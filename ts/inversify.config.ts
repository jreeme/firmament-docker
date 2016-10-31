import {Kernel} from 'inversify';
import {DockerImageManagement} from './interfaces/docker-image-management';
import {DockerImageManagementImpl} from './implementations/docker-image-management-impl';
import {DockerOde} from "./interfaces/dockerode";
import {DockerOdeImpl} from "./implementations/docker-ode-impl";
import {DockerUtil} from "./interfaces/docker-util";
import {DockerUtilImpl} from "./implementations/docker-util-impl";
import {DockerContainerManagement} from "./interfaces/docker-container-management";
import {DockerContainerManagementImpl} from "./implementations/docker-container-management-impl";
import {kernel as yargsKernel, CommandUtil} from 'firmament-yargs';
var commandUtil = yargsKernel.get<CommandUtil>('CommandUtil');

var kernel = new Kernel();
//TODO: Begin Super HACK -> v.3 of inversify will provide kernel merging but for 2.x we need
//TODO: a gruesome hack so our constructor injection will work with external types
kernel.bind<CommandUtil>('CommandUtil').to(<new (args:any)=>CommandUtil>commandUtil.constructor);
//TODO: <- End Super HACK

kernel.bind<DockerImageManagement>('DockerImageManagement').to(DockerImageManagementImpl);
kernel.bind<DockerContainerManagement>('DockerContainerManagement').to(DockerContainerManagementImpl);
kernel.bind<DockerOde>('DockerOde').to(DockerOdeImpl);
kernel.bind<DockerUtil>('DockerUtil').to(DockerUtilImpl);
export default kernel;
