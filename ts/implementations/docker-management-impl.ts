import {injectable, inject} from 'inversify';
import {DockerOde} from '../interfaces/dockerode';
import {CommandUtil} from 'firmament-yargs';
import {DockerUtil} from '../interfaces/docker-util';
import {DockerManagement} from "../interfaces/docker-management";

@injectable()
export class DockerManagementImpl implements DockerManagement {
  dockerode: DockerOde;
  dockerUtil: DockerUtil;
  commandUtil: CommandUtil;

  constructor(@inject('DockerOde') _dockerode: DockerOde,
              @inject('DockerUtil') _dockerUtil: DockerUtil,
              @inject('CommandUtil') _commandUtil: CommandUtil) {
    this.dockerode = _dockerode;
    this.dockerUtil = _dockerUtil;
    this.commandUtil = _commandUtil;
  }
}
