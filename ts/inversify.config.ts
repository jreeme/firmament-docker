import {Kernel} from 'inversify';
import {DockerImageManagement} from './interfaces/docker-image-management';
import {DockerImageManagementImpl} from './implementations/docker-image-management-impl';
import {DockerOde} from "./interfaces/dockerode";
import {DockerOdeImpl} from "./implementations/docker-ode-impl";
import {DockerUtil} from "./interfaces/docker-util";
import {DockerUtilImpl} from "./implementations/docker-util-impl";
import {DockerContainerManagement} from "./interfaces/docker-container-management";
import {DockerContainerManagementImpl} from "./implementations/docker-container-management-impl";
var kernel = new Kernel();
kernel.bind<DockerImageManagement>('DockerImageManagement').to(DockerImageManagementImpl);
kernel.bind<DockerContainerManagement>('DockerContainerManagement').to(DockerContainerManagementImpl);
kernel.bind<DockerOde>('DockerOde').to(DockerOdeImpl);
kernel.bind<DockerUtil>('DockerUtil').to(DockerUtilImpl);
export default kernel;
