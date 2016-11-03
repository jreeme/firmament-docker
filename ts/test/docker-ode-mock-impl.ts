import "reflect-metadata";
import {injectable} from "inversify";
import {
  DockerOde, DockerImage, DockerContainer, ContainerObject, ImageObject
} from "../interfaces/dockerode";
import {ImageObjectImpl} from "./image-object-impl";
import {ContainerObjectImpl} from "./container-object-impl";
import {ForceErrorImpl} from "../implementations/force-error-impl";
const jsonFile = require('jsonfile');
@injectable()
export class DockerOdeMockImpl extends ForceErrorImpl implements DockerOde {
  listImages(options: any, cb: (err: Error, images: DockerImage[])=>void): void {
    if (this.checkForceError(cb)) {
      return;
    }
    let images = options.all
      ? this.testImageList
      : this.testImageList.filter(image=> {
      return image.RepoTags[0] !== '<none>:<none>';
    });
    cb(null, images);
  }

  listContainers(options: any, cb: (err: Error, containers: DockerContainer[])=>void): void {
    if (this.checkForceError(cb)) {
      return;
    }
    let containers = options.all
      ? this.testContainerList
      : this.testContainerList.filter(container=> {
      return container.Status.substring(0, 2) === 'Up';
    });
    cb(null, containers);
  }

  getContainer(id: string, options: any = {}): ContainerObject {
    var containerArray = this.testContainerList.filter(container=> {
      return id === container.Id;
    });
    return containerArray.length
      ? new ContainerObjectImpl(null, containerArray[0].Id)
      : null;
  }

  getImage(id: string, options: any = {}): ImageObject {
    var imageArray = this.testImageList.filter(image=> {
      return id === image.Id;
    });
    return imageArray.length
      ? new ImageObjectImpl(null, imageArray[0].Id)
      : null;
  }

  buildImage(tarStream: any, options: any, cb: (err: Error, outputStream: any)=>void) {
  }

  createContainer(containerConfig: any, cb: (err: Error, container: DockerContainer)=>void): void {
  }

  pull(imageName: string, cb: (err: Error, outputStream: any)=>void) {
  }

  private get testImageList() {
    return jsonFile.readFileSync(__dirname + '/../../test-data/docker-image-list.json');
  }

  private get testContainerList() {
    return jsonFile.readFileSync(__dirname + '/../../test-data/docker-container-list.json');
  }
}

