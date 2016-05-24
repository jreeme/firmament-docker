import * as _ from 'lodash';
import {FirmamentDocker} from '../interfaces/firmament-docker';
import {ImageOrContainer, DockerImageOrContainer} from '../interfaces/dockerode';
import {CommandImpl} from 'firmament-yargs';
import {
  DockerImage,
  DockerOde,
  DockerContainer,
  ContainerRemoveResults,
  ImageRemoveResults
} from '../interfaces/dockerode';
const async = require('async');
const deepExtend = require('deep-extend');
const positive = require('positive');
const childProcess = require('child_process');
export class FirmamentDockerImpl extends CommandImpl implements FirmamentDocker {
  private dockerode:DockerOde;

  constructor() {
    super();
    this.dockerode = new (require('dockerode'))({socketPath: '/var/run/docker.sock'});
  }

  createContainer(dockerContainerConfig:any, cb:(err:Error, dockerContainer:DockerContainer)=>void) {
    var fullContainerConfigCopy = {ExpressApps: []};
    deepExtend(fullContainerConfigCopy, dockerContainerConfig);
    this.dockerode.createContainer(fullContainerConfigCopy, (err:Error, dockerContainer:DockerContainer)=> {
      cb(err, dockerContainer);
    });
  }

  removeImages(ids:string[], cb:(err:Error, imageRemoveResults:ImageRemoveResults[])=>void):void {
    let self = this;
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
    this.getImages(ids, (err:Error, images:any[])=> {
      this.logError(err);
      async.map(images,
        (imageOrErrorMsg, cb)=> {
          if (typeof imageOrErrorMsg === 'string') {
            this.logAndCallback(imageOrErrorMsg, cb, null, {msg: imageOrErrorMsg});
          } else {
            imageOrErrorMsg.remove({force: 1}, (err:Error)=> {
              var msg = 'Removing image "' + imageOrErrorMsg.name + '"';
              self.logAndCallback(msg, cb, err, {msg: imageOrErrorMsg.name});
            });
          }
        }, cb);
    });
  }

  removeContainers(ids:string[], cb:(err:Error, containerRemoveResults:ContainerRemoveResults[])=>void):void {
    let self = this;
    if (!ids.length) {
      console.log('Specify containers to remove by FirmamentId, Docker ID or Name. Or "all" to remove all.');
      return;
    }
    if (_.indexOf(ids, 'all') !== -1) {
      if (!positive("You're sure you want to remove all containers? [y/N] ", false)) {
        console.log('Operation canceled.');
        cb(null, null);
        return;
      }
      ids = null;
    }
    this.getContainers(ids, (err:Error, dockerContainer:DockerContainer[])=> {
      this.logError(err);
      async.map(dockerContainer,
        (containerOrErrorMsg, cb)=> {
          if (typeof containerOrErrorMsg === 'string') {
            this.logAndCallback(containerOrErrorMsg, cb, null, {msg: containerOrErrorMsg});
          } else {
            containerOrErrorMsg.remove({force: 1}, (err:Error)=> {
              var msg = 'Removing container "' + containerOrErrorMsg.name + '"';
              self.logAndCallback(msg, cb, err, {msg: containerOrErrorMsg.name});
            });
          }
        }, cb);
    });
  }

  startOrStopContainers(ids:string[], start:boolean, cb:()=>void):void {
    this.getContainers(ids, (err:Error, dockerContainer:DockerContainer[])=> {
      this.logError(err);
      async.mapSeries(dockerContainer,
        (containerOrErrorMsg, cb)=> {
          if (typeof containerOrErrorMsg === 'string') {
            this.logAndCallback(containerOrErrorMsg, cb);
          } else {
            let resultMessage = 'Container "' + containerOrErrorMsg.name + '" ';
            resultMessage += start ? 'started.' : 'stopped.';
            let fnStartStop = start
              ? containerOrErrorMsg.start.bind(containerOrErrorMsg)
              : containerOrErrorMsg.stop.bind(containerOrErrorMsg);
            fnStartStop((err:Error)=> {
              this.logAndCallback(this.returnErrorStringOrMessage(err, resultMessage), cb);
            });
          }
        }, cb);
    });
  }

  getImages(ids:string[], cb:(err:Error, images:DockerImage[])=>void):void {
    this.getImagesOrContainers(ids, ImageOrContainer.Image, cb);
  }

  getContainers(ids:string[], cb:(err:Error, dockerContainers:DockerContainer[])=>void):void {
    this.getImagesOrContainers(ids, ImageOrContainer.Container, cb);
  }

  private getImagesOrContainers(ids:string[],
                                IorC:ImageOrContainer,
                                cb:(err:Error, imagesOrContainers:any[])=>void) {
    if (!ids) {
      this.listImagesOrContainers(true, IorC, (err:Error, imagesOrContainers:any[])=> {
        if (this.callbackIfError(cb, err)) {
          return;
        }
        ids = [];
        imagesOrContainers.forEach(imageOrContainer=> {
          ids.push(imageOrContainer.firmamentId);
        });
        this.getImagesOrContainers(ids, IorC, cb);
      });
      return;
    }
    let fnArray = ids.map(id=> {
      return async.apply(this.getImageOrContainer.bind(this), id.toString(), IorC);
    });
    async.series(fnArray, (err:Error, results:any[])=> {
      if (!this.callbackIfError(cb, err)) {
        cb(err, results.filter(result=>!!result));
      }
    });
  }

  getImage(id:string, cb:(err:Error, image:DockerImage)=>void) {
    this.getImageOrContainer(id, ImageOrContainer.Image, cb);
  }

  getContainer(id:string, cb:(err:Error, dockerContainer:DockerContainer)=>void) {
    this.getImageOrContainer(id, ImageOrContainer.Container, cb);
  }

  private getImageOrContainer(id:string,
                              IorC:ImageOrContainer,
                              cb:(err:Error, imageOrContainer:any)=>void) {
    let me = this;
    async.waterfall([
        (cb:(err:Error)=>void)=> {
          me.listImagesOrContainers(true, IorC, cb);
        },
        (imagesOrContainers:any[], cb:(err:Error, imageOrContainerOrString:any)=>void)=> {
          let foundImagesOrContainers = imagesOrContainers.filter(imageOrContainer=> {
            if (imageOrContainer.firmamentId === id) {
              return true;
            } else {
              if (IorC === ImageOrContainer.Container) {
                for (let i = 0; i < imageOrContainer.Names.length; ++i) {
                  if(imageOrContainer.Names[i] === (id[0] === '/' ? id : '/' + id)){
                    return true;
                  }
                }
              }
              else if (IorC === ImageOrContainer.Image) {
                for (let i = 0; i < imageOrContainer.RepoTags.length; ++i) {
                  if(imageOrContainer.RepoTags[i] === id){
                    return true;
                  }
                }
              }
              let lowerCaseId = id.toLowerCase();
              let charCount = lowerCaseId.length;
              if (charCount < 3) {
                return false;
              }
              return imageOrContainer.Id.toLowerCase().substring(0, charCount) ===
                lowerCaseId.substring(0, charCount);
            }
          });
          if (foundImagesOrContainers.length > 0) {
            if (IorC === ImageOrContainer.Container) {
              let imageOrContainer = this.dockerode.getContainer(foundImagesOrContainers[0].Id);
              imageOrContainer.name = foundImagesOrContainers[0].Names[0];
              cb(null, imageOrContainer);
            }
            else if (IorC === ImageOrContainer.Image) {
              let imageOrContainer = this.dockerode.getImage(foundImagesOrContainers[0].Id);
              imageOrContainer.name = foundImagesOrContainers[0].RepoTags[0];
              cb(null, imageOrContainer);
            }
          } else {
            cb(null, 'Unable to find: "' + id + '"');
          }
        }
      ],
      cb);
  }

  listContainers(listAllContainers:boolean, cb:(err:Error, dockerContainers?:DockerContainer[])=>void) {
    this.listImagesOrContainers(listAllContainers, ImageOrContainer.Container, cb);
  }

  listImages(listAllImages:boolean, cb:(err:Error, images:DockerImage[])=>void) {
    this.listImagesOrContainers(listAllImages, ImageOrContainer.Image, cb);
  }

  private listImagesOrContainers(listAll:boolean,
                                 IorC:ImageOrContainer,
                                 cb:(err:Error, imagesOrContainers:any[])=>void) {
    let listFn:(options:any, cb:(err:Error, imagesOrContainers:any[])=>void)=>void;
    listFn = (IorC === ImageOrContainer.Image)
      ? this.dockerode.listImages
      : this.dockerode.listContainers;
    listFn.call(this.dockerode, {all: true}, (err:Error, imagesOrContainers:any[])=> {
      if (this.callbackIfError(cb, err)) {
        return;
      }
      //Sort by name so firmament id is consistent
      imagesOrContainers.sort(function (a, b) {
        if (IorC === ImageOrContainer.Container) {
          return a.Names[0].localeCompare(b.Names[0]);
        }
        else if (IorC === ImageOrContainer.Image) {
          return a.RepoTags[0].localeCompare(b.RepoTags[0]);
        }
      });
      let firmamentId = 0;
      imagesOrContainers = imagesOrContainers.map(imageOrContainer=> {
        imageOrContainer.firmamentId = (++firmamentId).toString();
        if (IorC === ImageOrContainer.Container) {
          return (listAll || (imageOrContainer.Status.substring(0, 2) === 'Up')) ? imageOrContainer : null;
        } else {
          return imageOrContainer;
        }
      }).filter(imageOrContainer=> {
        return imageOrContainer !== null;
      });
      cb(null, imagesOrContainers);
    });
  }

  buildDockerFile(dockerFilePath:string, dockerImageName:string,
                  progressCb:(taskId:string, status:string, current:number, total:number)=>void,
                  cb:(err:Error)=>void):void {
    try {
      //Check existence of dockerFilePath
      require('fs').statSync(dockerFilePath);
    } catch (err) {
      if (this.callbackIfError(cb, err)) {
        return;
      }
    }
    try {
      let tar = require('tar-fs');
      let tarStream = tar.pack(dockerFilePath);
      tarStream.on('error', (err:Error)=> {
        cb(err);
      });
      this.dockerode.buildImage(tarStream, {
        t: dockerImageName
      }, function (err, outputStream) {
        if (err) {
          cb(err);
          return;
        }
        let error:Error = null;
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
          this.callbackIfError(cb, new Error("Error creating image: '" + dockerImageName + "'"));
        });
      });
    } catch (err) {
      this.callbackIfError(cb, err);
    }
  }

  pullImage(imageName:string,
            progressCb:(taskId:string, status:string, current:number, total:number)=>void,
            cb:(err:Error)=>void) {
    this.dockerode.pull(imageName,
      (err, outputStream)=> {
        let error:Error = null;
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

  exec(id:string, command:string, cb:(err:Error, result:any)=>void):void {
    this.getContainer(id, (err:Error, dockerContainer:DockerContainer)=> {
      if (this.callbackIfError(cb, err)) {
        return;
      }
      childProcess.spawnSync('docker', ['exec', '-it', dockerContainer.name.slice(1), command], {
        stdio: 'inherit'
      });
      cb(null, 0);
    });
  }
}
