import {injectable, inject} from 'inversify';
import {
  DockerOde, DockerContainer, ImageOrContainer, ContainerRemoveResults
} from '../interfaces/dockerode';
import {CommandUtil} from 'firmament-yargs';
import {DockerContainerManagement} from '../interfaces/docker-container-management';
import {DockerUtil} from '../interfaces/docker-util';
import {DockerUtilOptionsImpl} from './docker-util-options-impl';
import {ForceErrorImpl} from './force-error-impl';
import * as _ from 'lodash';
import * as async from 'async';
const deepExtend = require('deep-extend');
const positive = require('positive');

@injectable()
export class DockerContainerManagementImpl extends ForceErrorImpl implements DockerContainerManagement {
  private dockerode: DockerOde;
  private dockerUtil: DockerUtil;
  private commandUtil: CommandUtil;

  constructor(@inject('DockerOde') _dockerode: DockerOde,
              @inject('DockerUtil') _dockerUtil: DockerUtil,
              @inject('CommandUtil') _commandUtil: CommandUtil) {
    super();
    this.dockerode = _dockerode;
    this.dockerUtil = _dockerUtil;
    this.commandUtil = _commandUtil;
  }

  listContainers(listAllContainers: boolean, cb: (err: Error, dockerContainers?: DockerContainer[])=>void) {
    let dockerUtilOptions = new DockerUtilOptionsImpl(ImageOrContainer.Container, listAllContainers);
    this.dockerUtil.forceError = this.forceError;
    this.dockerUtil.listImagesOrContainers(dockerUtilOptions, cb);
  }

  getContainers(ids: string[], cb: (err: Error, dockerContainers: DockerContainer[])=>void) {
    let dockerUtilOptions = new DockerUtilOptionsImpl(ImageOrContainer.Container);
    this.dockerUtil.forceError = this.forceError;
    this.dockerUtil.getImagesOrContainers(ids, dockerUtilOptions, cb);
  }

  getContainer(id: string, cb: (err: Error, dockerContainer: DockerContainer)=>void) {
    let dockerUtilOptions = new DockerUtilOptionsImpl(ImageOrContainer.Container);
    this.dockerUtil.forceError = this.forceError;
    this.dockerUtil.getImageOrContainer(id, dockerUtilOptions, cb);
  }

  createContainer(dockerContainerConfig: any, cb: (err: Error, dockerContainer: DockerContainer)=>void) {
    this.dockerode.forceError = this.forceError;
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
            let resultMessage = `Container '${containerOrErrorMsg.name}' `;
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

  removeContainers(ids: string[], cb: (err: Error, containerRemoveResults: ContainerRemoveResults[])=>void) {
    let me = this;
    if (!ids.length) {
      console.log(`Specify containers to remove by FirmamentId, Docker ID or Name. Or 'all' to remove all.`);
      return;
    }
    if (_.indexOf(ids, 'all') !== -1) {
      try {
        if (!positive(`You're sure you want to remove all containers? [y/N] `, false)) {
          console.log('Operation canceled.');
          cb(null, null);
          return;
        }
      } catch (err) {
        console.log(err.message);
      }
      ids = null;
    }
    me.getContainers(ids, (err: Error, containerObjects: DockerContainer[])=> {
      if (me.commandUtil.callbackIfError(cb, err)) {
        return;
      }
      async.map(containerObjects,
        (containerOrErrorMsg, cb)=> {
          if (typeof containerOrErrorMsg === 'string') {
            me.commandUtil.logAndCallback(containerOrErrorMsg, cb, null, {msg: containerOrErrorMsg});
          } else {
            containerOrErrorMsg.remove({force: 1}, (err: Error)=> {
              var msg = `Removing container '${containerOrErrorMsg.Name}'`;
              me.commandUtil.logAndCallback(msg, cb, err, {msg});
            });
          }
        }, cb);
    });
  }

}
