import {injectable, inject} from "inversify";
import {FirmamentDocker} from '../interfaces/firmament-docker';
import {CommandUtil} from 'firmament-yargs';
import {
  DockerImage,
  DockerContainer,
  ContainerRemoveResults,
  ImageRemoveResults
} from '../interfaces/dockerode';
import {DockerImageManagement} from "../interfaces/docker-image-management";
import {DockerContainerManagement} from "../interfaces/docker-container-management";
import {ForceErrorImpl} from "./force-error-impl";
const positive = require('positive');
const childProcess = require('child_process');
@injectable()
export class FirmamentDockerImpl extends ForceErrorImpl implements FirmamentDocker {
  private dockerContainerManagement: DockerContainerManagement;
  private dockerImageManagement: DockerImageManagement;
  private commandUtil: CommandUtil;

  constructor(@inject('DockerContainerManagement') _dockerContainerManagement: DockerContainerManagement,
              @inject('DockerImageManagement') _dockerImageManagement: DockerImageManagement,
              @inject('CommandUtil') _commandUtil: CommandUtil) {
    super();
    this.dockerContainerManagement = _dockerContainerManagement;
    this.dockerImageManagement = _dockerImageManagement;
    this.commandUtil = _commandUtil;
  }

  listContainers(listAllContainers: boolean, cb: (err: Error, dockerContainers?: DockerContainer[])=>void) {
    this.dockerContainerManagement.forceError = this.forceError;
    this.dockerContainerManagement.listContainers(listAllContainers, cb);
  }

  createContainer(dockerContainerConfig: any, cb: (err: Error, dockerContainer: DockerContainer)=>void) {
    this.dockerContainerManagement.createContainer(dockerContainerConfig, cb);
  }

  removeImages(ids: string[], cb: (err: Error, imageRemoveResults: ImageRemoveResults[])=>void): void {
    this.dockerImageManagement.removeImages(ids, cb);
  }

  removeContainers(ids: string[], cb: (err: Error, containerRemoveResults: ContainerRemoveResults[])=>void): void {
    this.dockerContainerManagement.removeContainers(ids, cb);
  }

  startOrStopContainers(ids: string[], start: boolean, cb: ()=>void): void {
    this.dockerContainerManagement.startOrStopContainers(ids, start, cb);
  }

  listImages(listAllImages: boolean, cb: (err: Error, images: DockerImage[])=>void) {
    this.dockerImageManagement.listImages(listAllImages, cb);
  }

  getImages(ids: string[], cb: (err: Error, images: DockerImage[])=>void): void {
    this.dockerImageManagement.getImages(ids, cb);
  }

  getImage(id: string, cb: (err: Error, image: DockerImage)=>void) {
    this.dockerImageManagement.getImage(id, cb);
  }

  getContainers(ids: string[], cb: (err: Error, dockerContainers: DockerContainer[])=>void): void {
    this.dockerContainerManagement.getContainers(ids, cb);
  }

  getContainer(id: string, cb: (err: Error, dockerContainer: DockerContainer)=>void) {
    this.dockerContainerManagement.getContainer(id, cb);
  }

  buildDockerFile(dockerFilePath: string, dockerImageName: string,
                  progressCb: (taskId: string, status: string, current: number, total: number)=>void,
                  cb: (err: Error)=>void): void {
    this.dockerImageManagement.buildDockerFile(dockerFilePath, dockerImageName, progressCb, cb);
  }

  pullImage(imageName: string,
            progressCb: (taskId: string, status: string, current: number, total: number)=>void,
            cb: (err: Error)=>void) {
    this.dockerImageManagement.pullImage(imageName, progressCb, cb);
  }

  exec(id: string, command: string, cb: (err: Error, result: any)=>void): void {
    let me = this;
    me.getContainer(id, (err: Error, dockerContainer: DockerContainer)=> {
      if (me.commandUtil.callbackIfError(cb, err)) {
        return;
      }
      childProcess.spawnSync('docker', ['exec', '-it', dockerContainer.Name.slice(1), command], {
        stdio: 'inherit'
      });
      cb(null, 0);
    });
  }
}
