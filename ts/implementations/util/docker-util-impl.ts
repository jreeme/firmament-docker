import {injectable, inject} from 'inversify';
import {DockerUtil} from '../../interfaces/docker-util';
import * as _ from 'lodash';
import {
  DockerOde, ImageOrContainer, DockerImageOrContainer,
  ImageOrContainerRemoveResults
} from '../../interfaces/dockerode';
import {CommandUtil, Positive, FailureRetVal} from 'firmament-yargs';
import {DockerUtilOptions} from "../../interfaces/docker-util-options";
import {ForceErrorImpl} from "./force-error-impl";
const deepExtend = require('deep-extend');
const async = require('async');
@injectable()
export class DockerUtilImpl extends ForceErrorImpl implements DockerUtil {
  private dockerode: DockerOde;
  private commandUtil: CommandUtil;
  private positive: Positive;

  constructor(@inject('DockerOde') _dockerode: DockerOde,
              @inject('Positive') _positive: Positive,
              @inject('CommandUtil') _commandUtil: CommandUtil) {
    super();
    this.dockerode = _dockerode;
    this.positive = _positive;
    this.commandUtil = _commandUtil;
  }

  listImagesOrContainers(options: DockerUtilOptions,
                         cb: (err: Error, imagesOrContainers: any[])=>void) {
    this.dockerode.forceError = this.forceError;
    let me = this;
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
                        cb: (err: Error, imagesOrContainers: DockerImageOrContainer[])=>void) {
    this.dockerode.forceError = this.forceError;
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
    this.dockerode.forceError = this.forceError;
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
              let charCount = id.length;
              if (charCount < 3) {
                return false;
              }
              return DockerUtilImpl.compareIds(id, imageOrContainer.Id);
            }
          });
          if (foundImagesOrContainers.length > 0) {
            let imageOrContainer: DockerImageOrContainer;
            if (options.IorC === ImageOrContainer.Container) {
              imageOrContainer = me.dockerode.getContainer(foundImagesOrContainers[0].Id, options);
              imageOrContainer.Name = foundImagesOrContainers[0].Names[0];
            }
            else if (options.IorC === ImageOrContainer.Image) {
              imageOrContainer = me.dockerode.getImage(foundImagesOrContainers[0].Id, options);
              imageOrContainer.Name = foundImagesOrContainers[0].RepoTags[0];
            }
            imageOrContainer.Id = DockerUtilImpl.stripSha256(foundImagesOrContainers[0].Id);
            cb(null, imageOrContainer);
          } else {
            cb(null, `Unable to find: ${id}`);
          }
        }
      ],
      cb);
  }

  removeImagesOrContainers(ids: string[],
                           options: DockerUtilOptions,
                           cb: (err: Error, imageOrContainerRemoveResults: ImageOrContainerRemoveResults[])=>void) {
    this.dockerode.forceError = this.forceError;
    let me = this;
    ids = ids || [];
    let thingsToRemove = options.IorC === ImageOrContainer.Container
      ? 'containers'
      : 'images';
    let thingToRemove = options.IorC === ImageOrContainer.Container
      ? 'container'
      : 'image';
    if (!ids.length) {
      throw new Error(`Specify ${thingsToRemove} to remove by FirmamentId, Docker ID or Name. Or 'all' to remove all.`);
    }
    if (_.indexOf(ids, 'all') !== -1) {
      if (!this.positive.areYouSure(`You're sure you want to remove all ${thingsToRemove}? [y/N] `,
          `Operation canceled.`,
          false,
          FailureRetVal.TRUE)) {
        cb(null, null);
        return;
      }
      ids = null;
    }
    me.getImagesOrContainers(ids, options, (err: Error, dockerImagesOrContainers: DockerImageOrContainer[])=> {
      if (me.commandUtil.callbackIfError(cb, err)) {
        return;
      }
      async.map(dockerImagesOrContainers,
        (imageOrContainer: DockerImageOrContainer, cb)=> {
          if (typeof imageOrContainer === 'string') {
            me.commandUtil.logAndCallback(imageOrContainer,
              cb,
              null,
              {msg: imageOrContainer});
          } else {
            imageOrContainer.remove({force: 1}, (err: Error)=> {
              let msg = `Removing ${thingToRemove} '${imageOrContainer.Name}' with id: '${imageOrContainer.Id.substr(0,8)}'`;
              me.commandUtil.logAndCallback(msg, cb, err, {msg});
            });
          }
        }, cb);
    });
  }

  private static compareIds(id0: string, id1: string): boolean {
    let str0 = DockerUtilImpl.stripSha256(id0).toLowerCase();
    let str1 = DockerUtilImpl.stripSha256(id1).toLowerCase();
    let len = str0.length < str1.length
      ? str0.length
      : str1.length;
    str0 = str0.substr(0, len);
    str1 = str1.substr(0, len);
    return str0 === str1;
  }

  private static stripSha256(id: string): string {
    const testPrefix = 'sha256:';
    let startIdx = (testPrefix === id.substr(0, testPrefix.length))
      ? testPrefix.length
      : 0;
    return id.substr(startIdx);
  }
}
