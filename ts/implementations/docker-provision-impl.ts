import {injectable, inject} from 'inversify';
import {DockerDescriptors} from '../interfaces/docker-descriptors';
import {Positive, FailureRetVal, CommandUtil, ProgressBar, Spawn, ForceErrorImpl} from 'firmament-yargs';
import {DockerContainerManagement} from '../interfaces/docker-container-management';
import {DockerImageManagement} from '../interfaces/docker-image-management';
import * as _ from 'lodash';
import * as fs from 'fs';
import * as YAML from 'yamljs';
import * as path from 'path';
import {RemoteCatalogGetter, RemoteCatalogEntry} from 'firmament-yargs';
import {DockerProvision} from "../interfaces/docker-provision";
import {DockerUtil} from "../interfaces/docker-util";
import {DockerStackConfigTemplate} from "../";

const fileExists = require('file-exists');
const jsonFile = require('jsonfile');
const camelToSnake = require('camel-to-snake');

//const path = require('path');
const templateCatalogUrl = '/home/jreeme/src/firmament-docker/docker/provisionTemplateCatalog.json';

//const templateCatalogUrl = 'https://raw.githubusercontent.com/jreeme/firmament-docker/master/docker/provisionTemplateCatalog.json';
@injectable()
export class DockerProvisionImpl extends ForceErrorImpl implements DockerProvision {
  constructor(@inject('CommandUtil') private commandUtil: CommandUtil,
              @inject('Spawn') private spawn: Spawn,
              @inject('RemoteCatalogGetter') private remoteCatalogGetter: RemoteCatalogGetter,
              @inject('DockerUtil') public dockerUtil: DockerUtil,
              @inject('DockerImageManagement') private dockerImageManagement: DockerImageManagement,
              @inject('DockerContainerManagement') private dockerContainerManagement: DockerContainerManagement,
              @inject('Positive') private positive: Positive,
              @inject('ProgressBar') private progressBar: ProgressBar) {
    super();
  }

  buildTemplate(argv: any) {
    let me = this;
    let {fullInputPath, stackConfigTemplate} = me.getContainerConfigsFromJsonFile(argv.input);
    me.commandUtil.log("Constructing Docker Stack described in: '" + fullInputPath + "'");
    const dockerMachineCmd = [
      'docker-machine',
      'create'
    ];
    //Add base driver options (the ones used for both master & worker)
    for (const dockerMachineDriverOption in stackConfigTemplate.dockerMachineDriverOptions) {
      const optionKey = camelToSnake(dockerMachineDriverOption, '-');
      const optionValue = stackConfigTemplate.dockerMachineDriverOptions[dockerMachineDriverOption];
      dockerMachineCmd.push(`--${optionKey}=${optionValue}`);
    }
    for (const dockerMachineMasterOption in stackConfigTemplate.dockerMachineMasterOptions) {
      const optionKey = camelToSnake(dockerMachineMasterOption, '-');
      const optionValue = stackConfigTemplate.dockerMachineMasterOptions[dockerMachineMasterOption];
      dockerMachineCmd.push(`--${optionKey}=${optionValue}`);
    }
    const masterMachineName = `${stackConfigTemplate.clusterPrefix}-master`;
    dockerMachineCmd.push(masterMachineName);
    me.spawn.spawnShellCommandAsync(dockerMachineCmd, {},
      (err, result) => {
        me.commandUtil.log(result.toString());
      },
      (err, result) => {
        me.commandUtil.processExitWithError(err, `Finished.\n`);
      });
    /*    me.processContainerConfigs(sortedContainerConfigs, baseDir, (err: Error) => {
          me.commandUtil.processExitWithError(err, `Finished.\n`);
        });*/
  }

  private getContainerConfigsFromJsonFile(inputPath: string) {
    let me = this;
    const fullInputPath = me.commandUtil.getConfigFilePath(inputPath, '.json');
    if (!fileExists.sync(fullInputPath)) {
      me.commandUtil.processExitWithError(new Error(`\n'${fullInputPath}' does not exist`));
    }
    const stackConfigTemplate = <DockerStackConfigTemplate>jsonFile.readFileSync(fullInputPath);
    return {fullInputPath, stackConfigTemplate};
  }

  makeTemplate(argv: any, cb: () => void = null) {
    let me = this;
    const fullOutputPath = this.commandUtil.getConfigFilePath(argv.output, '.json');
    if (argv.get === undefined) {
      //Just write out the descriptors we have "baked in" to this application
      if (fs.existsSync(fullOutputPath)
        && !me.positive.areYouSure(
          `Config file '${fullOutputPath}' already exists. Overwrite? [Y/n] `,
          'Operation canceled.',
          true,
          FailureRetVal.TRUE)) {
        me.commandUtil.processExit();
      } else {
        const dockerComposeYamlPath = path.resolve(__dirname, '../../docker/docker-compose.yml');
        const dockerComposeYaml = YAML.load(dockerComposeYamlPath);
        let jsonTemplate = Object.assign({dockerComposeYaml}, DockerDescriptors.dockerStackConfigTemplate);
        me.dockerUtil.writeJsonTemplateFile(jsonTemplate, fullOutputPath);
      }
      if (cb) {
        cb();
        return;
      }
      me.commandUtil.processExit();
    } else {
      me.commandUtil.processExit();
      //Need to interact with the network to get templates
      /*      me.remoteCatalogGetter.getCatalogFromUrl(templateCatalogUrl, (err, remoteCatalog) => {
              if (!argv.get.length) {
                //User specified --get with no template name so write available template names to console
                me.commandUtil.log('\nAvailable templates:\n');
                remoteCatalog.entries.forEach(entry => {
                  me.commandUtil.log('> ' + entry.name);
                });
                me.commandUtil.processExit();
              } else {
                //User specified a template, let's go get it
                let template: RemoteCatalogEntry = _.find(remoteCatalog.entries, entry => {
                  return entry.name === argv.get;
                });
                if (!template) {
                  me.commandUtil.processExitWithError(new Error(`\nTemplate catalog '${argv.get}' does not exist.\n`));
                }
                template.resources.forEach(resource => {
                  try {
                    let outputPath = path.resolve(process.cwd(), path.basename(resource.name));
                    fs.writeFileSync(outputPath, resource.text);
                  } catch (err) {
                    me.commandUtil.processExitWithError(err);
                  }
                });
                me.commandUtil.processExit(0, `\nTemplate '${template.name}' written.\n`);
              }
            });*/
    }
  }
}
