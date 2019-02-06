import {injectable, inject} from 'inversify';
import {DockerImageManagement} from '../interfaces/docker-image-management';
import {DockerImage, ImageOrContainerRemoveResults, ImageOrContainer} from '..';
import {DockerUtilOptionsImpl} from './util/docker-util-options-impl';
import {ForceErrorImpl, CommandUtil, Spawn, SafeJson} from 'firmament-yargs';
import {DockerManagement} from '../interfaces/docker-management';

import * as fs from 'fs';
import * as path from 'path';
import * as async from 'async';
import * as sanitize from 'sanitize-filename';

@injectable()
export class DockerImageManagementImpl extends ForceErrorImpl implements DockerImageManagement {
  constructor(@inject('DockerManagement') private DM: DockerManagement,
              @inject('Spawn') private spawn: Spawn,
              @inject('SafeJson') private safeJson: SafeJson,
              @inject('CommandUtil') private commandUtil: CommandUtil) {
    super();
  }

  loadImages(imageRegEx: string, inputFolder: string, cb: (err: Error) => void) {
    const me = this;
    async.waterfall([
      (cb) => {
        fs.readdir(inputFolder, cb);
      },
      (files: string[], cb) => {
        const regExp = new RegExp(imageRegEx);
        cb(null, files
          .filter((file) => regExp.test(file))
          .map((file) => `${path.resolve(inputFolder, file)}`));
      },
      (pathsToLoad: string[], cb) => {
        me.commandUtil.stdoutWrite(`Queueing the following image files for load:\n\n`);
        pathsToLoad.forEach((pathToLoad) => {
          me.commandUtil.stdoutWrite(`${pathToLoad}\n`);
        });
        me.commandUtil.stdoutWrite(`\n`);
        async.eachSeries(pathsToLoad, (pathToLoad, cb) => {
          me.commandUtil.stdoutWrite(`Loading image: '${pathToLoad}' -- `);
          me.spawn.spawnShellCommandAsync([
              'bash',
              '-c',
              `docker load -i ${pathToLoad}`
            ],
            {},
            (err, result) => {
              me.commandUtil.stdoutWrite(result);
            }, cb);
        }, cb);
      }
    ], cb);
  }

  saveImages(imageRegEx: string, outputFolder: string, cb: (err: Error) => void) {
    const me = this;
    async.waterfall([
      (cb) => {
        me.spawn.spawnShellCommandAsync([
            'bash',
            '-c',
            `docker images -a | awk '{print \$1":"\$2}'`
          ],
          {
            cacheStdOut: true
          },
          () => {
          },
          (err, listImagesResult) => {
            me.safeJson.safeParse(listImagesResult, (err: Error, obj: any) => {
              cb(err, obj.stdoutText.toString().split('\n'));
            });
          });
      },
      (allImages: string[], cb) => {
        allImages.shift(); //shift out REPOSITORY:TAG
        allImages.pop(); //pop out empty string at end
        const regExp = new RegExp(imageRegEx);
        cb(null, allImages.filter((image) => regExp.test(image)));
      },
      (matchingImages: string[], cb) => {
        const imageOutputFiles: string[] = [];
        me.commandUtil.stdoutWrite(`Queueing the following images for save:\n\n`);
        matchingImages.forEach((matchingImage) => {
          me.commandUtil.stdoutWrite(`${matchingImage}\n`);
        });
        me.commandUtil.stdoutWrite(`\n`);
        async.each(matchingImages, (image, cb) => {
          const outputPath = `${path.resolve(outputFolder, sanitize(image, {replacement: '_'}))}.tar.gz`;
          me.spawn.spawnShellCommandAsync([
              'bash',
              '-c',
              `docker save ${image} -o ${outputPath}`
            ],
            {
              cacheStdOut: true,
              cacheStdErr: true
            },
            () => {
            },
            (err) => {
              me.commandUtil.stdoutWrite(`Saving: '${outputPath}'\n`);
              imageOutputFiles.push(outputPath);
              cb(err);
            });
        }, (err: Error) => {
          cb(err, imageOutputFiles);
        });
      }
    ], (err: Error) => {
      cb(err);
    });
  }

  listImages(listAllImages: boolean, cb: (err: Error, images: DockerImage[]) => void) {
    let dockerUtilOptions = new DockerUtilOptionsImpl(ImageOrContainer.Image, listAllImages);
    this.DM.dockerUtil.forceError = this.forceError;
    this.DM.dockerUtil.listImagesOrContainers(dockerUtilOptions, cb);
  }

  getImages(ids: string[], cb: (err: Error, images: DockerImage[]) => void) {
    let dockerUtilOptions = new DockerUtilOptionsImpl(ImageOrContainer.Image);
    this.DM.dockerUtil.forceError = this.forceError;
    this.DM.dockerUtil.getImagesOrContainers(ids, dockerUtilOptions, cb);
  }

  getImage(id: string, cb: (err: Error, image: DockerImage) => void) {
    let dockerUtilOptions = new DockerUtilOptionsImpl(ImageOrContainer.Image);
    this.DM.dockerUtil.forceError = this.forceError;
    this.DM.dockerUtil.getImageOrContainer(id, dockerUtilOptions, cb);
  }

  removeImages(ids: string[], cb: (err: Error, imageRemoveResults: ImageOrContainerRemoveResults[]) => void): void {
    let dockerUtilOptions = new DockerUtilOptionsImpl(ImageOrContainer.Image);
    this.DM.dockerUtil.forceError = this.forceError;
    this.DM.dockerUtil.removeImagesOrContainers(ids, dockerUtilOptions, cb);
  }

  pullImage(imageName: string,
            progressCb: (taskId: string, status: string, current: number, total: number) => void,
            cb: (err: Error) => void) {
    this.DM.dockerode.forceError = this.forceError;
    let me = this;
    me.DM.dockerode.pull(imageName,
      (err, outputStream) => {
        if(me.DM.commandUtil.callbackIfError(cb, err)) {
          return;
        }
        outputStream.on('data', (chunk) => {
          try {
            let data = JSON.parse(chunk);
            if(data.error) {
              //noinspection ExceptionCaughtLocallyJS
              throw new Error(data.error);
            }
            if(data.status === 'Downloading' || data.status === 'Extracting') {
              progressCb(data.id,
                data.status,
                data.progressDetail.current,
                data.progressDetail.total);
            }
          } catch(err) {
            progressCb('**error**', err.message, 0, 10);
            if(cb) {
              cb(err);
              cb = null;
            }
          }
        });
        outputStream.on('end', () => {
          //Assume all was well with pull from here. Hopefully 'error' will have been
          //emitted if something went wrong
          if(cb) {
            cb(null);
            cb = null;
          }
        });
        outputStream.on('error', function(err: Error) {
          let msg = `Encountered error '${err.message}' while pulling image: '${imageName}'`;
          let newError = new Error(msg);
          me.DM.commandUtil.logError(newError, true);
          if(cb) {
            cb(newError);
            cb = null;
          }
        });
      });
  }

  buildDockerFile(dockerFilePath: string, dockerImageName: string, progressCb: (taskId: string, status: string, current: number, total: number) => void, cb: (err: Error) => void) {
    this.DM.dockerode.forceError = this.forceError;
    let me = this;
    try {
      //Check existence of dockerFilePath
      require('fs').statSync(dockerFilePath);
    } catch(err) {
      if(me.DM.commandUtil.callbackIfError(cb, err)) {
        return;
      }
    }
    try {
      let tar = require('tar-fs');
      let tarStream = tar.pack(dockerFilePath);
      tarStream.on('error', (err: Error) => {
        cb(err);
      });
      me.DM.dockerode.buildImage(tarStream, {
        t: dockerImageName
      }, function(err, outputStream) {
        if(me.DM.commandUtil.callbackIfError(cb, err)) {
          return;
        }
        let error: Error = null;
        outputStream.on('data', function(chunk) {
          try {
            let data = JSON.parse(chunk);
            if(data.stream) {
              me.commandUtil.stdoutWrite(data.stream);
              //progressCb('start', data.stream, 0, 10);
            } else {
              if(data.error) {
                error = data.error;
                return;
              }
              if(data.status == 'Downloading' || data.status == 'Extracting') {
                progressCb(data.id,
                  data.status,
                  data.progressDetail.current,
                  data.progressDetail.total);
              }
            }
          } catch(err) {
            error = err;
          }
        });
        outputStream.on('end', function() {
          //A sad little hack to not stop processing on the 'tag not found error'. We'll do
          //this better next time.
          cb(error
          && error.message
          && error.message.indexOf('not found in repository') === -1
            ? error
            : null);
        });
        outputStream.on('error', function(err: Error) {
          let msg = `Encountered error '${err.message}' while building: '${dockerImageName}'`;
          me.DM.commandUtil.logError(new Error(msg), true);
        });
      });
    } catch(err) {
      me.DM.commandUtil.callbackIfError(cb, err);
    }
  }
}

