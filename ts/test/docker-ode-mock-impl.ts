import "reflect-metadata";
import {injectable, inject} from "inversify";
import {
  DockerOde, DockerImage, DockerContainer, ContainerObject, ImageObject
} from "../interfaces/dockerode";
const jsonFile = require('jsonfile');
@injectable()
export class DockerOdeMockImpl implements DockerOde {
  listImages(options: any, cb: (err: Error, images: DockerImage[])=>void): void {
    if (options.forceError) {
      cb(new Error('error forced'), []);
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
    if (options.forceError) {
      cb(new Error('error forced'), []);
      return;
    }
    let containers = options.all
      ? this.testContainerList
      : this.testContainerList.filter(container=> {
      return container.Status.substring(0, 2) === 'Up';
    });
    cb(null, containers);
  }

  getContainer(id: string): ContainerObject {
    var containerArray = this.testContainerList.filter(container=> {
      return id === container.Id;
    });
    return containerArray.length ? containerArray[0] : null;
  }

  getImage(id: string): ImageObject {
    var imageArray = this.testImageList.filter(image=> {
      return id === image.Id;
    });
    return imageArray.length ? imageArray[0] : null;
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

