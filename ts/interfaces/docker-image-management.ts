import {ImageRemoveResults, DockerImage} from "./dockerode";
export interface DockerImageManagement {
  listImages(listAllImages:boolean, cb:(err:Error, images:DockerImage[])=>void);
  removeImages(ids:string[], cb:(err:Error, imageRemoveResults:ImageRemoveResults[])=>void):void;
}

