import "reflect-metadata";
import {injectable, inject} from "inversify";
import {
  DockerOde, DockerImage, DockerContainer, ImageObject, ContainerObject
} from "../interfaces/dockerode";
@injectable()
export class DockerOdeImpl implements DockerOde {
  private dockerode: DockerOde;

  constructor() {
    this.dockerode = new (require('dockerode'))({socketPath: '/var/run/docker.sock'});
  }

  listImages(options: any, cb: (err: Error, images: DockerImage[])=>void): void {
    if (options.forceError) {
      cb(new Error('error forced'), []);
      return;
    }
    this.dockerode.listImages(options, cb);
  }

  listContainers(options: any, cb: (err: Error, containers: DockerContainer[])=>void): void {
    if (options.forceError) {
      cb(new Error('error forced'), []);
      return;
    }
    this.dockerode.listContainers(options, cb);
  }

  getContainer(id: string): ContainerObject {
    return this.dockerode.getContainer(id);
  }

  getImage(id: string): ImageObject {
    return this.dockerode.getImage(id);
  }

  buildImage(tarStream: any, options: any, cb: (err: Error, outputStream: any)=>void) {
  }

  createContainer(containerConfig: any, cb: (err: Error, container: DockerContainer)=>void): void {
  }

  pull(imageName: string, cb: (err: Error, outputStream: any)=>void) {
  }
}

