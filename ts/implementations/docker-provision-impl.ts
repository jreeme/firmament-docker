import {injectable, inject} from 'inversify';
import {
  Positive,
  FailureRetVal,
  CommandUtil,
  ProgressBar,
  Spawn,
  ForceErrorImpl,
  SafeJson,
  SpawnOptions2
} from 'firmament-yargs';
import {DockerContainerManagement} from '../interfaces/docker-container-management';
import {DockerImageManagement} from '../interfaces/docker-image-management';
import * as async from 'async';
import * as fs from 'fs';
import * as YAML from 'yamljs';
import * as path from 'path';
import * as tmp from 'tmp';
import * as mkdirp from 'mkdirp';
import * as touch from 'touch';
import * as _ from 'lodash';
import {RemoteCatalogGetter} from 'firmament-yargs';
import {DockerProvision} from '../interfaces/docker-provision';
import {DockerUtil} from '../interfaces/docker-util';
import {
  DockerMachineDriverOptions_openstack, DockerMachineDriverOptions_vmwarevsphere, DockerServiceDescription,
  DockerStackConfigTemplate, DockerVolumeDescription
} from '../';
import {ProcessCommandJson} from 'firmament-bash/js/interfaces/process-command-json';

const fileExists = require('file-exists');

//const path = require('path');
//const templateCatalogUrl = '/home/jreeme/src/firmament-docker/docker/provisionTemplateCatalog.json';

//const templateCatalogUrl = 'https://raw.githubusercontent.com/jreeme/firmament-docker/manager/docker/provisionTemplateCatalog.json';
@injectable()
export class DockerProvisionImpl extends ForceErrorImpl implements DockerProvision {
  private stackConfigTemplate: DockerStackConfigTemplate;

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

  validateDockerStackConfigTemplate(dockerStackConfigTemplate: DockerStackConfigTemplate,
                                    cb: (err: Error, dockerStackConfigTemplate?: DockerStackConfigTemplate) => void) {
    const me = this;
    const dsct = dockerStackConfigTemplate;
    const dockerImageRegex = /.+?(:\d+?)?\/.+?:.+$/g;
    const dockerVolumesRegex = /:\//g;

    //Add dockerMachines.common options to dockerMachineDriverOptions
    Object.assign(dsct.dockerMachineDriverOptions, dsct.dockerMachines.common);
    //Don't need dsct.dockerMachines.common anymore
    delete dsct.dockerMachines.common;

    //Patch Docker Machines ==> If no 'engineLabels.affinity' set to nodeName
    //--Manager machine
    const manager = dsct.dockerMachines.manager;
    manager.engineLabels = manager.engineLabels ||
      {
        role: 'manager',
        affinity: manager.nodeName
      };
    manager.engineLabels.role = manager.engineLabels.role || 'manager';
    manager.engineLabels.affinity = manager.engineLabels.affinity || manager.nodeName;
    //--Worker machines
    dsct.dockerMachines.workers = dsct.dockerMachines.workers || [];
    dsct.dockerMachines.workers.forEach((worker) => {
      worker.engineLabels = worker.engineLabels ||
        {
          role: 'worker',
          affinity: worker.nodeName
        };
      worker.engineLabels.role = worker.engineLabels.role || 'worker';
      worker.engineLabels.affinity = worker.engineLabels.affinity || worker.nodeName;
    });

    //Patch 'dockerComposeYaml.volumes' block
    for (const volume in dsct.dockerComposeYaml.volumes) {
      const v = <DockerVolumeDescription>dsct.dockerComposeYaml.volumes[volume];
      if (v.driver_opts.type === 'nfs' && v.driver === 'local') {
        //Could be we need to 'fill in the blanks' for NFS volume
        //If device is missing, use the volume name
        v.driver_opts.device = v.driver_opts.device || volume;
        dockerVolumesRegex.lastIndex = 0;
        //If device doesn't start with ':/' then prepend 'nfsConfig.exportBaseDir'
        if (!dockerVolumesRegex.test(v.driver_opts.device)) {
          if (!dsct.nfsConfig) {
            return cb(new Error(`'${volume}.driver_opts.device' does not begin with ':/' but no 'nfsConfig' is specified`));
          }
          if (!dsct.nfsConfig.exportBaseDir) {
            return cb(new Error(`'${volume}.driver_opts.device' does not begin with ':/' but no 'nfsConfig.exportBaseDir' is specified`));
          }
          v.driver_opts.device = `:${dsct.nfsConfig.exportBaseDir}/${v.driver_opts.device}`;
        }
        //If there are no options then copy them from 'nfsConfig' (if they exist, otherwise error)
        if (!v.driver_opts.o) {
          if (!dsct.nfsConfig) {
            return cb(new Error(`'${volume}.driver_opts.o' does not exist but no 'nfsConfig' is specified`));
          }
          if (!dsct.nfsConfig.serverAddr) {
            return cb(new Error(`'${volume}.driver_opts.o' does not exist but no 'nfsConfig.serverAddr' is specified`));
          }
          if (!dsct.nfsConfig.options) {
            return cb(new Error(`'${volume}.driver_opts.o' does not exist but no 'nfsConfig.options' is specified`));
          }
          v.driver_opts.o = dsct.nfsConfig.options;
        }
        //Build the options (driver_opts.o)
        const optionsHash = DockerProvisionImpl.optionsStringToHash(v.driver_opts.o);
        if (!optionsHash['addr'] && !dsct.nfsConfig.serverAddr) {
          return cb(new Error(`'${volume}.driver_opts.o[addr=]' does not exist but no 'nfsConfig.serverAddr' is specified`));
        }
        //Only muck with 'addr' option since we know it's required. TODO: We could get clever and 'merge' nfsConfig.options & v.driver_opts.o
        optionsHash['addr'] = optionsHash['addr'] || dsct.nfsConfig.serverAddr;
        v.driver_opts.o = DockerProvisionImpl.optionsHashToString(optionsHash);
      }
    }

    //Patch 'dockerComposeYaml.services' block
    for (const service in dsct.dockerComposeYaml.services) {
      const s = <DockerServiceDescription>dsct.dockerComposeYaml.services[service];
      dockerImageRegex.lastIndex = 0;
      if (!dockerImageRegex.test(s.image)) {
        if (!dsct.defaultDockerRegistry) {
          return cb(new Error(`Service '${service}' missing 'image' property and 'defaultDockerRegistry' is undefined`));
        }
        if (!dsct.defaultDockerImageTag) {
          return cb(new Error(`Service '${service}' missing 'image' property and 'defaultDockerImageTag' is undefined`));
        }
        if (s.image) {
          if (/.+?:\d+?/.test(s.image)) {
            s.image = `${dsct.defaultDockerRegistry}/${s.image}`;
          } else {
            s.image = `${dsct.defaultDockerRegistry}/${s.image}:${dsct.defaultDockerImageTag}`;
          }
        } else {
          s.image = `${dsct.defaultDockerRegistry}/${service}:${dsct.defaultDockerImageTag}`;
        }
      }
      const labels = {};
      if (s.deploy.labels) {
        let traefikPortLabelPresent = 0;
        let frontendRuleLabelPresent = 0;
        const portRegex = /traefik\.(.*?\.|)port/g;
        const frontendRuleRegex = /traefik\.(.*?\.|)frontend.rule/g;
        s.deploy.labels.forEach((label) => {
          const tuple = label.split('=');
          portRegex.lastIndex = frontendRuleRegex.lastIndex = 0;
          if (portRegex.test(tuple[0])) {
            ++traefikPortLabelPresent;
          }
          if (frontendRuleRegex.test(tuple[0])) {
            ++frontendRuleLabelPresent;
          }
          labels[tuple[0]] = tuple[1];
        });
        if (labels['traefik.enable'] !== 'false') {
          if (!traefikPortLabelPresent) {
            return cb(new Error(`'traefik.??.port' label not present for service '${service}'`));
          }
          if (!labels['traefik.backend'] && frontendRuleLabelPresent === 1) {
            labels['traefik.backend'] = service;
          }
          if (!frontendRuleLabelPresent) {
            if (!dsct.traefikZoneName) {
              return cb(new Error(`'traefik.??.frontend.rule' label and 'traefikZoneName' both undefined for service '${service}'`));
            }
            labels['traefik.frontend.rule'] = `Host: ${service}.${dsct.traefikZoneName}`;
          }
        }
        s.deploy.labels.length = 0;
        for (const label in labels) {
          s.deploy.labels.push(`${label}=${labels[label]}`);
        }
      }
    }
    this.dockerUtil.writeJsonTemplateFile(dsct, '/tmp/tmp.json');
    return cb(null, dsct);
    me.checkNfsMounts(dsct, (err, dsct) => {
      //me.commandUtil.processExit(0, 'DEBUG --> Exit(0)');
      cb(err, dsct);
    });
  }

  private checkNfsMounts(dsct: DockerStackConfigTemplate,
                         cb: (err: Error, dockerStackConfigTemplate: DockerStackConfigTemplate) => void) {
    const me = this;
    const volumes = Object.keys(dsct.dockerComposeYaml.volumes).map((key) => dsct.dockerComposeYaml.volumes[key]);
    async.each(
      volumes,
      (volume: DockerVolumeDescription, cb: (err?: Error) => void) => {
        if (volume.driver !== 'local' || volume.driver_opts.type !== 'nfs') {
          return cb();
        }
        const options = DockerProvisionImpl.optionsStringToHash(volume.driver_opts.o);
        const volumeConfig = {
          host: options.addr,
          exportPath: volume.driver_opts.device.slice(1)//remove the leading colon
        };
        //BEGIN -> Waterfall to check existence of export, check if we can add it, if so then add it
        const localSpawnOptions: SpawnOptions2 = {
          suppressStdOut: false,
          suppressStdErr: false,
          cacheStdOut: true,
          cacheStdErr: true,
          suppressResult: false
        };
        const remoteSpawnOptions = Object.assign({}, localSpawnOptions, {
          remoteHost: dsct.nfsConfig.serverAddr,
          remoteUser: dsct.nfsConfig.nfsUser,
          remotePassword: dsct.nfsConfig.nfsPassword
        });
        async.waterfall([
          (cb) => {
            //Issue a 'showmount' to remote server to see if volume is exported
            me.spawn.spawnShellCommandAsync(
              [
                'showmount',
                '-e',
                `${volumeConfig.host}`
              ],
              localSpawnOptions,
              (err, result) => {
              },
              (err: Error, result: string) => {
                if (me.commandUtil.callbackIfError(cb, err, result)) {
                  return;
                }
                me.safeJson.safeParse(result, (err: Error, obj: { code: number, stdoutText: string }) => {
                  if (obj.code) {
                    return cb(new Error(`local 'showmount' FAILED`));
                  }
                  const exportList = obj.stdoutText.split('\n').slice(1, -1).map((exportLine) => exportLine.split(/\s/)[0]);
                  const msg = `Checking NFS mount ${volumeConfig.host}:${volumeConfig.exportPath} ...`;
                  if (exportList.indexOf(volumeConfig.exportPath) !== -1) {
                    //Looks like this volume is already exported so we can stop here
                    me.commandUtil.log(`${msg} OK`);
                    return cb(new Error('ALREADY_EXPORTED'));
                  }
                  me.commandUtil.log(`${msg} NOT EXPORTED`);
                  cb(err, volumeConfig.exportPath);
                });
              }
            );
          },
          (exportPath, cb) => {
            me.commandUtil.log(`Attempting to export NFS volume ${volumeConfig.host}:${exportPath} ...`);
            if (!remoteSpawnOptions.remoteHost || !remoteSpawnOptions.remoteUser || !remoteSpawnOptions.remotePassword) {
              return cb(new Error(`nfsConfig [nfsHost & nfsUser] must all be specified to export NFS volume. Cannot continue.`));
            }
            const etcExportsEntry = `${volumeConfig.exportPath} *(insecure,rw,sync,no_root_squash,no_subtree_check)`;
            const cmds = [
              [
                'mkdir',
                '-p',
                volumeConfig.exportPath
              ],
              [
                'chmod',
                '777',
                volumeConfig.exportPath
              ],
              [
                // Check for this entry in /etc/exports and add if not there
                `grep -q -F '${etcExportsEntry}' /etc/exports || echo '${etcExportsEntry}' >> /etc/exports`
              ],
              [
                '/usr/sbin/exportfs',
                '-ra'
              ]
            ];
            async.eachSeries(cmds, (cmd, cb) => {
              me.spawn.spawnShellCommandAsync(
                cmd,
                remoteSpawnOptions,
                (err: Error, result: string) => {
                  me.commandUtil.log(result);
                },
                (err: Error, result: string) => {
                  me.commandUtil.log(result);
                  cb(err);
                }
              );
            }, (err: Error) => {
              cb(err);
            });
          }
        ], (err) => {
          cb((err && err.message === 'ALREADY_EXPORTED') ? null : err);
        });
        //END -> Waterfall to check existence of export, check if we can add it, if so then add it
      }, (err: Error) => {
        cb(err, dsct);
      }
    );
  }

  private static optionsHashToString(hash: any): string {
    let retVal = '';
    for (const key in hash) {
      retVal += key + ((hash[key]) ? `=${hash[key]},` : ',');
    }
    return retVal.slice(0, -1);
  }

  private static optionsStringToHash(optionsString: string): any {
    const hash = {};
    optionsString.split(',').forEach((option) => {
      const optionWithValue = option.split('=');
      hash[optionWithValue[0]] = optionWithValue[1];
    });
    return hash;
  }

  extractYamlFromJson(argv: any, cb: () => void = null) {
    const me = this;
    const {fullInputPath, stackConfigTemplate} = me.getContainerConfigsFromJsonFile(argv.inputJsonFile);
    me.createOutputPath(fullInputPath, argv.outputYamlFile, '.yaml', (err, outputYamlPath, outputFileExists) => {
      me.callbackAndExitIfError(err, cb);
      if (outputFileExists && !me.positive.areYouSure(
        `Output file '${outputYamlPath}' already exists. Overwrite? [Y/n] `,
        'Operation canceled.',
        true,
        FailureRetVal.TRUE)) {
        me.callbackAndExitWithError(err, cb);
      }
      const yaml = YAML.stringify(stackConfigTemplate.dockerComposeYaml, 8, 2);
      fs.writeFile(outputYamlPath, yaml, (err) => {
        me.callbackAndExitWithError(err, cb);
      });
    });
  }

  makeTemplate(argv: any, cb: () => void = null) {
    const me = this;
    me.composeAndWriteTemplate(argv.get, argv.dm, argv.yaml, argv.output, (err: Error, msg: string) => {
      me.callbackAndExitWithError(err, cb);
    });
  }

  buildTemplate(argv: any, cb: (err?: Error) => void = null) {
    const me = this;
    const {fullInputPath, stackConfigTemplate} = me.getContainerConfigsFromJsonFile(argv.input);
    me.validateDockerStackConfigTemplate(stackConfigTemplate, (err, stackConfigTemplate) => {
      if (err) {
        if (cb) {
          return cb(err);
        }
        me.commandUtil.processExitWithError(err, 'OK');
      }
      me.stackConfigTemplate = stackConfigTemplate;
      switch (stackConfigTemplate.dockerMachineDriverOptions.driver) {
        case 'openstack': {
          const dmdo = (<DockerMachineDriverOptions_openstack>stackConfigTemplate.dockerMachineDriverOptions);
          if (argv.username) {
            dmdo.openstackUsername = argv.username;
          }
          if (argv.password) {
            dmdo.openstackPassword = argv.password;
          }
          break;
        }
        case 'vmwarevsphere': {
          const dmdo = (<DockerMachineDriverOptions_vmwarevsphere>stackConfigTemplate.dockerMachineDriverOptions);
          if (argv.username) {
            dmdo.vmwarevsphereUsername = argv.username;
          }
          if (argv.password) {
            dmdo.vmwarevspherePassword = argv.password;
          }
          break;
        }
        case 'amazonec2':
        case 'virtualbox':
        default:
          break;
      }
      me.commandUtil.log("Constructing Docker Stack described in: '" + fullInputPath + "'");
      me.createDockerMachines(fullInputPath, stackConfigTemplate, argv, (err, result) => {
        if (cb) {
          return cb();
        }
        me.commandUtil.processExitWithError(err, 'OK');
      });
    });
  }

  private convertOptionsFromCamelToSnakeCase(options: any): string[] {
    const me = this;
    const retVal = [];
    const excludeProperties = ['nodeCount', 'nodeName'];
    for (const option in options) {
      if (excludeProperties.indexOf(option) !== -1) {
        continue;
      }
      if (option === 'engineLabels') {
        for (const engineLabel in options[option]) {
          retVal.push('--engine-label');
          retVal.push(`${engineLabel}=${options[option][engineLabel]}`);
        }
        continue;
      }
      const optionKey = me.camelToSnake(option, '-');
      const optionValue = options[option];
      //There are some options --engine-opt & --engine-env that require a <space> instead of an <=> symbol
      //between Key & Value. This seems to be because the Value has an <=> symbol in it.
      //(e.g. --engine-opt dns=8.8.8.8 & --engine-env HTTP_PROXY=http://bananna-daiquiri.drink
      const keyValueSeparator = ((typeof optionValue !== 'string') || (optionValue.indexOf('=') === -1)) ? '=' : ' ';
      retVal.push(`--${optionKey}${keyValueSeparator}${optionValue}`);
    }
    return retVal;
  }

  private logErrAndResult(err: Error, result: string) {
    const me = this;
    if (err) {
      return me.commandUtil.log(err.message);
    }
    me.commandUtil.log((result || '').toString());
  }

//(alter vm.max_map_count in boot2docker ISO
//https://github.com/boot2docker/boot2docker/issues/1216
  private createDockerMachines(fullInputPath: string, stackConfigTemplate: DockerStackConfigTemplate, argv: any, cb: (err: Error, result: string) => void) {
    const me = this;
    cb = me.checkCallback(cb);
    const createOptions = me.convertOptionsFromCamelToSnakeCase(stackConfigTemplate.dockerMachineDriverOptions);
    async.waterfall([
      (cb: (err: Error, managerMachineName: string) => void) => {
        const managerMachineName = `${stackConfigTemplate.stackName}-${stackConfigTemplate.dockerMachines.manager.nodeName}`;
        const managerDockerMachineCmd = createOptions.slice();
        managerDockerMachineCmd.push.apply(managerDockerMachineCmd, me.convertOptionsFromCamelToSnakeCase(stackConfigTemplate.dockerMachines.manager));
        managerDockerMachineCmd.push(managerMachineName);
        me.createDockerMachine(managerDockerMachineCmd, (err: Error) => {
          cb(err, managerMachineName);
        });
      },
      (managerMachineName: string, cb: (err: Error, managerMachineName: string, ip: string) => void) => {
        const dockerMachineInitSwarmCmd = [
          'docker-machine',
          'ip',
          managerMachineName
        ];
        me.spawn.spawnShellCommandAsync(dockerMachineInitSwarmCmd,
          {
            cacheStdOut: true
          },
          me.logErrAndResult.bind(me),
          (err, result) => {
            const ip = me.safeJson.safeParseSync(result).obj.stdoutText.trim();
            cb(err, managerMachineName, ip);
          });
      },
      (managerMachineName: string, ip: string, cb: (err: Error, managerMachineName: string, ip: string) => void) => {
        const dockerMachineInitSwarmCmd = [
          'docker-machine',
          'ssh',
          managerMachineName,
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
          me.logErrAndResult.bind(me),
          (_err: Error) => {
            if (_err) {
              const {err, obj} = me.safeJson.safeParseSync(_err.message);
              if (!err && obj.code === 1) {
                return cb(null, managerMachineName, ip);
              }
            }
            cb(_err, managerMachineName, ip);
          });
      },
      (managerMachineName: string, ip: string, cb: (err: Error, managerMachineName: string, ip: string, joinToken: string) => void) => {
        const dockerMachineInitSwarmCmd = [
          'docker-machine',
          'ssh',
          managerMachineName,
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
          me.logErrAndResult.bind(me),
          (err: Error, result: any) => {
            const joinToken = me.safeJson.safeParseSync(result).obj.stdoutText.trim();
            cb(null, managerMachineName, ip, joinToken);
          });
      },
      (managerMachineName: string, ip: string, joinToken: string, cb: (err: Error, managerMachineName: string, ip: string) => void) => {
        let fnArray = [];
        stackConfigTemplate.dockerMachines.workers.forEach((workerDockerMachine) => {
          for (let i = 0; i < workerDockerMachine.nodeCount; ++i) {
            const workerMachineName = `${stackConfigTemplate.stackName}-${workerDockerMachine.nodeName}-${i}`;
            const workerDockerMachineCmd = createOptions.slice();
            workerDockerMachineCmd.push.apply(workerDockerMachineCmd, me.convertOptionsFromCamelToSnakeCase(workerDockerMachine));
            workerDockerMachineCmd.push(workerMachineName);
            fnArray.push(async.apply(me.createWorkerDockerMachine.bind(me),
              workerDockerMachineCmd,
              workerMachineName,
              ip,
              joinToken
            ));
          }
        });
        async.parallel(fnArray, (err: Error) => {
          cb(err, managerMachineName, ip);
        });
      },
      (managerMachineName: string, ip: string, cb: (err: Error, env: any, ip: string) => void) => {
        const dockerMachineGetMasterEnvCmd = [
          'docker-machine',
          'env',
          managerMachineName
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
            cb(null, env, ip);
          });
      },
      (env: any, ip: string, cb: (err?: Error) => void) => {
        tmp.file({dir: path.dirname(fullInputPath)}, (err, tmpPath, fd, cleanupCb) => {
          try {
            if (argv.noports) {
              for (const serviceName in stackConfigTemplate.dockerComposeYaml.services) {
                const service = stackConfigTemplate.dockerComposeYaml.services[serviceName];
                service.ports && delete service.ports;
              }
            }
          } catch (err) {
            me.commandUtil.error(`Failed to execute 'noports' option ${err}`);
          }
          const yaml = YAML.stringify(stackConfigTemplate.dockerComposeYaml, 8, 2).replace(/\$\{MASTER_IP\}/g, ip);
          if (me.commandUtil.callbackIfError(err)) {
            return;
          }
          fs.writeFile(tmpPath, yaml, (err: Error) => {
            if (err) {
              me.logErrAndResult(err, '');
              return cb(err);
            }
            const dockerMachineDeployCmd = [
              'docker',
              'stack',
              'deploy',
              '-c',
              tmpPath,
              stackConfigTemplate.stackName ? stackConfigTemplate.stackName : stackConfigTemplate.clusterPrefix
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
                me.logErrAndResult(err, result);
                //const joinToken = me.safeJson.safeParseSync(result).obj.stdoutText.trim();
                cleanupCb();
                cb();
              });
          });
        });
      }
    ], (err: Error, result: string) => {
      me.logErrAndResult(err, result);
      cb(err, result);
    });
  }

  private createWorkerDockerMachine(dockerMachineCmd: any[],
                                    workerMachineName,
                                    managerIp,
                                    joinToken, cb: (err, result?) => void) {
    const me = this;
    me.createDockerMachine(dockerMachineCmd, (err) => {
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
        `${managerIp}:2377`
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

  private handleDockerMachineExecutionFailure(err: Error, cb: (err: Error) => void) {
    const me = this;
    me.safeJson.safeParse(err.message, (err: Error, obj: any) => {
      try {
        if (obj.code.code === 'ENOENT') {
          if (me.positive.areYouSure(
            `Looks like 'docker-machine' is not installed. Want me to try to install it?`,
            'Operation canceled.',
            true,
            FailureRetVal.TRUE)) {
            const installDockerMachineJson = path.resolve(__dirname, '../../firmament-bash/install-docker-machine.json');
            return me.processCommandJson.processAbsoluteUrl(installDockerMachineJson, (err) => {
              me.commandUtil.log(`'docker-machine' installed. Try provisioning again.`);
              cb(err);
            });
          }
          return cb(null);
        }
        cb(null);
      } catch (err) {
        cb(err);
      }
    });
  }

  private createDockerMachine(dockerMachineCreateCmdOptions: string[], cb: (err: Error) => void) {
    const me = this;
    const dockerMachineCmd = [
      'docker-machine',
      'create'
    ].concat(dockerMachineCreateCmdOptions);

    me.spawn.spawnShellCommandAsync(
      dockerMachineCmd,
      {},
      (err, result) => {
        me.commandUtil.log(result.toString());
      },
      (err) => {
        if (err) {
          return me.handleDockerMachineExecutionFailure(err, cb);
        }
        //Below is where we do any tweaks to the underlying docker-machine host. This host is sometimes a boot2docker
        //machine (VMWare, VirtualBox) and sometimes a cloud-init, usually Ubuntu, image (OpenStack, AWS).
        const machineName = dockerMachineCmd[dockerMachineCmd.length - 1];
        switch (me.stackConfigTemplate.dockerMachineDriverOptions.driver) {
          case('vmwarevsphere'):
            return me.finalConfig_VMWareVSphere(machineName, cb);
          case('openstack'):
            return me.finalConfig_OpenStack(machineName, cb);
          case('amazonec2'):
            return me.finalConfig_AmazonEC2(machineName, cb);
          case('virtualbox'):
          default:
            return me.finalConfig_VirtualBox(machineName, cb);
        }
      });
  };

  private finalConfig_VirtualBox(machineName: string, cb: (err) => void) {
    this.adjustBoot2DockerProfile(machineName, cb);
  }

  private finalConfig_AmazonEC2(machineName: string, cb: (err) => void) {
    cb(null);
  }

  private finalConfig_OpenStack(machineName: string, cb: (err) => void) {
    cb(null);
  }

  private finalConfig_VMWareVSphere(machineName: string, cb: (err) => void) {
    this.adjustBoot2DockerProfile(machineName, cb);
  }

  //NOTE: The boot2docker profile file (living at /var/lib/boot2docker/profile on the VM host) is appropriate for
  //changing the way the docker daemon behaves. Settings for non-docker daemons need to be handled another way.
  private adjustBoot2DockerProfile(machineName: string, cb: (err) => void) {
    const me = this;
    //Need to up the vm.max_map_count to 262144 to support elasticsearch 5
    //NETDEVICES="$(awk -F: '\''/eth.:|tr.:/{print $1}'\'' /proc/net/dev 2>/dev/null)"
    const profileLines = (me.stackConfigTemplate.hostMachineDnsServer)
      ? `
#Need to set vm.max_map_count to 262144 to support ElasticSearch (ES fails in production without it)    
sysctl -w vm.max_map_count=262144
sysctl -w net.ipv4.tcp_keepalive_time=600
ulimit -l unlimited
#swapoff /dev/sda2
#sed -i '\\''/sda2/ s/^/#/'\\'' /etc/fstab

NETDEVICES="$(awk -F: '\\''/eth.:|tr.:/{print $1}'\\'' /proc/net/dev 2>/dev/null)"
for DEVICE in $NETDEVICES; do
  DHCP_PID_FILE=/var/run/udhcpc.$DEVICE.pid
  echo "Checking existence of $DHCP_PID_FILE ..."
  until [ -f $DHCP_PID_FILE ];
  do
    echo "Waiting for $DHCP_PID_FILE to exist ..."
    sleep 1
  done
done

echo "$DHCP_PID_FILE exists ..."

RESOLV_CONF=/etc/resolv.conf
echo "Checking existence of $RESOLV_CONF ..."
until [ -f $RESOLV_CONF ];
do
    echo "Waiting for $RESOLV_CONF to exist ..."
    sleep 1
done
  
echo "$RESOLV_CONF exists ..."

DATE_OF_DHCP_PID_FILE=$(date -u -r $DHCP_PID_FILE +%s)
DATE_OF_RESOLV_CONF=$(date -u -r $RESOLV_CONF +%s)
NOW=$(date -u +%s)

echo "$DHCP_PID_FILE last modified at $DATE_OF_DHCP_PID_FILE"
echo "$RESOLV_CONF last modified at $DATE_OF_RESOLV_CONF"

echo $(( \${DATE_OF_DHCP_PID_FILE}-\${DATE_OF_RESOLV_CONF} ))

echo 'nameserver ${me.stackConfigTemplate.hostMachineDnsServer}' > /etc/resolv.conf

#Try to protect against resolver restart or DHCP lease renewal rewriting our resolv.conf file
chmod 444 /etc/resolv.conf
` : `
#Need to set vm.max_map_count to 262144 to support ElasticSearch (ES fails in production without it)    
sysctl -w vm.max_map_count=262144
sysctl -w net.ipv4.tcp_keepalive_time=600
ulimit -l unlimited
#swapoff /dev/sda2
#sed -i '\\''/sda2/ s/^/#/'\\'' /etc/fstab
`;
    const dockerMachineJoinSwarmCmd = [
      `echo '${profileLines}' | sudo tee -a /var/lib/boot2docker/profile && sudo /etc/init.d/docker restart`
    ];
    me.runCommandOnDockerMachineHost(machineName, dockerMachineJoinSwarmCmd, (err: Error, result: string) => {
      err && me.commandUtil.log(err.toString());
      cb(err);
    });
  }

  private runCommandOnDockerMachineHost(machineName: string, commandArray: string[], cb: (err: Error, result: string) => void) {
    const me = this;
    commandArray.unshift('docker-machine', 'ssh', machineName);
    me.spawn.spawnShellCommandAsync(commandArray,
      {
        cacheStdOut: true
      },
      (err, result) => {
        me.commandUtil.log(result.toString());
      }, cb);
    //const joinToken = me.safeJson.safeParseSync(result).obj.stdoutText.trim();
  }

  private getContainerConfigsFromJsonFile(inputPath: string) {
    const me = this;
    const fullInputPath = me.commandUtil.getConfigFilePath(inputPath, '.json');
    if (!fileExists.sync(fullInputPath)) {
      me.commandUtil.processExitWithError(new Error(`\n'${fullInputPath}' does not exist`));
    }
    const stackConfigTemplate = <DockerStackConfigTemplate>me.safeJson.readFileSync(fullInputPath, undefined);
    return {fullInputPath, stackConfigTemplate};
  }

  private composeAndWriteTemplate(catalogEntryName: string,
                                  dockerMachineHostType: string,
                                  dockerComposeYamlPath: string,
                                  outputTemplateFileName: string,
                                  cb: (err: Error, msg?: string) => void) {
    const me = this;
    me.createOutputPath(path.resolve(process.cwd(), 'tmp.txt'), outputTemplateFileName, '.json', (err, fullOutputPath, outputFileExists) => {
      if (catalogEntryName === undefined) {
        //Just write out the descriptors we have "baked in" to this application
        if (fileExists.sync(fullOutputPath)
          && !me.positive.areYouSure(
            `Config file '${fullOutputPath}' already exists. Overwrite? [Y/n] `,
            'Operation canceled.',
            true,
            FailureRetVal.TRUE)) {
          return cb(null);
        }
        const dockerMachineWrapperPath =
          path.resolve(__dirname, `../../docker/docker-machine-wrappers/${dockerMachineHostType}.json`);
        const dockerMachineWrapper = me.safeJson.readFileSync(dockerMachineWrapperPath, undefined);
        const dockerComposeYaml = YAML.load(dockerComposeYamlPath);
        const jsonTemplate = Object.assign({}, dockerMachineWrapper, {dockerComposeYaml});
        //let jsonTemplate = Object.assign({}, DockerDescriptors.dockerStackConfigTemplate, {dockerComposeYaml});
        me.dockerUtil.writeJsonTemplateFile(jsonTemplate, fullOutputPath);
        cb(null, 'Template written.');
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
    });
  }

  private callbackAndExitIfError(err: Error, cb: () => void) {
    if (!err) {
      return;
    }
    if (cb) {
      cb();
    }
    this.commandUtil.processExitWithError(err, 'OK');
  }

  private callbackAndExitWithError(err: Error, cb: () => void) {
    if (cb) {
      cb();
    }
    this.commandUtil.processExitWithError(err, 'OK');
  }

  private camelToSnake(name, separator) {
    return name.replace(/([a-z]|(?:[A-Z]+))([A-Z]|$)/g, function (_, $1, $2) {
      return $1 + ($2 && (separator || '_') + $2);
    }).toLowerCase();
  }

  private createOutputPath(inPathFragment: string,
                           outPathFragment: string,
                           extension: string,
                           cb: (err: Error, createdOutputPath: string, exists?: boolean) => void) {
    if (path.extname(outPathFragment) !== extension) {
      outPathFragment += extension;
    }
    if (!path.isAbsolute(outPathFragment)) {
      outPathFragment = path.resolve(path.dirname(inPathFragment), outPathFragment);
    }
    const pathDirname = path.dirname(outPathFragment);
    mkdirp(pathDirname, (err) => {
      if (err) {
        return cb(err, outPathFragment);
      }
      //Check existence of file
      fileExists(outPathFragment, (err, exists) => {
        touch(outPathFragment, (err) => {
          if (err || exists) {
            return cb(err, outPathFragment, exists);
          }
          fs.unlink(outPathFragment, (err) => {
            return cb(err, outPathFragment, exists);
          });
        });
      });
    });
  };
}
