import {DockerUtilOptions} from "../interfaces/docker-util-options";
import {ImageOrContainer} from "../interfaces/dockerode";
export class DockerUtilOptionsImpl implements DockerUtilOptions {
  constructor(_IorC: ImageOrContainer, _listAll: boolean = false) {
    this.IorC = _IorC;
    this.listAll = _listAll;
  }

  IorC: ImageOrContainer = ImageOrContainer.Image;
  listAll: boolean = false;
}
