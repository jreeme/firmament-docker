import "reflect-metadata";
import {injectable} from "inversify";
import {
  DockerOde, DockerImage, DockerContainer
} from "../../interfaces/dockerode";
import {ForceErrorImpl} from "./force-error-impl";
@injectable()
export class DockerOdeImpl extends ForceErrorImpl implements DockerOde {
  private dockerode: DockerOde;

  constructor() {
    super();
    this.dockerode = new (require('dockerode'))({socketPath: '/var/run/docker.sock'});
  }

  listImages(options: any, cb: (err: Error, images: DockerImage[])=>void): void {
    if (this.checkForceError('listImages', cb)) {
      return;
    }
    this.dockerode.listImages(options, cb);
  }

  listContainers(options: any, cb: (err: Error, containers: DockerContainer[])=>void): void {
    if (this.checkForceError('listContainers', cb)) {
      return;
    }
    this.dockerode.listContainers(options, cb);
  }

  getContainer(id: string): DockerContainer {
    if (this.checkForceError('getContainer')) {
      return;
    }
    return this.dockerode.getContainer(id);
  }

  getImage(id: string): DockerImage {
    if (this.checkForceError('getImage')) {
      return;
    }
    return this.dockerode.getImage(id);
  }

  buildImage(tarStream: any, options: any, cb: (err: Error, outputStream: any)=>void) {
    if (this.checkForceError('buildImage', cb)) {
      return;
    }
    this.dockerode.buildImage(tarStream, options, cb);
  }

  createContainer(containerConfig: any, cb: (err: Error, container: DockerContainer)=>void): void {
    if (this.checkForceError('createContainer', cb)) {
      return;
    }
    this.dockerode.createContainer(containerConfig, (err: Error, container: any)=> {
      cb(err, container);
    });
  }

  pull(imageName: string, cb: (err: Error, outputStream: any)=>void) {
    if (this.checkForceError('pull', cb)) {
      return;
    }
    this.dockerode.pull(imageName, cb);
  }
}

