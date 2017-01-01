import {injectable, inject} from "inversify";
import {ChildProcess, spawn} from 'child_process';
import {DockerMake} from "../interfaces/docker-make";
import {DockerDescriptors} from "../interfaces/docker-descriptors";
import {
  ContainerConfig, DockerContainer, ExpressApp, ImageOrContainerRemoveResults
} from "../interfaces/dockerode";
import {Positive, FailureRetVal, CommandUtil, ProgressBar, Spawn, ForceErrorImpl} from "firmament-yargs";
import {DockerContainerManagement} from "../interfaces/docker-container-management";
import {DockerImageManagement} from "../interfaces/docker-image-management";
import * as _ from 'lodash';
import * as fs from 'fs';
import {FirmamentTemplateCatalog, FirmamentTemplateDownloadResult} from "../custom-typings";
const path = require('path');
const jsonFile = require('jsonfile');
const request = require('request');
const fileExists = require('file-exists');
const async = require('async');
const templateCatalogUrl = 'https://raw.githubusercontent.com/jreeme/firmament-docker/master/docker/templateCatalog.json';
const url = require('url');
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

  buildTemplate(argv: any) {
    let me = this;
    const fullInputPath = me.commandUtil.getConfigFilePath(argv.input, '.json');
    me.commandUtil.log("Constructing Docker containers described in: '" + fullInputPath + "'");
    if (!fileExists(fullInputPath)) {
      let err = new Error(`\n'${fullInputPath}' does not exist`);
      me.commandUtil.processExitWithError(err);
    }
    const baseDir = path.dirname(fullInputPath);
    const containerDescriptors = jsonFile.readFileSync(fullInputPath);
    me.processContainerConfigs(containerDescriptors, baseDir, (err: Error, result: string) => {
      me.commandUtil.processExitWithError(err, `Finished.\n`);
    });
  }

  makeTemplate(argv: any) {
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
        me.writeJsonTemplateFile(argv.full
          ? DockerDescriptors.dockerContainerDefaultTemplate
          : DockerDescriptors.dockerContainerConfigTemplate, this.commandUtil.getConfigFilePath(argv.output, '.json'));
      }
      me.commandUtil.processExit();
    } else {
      //Need to interact with the network to get templates
      request(templateCatalogUrl,
        (err, res, body) => {
          try {
            let templateCatalog: FirmamentTemplateCatalog[] = JSON.parse(body);
            if (!argv.get.length) {
              //User specified --get with no template name so write available template names to console
              me.commandUtil.log('\nAvailable templates:\n');
              templateCatalog.forEach(template => {
                me.commandUtil.log('> ' + template.name);
              });
              me.commandUtil.processExit();
            } else {
              //User specified a template, let's go get it
              let templateToDownload = _.find(templateCatalog, t => {
                return t.name === argv.get;
              });
              if (!templateToDownload) {
                me.commandUtil.processExitWithError(new Error(`\nTemplate catalog '${argv.get}' does not exist.\n`));
              }
              //Get and write all the urls
              let fnArray: any[] = [];
              templateToDownload.urls.forEach(url => {
                fnArray.push(async.apply((url, cb) => {
                  request(url, (err, res, body) => {
                    cb(null, {url, body});
                  });
                }, url));
              });
              async.parallel(fnArray, (err, results: FirmamentTemplateDownloadResult[]) => {
                const finishedMsg = `\nTemplate '${templateToDownload.name}' written.\n`;
                if (err) {
                  me.commandUtil.processExitWithError(err, finishedMsg);
                }
                results.forEach(result => {
                  try {
                    let parsedUrl = url.parse(result.url);
                    let outputPath = path.resolve(process.cwd(), path.basename(parsedUrl.path));
                    fs.writeFileSync(outputPath, result.body);
                  } catch (err) {
                    me.commandUtil.processExitWithError(err);
                  }
                });
                me.commandUtil.processExit(0, finishedMsg);
              });
            }
          } catch (e) {
            me.commandUtil.processExitWithError(new Error('Error getting template catalog ' + e.message));
          }
        });
    }
  }

  private processContainerConfigs(containerConfigs: ContainerConfig[], baseDir: string, cb: (err: Error, results: string)=>void) {
    let me = this;
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
          if (me.commandUtil.callbackIfError(cb, err)) {
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
                me.progressBar.showProgressForTask(taskId, status, current, total);
              },
              (err: Error) => {
                cb(null, err ? missingImageName : null);
              });
          },
          (err: Error, missingImageNames: string[]) => {
            if (me.commandUtil.callbackIfError(cb, err)) {
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
                me.progressBar.showProgressForTask(taskId, status, current, total);
              },
              (err: Error) => {
                cb(null, err
                  ? new Error('Unable to build Dockerfile at "' + dockerFilePath + '" because: ' + err.message)
                  : null);
              });
          },
          (err: Error, errors: Error[]) => {
            if (me.commandUtil.callbackIfError(cb, err)) {
              return;
            }
            errors = errors.filter(error => !!error);
            cb(me.commandUtil.logErrors(errors).length ? new Error() : null, errors);
          });
      },
      (errs: Error[], cb: (err: Error, results: any)=>void) => {
        try {
          let sortedContainerConfigs = me.containerDependencySort(containerConfigs);
          //noinspection JSUnusedLocalSymbols
          async.mapSeries(sortedContainerConfigs,
            (containerConfig, cb: (err: Error, result: any)=>void) => {
              this.dockerContainerManagement.createContainer(containerConfig, (err: Error, container: DockerContainer) => {
                me.commandUtil.logAndCallback('Container "' + containerConfig.name + '" created.', cb, err, container);
              });
            },
            (err: Error, containers: DockerContainer[]) => {
              if (me.commandUtil.callbackIfError(cb, err)) {
                return;
              }
              let sortedContainerNames = sortedContainerConfigs.map(containerConfig => containerConfig.name);
              this.dockerContainerManagement.startOrStopContainers(sortedContainerNames, true, () => {
                cb(null, null);
              });
            }
          );
        } catch (err) {
          me.commandUtil.callbackIfError(cb, err);
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
                        me.gitClone(expressApp.GitUrl,
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
                      me.remoteSlcCtlCommand('Looking for SLC PM ...', expressApp, ['info'],
                        (err: Error, result: string) => {
                          --retries;
                          const errorMsg = 'Strongloop not available';
                          const readyResult = /Driver Status:\s+running/;
                          if (err) {
                            //This happens if SLC not ready yet ...
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
                    me.remoteSlcCtlCommand(msg, expressApp, ['create', serviceName], cb);
                  },
                  (cb: (err: Error, result?: any)=>void) => {//Set ClusterSize
                    if (!expressApp.ClusterSize) {
                      cb(null);
                      return;
                    }
                    let clusterSize = expressApp.ClusterSize.toString();
                    me.remoteSlcCtlCommand('Setting cluster size to: ' + clusterSize,
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
                    me.remoteSlcCtlCommand('Setting environment variables', expressApp, cmd, cb);
                  },
                  (cb: (err: Error, result?: any)=>void) => {//Perform Bower install if required
                    if (!expressApp.DoBowerInstall) {
                      cb(null);
                      return;
                    }
                    let cwd = expressApp.GitCloneFolder;
                    me.spawnIt(['bower', 'install', '--config.interactive=false'], {cwd},
                      (err, result) => {
                        me.commandUtil.log(result.toString());
                      },
                      cb);
                  },
                  (cb: (err: Error, result: any)=>void) => {
                    let cwd = expressApp.GitCloneFolder;
                    //Do an 'npm install' here in case any scripts need node_modules
                    me.spawnIt(['npm', 'install', '--quiet'], {cwd},
                      (err, result) => {
                        me.commandUtil.log(result.toString());
                      },
                      cb);
                  },
                  (cb: (err: Error, result: any)=>void) => {//Execute local scripts
                    //noinspection JSUnusedLocalSymbols
                    async.mapSeries(expressApp.Scripts || [],
                      (script, cb: (err: Error, result: any)=>void) => {
                        let cwd = expressApp.GitCloneFolder + '/' + script.RelativeWorkingDir;
                        let cmd = [script.Command];
                        cmd = cmd.concat(script.Args);
                        me.spawnIt(cmd, {cwd},
                          (err, result) => {
                            me.commandUtil.log(result.toString());
                          },
                          cb);
                      },
                      (err: Error, results: any) => {
                        cb(err, null);
                      });
                  },
                  (cb: (err: Error, result: any)=>void) => {//Perform Strongloop build ...
                    let cwd = expressApp.GitCloneFolder;
                    me.spawnIt(['slc', 'build', '--scripts'], {cwd},
                      (err, result) => {
                        me.commandUtil.log(result.toString());
                      },
                      cb);
                  },
                  (cb: (err: Error, result: any)=>void) => {//... and Strongloop deploy
                    let cwd = expressApp.GitCloneFolder;
                    me.commandUtil.log('StrongLoop Deploying @ ' + cwd);
                    me.spawnIt(['slc', 'deploy', '--service=' + expressApp.ServiceName, expressApp.StrongLoopServerUrl], {cwd},
                      (err, result) => {
                        me.commandUtil.log(result.toString());
                      },
                      cb);
                  }
                ], cb);
              }, cb);
          }, cb);
      }
    ], cb);
  }

  private spawnIt(cmd,
                  options,
                  cbStatus: (err: Error, result?: string)=>void,
                  cbFinal: (err: Error, result?: any)=>void): ChildProcess {
    let me = this;
    let args = cmd.slice(0);
    cmd = args.shift();
    let stdoutText = '';
    let stderrText = '';
    console.log(`Spawning: ${cmd} : ${args}`);
    let childProcess = spawn(cmd, args, options);
    childProcess.stderr.on('data', (dataChunk: Uint8Array) => {
      let text = dataChunk.toString();
      cbStatus(new Error(text), text);
      stderrText += text;
    });
    childProcess.stdout.on('data', (dataChunk: Uint8Array) => {
      let text = dataChunk.toString();
      cbStatus(null, text);
      stdoutText += text;
    });
    childProcess.on('error', (code: number) => {
      cbFinal = me.childCloseOrExit(code, '', stdoutText, stderrText, cbFinal);
    });
    childProcess.on('exit', (code: number, signal: string) => {
      cbFinal = me.childCloseOrExit(code, signal, stdoutText, stderrText, cbFinal);
    });
    childProcess.on('close', (code: number, signal: string) => {
      cbFinal = me.childCloseOrExit(code, signal, stdoutText, stderrText, cbFinal);
    });
    return childProcess;
  }

  private childCloseOrExit(code: number,
                           signal: string,
                           stdoutText: string,
                           stderrText: string,
                           cbFinal: (err: Error, result: string)=>void): (err: Error, result: string)=>void {
    if (cbFinal) {
      let returnString = JSON.stringify({code, signal, stdoutText, stderrText}, undefined, 2);
      let error = (code !== null && code !== 0)
        ? new Error(returnString)
        : null;
      cbFinal(error, returnString);
    }
    return (err: Error, result: string)=>{};
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
    this.spawnIt(baseCmd, {cwd, stdio: 'pipe'},
      (err, result) => {
        this.commandUtil.log(result.toString());
      },
      (err, result) => {
        this.commandUtil.log(result);
        cb(err, result);
      });
  }

  private gitClone(gitUrl: string, gitBranch: string, localFolder: string, cb: (err: Error, child: any)=>void) {
    this.spawnIt(['git', 'clone', '-b', gitBranch, '--single-branch', gitUrl, localFolder],
      {cwd: process.cwd(), stdio: 'pipe'},
      (err, result) => {
        this.commandUtil.log(result.toString());
      },
      cb);
  }

  private writeJsonTemplateFile(objectToWrite: any, fullOutputPath: string) {
    this.commandUtil.log("Writing JSON template file '" + fullOutputPath + "' ...");
    const jsonFile = require('jsonfile');
    jsonFile.spaces = 2;
    jsonFile.writeFileSync(fullOutputPath, objectToWrite);
  }
}
