import {injectable, inject} from 'inversify';
import kernel from '../../inversify.config';
import * as path from 'path';
import {Command} from 'firmament-yargs';
import {DockerProvision} from '../../interfaces/docker-provision';

@injectable()
export class ProvisionCommandImpl implements Command {
  aliases: string[] = [];
  command: string = '';
  commandDesc: string = '';
  handler: (argv: any) => void = (/*argv: any*/) => {
  };
  options: any = {};
  subCommands: Command[] = [];
  static defaultConfigFilename = 'docker-provision.json';
  static defaultComposeYamlFilename = path.resolve(__dirname, '../../../docker/merlin.yml');

  constructor(@inject('DockerProvision') private dockerProvision: DockerProvision) {
    this.buildCommandTree();
  }

  private buildCommandTree() {
    this.aliases = ['provision', 'p'];
    this.command = '<subCommand>';
    this.commandDesc = 'Support for provisioning docker swarms & stacks';
    this.pushBuildCommand();
    this.pushTemplateCommand();
    this.pushExtractYamlCommand();
  };

  private pushTemplateCommand() {
    let templateCommand = kernel.get<Command>('CommandImpl');
    templateCommand.aliases = ['template', 't'];
    templateCommand.commandDesc = 'Create a template JSON spec for creating docker stack/swarm';
    templateCommand.options = {
      dockermachine: {
        alias: 'dm',
        type: 'string',
        default: 'virtualbox',
        desc: `docker-machine host type ['virtualbox','openstack','vmwarevsphere','amazonec2']`,
      },
      get: {
        alias: 'g',
        type: 'string',
        desc: '.. get [templateName]. If no templateName is specified then lists available templates'
      },
      yaml: {
        alias: 'y',
        type: 'string',
        desc: 'Name of the input docker-compose YAML file to embed in template'
      },
      output: {
        alias: 'o',
        default: ProvisionCommandImpl.defaultConfigFilename,
        type: 'string',
        desc: 'Name of the output JSON file'
      }
    };
    templateCommand.handler = this.dockerProvision.makeTemplate.bind(this.dockerProvision);
    this.subCommands.push(templateCommand);
  };

  private pushBuildCommand() {
    let buildCommand = kernel.get<Command>('CommandImpl');
    buildCommand.aliases = ['build', 'b'];
    buildCommand.commandDesc = 'Build Docker Stack based on JSON spec';
    buildCommand.options = {
      username: {
        alias: 'u',
        type: 'string',
        desc: 'username for Docker Machine host'
      },
      password: {
        alias: 'p',
        type: 'string',
        desc: 'password for Docker Machine host'
      },
      input: {
        alias: 'i',
        default: ProvisionCommandImpl.defaultConfigFilename,
        type: 'string',
        desc: 'Name the config JSON file'
      },
      noPorts: {
        alias: 'np',
        default: false,
        type: 'boolean',
        desc: 'Suppress port publish blocks in compose files (to support Traefik autoconfig)'
      },
      noNfs: {
        alias: 'nn',
        default: false,
        type: 'boolean',
        desc: 'Suppress NFS server exports check and create'
      }
    };
    buildCommand.handler = this.dockerProvision.buildTemplate.bind(this.dockerProvision);
    this.subCommands.push(buildCommand);
  };

  private pushExtractYamlCommand() {
    let extractYamlCommand = kernel.get<Command>('CommandImpl');
    extractYamlCommand.aliases = ['extract-yaml', 'x'];
    extractYamlCommand.commandDesc = 'Extract Docker Compose (for Swarm) YAML from firmament provision JSON file';
    extractYamlCommand.options = {
      inputJsonFile: {
        alias: 'i',
        type: 'string',
        default: ProvisionCommandImpl.defaultConfigFilename,
        desc: 'The input firmament provision JSON file'
      },
      outputYamlFile: {
        alias: 'o',
        type: 'string',
        desc: 'The output Docker Compose YAML file'
      }
    };
    extractYamlCommand.handler = this.dockerProvision.extractYamlFromJson.bind(this.dockerProvision);
    this.subCommands.push(extractYamlCommand);
  };
}

