import {injectable, inject} from "inversify";
import {DockerImageManagement} from "../interfaces/docker-image-management";
import {DockerImage, ImageRemoveResults, DockerOde, ImageOrContainer, ImageObject} from "../interfaces/dockerode";
import {CommandUtil} from 'firmament-yargs';
import {DockerUtil} from "../interfaces/docker-util";
import {DockerUtilOptionsImpl} from "./docker-util-options-impl";
import {ForceErrorImpl} from "./force-error-impl";
import * as _ from 'lodash';
import * as async from 'async';
const positive = require('positive');
@injectable()
export class DockerImageManagementImpl extends ForceErrorImpl implements DockerImageManagement {
  private dockerode: DockerOde;
  private commandUtil: CommandUtil;
  private dockerUtil: DockerUtil;

  constructor(@inject('DockerOde') _dockerode: DockerOde,
              @inject('DockerUtil') _dockerUtil: DockerUtil,
              @inject('CommandUtil') _commandUtil: CommandUtil) {
    super();
    this.dockerode = _dockerode;
    this.dockerUtil = _dockerUtil;
    this.commandUtil = _commandUtil;
  }

  listImages(listAllImages: boolean, cb: (err: Error, images: DockerImage[])=>void) {
    let dockerUtilOptions = new DockerUtilOptionsImpl(ImageOrContainer.Image, listAllImages);
    this.dockerUtil.forceError = this.forceError;
    this.dockerUtil.listImagesOrContainers(dockerUtilOptions, cb);
  }

  getImage(id: string, cb: (err: Error, image: DockerImage)=>void) {
    let dockerUtilOptions = new DockerUtilOptionsImpl(ImageOrContainer.Image);
    this.dockerUtil.forceError = this.forceError;
    this.dockerUtil.getImageOrContainer(id, dockerUtilOptions, cb);
  }

  getImages(ids: string[], cb: (err: Error, images: DockerImage[])=>void) {
    let dockerUtilOptions = new DockerUtilOptionsImpl(ImageOrContainer.Image);
    this.dockerUtil.forceError = this.forceError;
    this.dockerUtil.getImagesOrContainers(ids, dockerUtilOptions, cb);
  }

  pullImage(imageName: string, progressCb: (taskId: string, status: string, current: number, total: number)=>void, cb: (err: Error)=>void) {
    this.dockerode.forceError = this.forceError;
    let me = this;
    me.dockerode.pull(imageName,
      (err, outputStream)=> {
        if (me.commandUtil.callbackIfError(cb, err)) {
          return;
        }
        outputStream.on('data', (chunk) => {
          try {
            let data = JSON.parse(chunk);
            if (data.error) {
              throw new Error(data.error);
            }
            if (data.status === 'Downloading' || data.status === 'Extracting') {
              progressCb(data.id,
                data.status,
                data.progressDetail.current,
                data.progressDetail.total);
            }
          } catch (err) {
            progressCb('**error**', err.message, 0, 10);
          }
        });
        outputStream.on('end', () => {
          //Assume all was well with pull from here. Hopefully 'error' will have been
          //emitted if something went wrong
          cb(null);
        });
        outputStream.on('error', function () {
          me.commandUtil.callbackIfError(cb, new Error(`Unable to pull image: '${imageName}'`));
        });
      });
  }

  buildDockerFile(dockerFilePath: string, dockerImageName: string, progressCb: (taskId: string, status: string, current: number, total: number)=>void, cb: (err: Error)=>void) {
    this.dockerode.forceError = this.forceError;
    let me = this;
    try {
      //Check existence of dockerFilePath
      require('fs').statSync(dockerFilePath);
    } catch (err) {
      if (me.commandUtil.callbackIfError(cb, err)) {
        return;
      }
    }
    try {
      let tar = require('tar-fs');
      let tarStream = tar.pack(dockerFilePath);
      tarStream.on('error', (err: Error)=> {
        cb(err);
      });
      me.dockerode.buildImage(tarStream, {
        t: dockerImageName
      }, function (err, outputStream) {
        if (me.commandUtil.callbackIfError(cb, err)) {
          return;
        }
        let error: Error = null;
        outputStream.on('data', function (chunk) {
          try {
            let data = JSON.parse(chunk);
            if (data.stream) {
              progressCb('start', data.stream, 0, 10);
            } else {
              if (data.error) {
                error = data.error;
                return;
              }
              if (data.status == 'Downloading' || data.status == 'Extracting') {
                progressCb(data.id,
                  data.status,
                  data.progressDetail.current,
                  data.progressDetail.total);
              }
            }
          } catch (err) {
            error = err;
          }
        });
        outputStream.on('end', function () {
          //A sad little hack to not stop processing on the 'tag not found error'. We'll do
          //this better next time.
          cb(error
          && error.message
          && error.message.indexOf('not found in repository') === -1
            ? error
            : null);
        });
        outputStream.on('error', function () {
          me.commandUtil.callbackIfError(cb, new Error(`Error creating image: '${dockerImageName}'`));
        });
      });
    } catch (err) {
      me.commandUtil.callbackIfError(cb, err);
    }
  }

  removeImages(ids: string[], cb: (err: Error, imageRemoveResults: ImageRemoveResults[])=>void): void {
    if (this.checkForceError(cb)) {
      return;
    }
    let me = this;
    if (!ids.length) {
      console.log('Specify images to remove by FirmamentId, Docker ID or Name. Or "all" to remove all.');
      return;
    }
    if (_.indexOf(ids, 'all') !== -1) {
      try {
        if (!positive("You're sure you want to remove all images? [y/N] ", false)) {
          console.log('Operation canceled.');
          cb(null, null);
          return;
        }
      } catch (err) {
        console.log(err.message);
      }
      ids = null;
    }
    me.getImages(ids, (err: Error, images: any[])=> {
      me.commandUtil.logError(err);
      async.map(images,
        (imageOrErrorMsg, cb)=> {
          if (typeof imageOrErrorMsg === 'string') {
            me.commandUtil.logAndCallback(imageOrErrorMsg, cb, null, {msg: imageOrErrorMsg});
          } else {
            imageOrErrorMsg.remove({force: 1}, (err: Error, image: ImageObject)=> {
              //Trim 'sha256' off of id string
              let id = image.id.substr(7, 9);
              let msg = `Removing image '${imageOrErrorMsg.name}' with id: '${id}'`;
              me.commandUtil.logAndCallback(msg, cb, err, {msg});
            });
          }
        }, cb);
    });
  }
}

