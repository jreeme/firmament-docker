import "reflect-metadata";
import {injectable} from "inversify";
import {
  DockerOde, DockerImage, DockerContainer
} from "../interfaces/dockerode";
import {DockerImageImpl} from "./image-object-impl";
import {DockerContainerImpl} from "./container-object-impl";
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

  getContainer(id: string, options: any = {}): DockerContainer {
    var containerArray = this.testContainerList.filter(container=> {
      return id === container.Id;
    });
    return containerArray.length
      ? new DockerContainerImpl(null, containerArray[0].Id)
      : null;
  }

  getImage(id: string, options: any = {}): DockerImage {
    var imageArray = this.testImageList.filter(image=> {
      return id === image.Id;
    });
    return imageArray.length
      ? new DockerImageImpl(null, imageArray[0].Id)
      : null;
  }

  buildImage(tarStream: any, options: any, cb: (err: Error, outputStream: any)=>void) {
    this.pull('', cb);
  }

  createContainer(containerConfig: any, cb: (err: Error, container: DockerContainer)=>void): void {
    if (this.checkForceError(cb)) {
      return;
    }

    let testContainer = this.testContainerList.filter(container=> {
      return container.Image = 'mongo:2.6';
    })[0];

    cb(null, new DockerContainerImpl(null, testContainer.Id));
  }

  pull(imageName: string, cb: (err: Error, outputStream: any)=>void) {
    /*  Force error from the stream callback instead of here
     if (this.checkForceError(cb)) {
     return;
     }*/
    let me = this;
    let streamMock = new (require('events').EventEmitter)();
    let eventCount = 10;
    let interval = setInterval(()=> {
      if (me.forceError) {
        streamMock.emit('error', JSON.stringify({
          error: 'Big Error! Sorry.'
        }));
        clearInterval(interval);
      }
      if (!(eventCount % 2)) {
        streamMock.emit('data', JSON.stringify({
          id: 'baadf00d',
          status: 'Downloading',
          progressDetail: {
            current: eventCount,
            total: 10
          }
        }));
      }
      if (!(eventCount % 3)) {
        streamMock.emit('data', JSON.stringify({
          error: 'Big Error! Sorry.'
        }));
      }
      if (--eventCount < 0) {
        streamMock.emit('end', JSON.stringify({
          id: 'baadf00d',
          status: 'Finished',
          progressDetail: {
            current: 10,
            total: 10
          }
        }));
        clearInterval(interval);
      }
    }, 200);
    cb(null, streamMock);
  }

  private get testImageList() {
    return jsonFile.readFileSync(__dirname + '/../../test-data/docker-image-list.json');
  }

  private get testContainerList() {
    return jsonFile.readFileSync(__dirname + '/../../test-data/docker-container-list.json');
  }
}

