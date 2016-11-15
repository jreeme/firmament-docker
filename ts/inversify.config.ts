import {Container, interfaces} from 'inversify';
import {DockerImageManagement} from './interfaces/docker-image-management';
import {DockerImageManagementImpl} from './implementations/docker-image-management-impl';
import {DockerOde} from "./interfaces/dockerode";
import {DockerOdeImpl} from "./implementations/util/docker-ode-impl";
import {DockerUtil} from "./interfaces/docker-util";
import {DockerUtilImpl} from "./implementations/util/docker-util-impl";
import {DockerContainerManagement} from "./interfaces/docker-container-management";
import {DockerContainerManagementImpl} from "./implementations/docker-container-management-impl";
import {kernel as yargsKernel, CommandUtil, Command, Positive, Spawn, CommandLine, ProgressBar} from 'firmament-yargs';
import {DockerCommandImpl} from "./implementations/commands/docker-command-impl";
//import {NestedYargs} from "firmament-yargs/js/interfaces/nested-yargs-wrapper";
import {MakeCommandImpl} from "./implementations/commands/make-command-impl";
import {DockerManagement} from "./interfaces/docker-management";
import {DockerManagementImpl} from "./implementations/docker-management-impl";
/*var commandUtil = yargsKernel.get<CommandUtil>('CommandUtil');
 var nestedYargs = yargsKernel.get<NestedYargs>('NestedYargs');
 var progressBar = yargsKernel.get<ProgressBar>('ProgressBar');
 var commandLine = yargsKernel.get<CommandLine>('CommandLine');
 var spawn = yargsKernel.get<Spawn>('Spawn');
 var positive = yargsKernel.get<Positive>('Positive');*/

var dockerKernel = new Container();
//TODO: Begin Super HACK -> v.3 of inversify will provide dockerKernel merging but for 2.x we need
//TODO: a gruesome hack so our constructor injection will work with external types
/*dockerKernel.bind<CommandUtil>('CommandUtil').to(<new (args:any)=>CommandUtil>commandUtil.constructor);
 dockerKernel.bind<NestedYargs>('NestedYargs').to(<new (args:any)=>NestedYargs>nestedYargs.constructor);
 dockerKernel.bind<ProgressBar>('ProgressBar').to(<new (args:any)=>ProgressBar>progressBar.constructor);
 dockerKernel.bind<CommandLine>('CommandLine').to(<new (args:any)=>CommandLine>commandLine.constructor);
 dockerKernel.bind<Positive>('Positive').to(<new (args:any)=>Positive>positive.constructor);
 dockerKernel.bind<Spawn>('Spawn').to(<new (args:any)=>Spawn>spawn.constructor);*/
//TODO: <- End Super HACK

dockerKernel.bind<DockerManagement>('DockerManagement').to(DockerManagementImpl);
dockerKernel.bind<DockerImageManagement>('DockerImageManagement').to(DockerImageManagementImpl);
dockerKernel.bind<DockerContainerManagement>('DockerContainerManagement').to(DockerContainerManagementImpl);
dockerKernel.bind<DockerOde>('DockerOde').to(DockerOdeImpl);
dockerKernel.bind<DockerUtil>('DockerUtil').to(DockerUtilImpl);
dockerKernel.bind<Command>('Command').to(DockerCommandImpl);
dockerKernel.bind<Command>('Command').to(MakeCommandImpl);
let kernel: interfaces.Container = Container.merge(dockerKernel, yargsKernel);
export default kernel;
