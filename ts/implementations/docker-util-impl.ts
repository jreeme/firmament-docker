import {injectable, inject} from 'inversify';
import {DockerUtil} from '../interfaces/docker-util';
import {ImageOrContainer, DockerOde} from '../interfaces/dockerode';
import {CommandUtil} from 'firmament-yargs';
const deepExtend = require('deep-extend');
const async = require('async');
@injectable()
export class DockerUtilImpl implements DockerUtil {
  private dockerode: DockerOde;
  private commandUtil: CommandUtil;

  constructor(@inject('DockerOde') _dockerode: DockerOde,
              @inject('CommandUtil') _commandUtil: CommandUtil) {
    this.dockerode = _dockerode;
    this.commandUtil = _commandUtil;
  }

  getImagesOrContainers(ids: string[],
                        IorC: ImageOrContainer,
                        cb: (err: Error, imagesOrContainers: any[])=>void,
                        options = {}) {
    let me = this;
    if (!ids) {
      me.listImagesOrContainers(true, IorC, (err: Error, imagesOrContainers: any[])=> {
        if (me.commandUtil.callbackIfError(cb, err)) {
          return;
        }
        ids = [];
        imagesOrContainers.forEach(imageOrContainer=> {
          ids.push(imageOrContainer.firmamentId);
        });
        me.getImagesOrContainers(ids, IorC, cb);
      }, options);
      return;
    }
    let fnArray = ids.map(id=> {
      return async.apply(me.getImageOrContainer.bind(me), id.toString(), IorC);
    });
    async.series(fnArray, (err: Error, results: any[])=> {
      if (!me.commandUtil.callbackIfError(cb, err)) {
        cb(err, results.filter(result=>!!result));
      }
    });
  }

  listImagesOrContainers(listAll: boolean,
                         IorC: ImageOrContainer,
                         cb: (err: Error, imagesOrContainers: any[])=>void,
                         options = {}) {
    let me = this;
    let listFn: (options: any, cb: (err: Error, imagesOrContainers: any[])=>void)=>void;
    deepExtend(options, {all: true});
    listFn = (IorC === ImageOrContainer.Image)
      ? me.dockerode.listImages
      : me.dockerode.listContainers;
    listFn.call(
      me.dockerode,
      options,
      (err: Error, imagesOrContainers: any[])=> {
        if (me.commandUtil.callbackIfError(cb, err)) {
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
            return (listAll || (imageOrContainer.RepoTags[0] !== '<none>:<none>')) ? imageOrContainer : null;
          }
        }).filter(imageOrContainer=> {
          return imageOrContainer !== null;
        });
        cb(null, imagesOrContainers);
      });
  }

  getImageOrContainer(id: string,
                      IorC: ImageOrContainer,
                      cb: (err: Error, imageOrContainer: any)=>void) {
    let me = this;
    async.waterfall([
        (cb: (err: Error)=>void)=> {
          me.listImagesOrContainers(true, IorC, cb);
        },
        (imagesOrContainers: any[], cb: (err: Error, imageOrContainerOrString: any)=>void)=> {
          let foundImagesOrContainers = imagesOrContainers.filter(imageOrContainer=> {
            if (imageOrContainer.firmamentId === id) {
              return true;
            } else {
              if (IorC === ImageOrContainer.Container) {
                for (let i = 0; i < imageOrContainer.Names.length; ++i) {
                  if (imageOrContainer.Names[i] === (id[0] === '/' ? id : '/' + id)) {
                    return true;
                  }
                }
              }
              else if (IorC === ImageOrContainer.Image) {
                for (let i = 0; i < imageOrContainer.RepoTags.length; ++i) {
                  if (imageOrContainer.RepoTags[i] === id) {
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
              let imageOrContainer = me.dockerode.getContainer(foundImagesOrContainers[0].Id);
              imageOrContainer.name = foundImagesOrContainers[0].Names[0];
              cb(null, imageOrContainer);
            }
            else if (IorC === ImageOrContainer.Image) {
              let imageOrContainer = me.dockerode.getImage(foundImagesOrContainers[0].Id);
              imageOrContainer.name = foundImagesOrContainers[0].RepoTags[0];
              cb(null, imageOrContainer);
            }
          } else {
            cb(null, `Unable to find: ${id}`);
          }
        }
      ],
      cb);
  }
}
