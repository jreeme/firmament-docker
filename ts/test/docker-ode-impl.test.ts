/// <reference path="../../node_modules/inversify-dts/inversify/inversify.d.ts" />
/// <reference path="../../node_modules/reflect-metadata/reflect-metadata.d.ts" />
import "reflect-metadata";
import {injectable, inject} from "inversify";
import {
  DockerOde, DockerImage, DockerContainer
} from "../interfaces/dockerode";
const jsonFile = require('jsonfile');
@injectable()
export class DockerOdeMockImpl implements DockerOde {
  listImages(options:any, cb:(err:Error, images:DockerImage[])=>void):void {
    if(options.forceError){
      cb(new Error('error forced'),[]);
      return;
    }
    let images = jsonFile.readFileSync(__dirname + '/../../test-data/docker-image-list.json');
    if(!options.all){
      images = images.slice(1,3);
    }
    cb(null, images);
  }

  listContainers(options:any, cb:(err:Error, containers:DockerContainer[])=>void):void {
    if(options.forceError){
      cb(new Error('error forced'),[]);
      return;
    }
    let images = jsonFile.readFileSync(__dirname + '/../../test-data/docker-image-list.json');
    if(!options.all){
      images = images.slice(1,3);
    }
    cb(null, images);
  }

  getContainer(id:string):DockerContainer {
    return undefined;
  }

  getImage(id:string):DockerImage {
    return undefined;
  }

  buildImage(tarStream:any, options:any, cb:(err:Error, outputStream:any)=>void) {
  }

  createContainer(containerConfig:any, cb:(err:Error, container:DockerContainer)=>void):void {
  }

  pull(imageName:string, cb:(err:Error, outputStream:any)=>void) {
  }
}

