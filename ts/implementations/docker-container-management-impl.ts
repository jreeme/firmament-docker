import {injectable, inject} from 'inversify';
import {
  DockerContainer, ImageOrContainer, ImageOrContainerRemoveResults
} from '../interfaces/dockerode';
import {DockerUtilOptionsImpl} from './util/docker-util-options-impl';
import * as async from 'async';
import {DockerManagement} from '../interfaces/docker-management';
import {DockerContainerManagement} from '../interfaces/docker-container-management';
import {ForceErrorImpl} from 'firmament-yargs';
const childProcess = require('child_process');
const deepExtend = require('deep-extend');

@injectable()
export class DockerContainerManagementImpl extends ForceErrorImpl implements DockerContainerManagement {
  constructor(@inject('DockerManagement') private DM: DockerManagement) {
    super();
  }

  listContainers(listAllContainers: boolean, cb: (err: Error, dockerContainers?: DockerContainer[]) => void) {
    let dockerUtilOptions = new DockerUtilOptionsImpl(ImageOrContainer.Container, listAllContainers);
    this.DM.dockerUtil.forceError = this.forceError;
    this.DM.dockerUtil.listImagesOrContainers(dockerUtilOptions, cb);
  }

  getContainers(ids: string[], cb: (err: Error, dockerContainers: DockerContainer[]) => void) {
    let dockerUtilOptions = new DockerUtilOptionsImpl(ImageOrContainer.Container);
    this.DM.dockerUtil.forceError = this.forceError;
    this.DM.dockerUtil.getImagesOrContainers(ids, dockerUtilOptions, cb);
  }

  getContainer(id: string, cb: (err: Error, dockerContainer: DockerContainer) => void) {
    let dockerUtilOptions = new DockerUtilOptionsImpl(ImageOrContainer.Container);
    this.DM.dockerUtil.forceError = this.forceError;
    this.DM.dockerUtil.getImageOrContainer(id, dockerUtilOptions, cb);
  }

  removeContainers(ids: string[], cb: (err: Error, containerRemoveResults: ImageOrContainerRemoveResults[]) => void) {
    let dockerUtilOptions = new DockerUtilOptionsImpl(ImageOrContainer.Container);
    this.DM.dockerUtil.forceError = this.forceError;
    this.DM.dockerUtil.removeImagesOrContainers(ids, dockerUtilOptions, cb);
  }

  createContainer(dockerContainerConfig: any, cb: (err: Error, dockerContainer: DockerContainer) => void) {
    this.DM.dockerode.forceError = this.forceError;
    let fullContainerConfigCopy = {ExpressApps: []};
    deepExtend(fullContainerConfigCopy, dockerContainerConfig);
    this.DM.dockerode.createContainer(fullContainerConfigCopy, cb);
  }

  startOrStopContainers(ids: string[], start: boolean, cb: () => void) {
    let me = this;
    me.getContainers(ids, (err: Error, dockerContainersOrMessages: any[]) => {
      me.DM.commandUtil.logError(err);
      async.mapSeries(dockerContainersOrMessages,
        (dockerContainerOrMessage, cb) => {
          if (typeof dockerContainerOrMessage === 'string') {
            me.DM.commandUtil.logAndCallback(dockerContainerOrMessage, cb);
          } else {
            let dockerContainer: DockerContainer = <DockerContainer>dockerContainerOrMessage;
            let resultMessage = `Container '${dockerContainer.Name}' `;
            resultMessage += start ? 'started.' : 'stopped.';
            let fnStartStop = start
              ? dockerContainer.start.bind(dockerContainer)
              : dockerContainer.stop.bind(dockerContainer);
            fnStartStop((err: Error) => {
              me.DM.commandUtil.logAndCallback(me.DM.commandUtil.returnErrorStringOrMessage(err, resultMessage), cb);
            });
          }
        }, cb);
    });
  }

  exec(id: string, command: string, cb: (err: Error, result: any) => void): void {
    let me = this;
    me.getContainer(id, (err: Error, dockerContainer: DockerContainer) => {
      if (me.DM.commandUtil.callbackIfError(cb, err)) {
        return;
      }
      childProcess.spawnSync('docker', ['exec', '-it', dockerContainer.Name.slice(1), command], {
        stdio: 'inherit'
      });
      cb(null, 0);
    });
  }
}
