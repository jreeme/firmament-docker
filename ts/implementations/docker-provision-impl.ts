import {injectable, inject} from 'inversify';
import {DockerDescriptors} from '../interfaces/docker-descriptors';
import {Positive, FailureRetVal, CommandUtil, ProgressBar, Spawn, ForceErrorImpl, SafeJson} from 'firmament-yargs';
import {DockerContainerManagement} from '../interfaces/docker-container-management';
import {DockerImageManagement} from '../interfaces/docker-image-management';
import * as async from 'async';
import * as fs from 'fs';
import * as YAML from 'yamljs';
import * as path from 'path';
import * as tmp from 'tmp';
import {RemoteCatalogGetter, RemoteCatalogEntry} from 'firmament-yargs';
import {DockerProvision} from "../interfaces/docker-provision";
import {DockerUtil} from "../interfaces/docker-util";
import {DockerStackConfigTemplate} from "../";
import {ProcessCommandJson} from "firmament-bash/js/interfaces/process-command-json";

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
              @inject('SafeJson') private safeJson: SafeJson,
              @inject('RemoteCatalogGetter') private remoteCatalogGetter: RemoteCatalogGetter,
              @inject('ProcessCommandJson') private processCommandJson: ProcessCommandJson,
              @inject('DockerUtil') public dockerUtil: DockerUtil,
              @inject('DockerImageManagement') private dockerImageManagement: DockerImageManagement,
              @inject('DockerContainerManagement') private dockerContainerManagement: DockerContainerManagement,
              @inject('Positive') private positive: Positive,
              @inject('ProgressBar') private progressBar: ProgressBar) {
    super();
  }

  makeTemplate(argv: any, cb: () => void = null) {
    const me = this;
    me.composeAndWriteTemplate(argv.get, argv.yaml, argv.output, (err: Error, msg: string) => {
      /*      if (cb) {
              return cb();
            }*/
      me.commandUtil.processExitWithError(err, msg);
    });
  }

  buildTemplate(argv: any) {
    const me = this;
    const {fullInputPath, stackConfigTemplate} = me.getContainerConfigsFromJsonFile(argv.input);
    me.commandUtil.log("Constructing Docker Stack described in: '" + fullInputPath + "'");
    me.createDockerMachines(stackConfigTemplate, (err, result) => {
      me.commandUtil.processExitWithError(err, 'OK');
    });
  }
//(alter vm.max_map_count in boot2docker ISO
//https://github.com/boot2docker/boot2docker/issues/1216
  private createDockerMachines(stackConfigTemplate: DockerStackConfigTemplate, cb: (err, result?) => void) {
    const me = this;
    cb = me.checkCallback(cb);
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
    const masterMachineName = `${stackConfigTemplate.clusterPrefix}-master`;
    async.waterfall([
      (cb) => {
        const masterDockerMachineCmd = dockerMachineCmd.slice();
        for (const dockerMachineMasterOption in stackConfigTemplate.dockerMachineMasterOptions) {
          const optionKey = camelToSnake(dockerMachineMasterOption, '-');
          const optionValue = stackConfigTemplate.dockerMachineMasterOptions[dockerMachineMasterOption];
          masterDockerMachineCmd.push(`--${optionKey}=${optionValue}`);
        }
        masterDockerMachineCmd.push(masterMachineName);
        me.createDockerMachine(masterDockerMachineCmd, cb);
      },
      (cb) => {
        const dockerMachineInitSwarmCmd = [
          'docker-machine',
          'ip',
          masterMachineName
        ];
        me.spawn.spawnShellCommandAsync(dockerMachineInitSwarmCmd,
          {
            cacheStdOut: true
          },
          (err, result) => {
            me.commandUtil.log(result.toString());
          },
          (err, result) => {
            const ip = me.safeJson.safeParseSync(result).obj.stdoutText.trim();
            cb(null, ip);
          });
      },
      (ip, cb) => {
        const dockerMachineInitSwarmCmd = [
          'docker-machine',
          'ssh',
          masterMachineName,
          'docker',
          'swarm',
          'init',
          '--advertise-addr',
          ip
        ];
        me.spawn.spawnShellCommandAsync(dockerMachineInitSwarmCmd,
          {
            cacheStdOut: true
          },
          (err, result) => {
            me.commandUtil.log(result.toString());
          },
          (err, result) => {
            cb(null, ip);
          });
      },
      (ip, cb) => {
        const dockerMachineInitSwarmCmd = [
          'docker-machine',
          'ssh',
          masterMachineName,
          'docker',
          'swarm',
          'join-token',
          'worker',
          '-q'
        ];
        me.spawn.spawnShellCommandAsync(dockerMachineInitSwarmCmd,
          {
            cacheStdOut: true
          },
          (err, result) => {
            me.commandUtil.log(result.toString());
          },
          (err, result) => {
            const joinToken = me.safeJson.safeParseSync(result).obj.stdoutText.trim();
            cb(null, ip, joinToken);
          });
      },
      (ip, joinToken, cb) => {
        let fnArray = [];
        for (let i = 0; i < stackConfigTemplate.workerHostCount; ++i) {
          const workerDockerMachineCmd = dockerMachineCmd.slice();
          const workerMachineName = `${stackConfigTemplate.clusterPrefix}-worker-${i}`;
          for (const dockerMachineWorkerOption in stackConfigTemplate.dockerMachineWorkerOptions) {
            const optionKey = camelToSnake(dockerMachineWorkerOption, '-');
            const optionValue = stackConfigTemplate.dockerMachineMasterOptions[dockerMachineWorkerOption];
            workerDockerMachineCmd.push(`--${optionKey}=${optionValue}`);
          }
          workerDockerMachineCmd.push(workerMachineName);
          fnArray.push(async.apply(me.createWorkerDockerMachine.bind(me),
            workerDockerMachineCmd,
            workerMachineName,
            ip,
            joinToken
          ));
        }
        async.parallel(fnArray, (err, result) => {
          cb(err);
        });
      },
      (cb) => {
        const dockerMachineGetMasterEnvCmd = [
          'docker-machine',
          'env',
          masterMachineName
        ];
        me.spawn.spawnShellCommandAsync(dockerMachineGetMasterEnvCmd,
          {
            cacheStdOut: true
          },
          (err, result) => {
            me.commandUtil.log(result.toString());
          },
          (err, result) => {
            const regex = /export (.*)/g;
            const envString = me.safeJson.safeParseSync(result).obj.stdoutText.trim();
            let match: string[];
            let env: any = {};
            do {
              match = regex.exec(envString);
              if (match) {
                const keyValue = match[1].split('=');
                env[keyValue[0]] = keyValue[1].replace(/"/g, '');
              }
            } while (match);
            cb(null, env);
          });
      },
      (env, cb) => {
        tmp.file((err, tmpPath, fd, cleanupCb) => {
          const yaml = YAML.dump(stackConfigTemplate.dockerComposeYaml);
          if (me.commandUtil.callbackIfError(err)) {
            return;
          }
          fs.writeFile(tmpPath, yaml, (err) => {
            const dockerMachineDeployCmd = [
              'docker',
              'stack',
              'deploy',
              '-c',
              tmpPath,
              stackConfigTemplate.clusterPrefix
            ];
            me.spawn.spawnShellCommandAsync(dockerMachineDeployCmd,
              {
                env,
                cacheStdOut: true
              },
              (err, result) => {
                me.commandUtil.log(result.toString());
              },
              (err, result) => {
                //const joinToken = me.safeJson.safeParseSync(result).obj.stdoutText.trim();
                cleanupCb();
                cb(null);
              });
          });
        });
      }
    ], (err, result) => {
      cb(null);
    });
  }

  private createWorkerDockerMachine(dockerMachineCmd: any[],
                                    workerMachineName,
                                    masterIp,
                                    joinToken, cb: (err, result?) => void) {
    const me = this;
    me.createDockerMachine(dockerMachineCmd, (err, result) => {
      if (err) {
        return cb(err);
      }
      const dockerMachineJoinSwarmCmd = [
        'docker-machine',
        'ssh',
        workerMachineName,
        'docker',
        'swarm',
        'join',
        '--token',
        joinToken,
        `${masterIp}:2377`
      ];
      me.spawn.spawnShellCommandAsync(dockerMachineJoinSwarmCmd,
        {
          cacheStdOut: true
        },
        (err, result) => {
          me.commandUtil.log(result.toString());
        },
        (err, result) => {
          const joinToken = me.safeJson.safeParseSync(result).obj.stdoutText.trim();
          cb(null, joinToken);
        });
    });
  }

  private createDockerMachine(dockerMachineCmd: any[], cb: (err, result?) => void) {
    const me = this;
    me.spawn.spawnShellCommandAsync(dockerMachineCmd, {},
      (err, result) => {
        me.commandUtil.log(result.toString());
      },
      (err, result) => {
        if (err) {
          me.safeJson.safeParse(err.message, (err: Error, obj: any) => {
            try {
              if (obj.code.code === 'ENOENT') {
                if (me.positive.areYouSure(
                    `Looks like 'docker-machine' is not installed. Want me to try to install it?`,
                    'Operation canceled.',
                    true,
                    FailureRetVal.TRUE)) {
                  const installDockerMachineJson = path.resolve(__dirname, '../../firmament-bash/install-docker-machine.json');
                  me.processCommandJson.processAbsoluteUrl(installDockerMachineJson, (err, result) => {
                    const msg = `'docker-machine' installed. Try provisioning again.`;
                    cb(err, err ? null : msg);
                  });
                  return;
                }
                return cb(null);
              }
              cb(null);
            } catch (err) {
              cb(err);
            }
          });
          return;
        }
        cb(null);
      });
  };

  private getContainerConfigsFromJsonFile(inputPath: string) {
    const me = this;
    const fullInputPath = me.commandUtil.getConfigFilePath(inputPath, '.json');
    if (!fileExists.sync(fullInputPath)) {
      me.commandUtil.processExitWithError(new Error(`\n'${fullInputPath}' does not exist`));
    }
    const stackConfigTemplate = <DockerStackConfigTemplate>jsonFile.readFileSync(fullInputPath);
    return {fullInputPath, stackConfigTemplate};
  }

  private composeAndWriteTemplate(catalogEntryName: string,
                                  dockerComposeYamlPath: string,
                                  outputTemplateFileName: string,
                                  cb: (err: Error, msg?: string) => void) {
    const me = this;
    const fullOutputPath = this.commandUtil.getConfigFilePath(outputTemplateFileName, '.json');
    if (catalogEntryName === undefined) {
      //Just write out the descriptors we have "baked in" to this application
      if (fs.existsSync(fullOutputPath)
        && !me.positive.areYouSure(
          `Config file '${fullOutputPath}' already exists. Overwrite? [Y/n] `,
          'Operation canceled.',
          true,
          FailureRetVal.TRUE)) {
        cb(null);
      } else {
        const dockerComposeYaml = YAML.load(dockerComposeYamlPath);
        let jsonTemplate = Object.assign({}, DockerDescriptors.dockerStackConfigTemplate, {dockerComposeYaml});
        me.dockerUtil.writeJsonTemplateFile(jsonTemplate, fullOutputPath);
        cb(null, 'Template written.');
      }
    } else {
      cb(new Error('Provision from template not implemented.'));
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
