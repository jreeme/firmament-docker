import {DockerOde} from "./dockerode";
import {DockerUtil} from "./docker-util";
import {CommandUtil} from "firmament-yargs";
export interface DockerManagement {
  dockerode: DockerOde;
  dockerUtil: DockerUtil;
  commandUtil: CommandUtil;
}
