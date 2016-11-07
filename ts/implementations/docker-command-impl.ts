import {injectable, inject} from "inversify";
import kernel from '../inversify.config';
import {Command, CommandLine, CommandUtil, Spawn} from 'firmament-yargs';
import {FirmamentDocker} from "../interfaces/firmament-docker";
import {DockerImage} from "../interfaces/dockerode";
@injectable()
export class DockerCommandImpl implements Command {
  aliases: string[] = [];
  command: string = '';
  commandDesc: string = '';
  //noinspection JSUnusedGlobalSymbols
  //noinspection JSUnusedLocalSymbols
  handler: (argv: any)=>void = (argv:any)=>{};
  options: any = {};
  subCommands: Command[] = [];
  private firmamentDocker: FirmamentDocker;
  private commandUtil: CommandUtil;
  private commandLine: CommandLine;
  private spawn: Spawn;

  constructor(@inject('CommandUtil') _commandUtil: CommandUtil,
              @inject('Spawn') _spawn: Spawn,
              @inject('CommandLine') _commandLine: CommandLine,
              @inject('FirmamentDocker') _firmamentDocker: FirmamentDocker) {
    this.buildCommandTree();
    this.commandUtil = _commandUtil;
    this.commandLine = _commandLine;
    this.spawn = _spawn;
    this.firmamentDocker = _firmamentDocker;
  }

  private buildCommandTree() {
    this.aliases = ['docker', 'd'];
    this.command = '<subCommand>';
    this.commandDesc = 'Support for working with Docker containers';
    this.pushCleanVolumesCommand();
    this.pushImagesCommand();
    this.pushPsCommand();
    this.pushStartCommand();
    this.pushStopCommand();
    this.pushRemoveContainersCommand();
    this.pushRemoveImagesCommand();
    this.pushShellCommand();
  }

  private pushCleanVolumesCommand() {
    let me = this;
    let cleanVolumesCommand = kernel.get<Command>('Command');
    cleanVolumesCommand.aliases = ['clean-volumes', 'cv'];
    cleanVolumesCommand.commandDesc = 'Clean orphaned Docker resources';
    //noinspection JSUnusedLocalSymbols
    cleanVolumesCommand.handler = (argv)=> {
      var script = require('path').resolve(__dirname, '../../bash/_docker-cleanup-volumes.sh');
      me.spawn.sudoSpawn(['/bin/bash', script], (err: Error)=> {
        me.commandUtil.processExitWithError(err);
      });
    };
    me.subCommands.push(cleanVolumesCommand);
  }

  private pushRemoveImagesCommand() {
    let me = this;
    let removeCommand = kernel.get<Command>('Command');
    removeCommand.aliases = ['rmi'];
    removeCommand.commandDesc = 'Remove Docker images';
    removeCommand.handler = (argv)=> {
      me.firmamentDocker.removeImages(argv._.slice(2), (err: Error)=> {
        me.commandUtil.processExitWithError(err);
      });
    };
    me.subCommands.push(removeCommand);
  }

  private pushRemoveContainersCommand() {
    let me = this;
    let removeCommand = kernel.get<Command>('Command');
    removeCommand.aliases = ['rm'];
    removeCommand.commandDesc = 'Remove Docker containers';
    removeCommand.handler = (argv)=> {
      me.firmamentDocker.removeContainers(argv._.slice(2),
        (err: Error)=> {
          me.commandUtil.processExitWithError(err);
        });
    };
    me.subCommands.push(removeCommand);
  }

  private pushShellCommand() {
    let me = this;
    let shellCommand = kernel.get<Command>('Command');
    shellCommand.aliases = ['sh'];
    shellCommand.commandDesc = 'Run bash shell in Docker container';
    shellCommand.handler = (argv)=> {
      me.bashInToContainer(argv._.slice(2), (err: Error)=> {
        me.commandUtil.processExitWithError(err);
      });
    };
    this.subCommands.push(shellCommand);
  }

  private pushStartCommand() {
    let me = this;
    let startCommand = kernel.get<Command>('Command');
    startCommand.aliases = ['start'];
    startCommand.commandDesc = 'Start Docker containers';
    startCommand.handler = (argv)=> {
      me.firmamentDocker.startOrStopContainers(argv._.slice(2), true, ()=>me.commandUtil.processExit());
    };
    me.subCommands.push(startCommand);
  }

  private pushStopCommand() {
    let me = this;
    let stopCommand = kernel.get<Command>('Command');
    stopCommand.aliases = ['stop'];
    stopCommand.commandDesc = 'Stop Docker containers';
    stopCommand.handler = argv=> {
      me.firmamentDocker.startOrStopContainers(argv._.slice(2), false, ()=>me.commandUtil.processExit());
    };
    me.subCommands.push(stopCommand);
  }

  private pushImagesCommand() {
    let me = this;
    let imagesCommand = kernel.get<Command>('Command');
    imagesCommand.aliases = ['images'];
    imagesCommand.commandDesc = 'List Docker images';
    //noinspection ReservedWordAsName
    imagesCommand.options = {
      all: {
        alias: 'a',
        boolean: true,
        default: false,
        desc: 'Show intermediate images also'
      }
    };
    imagesCommand.handler = argv=> me.printImagesList(argv, ()=>me.commandUtil.processExit());
    this.subCommands.push(imagesCommand);
  }

  private pushPsCommand() {
    let me = this;
    let psCommand = kernel.get<Command>('Command');
    psCommand.aliases = ['ps'];
    psCommand.commandDesc = 'List Docker containers';
    //noinspection ReservedWordAsName
    psCommand.options = {
      all: {
        alias: 'a',
        boolean: true,
        default: false,
        desc: 'Show non-running containers also'
      }
    };
    psCommand.handler = argv=> me.printContainerList(argv, ()=>me.commandUtil.processExit());
    this.subCommands.push(psCommand);
  }

  private printImagesList(argv: any, cb: ()=>void) {
    this.firmamentDocker.listImages(argv.a, (err, images)=> {
      this.prettyPrintDockerImagesList(err, images, cb);
    });
  }

  private printContainerList(argv: any, cb: ()=>void) {
    this.firmamentDocker.listContainers(argv.a, (err, containers)=> {
      this.prettyPrintDockerContainerList(err, containers, argv.a, cb);
    });
  }

  private bashInToContainer(ids: string[], cb: (err: Error)=>void) {
    if (ids.length !== 1) {
      let msg = '\nSpecify container to shell into by FirmamentId, Docker ID or Name.\n';
      msg += '\nExample: $ ... d sh 2  <= Open bash shell in container with FirmamentId "2"\n';
      cb(new Error(msg));
      return;
    }
    this.firmamentDocker.exec(ids[0].toString(), '/bin/bash', cb);
  }

  private prettyPrintDockerImagesList(err: Error, images: DockerImage[], cb: ()=>void) {
    let me = this;
    if (!images || !images.length) {
      let msg = me.commandUtil.returnErrorStringOrMessage(err, '\nNo images\n');
      console.log(msg);
    } else {
      var timeAgo = require('time-ago')();
      var fileSize = require('filesize');
      me.commandLine.printTable(images.map(image=> {
        try {
          var ID = image.firmamentId;
          var repoTags = image.RepoTags[0].split(':');
          var Repository = repoTags[0];
          var Tag = repoTags[1];
          var ImageId = image.Id.substring(7, 19);
          var nowTicks = +new Date();
          var tickDiff = nowTicks - (1000 * image.Created);
          var Created = timeAgo.ago(nowTicks - tickDiff);
          var Size = fileSize(image.Size);
        } catch (err) {
          console.log(err.message);
        }
        return {ID, Repository, Tag, ImageId, Created, Size};
      }));
    }
    cb();
  }

  private prettyPrintDockerContainerList(err: Error, containers: any[], all: boolean, cb: ()=>void) {
    let me = this;
    if (!containers || !containers.length) {
      let msg = me.commandUtil.returnErrorStringOrMessage(err, '\nNo ' + (all ? '' : 'Running ') + 'Containers\n');
      console.log(msg);
    } else {
      me.commandLine.printTable(containers.map(container=> {
        return {
          ID: container.firmamentId,
          Name: container.Names[0],
          Image: container.Image,
          DockerId: container.Id.substring(0, 11),
          Status: container.Status
        };
      }));
    }
    cb();
  }
}

