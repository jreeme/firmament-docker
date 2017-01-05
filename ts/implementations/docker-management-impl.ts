import {injectable, inject} from 'inversify';
import {DockerOde} from '../interfaces/dockerode';
import {CommandUtil} from 'firmament-yargs';
import {DockerUtil} from '../interfaces/docker-util';
import {DockerManagement} from "../interfaces/docker-management";

@injectable()
export class DockerManagementImpl implements DockerManagement {
  constructor(@inject('DockerOde') public dockerode: DockerOde,
              @inject('DockerUtil') public dockerUtil: DockerUtil,
              @inject('CommandUtil') public commandUtil: CommandUtil) {
  }
}
