import {injectable, inject} from 'inversify';
import {DockerUtil} from '../interfaces/docker-util';
import {ImageOrContainer, DockerOde} from '../interfaces/dockerode';
import {CommandUtil} from 'firmament-yargs';
import {DockerUtilOptions} from "../interfaces/docker-util-options";
import {ForceErrorImpl} from "./force-error-impl";
const deepExtend = require('deep-extend');
const async = require('async');
@injectable()
export class DockerUtilImpl extends ForceErrorImpl implements DockerUtil {
  private dockerode: DockerOde;
  private commandUtil: CommandUtil;

  constructor(@inject('DockerOde') _dockerode: DockerOde,
              @inject('CommandUtil') _commandUtil: CommandUtil) {
    super();
    this.dockerode = _dockerode;
    this.commandUtil = _commandUtil;
  }

  listImagesOrContainers(options: DockerUtilOptions,
                         cb: (err: Error, imagesOrContainers: any[])=>void) {
    let me = this;
    me.dockerode.forceError = this.forceError;
    let listFn: (options: any, cb: (err: Error, imagesOrContainers: any[])=>void)=>void;
    deepExtend(options, {all: true});
    listFn = (options.IorC === ImageOrContainer.Image)
      ? me.dockerode.listImages
      : me.dockerode.listContainers;
    listFn.call(
      me.dockerode,
      {
        all: true
      },
      (err: Error, imagesOrContainers: any[])=> {
        if (me.commandUtil.callbackIfError(cb, err)) {
          return;
        }
        //Sort by name so firmament id is consistent
        imagesOrContainers.sort(function (a, b) {
          if (options.IorC === ImageOrContainer.Container) {
            return a.Names[0].localeCompare(b.Names[0]);
          }
          else if (options.IorC === ImageOrContainer.Image) {
            let ref = a.RepoTags[0] + a.Id;
            let cmp = b.RepoTags[0] + b.Id;
            return ref.localeCompare(cmp);
          }
        });
        let firmamentId = 0;
        imagesOrContainers = imagesOrContainers.map(imageOrContainer=> {
          imageOrContainer.firmamentId = (++firmamentId).toString();
          if (options.IorC === ImageOrContainer.Container) {
            return (options.listAll || (imageOrContainer.Status.substring(0, 2) === 'Up')) ? imageOrContainer : null;
          } else {
            return (options.listAll || (imageOrContainer.RepoTags[0] !== '<none>:<none>')) ? imageOrContainer : null;
          }
        }).filter(imageOrContainer=> {
          return imageOrContainer !== null;
        });
        cb(null, imagesOrContainers);
      });
  }

  getImagesOrContainers(ids: string[],
                        options: DockerUtilOptions,
                        cb: (err: Error, imagesOrContainers: any[])=>void) {
    let me = this;
    if (!ids) {
      //if 'ids' is 'falsy' then return all containers or images
      options.listAll = true;
      me.listImagesOrContainers(options, (err: Error, imagesOrContainers: any[])=> {
        if (me.commandUtil.callbackIfError(cb, err)) {
          return;
        }
        ids = [];
        imagesOrContainers.forEach(imageOrContainer=> {
          ids.push(imageOrContainer.firmamentId);
        });
        me.getImagesOrContainers(ids, options, cb);
      });
      return;
    }
    let fnArray = ids.map(id=> {
      return async.apply(me.getImageOrContainer.bind(me), id.toString(), options);
    });
    async.series(fnArray, (err: Error, results: any[])=> {
      if (!me.commandUtil.callbackIfError(cb, err)) {
        cb(err, results.filter(result=>!!result));
      }
    });
  }

  getImageOrContainer(id: string,
                      options: DockerUtilOptions,
                      cb: (err: Error, imageOrContainer: any)=>void) {
    let me = this;
    async.waterfall([
        (cb: (err: Error)=>void)=> {
          options.listAll = true;
          me.listImagesOrContainers(options, cb);
        },
        (imagesOrContainers: any[], cb: (err: Error, imageOrContainerOrString: any)=>void)=> {
          let foundImagesOrContainers = imagesOrContainers.filter(imageOrContainer=> {
            if (imageOrContainer.firmamentId === id) {
              return true;
            } else {
              if (options.IorC === ImageOrContainer.Container) {
                for (let i = 0; i < imageOrContainer.Names.length; ++i) {
                  if (imageOrContainer.Names[i] === (id[0] === '/' ? id : '/' + id)) {
                    return true;
                  }
                }
              }
              else if (options.IorC === ImageOrContainer.Image) {
                for (let i = 0; i < imageOrContainer.RepoTags.length; ++i) {
                  //Don't match <none>:<none> (intermediate layers) since many images can have that as a RepoTag
                  if (imageOrContainer.RepoTags[i] === '<none>:<none>') {
                    continue;
                  }
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
              //If id starts with 'sha256:' then compare past it
              const testPrefix = 'sha256:';
              let imageOrContainerId = imageOrContainer.Id.toLowerCase();
              let startIdx = (testPrefix === imageOrContainerId.substr(0, testPrefix.length))
                ? testPrefix.length
                : 0;
              let str0 = imageOrContainerId.substring(startIdx, startIdx + charCount);
              let str1 = lowerCaseId.substring(0, charCount);
              return str0 === str1;
            }
          });
          if (foundImagesOrContainers.length > 0) {
            let imageOrContainer: any;
            if (options.IorC === ImageOrContainer.Container) {
              imageOrContainer = me.dockerode.getContainer(foundImagesOrContainers[0].Id, options);
              imageOrContainer.name = foundImagesOrContainers[0].Names[0];
            }
            else if (options.IorC === ImageOrContainer.Image) {
              imageOrContainer = me.dockerode.getImage(foundImagesOrContainers[0].Id, options);
              imageOrContainer.name = foundImagesOrContainers[0].RepoTags[0];
            }
            cb(null, imageOrContainer);
          } else {
            cb(null, `Unable to find: ${id}`);
          }
        }
      ],
      cb);
  }
}
