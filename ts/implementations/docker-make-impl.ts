import {injectable, inject} from 'inversify';
import {DockerMake} from '../interfaces/docker-make';
import {DockerDescriptors} from '../interfaces/docker-descriptors';
import {
  ContainerConfig, DockerContainer, ExpressApp, ImageOrContainerRemoveResults
} from '../interfaces/dockerode';
import {Positive, FailureRetVal, CommandUtil, ProgressBar, Spawn, ForceErrorImpl} from 'firmament-yargs';
import {DockerContainerManagement} from '../interfaces/docker-container-management';
import {DockerImageManagement} from '../interfaces/docker-image-management';
import * as _ from 'lodash';
import * as fs from 'fs';
import url = require('url');
import {RemoteCatalogGetter, RemoteCatalogEntry} from 'firmament-yargs';
const path = require('path');
const jsonFile = require('jsonfile');
const request = require('request');
const fileExists = require('file-exists');
const async = require('async');
//const templateCatalogUrl = '/home/jreeme/src/firmament-docker/docker/templateCatalog.json';
const templateCatalogUrl = 'https://raw.githubusercontent.com/jreeme/firmament-docker/master/docker/templateCatalog.json';
@injectable()
export class DockerMakeImpl extends ForceErrorImpl implements DockerMake {
  constructor(@inject('CommandUtil') private commandUtil: CommandUtil,
              @inject('Spawn') private spawn: Spawn,
              @inject('RemoteCatalogGetter') private remoteCatalogGetter: RemoteCatalogGetter,
              @inject('DockerImageManagement') private dockerImageManagement: DockerImageManagement,
              @inject('DockerContainerManagement') private dockerContainerManagement: DockerContainerManagement,
              @inject('Positive') private positive: Positive,
              @inject('ProgressBar') private progressBar: ProgressBar) {
    super();
  }

  buildTemplate(argv: any) {
    let me = this;
    let {fullInputPath, sortedContainerConfigs} = me.getSortedContainerConfigsFromJsonFile(argv.input);
    const baseDir = path.dirname(fullInputPath);
    me.commandUtil.log("Constructing Docker containers described in: '" + fullInputPath + "'");
    me.processContainerConfigs(sortedContainerConfigs, baseDir, (err: Error) => {
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
      me.remoteCatalogGetter.getCatalogFromUrl(templateCatalogUrl, (err, remoteCatalog) => {
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
      });
    }
  }

  getSortedContainerConfigsFromJsonFile(inputPath: string) {
    let me = this;
    const fullInputPath = me.commandUtil.getConfigFilePath(inputPath, '.json');
    if (!fileExists(fullInputPath)) {
      me.commandUtil.processExitWithError(new Error(`\n'${fullInputPath}' does not exist`));
    }
    const containerConfigs = jsonFile.readFileSync(fullInputPath);
    const sortedContainerConfigs = me.containerDependencySort(containerConfigs);
    return {fullInputPath, sortedContainerConfigs};
  }

  private processContainerConfigs(containerConfigs: ContainerConfig[], baseDir: string, cb: (err: Error, results: string) => void) {
    let me = this;
    let containerConfigsByImageName = {};
    containerConfigs.forEach(containerConfig => {
      containerConfigsByImageName[containerConfig.Image] = containerConfig;
    });
    //noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols
    async.waterfall([
      //Remove all containers mentioned in config file
      (cb: (err: Error, containerRemoveResults: ImageOrContainerRemoveResults[]) => void) => {
        this.dockerContainerManagement.removeContainers(containerConfigs.map(containerConfig => containerConfig.name), cb);
      },
      (containerRemoveResults: ImageOrContainerRemoveResults[], cb: (err: Error, missingImageNames: string[]) => void) => {
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
      (missingImageNames: string[], cb: (err: Error, missingImageNames: string[]) => void) => {
        async.mapLimit(missingImageNames,
          4,
          (missingImageName, cb: (err: Error, missingImageName: string) => void) => {
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
      (missingImageNames: string[], cb: (err: Error, containerBuildErrors: Error[]) => void) => {
        async.mapLimit(missingImageNames,
          4,
          (missingImageName, cb: (err: Error, containerBuildError: Error) => void) => {
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
      (errs: Error[], cb: (err: Error, results: any) => void) => {
        try {
          //let sortedContainerConfigs = me.containerDependencySort(containerConfigs);
          //noinspection JSUnusedLocalSymbols
          async.mapSeries(containerConfigs,
            (containerConfig, cb: (err: Error, result: any) => void) => {
              this.dockerContainerManagement.createContainer(containerConfig, (err: Error, container: DockerContainer) => {
                me.commandUtil.logAndCallback('Container "' + containerConfig.name + '" created.', cb, err, container);
              });
            },
            (err: Error, containers: DockerContainer[]) => {
              if (me.commandUtil.callbackIfError(cb, err)) {
                return;
              }
              let sortedContainerNames = containerConfigs.map(containerConfig => containerConfig.name);
              this.dockerContainerManagement.startOrStopContainers(sortedContainerNames, true, () => {
                cb(null, null);
              });
            }
          );
        } catch (err) {
          me.commandUtil.callbackIfError(cb, err);
        }
      },
      function deployExpressApps(errs: Error[], cb: (err: Error, results: any) => void) {
        //noinspection JSUnusedLocalSymbols
        async.mapLimit(containerConfigs,
          4,
          (containerConfig: ContainerConfig, cb: (err: Error, result: any) => void) => {
            //noinspection JSUnusedLocalSymbols
            async.mapSeries(containerConfig.ExpressApps || [],
              (expressApp: ExpressApp, cb: (err: Error, result: any) => void) => {
                //noinspection JSUnusedLocalSymbols
                async.series([
                  (cb: (err: Error, result?: any) => void) => {//Figure out git clone folder name and check 'DeployExisting'
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
                    //On really fast computers .getTime() can be the same across two calls so call a few times
                    //to make sure it's different
                    let refTimeStamp = (new Date()).getTime();
                    let timeStamp = refTimeStamp;
                    while (timeStamp === refTimeStamp) {
                      timeStamp = (new Date()).getTime();
                    }

                    expressApp.GitCloneFolder = `${cwd}/${expressApp.ServiceName}${timeStamp}`;
                    cb(null);
                  },
                  (cb: (err: Error, result?: any) => void) => {//Clone Express app Git Repo
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
                  (cb: (err: Error, result: any) => void) => {//Make sure there's a Strongloop PM listening
                    let retries: number = 20;
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
                  (cb: (err: Error, result: any) => void) => {//Create Strongloop app
                    let serviceName = expressApp.ServiceName;
                    let msg = 'Creating ' + serviceName;
                    me.remoteSlcCtlCommand(msg, expressApp, ['create', serviceName], cb);
                  },
                  (cb: (err: Error, result?: any) => void) => {//Set ClusterSize
                    if (!expressApp.ClusterSize) {
                      cb(null);
                      return;
                    }
                    let clusterSize = expressApp.ClusterSize.toString();
                    me.remoteSlcCtlCommand('Setting cluster size to: ' + clusterSize,
                      expressApp, ['set-size', expressApp.ServiceName, clusterSize], cb);
                  },
                  (cb: (err: Error, result?: any) => void) => {//Set ExpressApp environment
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
                  (cb: (err: Error, result?: any) => void) => {//Perform Bower install if required
                    if (!expressApp.DoBowerInstall) {
                      cb(null);
                      return;
                    }
                    let cwd = expressApp.GitCloneFolder;
                    me.spawn.spawnShellCommandAsync(['bower', 'install', '--config.interactive=false'], {cwd},
                      (err, result) => {
                        me.commandUtil.log(result.toString());
                      },
                      cb);
                  },
                  (cb: (err: Error, result: any) => void) => {
                    let cwd = expressApp.GitCloneFolder;
                    //Do an 'npm install' here in case any scripts need node_modules
                    me.spawn.spawnShellCommandAsync(['npm', 'install', '--quiet'], {cwd},
                      (err, result) => {
                        me.commandUtil.log(result.toString());
                      },
                      cb);
                  },
                  (cb: (err: Error, result: any) => void) => {//Execute local scripts
                    //noinspection JSUnusedLocalSymbols
                    async.mapSeries(expressApp.Scripts || [],
                      (script, cb: (err: Error, result: any) => void) => {
                        let cwd = expressApp.GitCloneFolder + '/' + script.RelativeWorkingDir;
                        let cmd = [script.Command];
                        cmd = cmd.concat(script.Args);
                        me.spawn.spawnShellCommandAsync(cmd, {cwd},
                          (err, result) => {
                            me.commandUtil.log(result.toString());
                          },
                          cb);
                      },
                      (err: Error, results: any) => {
                        cb(err, null);
                      });
                  },
                  (cb: (err: Error, result: any) => void) => {//Perform Strongloop build ...
                    let cwd = expressApp.GitCloneFolder;
                    me.spawn.spawnShellCommandAsync(['slc', 'build', '--scripts'], {cwd},
                      (err, result) => {
                        me.commandUtil.log(result.toString());
                      },
                      cb);
                  },
                  (cb: (err: Error, result: any) => void) => {//... and Strongloop deploy
                    let cwd = expressApp.GitCloneFolder;
                    me.commandUtil.log('StrongLoop Deploying @ ' + cwd);
                    me.spawn.spawnShellCommandAsync(['slc', 'deploy', '--service=' + expressApp.ServiceName, expressApp.StrongLoopServerUrl], {cwd},
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

  private remoteSlcCtlCommand(msg: string, expressApp: ExpressApp, cmd: string[], cb: (err: Error, result: string) => void) {
    let cwd = expressApp.GitCloneFolder;
    let serviceName = expressApp.ServiceName;
    let serverUrl = expressApp.StrongLoopServerUrl;
    this.commandUtil.log(msg + ' "' + serviceName + '" @ "' + cwd + '" via "' + serverUrl + '"');
    const baseCmd = ['slc', 'ctl', '-C', serverUrl];
    Array.prototype.push.apply(baseCmd, cmd);
    this.spawn.spawnShellCommandAsync(baseCmd, {cwd, stdio: 'pipe', cacheStdOut: true, cacheStdErr: true},
      (err, result) => {
        this.commandUtil.log(result.toString());
      },
      (err, result) => {
        this.commandUtil.log(result);
        cb(err, result);
      });
  }

  private gitClone(gitUrl: string, gitBranch: string, localFolder: string, cb: (err: Error, child: any) => void) {
    this.spawn.spawnShellCommandAsync(['git', 'clone', '-b', gitBranch, '--single-branch', gitUrl, localFolder],
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
