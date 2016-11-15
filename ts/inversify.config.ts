import {Kernel} from 'inversify';
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
import {NestedYargs} from "firmament-yargs/js/interfaces/nested-yargs-wrapper";
import {MakeCommandImpl} from "./implementations/commands/make-command-impl";
import {DockerManagement} from "./interfaces/docker-management";
import {DockerManagementImpl} from "./implementations/docker-management-impl";
var commandUtil = yargsKernel.get<CommandUtil>('CommandUtil');
var nestedYargs = yargsKernel.get<NestedYargs>('NestedYargs');
var progressBar = yargsKernel.get<ProgressBar>('ProgressBar');
var commandLine = yargsKernel.get<CommandLine>('CommandLine');
var command = yargsKernel.get<Command>('Command');
var spawn = yargsKernel.get<Spawn>('Spawn');
var positive = yargsKernel.get<Positive>('Positive');

var kernel = new Kernel();
//TODO: Begin Super HACK -> v.3 of inversify will provide kernel merging but for 2.x we need
//TODO: a gruesome hack so our constructor injection will work with external types
kernel.bind<CommandUtil>('CommandUtil').to(<new (args:any)=>CommandUtil>commandUtil.constructor);
kernel.bind<NestedYargs>('NestedYargs').to(<new (args:any)=>NestedYargs>nestedYargs.constructor);
kernel.bind<ProgressBar>('ProgressBar').to(<new (args:any)=>ProgressBar>progressBar.constructor);
kernel.bind<CommandLine>('CommandLine').to(<new (args:any)=>CommandLine>commandLine.constructor);
//kernel.bind<Command>('Command').to(<new (args:any)=>Command>command.constructor);
kernel.bind<Positive>('Positive').to(<new (args:any)=>Positive>positive.constructor);
kernel.bind<Spawn>('Spawn').to(<new (args:any)=>Spawn>spawn.constructor);
//TODO: <- End Super HACK

kernel.bind<DockerManagement>('DockerManagement').to(DockerManagementImpl);
kernel.bind<DockerImageManagement>('DockerImageManagement').to(DockerImageManagementImpl);
kernel.bind<DockerContainerManagement>('DockerContainerManagement').to(DockerContainerManagementImpl);
kernel.bind<DockerOde>('DockerOde').to(DockerOdeImpl);
kernel.bind<DockerUtil>('DockerUtil').to(DockerUtilImpl);
//Export commands. Tag them so firmament shell can get tagged
/*kernel.bind<Command>('DockerCommand').to(DockerCommandImpl);
kernel.bind<Command>('MakeCommand').to(MakeCommandImpl);*/
kernel.bind<Command>('Command').to(DockerCommandImpl);
kernel.bind<Command>('Command').to(MakeCommandImpl);
export default kernel;
