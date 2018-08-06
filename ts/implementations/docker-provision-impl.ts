import {injectable, inject} from 'inversify';
import {Positive, FailureRetVal, CommandUtil, ProgressBar, Spawn, ForceErrorImpl, SafeJson} from 'firmament-yargs';
import {DockerContainerManagement} from '../interfaces/docker-container-management';
import {DockerImageManagement} from '../interfaces/docker-image-management';
import * as async from 'async';
import * as fs from 'fs';
import * as YAML from 'yamljs';
import * as path from 'path';
import * as tmp from 'tmp';
import * as mkdirp from 'mkdirp';
import * as touch from 'touch';
import {RemoteCatalogGetter} from 'firmament-yargs';
import {DockerProvision} from '../interfaces/docker-provision';
import {DockerUtil} from '../interfaces/docker-util';
import {
  DockerMachineDriverOptions_openstack, DockerMachineDriverOptions_vmwarevsphere, DockerServiceDescription,
  DockerStackConfigTemplate
} from '../';
import {ProcessCommandJson} from 'firmament-bash/js/interfaces/process-command-json';

const fileExists = require('file-exists');
const jsonFile = require('jsonfile');

//const path = require('path');
//const templateCatalogUrl = '/home/jreeme/src/firmament-docker/docker/provisionTemplateCatalog.json';

//const templateCatalogUrl = 'https://raw.githubusercontent.com/jreeme/firmament-docker/master/docker/provisionTemplateCatalog.json';
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
    const dockerImageRegex = /.+?:\d+?\/.+?:.+$/g;
    for (const service in dsct.dockerComposeYaml.services) {
      const s = <DockerServiceDescription>dsct.dockerComposeYaml.services[service];
      if (!s.image || !dockerImageRegex.test(s.image)) {
        if (!dsct.defaultDockerRegistry) {
          return cb(new Error(`Service '${service}' missing 'image' property and 'defaultDockerRegistry' is undefined`));
        }
        if (!dsct.defaultDockerImageTag) {
          return cb(new Error(`Service '${service}' missing 'image' property and 'defaultDockerImageTag' is undefined`));
        }
        if(s.image){
          s.image = `${dsct.defaultDockerRegistry}/${s.image}:${dsct.defaultDockerImageTag}`;
        }else{
          s.image = `${dsct.defaultDockerRegistry}/${service}:${dsct.defaultDockerImageTag}`;
        }
      }
      const labels = {};
      if (s.deploy.labels) {
        let traefikPortLabelPresent = false;
        let frontendRuleLabelPresent = false;
        const portRegex = /traefik\.(.*?\.|)port/g;
        const frontendRuleRegex = /traefik\.(.*?\.|)frontend.rule/g;
        s.deploy.labels.forEach((label) => {
          const tuple = label.split('=');
          if(portRegex.test(tuple[0])){
            traefikPortLabelPresent = true;
          }
          if(frontendRuleRegex.test(tuple[0])){
            frontendRuleLabelPresent = true;
          }
          labels[tuple[0]] = tuple[1];
        });
        if (labels['traefik.enable'] !== 'false') {
          if (!traefikPortLabelPresent) {
            return cb(new Error(`'traefik.??.port' label not present for service '${service}'`));
          }
          if (!labels['traefik.backend']) {
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
    //me.dockerUtil.writeJsonTemplateFile(dsct, '/tmp/tmp.json');
    cb(null, dsct);
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

  buildTemplate(argv: any, cb: () => void = null) {
    const me = this;
    const {fullInputPath, stackConfigTemplate} = me.getContainerConfigsFromJsonFile(argv.input);
    me.validateDockerStackConfigTemplate(stackConfigTemplate, (err, stackConfigTemplate) => {
      if (err) {
        if (cb) {
          return cb();
        }
        me.commandUtil.processExitWithError(err, 'OK');
      }
      me.stackConfigTemplate = stackConfigTemplate;
      switch (stackConfigTemplate.dockerMachineDriverOptions.driver) {
        case 'openstack': {
          const dockerMachineDriverOptions =
            (<DockerMachineDriverOptions_openstack>stackConfigTemplate.dockerMachineDriverOptions);
          if (argv.username) {
            dockerMachineDriverOptions.openstackUsername = argv.username;
          }
          if (argv.password) {
            dockerMachineDriverOptions.openstackPassword = argv.password;
          }
          break;
        }
        case 'vmwarevsphere': {
          const dockerMachineDriverOptions =
            (<DockerMachineDriverOptions_vmwarevsphere>stackConfigTemplate.dockerMachineDriverOptions);
          if (argv.username) {
            dockerMachineDriverOptions.vmwarevsphereUsername = argv.username;
          }
          if (argv.password) {
            dockerMachineDriverOptions.vmwarevspherePassword = argv.password;
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

//(alter vm.max_map_count in boot2docker ISO
//https://github.com/boot2docker/boot2docker/issues/1216
  private createDockerMachines(fullInputPath: string, stackConfigTemplate: DockerStackConfigTemplate, argv: any, cb: (err, result?) => void) {
    const me = this;
    cb = me.checkCallback(cb);
    const dockerMachineCmd = [
      'docker-machine',
      'create'
    ];
    //Add base driver options (the ones used for both master & worker)
    for (const dockerMachineDriverOption in stackConfigTemplate.dockerMachineDriverOptions) {
      const optionKey = me.camelToSnake(dockerMachineDriverOption, '-');
      const optionValue = stackConfigTemplate.dockerMachineDriverOptions[dockerMachineDriverOption];
      //There are some options --engine-opt & --engine-env that require a <space> instead of an <=> symbol
      //between Key & Value. This seems to be because the Value has an <=> symbol in it.
      //(e.g. --engine-opt dns=8.8.8.8 & --engine-env HTTP_PROXY=http://bananna-daiquiri.drink
      const keyValueSeparator = ((typeof optionValue !== 'string') || (optionValue.indexOf('=') === -1)) ? '=' : ' ';
      dockerMachineCmd.push(`--${optionKey}${keyValueSeparator}${optionValue}`);
    }
    const masterMachineName = `${stackConfigTemplate.clusterPrefix}-master`;
    async.waterfall([
      (cb) => {
        const masterDockerMachineCmd = dockerMachineCmd.slice();
        for (const dockerMachineMasterOption in stackConfigTemplate.dockerMachineMasterOptions) {
          const optionKey = me.camelToSnake(dockerMachineMasterOption, '-');
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
            const optionKey = me.camelToSnake(dockerMachineWorkerOption, '-');
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
          cb(err, ip);
        });
      },
      (ip, cb) => {
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
            cb(null, env, ip);
          });
      },
      (env, ip, cb) => {
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
          fs.writeFile(tmpPath, yaml, (err) => {
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

  private handleDockerMachineExecutionFailure(err: Error, cb: (err, result?) => void) {
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
              const msg = `'docker-machine' installed. Try provisioning again.`;
              cb(err, err ? null : msg);
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

  private createDockerMachine(dockerMachineCmd: any[], cb: (err, result?) => void) {
    const me = this;
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
    const me = this;
    me.adjustBoot2DockerProfile(machineName, (err) => {
      cb(err);
    });
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
` : `
#Need to set vm.max_map_count to 262144 to support ElasticSearch (ES fails in production without it)    
sysctl -w vm.max_map_count=262144
`;
    const dockerMachineJoinSwarmCmd = [
      `echo '${profileLines}' | sudo tee -a /var/lib/boot2docker/profile && sudo /etc/init.d/docker restart`
    ];
    me.runCommandOnDockerMachineHost(machineName, dockerMachineJoinSwarmCmd, cb);
  }

  private runCommandOnDockerMachineHost(machineName: string, commandArray: string[], cb: (err, result) => void) {
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
    const stackConfigTemplate = <DockerStackConfigTemplate>jsonFile.readFileSync(fullInputPath);
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
        const dockerMachineWrapper = jsonFile.readFileSync(dockerMachineWrapperPath);
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
