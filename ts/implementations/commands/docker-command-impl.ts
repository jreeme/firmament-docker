import {injectable, inject} from 'inversify';
import kernel from '../../inversify.config';
import {Command, CommandLine, CommandUtil, Spawn} from 'firmament-yargs';
import {DockerImage} from '../..';
import {DockerImageManagement} from '../../interfaces/docker-image-management';
import {DockerContainerManagement} from '../../interfaces/docker-container-management';
import * as _ from 'lodash';
import {DockerMake} from '../../interfaces/docker-make';
import {MakeCommandImpl} from './make-command-impl';

@injectable()
export class DockerCommandImpl implements Command {
  aliases: string[] = [];
  command: string = '';
  commandDesc: string = '';
  handler: (argv: any) => void = () => {
  };
  options: any = {};
  subCommands: Command[] = [];

  constructor(@inject('CommandUtil') private commandUtil: CommandUtil,
              @inject('Spawn') private spawn: Spawn,
              @inject('DockerMake') private dockerMake: DockerMake,
              @inject('DockerImageManagement') private dockerImageManagement: DockerImageManagement,
              @inject('DockerContainerManagement') private dockerContainerManagement: DockerContainerManagement,
              @inject('CommandLine') private commandLine: CommandLine) {
    this.buildCommandTree();
  }

  private buildCommandTree() {
    this.aliases = ['docker', 'd'];
    this.command = '<subCommand>';
    this.commandDesc = 'Support for working with Docker containers';
    this.pushLoadImagesCommand();
    this.pushSaveImagesCommand();
    this.pushCleanVolumesCommand();
    this.pushImagesCommand();
    this.pushPsCommand();
    this.pushStartCommand();
    this.pushStopCommand();
    this.pushRemoveContainersCommand();
    this.pushRemoveImagesCommand();
    this.pushShellCommand();
  }

  private pushSaveImagesCommand() {
    const me = this;
    const saveImagesCommand = kernel.get<Command>('CommandImpl');
    saveImagesCommand.aliases = ['save'];
    saveImagesCommand.commandDesc = 'Save local docker images to tar file';
    saveImagesCommand.options = {
      regexp: {
        alias: 'r',
        type: 'string',
        default: '.*',
        desc: 'javascript regular expression text to match docker images'
      },
      outdir: {
        alias: 'o',
        type: 'string',
        default: process.cwd(),
        desc: 'directory to write image tar files to'
      }
    };
    saveImagesCommand.handler = (argv) => {
      me.dockerImageManagement.saveImages(argv.regexp, argv.outdir, (err: Error) => {
        me.commandUtil.processExitWithError(err);
      });
    };
    me.subCommands.push(saveImagesCommand);
  }

  private pushLoadImagesCommand() {
    const me = this;
    const loadImagesCommand = kernel.get<Command>('CommandImpl');
    loadImagesCommand.aliases = ['load'];
    loadImagesCommand.commandDesc = 'Load docker images locally from tar file';
    loadImagesCommand.options = {
      regexp: {
        alias: 'r',
        type: 'string',
        default: '.*',
        desc: 'javascript regular expression text to match tar files'
      },
      indir: {
        alias: 'i',
        type: 'string',
        default: process.cwd(),
        desc: 'directory containing the docker tar files'
      }
    };
    loadImagesCommand.handler = (argv) => {
      me.dockerImageManagement.loadImages(argv.regexp, argv.indir, (err: Error) => {
        me.commandUtil.processExitWithError(err);
      });
    };
    me.subCommands.push(loadImagesCommand);
  }

  private pushCleanVolumesCommand() {
    const me = this;
    const cleanVolumesCommand = kernel.get<Command>('CommandImpl');
    cleanVolumesCommand.aliases = ['clean-volumes', 'cv'];
    cleanVolumesCommand.commandDesc = 'Clean orphaned Docker resources';
    //noinspection JSUnusedLocalSymbols
    cleanVolumesCommand.handler = (argv) => {
      const script = require('path').resolve(__dirname, '../../../bash/_docker-cleanup-volumes.sh');
      me.spawn.sudoSpawnAsync(['/bin/bash', script], {}, (err) => {
      }, (err) => {
        me.commandUtil.processExitWithError(err);
      });
    };
    me.subCommands.push(cleanVolumesCommand);
  }

  private pushRemoveImagesCommand() {
    const me = this;
    const removeCommand = kernel.get<Command>('CommandImpl');
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
    const me = this;
    const removeCommand = kernel.get<Command>('CommandImpl');
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
    const me = this;
    const shellCommand = kernel.get<Command>('CommandImpl');
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
    const me = this;
    const startCommand = kernel.get<Command>('CommandImpl');
    startCommand.aliases = ['start'];
    startCommand.commandDesc = 'Start Docker containers';
    startCommand.options = {
      input: {
        alias: 'i',
        type: 'string',
        desc: 'Firmament JSON file describing the containers to start (in correct order)'
      }
    };
    startCommand.handler = me.startOrStopContainers.bind(me);
    me.subCommands.push(startCommand);
  }

  private startOrStopContainers(argv) {
    const me = this;
    let action = 'Stopping';
    let start = false;

    if(argv._[1] === 'start') {
      action = 'Starting';
      start = true;
    }

    let containerNames: string[];
    if(argv.input === undefined) {
      containerNames = argv._.slice(2);
    } else {
      const {fullInputPath, sortedContainerConfigs} =
        me.dockerMake.getSortedContainerConfigsFromJsonFile(argv.input || MakeCommandImpl.defaultConfigFilename);
      me.commandUtil.log(`${action} Docker containers described in: '${fullInputPath}'`);
      containerNames = <string[]>_.map(start ? sortedContainerConfigs : sortedContainerConfigs.reverse(), 'name');
    }
    me.dockerContainerManagement.startOrStopContainers(containerNames, start, () => me.commandUtil.processExit());
  }

  private pushStopCommand() {
    const me = this;
    const stopCommand = kernel.get<Command>('CommandImpl');
    stopCommand.aliases = ['stop'];
    stopCommand.commandDesc = 'Stop Docker containers';
    stopCommand.options = {
      input: {
        alias: 'i',
        type: 'string',
        desc: 'Firmament JSON file describing the containers to start (in correct order)'
      }
    };
    stopCommand.handler = me.startOrStopContainers.bind(me);
    me.subCommands.push(stopCommand);
  }

  private pushImagesCommand() {
    const me = this;
    const imagesCommand = kernel.get<Command>('CommandImpl');
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
    const me = this;
    const psCommand = kernel.get<Command>('CommandImpl');
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

  private printImagesList(argv: any, cb: () => void) {
    this.dockerImageManagement.listImages(argv.a, (err, images) => {
      this.prettyPrintDockerImagesList(err, images, cb);
    });
  }

  private printContainerList(argv: any, cb: () => void) {
    this.dockerContainerManagement.listContainers(argv.a, (err, containers) => {
      this.prettyPrintDockerContainerList(err, containers, argv.a, cb);
    });
  }

  private bashInToContainer(ids: string[], cb: (err: Error) => void) {
    if(ids.length !== 1) {
      let msg = '\nSpecify container to shell into by FirmamentId, Docker ID or Name.\n';
      msg += '\nExample: $ ... d sh 2  <= Open bash shell in container with FirmamentId "2"\n';
      cb(new Error(msg));
      return;
    }
    this.dockerContainerManagement.exec(ids[0].toString(), '/bin/bash', cb);
  }

  private prettyPrintDockerImagesList(err: Error, images: DockerImage[], cb: () => void) {
    const me = this;
    if(!images || !images.length) {
      const msg = me.commandUtil.returnErrorStringOrMessage(err, '\nNo images\n');
      console.log(msg);
    } else {
      const timeAgo = require('time-ago')();
      const fileSize = require('filesize');
      me.commandLine.printTable(images.map(image => {
        try {
          const ID = image.firmamentId;
          const repoTags = image.RepoTags[0].split(':');
          const Repository = repoTags[0];
          const Tag = repoTags[1];
          const ImageId = image.Id.substring(7, 19);
          const nowTicks = +new Date();
          const tickDiff = nowTicks - (1000 * image.Created);
          const Created = timeAgo.ago(nowTicks - tickDiff);
          const Size = fileSize(image.Size);
          return {ID, Repository, Tag, ImageId, Created, Size};
        } catch(err) {
          console.log(err.message);
          return {};
        }
      }));
    }
    cb();
  }

  private prettyPrintDockerContainerList(err: Error, containers: any[], all: boolean, cb: () => void) {
    const me = this;
    if(!containers || !containers.length) {
      const msg = me.commandUtil.returnErrorStringOrMessage(err, '\nNo ' + (all ? '' : 'Running ') + 'Containers\n');
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

