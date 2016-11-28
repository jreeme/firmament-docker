import {DockerImageManagement} from './interfaces/docker-image-management';
import {DockerImageManagementImpl} from './implementations/docker-image-management-impl';
import {DockerOde} from "./interfaces/dockerode";
import {DockerOdeImpl} from "./implementations/util/docker-ode-impl";
import {DockerUtil} from "./interfaces/docker-util";
import {DockerUtilImpl} from "./implementations/util/docker-util-impl";
import {DockerContainerManagement} from "./interfaces/docker-container-management";
import {DockerContainerManagementImpl} from "./implementations/docker-container-management-impl";
import {kernel, Command} from 'firmament-yargs';
import {DockerCommandImpl} from "./implementations/commands/docker-command-impl";
import {MakeCommandImpl} from "./implementations/commands/make-command-impl";
import {DockerManagement} from "./interfaces/docker-management";
import {DockerManagementImpl} from "./implementations/docker-management-impl";
import {DockerMakeImpl} from "./implementations/docker-make-impl";
import {DockerMake} from "./interfaces/docker-make";

kernel.bind<DockerManagement>('DockerManagement').to(DockerManagementImpl);
kernel.bind<DockerMake>('DockerMake').to(DockerMakeImpl);
kernel.bind<DockerImageManagement>('DockerImageManagement').to(DockerImageManagementImpl);
kernel.bind<DockerContainerManagement>('DockerContainerManagement').to(DockerContainerManagementImpl);
kernel.bind<DockerOde>('DockerOde').to(DockerOdeImpl);
kernel.bind<DockerUtil>('DockerUtil').to(DockerUtilImpl);
kernel.bind<Command>('Command').to(DockerCommandImpl);
kernel.bind<Command>('Command').to(MakeCommandImpl);

export default kernel;
