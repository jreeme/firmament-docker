import {injectable, inject} from "inversify";
import kernel from '../../inversify.config';
import {Command} from 'firmament-yargs';
import {DockerMake} from "../../interfaces/docker-make";

const fs = require('fs');

@injectable()
export class MakeCommandImpl implements Command {
  aliases: string[] = [];
  command: string = '';
  commandDesc: string = '';
  //noinspection JSUnusedGlobalSymbols
  //noinspection JSUnusedLocalSymbols
  handler: (argv: any)=>void = (argv: any) => {
  };
  options: any = {};
  subCommands: Command[] = [];
  static defaultConfigFilename = 'firmament.json';
  private dockerMake: DockerMake;

  constructor(@inject('DockerMake') _dockerMake: DockerMake) {
    this.dockerMake = _dockerMake;
    this.buildCommandTree();
  }

  private buildCommandTree() {
    this.aliases = ['make', 'm'];
    this.command = '<subCommand>';
    this.commandDesc = 'Support for building Docker container clusters';
    this.pushBuildCommand();
    this.pushTemplateCommand();
  };

  private pushTemplateCommand() {
    let templateCommand = kernel.get<Command>('CommandImpl');
    templateCommand.aliases = ['template', 't'];
    templateCommand.commandDesc = 'Create a template JSON spec for a container cluster';
    //noinspection ReservedWordAsName
    templateCommand.options = {
      get: {
        alias: 'g',
        type: 'string',
        desc: '.. get [templateName]. If no templateName is specified then lists available templates'
      },
      output: {
        alias: 'o',
        default: MakeCommandImpl.defaultConfigFilename,
        type: 'string',
        desc: 'Name the output JSON file'
      },
      full: {
        alias: 'f',
        type: 'boolean',
        default: false,
        desc: 'Create a full JSON template with all Docker options set to reasonable defaults'
      }
    };
    templateCommand.handler = this.dockerMake.makeTemplate;
    this.subCommands.push(templateCommand);
  };

  private pushBuildCommand() {
    let buildCommand = kernel.get<Command>('CommandImpl');
    buildCommand.aliases = ['build', 'b'];
    buildCommand.commandDesc = 'Build Docker containers based on JSON spec';
    //noinspection ReservedWordAsName
    buildCommand.options = {
      input: {
        alias: 'i',
        default: MakeCommandImpl.defaultConfigFilename,
        type: 'string',
        desc: 'Name the config JSON file'
      }
    };
    buildCommand.handler = this.dockerMake.buildTemplate;
    this.subCommands.push(buildCommand);
  };
}

