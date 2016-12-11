import {injectable, inject} from "inversify";
import {DockerMake} from "../interfaces/docker-make";
import {DockerDescriptors} from "../interfaces/docker-descriptors";
import {
  ContainerConfig, DockerContainer, ExpressApp, ImageOrContainerRemoveResults
} from "../interfaces/dockerode";
import {Positive, FailureRetVal, CommandUtil, ProgressBar, Spawn, ForceErrorImpl} from "firmament-yargs";
import {DockerContainerManagement} from "../interfaces/docker-container-management";
import {DockerImageManagement} from "../interfaces/docker-image-management";
import * as async from 'async';
import * as _ from 'lodash';
import * as fs from 'fs';
const path = require('path');
const jsonFile = require('jsonfile');
const request = require('request');
const fileExists = require('file-exists');
const templateCatalogUrl = 'https://raw.githubusercontent.com/jreeme/firmament-docker/master/docker/templateCatalog.json';

@injectable()
export class DockerMakeImpl extends ForceErrorImpl implements DockerMake {
  private positive: Positive;
  private spawn: Spawn;
  private commandUtil: CommandUtil;
  private progressBar: ProgressBar;
  private dockerImageManagement: DockerImageManagement;
  private dockerContainerManagement: DockerContainerManagement;

  constructor(@inject('CommandUtil') _commandUtil: CommandUtil,
              @inject('Spawn') _spawn: Spawn,
              @inject('DockerImageManagement') _dockerImageManagement: DockerImageManagement,
              @inject('DockerContainerManagement') _dockerContainerManagement: DockerContainerManagement,
              @inject('Positive') _positive: Positive,
              @inject('ProgressBar') _progressBar: ProgressBar) {
    super();
    this.positive = _positive;
    this.progressBar = _progressBar;
    this.spawn = _spawn;
    this.dockerImageManagement = _dockerImageManagement;
    this.dockerContainerManagement = _dockerContainerManagement;
    this.commandUtil = _commandUtil;
  }

  buildTemplate(argv: any, cb: (err: Error, result?: string)=>void = null) {
    cb = this.checkCallback(cb);
    const fullInputPath = this.commandUtil.getConfigFilePath(argv.input, '.json');
    this.commandUtil.log("Constructing Docker containers described in: '" + fullInputPath + "'");
    const baseDir = path.dirname(fullInputPath);
    if (!fileExists(fullInputPath)) {
      let err = new Error(`'${fullInputPath}' does not exist`);
      if (this.commandUtil.callbackIfError(cb, err)) {
        return;
      }
    }
    const containerDescriptors = jsonFile.readFileSync(fullInputPath);
    this.processContainerConfigs(containerDescriptors, baseDir, (err: Error, result: string) => {
      if (this.commandUtil.callbackIfError(cb, err)) {
        return;
      }
      cb(err, result);
    });
  }

  makeTemplate(argv: any) {
    let me = this;
    const fullOutputPath = this.commandUtil.getConfigFilePath(argv.input, '.json');
    async.waterfall([
        (cb: (err: Error, containerTemplatesToWrite?: any)=>void) => {
          if (argv.get === undefined) {
            cb(null, argv.full
              ? DockerDescriptors.dockerContainerDefaultTemplate
              : DockerDescriptors.dockerContainerConfigTemplate);
          }
          else {
            request(templateCatalogUrl,
              (err, res, body) => {
                try {
                  let templateCatalog: any[] = JSON.parse(body);
                  let templateMap = {};
                  templateCatalog.forEach(template => {
                    templateMap[template.name] = template;
                  });
                  if (!argv.get.length) {
                    me.commandUtil.log('\nAvailable templates:\n');
                    for (let key in templateMap) {
                      //noinspection JSUnfilteredForInLoop
                      me.commandUtil.log('> ' + templateMap[key].name);
                    }
                    cb(null, null);
                  } else if (argv.get) {
                    if (!templateMap[argv.get]) {
                      cb(new Error("Could not find template '" + argv.get + "'"));
                    } else {
                      request(templateMap[argv.get].url,
                        (err, res, body) => {
                          try {
                            cb(null, JSON.parse(body));
                          } catch (e) {
                            cb(new Error('Template found but is not valid (not JSON)' + e.message));
                          }
                        });
                    }
                  }
                } catch (e) {
                  cb(new Error('Error getting template catalog ' + e.message));
                }
              });
          }
        },
        (containerTemplatesToWrite: any, cb: (err: Error, msg?: any)=>void) => {
          if (containerTemplatesToWrite) {
            if (fs.existsSync(fullOutputPath)
              && !me.positive.areYouSure(
                `Config file '${fullOutputPath}' already exists. Overwrite? [Y/n] `,
                'Operation canceled.',
                true,
                FailureRetVal.TRUE)) {
              cb(null, 'Canceling JSON template creation!');
              return;
            } else {
              me.writeJsonTemplateFile(containerTemplatesToWrite, fullOutputPath);
            }
          }
          cb(null);
        }],
      (err: Error, msg: any = null) => {
        me.commandUtil.processExitWithError(err, msg);
      });
  }

  private processContainerConfigs(containerConfigs: ContainerConfig[], baseDir: string, cb: (err: Error, results: string)=>void) {
    let self = this;
    let containerConfigsByImageName = {};
    containerConfigs.forEach(containerConfig => {
      containerConfigsByImageName[containerConfig.Image] = containerConfig;
    });
    //noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols
    async.waterfall([
      //Remove all containers mentioned in config file
      (cb: (err: Error, containerRemoveResults: ImageOrContainerRemoveResults[])=>void) => {
        this.dockerContainerManagement.removeContainers(containerConfigs.map(containerConfig => containerConfig.name), cb);
      },
      (containerRemoveResults: ImageOrContainerRemoveResults[], cb: (err: Error, missingImageNames: string[])=>void) => {
        this.dockerImageManagement.listImages(false, (err, images) => {
          if (self.commandUtil.callbackIfError(cb, err)) {
            return;
          }
          let repoTags = {};
          images.forEach(dockerImage => {
            repoTags[dockerImage.RepoTags[0]] = true;
          });
          let missingImageNames: string[] = [];
          containerConfigs.forEach(containerConfig => {
            let imageName = (containerConfig.Image.indexOf(':') == -1)
              ? containerConfig.Image + ':latest'
              : containerConfig.Image;
            if (!repoTags[imageName]) {
              missingImageNames.push(imageName);
            }
          });
          cb(null, _.uniq(missingImageNames));
        });
      },
      (missingImageNames: string[], cb: (err: Error, missingImageNames: string[])=>void) => {
        async.mapSeries(missingImageNames,
          (missingImageName, cb: (err: Error, missingImageName: string)=>void) => {
            //Try to pull image
            this.dockerImageManagement.pullImage(missingImageName,
              (taskId, status, current, total) => {
                self.progressBar.showProgressForTask(taskId, status, current, total);
              },
              (err: Error) => {
                cb(null, err ? missingImageName : null);
              });
          },
          (err: Error, missingImageNames: string[]) => {
            if (self.commandUtil.callbackIfError(cb, err)) {
              return;
            }
            cb(null, missingImageNames.filter(missingImageName => !!missingImageName));
          });
      },
      (missingImageNames: string[], cb: (err: Error, containerBuildErrors: Error[])=>void) => {
        async.mapSeries(missingImageNames,
          (missingImageName, cb: (err: Error, containerBuildError: Error)=>void) => {
            const containerConfig = containerConfigsByImageName[missingImageName];
            //Try to build from Dockerfile
            let dockerFilePath = path.resolve(baseDir, containerConfig.DockerFilePath);
            let dockerImageName = containerConfig.Image;
            this.dockerImageManagement.buildDockerFile(dockerFilePath, dockerImageName,
              function (taskId, status, current, total) {
                self.progressBar.showProgressForTask(taskId, status, current, total);
              },
              (err: Error) => {
                cb(null, err
                  ? new Error('Unable to build Dockerfile at "' + dockerFilePath + '" because: ' + err.message)
                  : null);
              });
          },
          (err: Error, errors: Error[]) => {
            if (self.commandUtil.callbackIfError(cb, err)) {
              return;
            }
            errors = errors.filter(error => !!error);
            cb(self.commandUtil.logErrors(errors).length ? new Error() : null, errors);
          });
      },
      (errs: Error[], cb: (err: Error, results: any)=>void) => {
        try {
          let sortedContainerConfigs = self.containerDependencySort(containerConfigs);
          //noinspection JSUnusedLocalSymbols
          async.mapSeries(sortedContainerConfigs,
            (containerConfig, cb: (err: Error, result: any)=>void) => {
              this.dockerContainerManagement.createContainer(containerConfig, (err: Error, container: DockerContainer) => {
                self.commandUtil.logAndCallback('Container "' + containerConfig.name + '" created.', cb, err, container);
              });
            },
            (err: Error, containers: DockerContainer[]) => {
              if (self.commandUtil.callbackIfError(cb, err)) {
                return;
              }
              let sortedContainerNames = sortedContainerConfigs.map(containerConfig => containerConfig.name);
              this.dockerContainerManagement.startOrStopContainers(sortedContainerNames, true, () => {
                cb(null, null);
              });
            }
          );
        } catch (err) {
          self.commandUtil.callbackIfError(cb, err);
        }
      },
      function deployExpressApps(errs: Error[], cb: (err: Error, results: any)=>void) {
        //noinspection JSUnusedLocalSymbols
        async.mapSeries(containerConfigs,
          (containerConfig: ContainerConfig, cb: (err: Error, result: any)=>void) => {
            //noinspection JSUnusedLocalSymbols
            async.mapSeries(containerConfig.ExpressApps || [],
              (expressApp: ExpressApp, cb: (err: Error, result: any)=>void) => {
                //noinspection JSUnusedLocalSymbols
                async.series([
                  (cb: (err: Error, result?: any)=>void) => {//Figure out git clone folder name and check 'DeployExisting'
                    let cwd = process.cwd();
                    let serviceName = expressApp.ServiceName;
                    if (expressApp.DeployExisting) {
                      let serviceSourceFolders = fs.readdirSync(cwd).filter((fileName) => {
                        return fileName.substring(0, serviceName.length) === serviceName;
                      });
                      if (serviceSourceFolders.length > 1) {
                        let msg = 'DeployExisting was specified but there is more than one service named: ';
                        msg += serviceName + ': ' + serviceSourceFolders + '. Delete all but one and retry.';
                        cb(new Error(msg));
                        return;
                      } else if (serviceSourceFolders.length > 0) {
                        expressApp.GitCloneFolder = cwd + '/' + serviceSourceFolders[0];
                        cb(null);
                        return;
                      }
                    }
                    expressApp.GitCloneFolder = cwd + '/' + expressApp.ServiceName + (new Date()).getTime();
                    cb(null);
                  },
                  (cb: (err: Error, result?: any)=>void) => {//Clone Express app Git Repo
                    //Check for existence of GitCloneFolder ...
                    //noinspection JSUnusedLocalSymbols
                    fs.stat(expressApp.GitCloneFolder, (err, stats) => {
                      if (err) {
                        //Directory does not exist, clone it
                        self.gitClone(expressApp.GitUrl,
                          expressApp.GitSrcBranchName,
                          expressApp.GitCloneFolder, (err: Error) => {
                            cb(err);
                          });
                      } else {
                        cb(null);
                      }
                    });
                  },
                  (cb: (err: Error, result: any)=>void) => {//Make sure there's a Strongloop PM listening
                    let retries: number = 3;
                    (function checkForStrongloop() {
                      self.remoteSlcCtlCommand('Looking for SLC PM ...', expressApp, ['info'],
                        (err: Error, result: string) => {
                          --retries;
                          const errorMsg = 'Strongloop not available';
                          const readyResult = /Driver Status:\s+running/;
                          if (err) {
                            cb(new Error(err.message), errorMsg);
                            setTimeout(checkForStrongloop, 3000);
                          } else if (readyResult.test(result)) {
                            cb(null, 'Strongloop ready.');
                          } else if (retries < 0) {
                            cb(new Error(errorMsg), errorMsg);
                          } else {
                            setTimeout(checkForStrongloop, 3000);
                          }
                        });
                    })();
                  },
                  (cb: (err: Error, result: any)=>void) => {//Create Strongloop app
                    let serviceName = expressApp.ServiceName;
                    let msg = 'Creating ' + serviceName;
                    self.remoteSlcCtlCommand(msg, expressApp, ['create', serviceName], cb);
                  },
                  (cb: (err: Error, result?: any)=>void) => {//Set ClusterSize
                    if (!expressApp.ClusterSize) {
                      cb(null);
                      return;
                    }
                    let clusterSize = expressApp.ClusterSize.toString();
                    self.remoteSlcCtlCommand('Setting cluster size to: ' + clusterSize,
                      expressApp, ['set-size', expressApp.ServiceName, clusterSize], cb);
                  },
                  (cb: (err: Error, result?: any)=>void) => {//Set ExpressApp environment
                    expressApp.EnvironmentVariables = expressApp.EnvironmentVariables || {};
                    let cmd = ['env-set', expressApp.ServiceName];
                    for (let environmentVariable in expressApp.EnvironmentVariables) {
                      //noinspection JSUnfilteredForInLoop
                      cmd.push(environmentVariable
                        + '='
                        + expressApp.EnvironmentVariables[environmentVariable]);
                    }
                    self.remoteSlcCtlCommand('Setting environment variables', expressApp, cmd, cb);
                  },
                  (cb: (err: Error, result?: any)=>void) => {//Perform Bower install if required
                    if (!expressApp.DoBowerInstall) {
                      cb(null);
                      return;
                    }
                    let cwd = expressApp.GitCloneFolder;
                    self.spawn.spawnShellCommandAsync(['bower', 'install', '--config.interactive=false'], {
                      cwd
                    }, cb);
                  },
                  (cb: (err: Error, result: any)=>void) => {
                    //Perform NPM install --ignore-scripts in case any scripts require node_modules
                    let cwd = expressApp.GitCloneFolder;
                    self.spawn.spawnShellCommandAsync(['npm', 'install', '--ignore-scripts'], {cwd}, cb);
                  },
                  (cb: (err: Error, result: any)=>void) => {//Execute local scripts
                    //noinspection JSUnusedLocalSymbols
                    async.mapSeries(expressApp.Scripts || [],
                      (script, cb: (err: Error, result: any)=>void) => {
                        let cwd = expressApp.GitCloneFolder + '/' + script.RelativeWorkingDir;
                        let cmd = [script.Command];
                        cmd = cmd.concat(script.Args);
                        self.spawn.spawnShellCommandAsync(cmd, {cwd}, cb);
                      },
                      (err: Error, results: any) => {
                        cb(err, null);
                      });
                  },
                  (cb: (err: Error, result: any)=>void) => {//Perform Strongloop build ...
                    let cwd = expressApp.GitCloneFolder;
                    self.spawn.spawnShellCommandAsync(['slc', 'build', '--scripts'], {cwd}, cb);
                  },
                  (cb: (err: Error, result: any)=>void) => {//... and Strongloop deploy
                    let cwd = expressApp.GitCloneFolder;
                    this.commandUtil.log('StrongLoop Deploying @ ' + cwd);
                    self.spawn.spawnShellCommandAsync(['slc', 'deploy', '--service=' + expressApp.ServiceName,
                      expressApp.StrongLoopServerUrl], {cwd}, cb);
                  }
                ], cb);
              }, cb);
          }, cb);
      }
    ], cb);
  }

  private containerDependencySort(containerConfigs) {
    const sortedContainerConfigs = [];
    //Sort on linked container dependencies
    const objectToSort = {};
    const containerConfigByNameMap = {};
    containerConfigs.forEach(function (containerConfig) {
      if (containerConfigByNameMap[containerConfig.name]) {
        console.error('Same name is used by more than one container.');
      }
      containerConfigByNameMap[containerConfig.name] = containerConfig;
      const dependencies = [];
      if (containerConfig.HostConfig && containerConfig.HostConfig.Links) {
        containerConfig.HostConfig.Links.forEach(function (link) {
          const linkName = link.split(':')[0];
          dependencies.push(linkName);
        });
      }
      objectToSort[containerConfig.name] = dependencies;
    });
    const sortedContainerNames = this.topologicalDependencySort(objectToSort);
    sortedContainerNames.forEach(function (sortedContainerName) {
      sortedContainerConfigs.push(containerConfigByNameMap[sortedContainerName]);
    });
    return sortedContainerConfigs;
  }

  private topologicalDependencySort(graph) {
    const sorted = [], // sorted list of IDs ( returned value )
      visited = {}; // hash: id of already visited node => true
    // 2. topological sort
    try {
      Object.keys(graph).forEach(function visit(name: string, ancestors: any) {
        // if already exists, do nothing
        if (visited[name]) {
          return
        }
        if (!Array.isArray(ancestors)) {
          ancestors = []
        }
        ancestors.push(name);
        visited[name] = true;
        const deps = graph[name];
        deps.forEach(function (dep) {
          if (ancestors.indexOf(dep) >= 0) {
            console.error('Circular dependency "' + dep + '" is required by "' + name + '": ' + ancestors.join(' -> '));
          }
          visit(dep, ancestors.slice(0)); // recursive call
        });
        sorted.push(name);
      });
    } catch (ex) {
      throw new Error('Linked container dependency sort failed. You are probably trying to link to an unknown container.');
    }
    return sorted;
  }

  private remoteSlcCtlCommand(msg: string, expressApp: ExpressApp, cmd: string[], cb: (err: Error, result: string)=>void) {
    let cwd = expressApp.GitCloneFolder;
    let serviceName = expressApp.ServiceName;
    let serverUrl = expressApp.StrongLoopServerUrl;
    this.commandUtil.log(msg + ' "' + serviceName + '" @ "' + cwd + '" via "' + serverUrl + '"');
    const baseCmd = ['slc', 'ctl', '-C', serverUrl];
    Array.prototype.push.apply(baseCmd, cmd);
    this.spawn.spawnShellCommandAsync(baseCmd, {cwd, stdio: 'pipe'}, (err, result) => {
      this.commandUtil.log(result);
      cb(err, result);
    });
  }

  private gitClone(gitUrl: string, gitBranch: string, localFolder: string, cb: (err: Error, child: any)=>void) {
    this.spawn.spawnShellCommandAsync(['git', 'clone', '-b', gitBranch, '--single-branch', gitUrl, localFolder],
      {cwd: process.cwd(), stdio: 'pipe'}, cb);
  }

  private writeJsonTemplateFile(objectToWrite: any, fullOutputPath: string) {
    this.commandUtil.log("Writing JSON template file '" + fullOutputPath + "' ...");
    const jsonFile = require('jsonfile');
    jsonFile.spaces = 2;
    jsonFile.writeFileSync(fullOutputPath, objectToWrite);
  }
}
