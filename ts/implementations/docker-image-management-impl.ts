/// <reference path="../../node_modules/inversify-dts/inversify/inversify.d.ts" />
/// <reference path="../../node_modules/reflect-metadata/reflect-metadata.d.ts" />
import {injectable, inject} from "inversify";
import {DockerImageManagement} from "../interfaces/docker-image-management";
import {DockerImage, ImageRemoveResults, DockerOde} from "../interfaces/dockerode";
import {CommandImpl} from 'firmament-yargs';
@injectable()
export class DockerImageManagementImpl extends CommandImpl implements DockerImageManagement {
  private dockerode:DockerOde;

  constructor(@inject('DockerOde') _dockerode:DockerOde) {
    super();
    this.dockerode = _dockerode;
  }

  listImages(listAllImages:boolean, cb:(err:Error, images:DockerImage[])=>void) {
    this.dockerode.listImages({all: true}, (err:Error, images:DockerImage[])=> {
      if (this.callbackIfError(cb, err)) {
        return;
      }
      //Sort by name so firmament id is consistent
      images.sort(function (a, b) {
        return a.RepoTags[0].localeCompare(b.RepoTags[0]);
      });
      let firmamentId = 0;
      images = images.map(image=> {
        image.firmamentId = (++firmamentId).toString();
        return image;
      }).filter(image=> {
        return image!== null;
      });
      cb(null, images);
    });
  }

  removeImages(ids:string[], cb:(err:Error, imageRemoveResults:ImageRemoveResults[])=>void):void {
  }
}

