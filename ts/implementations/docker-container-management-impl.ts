import {injectable, inject} from "inversify";
import {DockerOde, DockerContainer, ImageOrContainer, ContainerRemoveResults} from "../interfaces/dockerode";
import {CommandUtil} from 'firmament-yargs';
import {DockerContainerManagement} from "../interfaces/docker-container-management";
import {DockerUtil} from "../interfaces/docker-util";
const deepExtend = require('deep-extend');
const positive = require('positive');

@injectable()
export class DockerContainerManagementImpl implements DockerContainerManagement {
  removeContainers(ids: string[], cb: (err: Error, containerRemoveResults: ContainerRemoveResults[])=>void) {
    let me = this;
    if (!ids.length) {
      console.log('Specify containers to remove by FirmamentId, Docker ID or Name. Or "all" to remove all.');
      return;
    }
    if (_.indexOf(ids, 'all') !== -1) {
      if (!positive("You're sure you want to remove all containers? [y/N] ", false)) {
        console.log('Operation canceled.');
        cb(null, null);
        return;
      }
      ids = null;
    }
    me.getContainers(ids, (err: Error, dockerContainer: any[])=> {
      me.commandUtil.logError(err);
      async.map(dockerContainer,
        (containerOrErrorMsg, cb)=> {
          if (typeof containerOrErrorMsg === 'string') {
            me.commandUtil.logAndCallback(containerOrErrorMsg, cb, null, {msg: containerOrErrorMsg});
          } else {
            containerOrErrorMsg.remove({force: 1}, (err: Error)=> {
              var msg = 'Removing container "' + containerOrErrorMsg.name + '"';
              me.commandUtil.logAndCallback(msg, cb, err, {msg: containerOrErrorMsg.name});
            });
          }
        }, cb);
    });
  }
  private dockerode:DockerOde;
  private dockerUtil:DockerUtil;
  private commandUtil:CommandUtil;

  constructor(
      @inject('DockerOde') _dockerode:DockerOde,
      @inject('DockerUtil') _dockerUtil:DockerUtil,
      @inject('CommandUtil') _commandUtil:CommandUtil
  ) {
    this.dockerode = _dockerode;
    this.dockerUtil = _dockerUtil;
    this.commandUtil = _commandUtil;
  }
  getContainers(ids: string[], cb: (err: Error, dockerContainers: DockerContainer[])=>void) {
    this.dockerUtil.getImagesOrContainers(ids, ImageOrContainer.Container, cb);
  }

  getContainer(id: string, cb: (err: Error, dockerContainer: DockerContainer)=>void) {
    this.dockerUtil.getImageOrContainer(id, ImageOrContainer.Container, cb);
  }

  listContainers(listAllContainers: boolean, cb: (err: Error, dockerContainers?: DockerContainer[])=>void) {
    this.dockerUtil.listImagesOrContainers(listAllContainers, ImageOrContainer.Container, cb);
  }

  createContainer(dockerContainerConfig: any, cb: (err: Error, dockerContainer: DockerContainer)=>void) {
    var fullContainerConfigCopy = {ExpressApps: []};
    deepExtend(fullContainerConfigCopy, dockerContainerConfig);
    this.dockerode.createContainer(fullContainerConfigCopy, (err: Error, dockerContainer: DockerContainer)=> {
      cb(err, dockerContainer);
    });
  }

  startOrStopContainers(ids: string[], start: boolean, cb: ()=>void) {
    let me = this;
    me.getContainers(ids, (err: Error, dockerContainer: any[])=> {
      me.commandUtil.logError(err);
      async.mapSeries(dockerContainer,
        (containerOrErrorMsg, cb)=> {
          if (typeof containerOrErrorMsg === 'string') {
            me.commandUtil.logAndCallback(containerOrErrorMsg, cb);
          } else {
            let resultMessage = 'Container "' + containerOrErrorMsg.name + '" ';
            resultMessage += start ? 'started.' : 'stopped.';
            let fnStartStop = start
              ? containerOrErrorMsg.start.bind(containerOrErrorMsg)
              : containerOrErrorMsg.stop.bind(containerOrErrorMsg);
            fnStartStop((err: Error)=> {
              me.commandUtil.logAndCallback(me.commandUtil.returnErrorStringOrMessage(err, resultMessage), cb);
            });
          }
        }, cb);
    });
  }
}
