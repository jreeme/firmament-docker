import {injectable, inject} from "inversify";
import {FirmamentDocker} from '../interfaces/firmament-docker';
import {Command, CommandUtil} from 'firmament-yargs';
import {
  DockerImage,
  DockerOde,
  DockerContainer,
  ContainerRemoveResults,
  ImageRemoveResults
} from '../interfaces/dockerode';
import {DockerImageManagement} from "../interfaces/docker-image-management";
import {DockerContainerManagement} from "../interfaces/docker-container-management";
const positive = require('positive');
const childProcess = require('child_process');
@injectable()
export class FirmamentDockerImpl implements Command, FirmamentDocker {
  aliases: string[];
  command: string;
  commandDesc: string;
  handler: (argv: any)=>void;
  options: any;
  subCommands: Command[];
  private dockerode: DockerOde;
  private dockerContainerManagement: DockerContainerManagement;
  private dockerImageManagement: DockerImageManagement;
  private commandUtil: CommandUtil;

  constructor(@inject('DockerContainerManagement') _dockerContainerManagement: DockerContainerManagement,
              @inject('DockerImageManagement') _dockerImageManagement: DockerImageManagement,
              @inject('DockerOde') _dockerode: DockerOde,
              @inject('CommandUtil') _commandUtil: CommandUtil) {
    this.dockerContainerManagement = _dockerContainerManagement;
    this.dockerImageManagement = _dockerImageManagement;
    this.dockerode = _dockerode;
    this.commandUtil = _commandUtil;
    this.aliases = [];
    this.command = '';
    this.commandDesc = '';
    //noinspection JSUnusedLocalSymbols
    this.handler = (argv: any)=> {
    };
    this.options = {};
    this.subCommands = [];
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

  listContainers(listAllContainers: boolean, cb: (err: Error, dockerContainers?: DockerContainer[])=>void) {
    this.dockerContainerManagement.listContainers(listAllContainers, cb);
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
      childProcess.spawnSync('docker', ['exec', '-it', dockerContainer.name.slice(1), command], {
        stdio: 'inherit'
      });
      cb(null, 0);
    });
  }
}
