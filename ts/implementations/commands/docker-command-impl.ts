import {injectable, inject} from "inversify";
import kernel from '../../inversify.config';
import {Command, CommandLine, CommandUtil, Spawn} from 'firmament-yargs';
import {DockerImage} from "../../interfaces/dockerode";
import {DockerImageManagement} from "../../interfaces/docker-image-management";
import {DockerContainerManagement} from "../../interfaces/docker-container-management";

@injectable()
export class DockerCommandImpl implements Command {
  aliases: string[] = [];
  command: string = '';
  commandDesc: string = '';
  //noinspection JSUnusedGlobalSymbols
  //noinspection JSUnusedLocalSymbols
  handler: (argv: any)=>void = (argv: any) => {
  };
  options: any = {};
  subCommands: Command[] = [];
  private commandUtil: CommandUtil;
  private dockerImageManagement: DockerImageManagement;
  private dockerContainerManagement: DockerContainerManagement;
  private commandLine: CommandLine;
  private spawn: Spawn;

  constructor(@inject('CommandUtil') _commandUtil: CommandUtil,
              @inject('Spawn') _spawn: Spawn,
              @inject('DockerImageManagement') _dockerImageManagement: DockerImageManagement,
              @inject('DockerContainerManagement') _dockerContainerManagement: DockerContainerManagement,
              @inject('CommandLine') _commandLine: CommandLine) {
    this.buildCommandTree();
    this.commandUtil = _commandUtil;
    this.spawn = _spawn;
    this.dockerContainerManagement = _dockerContainerManagement;
    this.dockerImageManagement = _dockerImageManagement;
    this.commandLine = _commandLine;
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
    let cleanVolumesCommand = kernel.get<Command>('CommandImpl');
    cleanVolumesCommand.aliases = ['clean-volumes', 'cv'];
    cleanVolumesCommand.commandDesc = 'Clean orphaned Docker resources';
    //noinspection JSUnusedLocalSymbols
    cleanVolumesCommand.handler = (argv) => {
      var script = require('path').resolve(__dirname, '../../bash/_docker-cleanup-volumes.sh');
      me.spawn.sudoSpawnAsync(['/bin/bash', script], {}, (err: Error) => {
        me.commandUtil.processExitWithError(err);
      });
    };
    me.subCommands.push(cleanVolumesCommand);
  }

  private pushRemoveImagesCommand() {
    let me = this;
    let removeCommand = kernel.get<Command>('CommandImpl');
    removeCommand.aliases = ['rmi'];
    removeCommand.commandDesc = 'Remove Docker images';
    removeCommand.handler = (argv) => {
      me.dockerImageManagement.removeImages(argv._.slice(2), (err: Error) => {
        me.commandUtil.processExitWithError(err);
      });
    };
    me.subCommands.push(removeCommand);
  }

  private pushRemoveContainersCommand() {
    let me = this;
    let removeCommand = kernel.get<Command>('CommandImpl');
    removeCommand.aliases = ['rm'];
    removeCommand.commandDesc = 'Remove Docker containers';
    removeCommand.handler = (argv) => {
      me.dockerContainerManagement.removeContainers(argv._.slice(2),
        (err: Error) => {
          me.commandUtil.processExitWithError(err);
        });
    };
    me.subCommands.push(removeCommand);
  }

  private pushShellCommand() {
    let me = this;
    let shellCommand = kernel.get<Command>('CommandImpl');
    shellCommand.aliases = ['sh'];
    shellCommand.commandDesc = 'Run bash shell in Docker container';
    shellCommand.handler = (argv) => {
      me.bashInToContainer(argv._.slice(2), (err: Error) => {
        me.commandUtil.processExitWithError(err);
      });
    };
    this.subCommands.push(shellCommand);
  }

  private pushStartCommand() {
    let me = this;
    let startCommand = kernel.get<Command>('CommandImpl');
    startCommand.aliases = ['start'];
    startCommand.commandDesc = 'Start Docker containers';
    startCommand.handler = (argv) => {
      me.dockerContainerManagement.startOrStopContainers(argv._.slice(2), true, () => me.commandUtil.processExit());
    };
    me.subCommands.push(startCommand);
  }

  private pushStopCommand() {
    let me = this;
    let stopCommand = kernel.get<Command>('CommandImpl');
    stopCommand.aliases = ['stop'];
    stopCommand.commandDesc = 'Stop Docker containers';
    stopCommand.handler = argv => {
      me.dockerContainerManagement.startOrStopContainers(argv._.slice(2), false, () => me.commandUtil.processExit());
    };
    me.subCommands.push(stopCommand);
  }

  private pushImagesCommand() {
    let me = this;
    let imagesCommand = kernel.get<Command>('CommandImpl');
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
    imagesCommand.handler = argv => me.printImagesList(argv, () => me.commandUtil.processExit());
    this.subCommands.push(imagesCommand);
  }

  private pushPsCommand() {
    let me = this;
    let psCommand = kernel.get<Command>('CommandImpl');
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
    psCommand.handler = argv => me.printContainerList(argv, () => me.commandUtil.processExit());
    this.subCommands.push(psCommand);
  }

  private printImagesList(argv: any, cb: ()=>void) {
    this.dockerImageManagement.listImages(argv.a, (err, images) => {
      this.prettyPrintDockerImagesList(err, images, cb);
    });
  }

  private printContainerList(argv: any, cb: ()=>void) {
    this.dockerContainerManagement.listContainers(argv.a, (err, containers) => {
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
    this.dockerContainerManagement.exec(ids[0].toString(), '/bin/bash', cb);
  }

  private prettyPrintDockerImagesList(err: Error, images: DockerImage[], cb: ()=>void) {
    let me = this;
    if (!images || !images.length) {
      let msg = me.commandUtil.returnErrorStringOrMessage(err, '\nNo images\n');
      console.log(msg);
    } else {
      var timeAgo = require('time-ago')();
      var fileSize = require('filesize');
      me.commandLine.printTable(images.map(image => {
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
      me.commandLine.printTable(containers.map(container => {
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

