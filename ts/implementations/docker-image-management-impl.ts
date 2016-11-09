import {injectable, inject} from 'inversify';
import {DockerImageManagement} from '../interfaces/docker-image-management';
import {DockerImage, ImageOrContainerRemoveResults, ImageOrContainer} from '../interfaces/dockerode';
import {DockerUtilOptionsImpl} from './util/docker-util-options-impl';
import {ForceErrorImpl} from './util/force-error-impl';
import * as _ from 'lodash';
import * as async from 'async';
import {DockerManagement} from "../interfaces/docker-management";
const positive = require('positive');

@injectable()
export class DockerImageManagementImpl extends ForceErrorImpl implements DockerImageManagement {
  private DM: DockerManagement;

  constructor(@inject('DockerManagement')_dockerManagement: DockerManagement) {
    super();
    this.DM = _dockerManagement;
  }

  listImages(listAllImages: boolean, cb: (err: Error, images: DockerImage[])=>void) {
    let dockerUtilOptions = new DockerUtilOptionsImpl(ImageOrContainer.Image, listAllImages);
    this.DM.dockerUtil.forceError = this.forceError;
    this.DM.dockerUtil.listImagesOrContainers(dockerUtilOptions, cb);
  }

  getImages(ids: string[], cb: (err: Error, images: DockerImage[])=>void) {
    let dockerUtilOptions = new DockerUtilOptionsImpl(ImageOrContainer.Image);
    this.DM.dockerUtil.forceError = this.forceError;
    this.DM.dockerUtil.getImagesOrContainers(ids, dockerUtilOptions, cb);
  }

  getImage(id: string, cb: (err: Error, image: DockerImage)=>void) {
    let dockerUtilOptions = new DockerUtilOptionsImpl(ImageOrContainer.Image);
    this.DM.dockerUtil.forceError = this.forceError;
    this.DM.dockerUtil.getImageOrContainer(id, dockerUtilOptions, cb);
  }

  removeImages(ids: string[], cb: (err: Error, imageRemoveResults: ImageOrContainerRemoveResults[])=>void): void {
    let dockerUtilOptions = new DockerUtilOptionsImpl(ImageOrContainer.Image);
    this.DM.dockerUtil.forceError = this.forceError;
    this.DM.dockerUtil.removeImagesOrContainers(ids, dockerUtilOptions, cb);
  }

  pullImage(imageName: string, progressCb: (taskId: string, status: string, current: number, total: number)=>void, cb: (err: Error)=>void) {
    this.DM.dockerode.forceError = this.forceError;
    let me = this;
    me.DM.dockerode.pull(imageName,
      (err, outputStream)=> {
        if (me.DM.commandUtil.callbackIfError(cb, err)) {
          return;
        }
        outputStream.on('data', (chunk) => {
          try {
            let data = JSON.parse(chunk);
            if (data.error) {
              //noinspection ExceptionCaughtLocallyJS
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
          me.DM.commandUtil.callbackIfError(cb, new Error(`Unable to pull image: '${imageName}'`));
        });
      });
  }

  buildDockerFile(dockerFilePath: string, dockerImageName: string, progressCb: (taskId: string, status: string, current: number, total: number)=>void, cb: (err: Error)=>void) {
    this.DM.dockerode.forceError = this.forceError;
    let me = this;
    try {
      //Check existence of dockerFilePath
      require('fs').statSync(dockerFilePath);
    } catch (err) {
      if (me.DM.commandUtil.callbackIfError(cb, err)) {
        return;
      }
    }
    try {
      let tar = require('tar-fs');
      let tarStream = tar.pack(dockerFilePath);
      tarStream.on('error', (err: Error)=> {
        cb(err);
      });
      me.DM.dockerode.buildImage(tarStream, {
        t: dockerImageName
      }, function (err, outputStream) {
        if (me.DM.commandUtil.callbackIfError(cb, err)) {
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
          me.DM.commandUtil.callbackIfError(cb, new Error(`Error creating image: '${dockerImageName}'`));
        });
      });
    } catch (err) {
      me.DM.commandUtil.callbackIfError(cb, err);
    }
  }
}

