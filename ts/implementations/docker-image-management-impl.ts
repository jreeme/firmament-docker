import {injectable, inject} from "inversify";
import {DockerImageManagement} from "../interfaces/docker-image-management";
import {DockerImage, ImageRemoveResults, DockerOde, ImageOrContainer} from "../interfaces/dockerode";
import {CommandUtil} from 'firmament-yargs';
import {DockerUtil} from "../interfaces/docker-util";
import {DockerUtilOptionsImpl} from "./docker-util-options-impl";
import {ForceErrorImpl} from "./force-error-impl";
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
        let error: Error = null;
        if (err) {
          cb(err);
          return;
        }
        outputStream.on('data', (chunk) => {
          try {
            let data = JSON.parse(chunk);
            if (data.error) {
              error = new Error(data.error);
              return;
            }
            if (data.status === 'Downloading' || data.status === 'Extracting') {
              progressCb(data.id,
                data.status,
                data.progressDetail.current,
                data.progressDetail.total);
            }
          } catch (err) {
            error = err;
          }
        });
        outputStream.on('end', () => {
          cb(error);
        });
        outputStream.on('error', function () {
          let msg = "Unable to pull image: '" + imageName + "'";
          cb(new Error(msg));
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
        if (err) {
          cb(err);
          return;
        }
        let error: Error = null;
        outputStream.on('data', function (chunk) {
          try {
            let data = JSON.parse(chunk);
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
          me.commandUtil.callbackIfError(cb, new Error("Error creating image: '" + dockerImageName + "'"));
        });
      });
    } catch (err) {
      me.commandUtil.callbackIfError(cb, err);
    }
  }

  removeImages(ids: string[], cb: (err: Error, imageRemoveResults: ImageRemoveResults[])=>void): void {
    let me = this;
    if (!ids.length) {
      console.log('Specify images to remove by FirmamentId, Docker ID or Name. Or "all" to remove all.');
      return;
    }
    if (_.indexOf(ids, 'all') !== -1) {
      if (!positive("You're sure you want to remove all images? [y/N] ", false)) {
        console.log('Operation canceled.');
        cb(null, null);
        return;
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
            imageOrErrorMsg.remove({force: 1}, (err: Error)=> {
              var msg = 'Removing image "' + imageOrErrorMsg.name + '"';
              me.commandUtil.logAndCallback(msg, cb, err, {msg: imageOrErrorMsg.name});
            });
          }
        }, cb);
    });
  }
}

