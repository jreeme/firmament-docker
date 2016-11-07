"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
const inversify_1 = require("inversify");
const inversify_config_1 = require('../inversify.config');
const docker_descriptors_1 = require("../interfaces/docker-descriptors");
const async = require('async');
const _ = require('lodash');
const request = require('request');
const positive = require('positive');
const fs = require('fs');
const templateCatalogUrl = 'https://raw.githubusercontent.com/Sotera/firmament/typescript/docker/templateCatalog.json';
let MakeCommandImpl_1 = class MakeCommandImpl {
    constructor(_commandUtil, _spawn, _commandLine, _progressBar, _firmamentDocker) {
        this.aliases = [];
        this.command = '';
        this.commandDesc = '';
        this.handler = (argv) => {
        };
        this.options = {};
        this.subCommands = [];
        this.buildCommandTree();
        this.commandUtil = _commandUtil;
        this.commandLine = _commandLine;
        this.progressBar = _progressBar;
        this.spawn = _spawn;
        this.firmamentDocker = _firmamentDocker;
    }
    buildCommandTree() {
        this.aliases = ['make', 'm'];
        this.command = '<subCommand>';
        this.commandDesc = 'Support for building Docker container clusters';
        this.pushBuildCommand();
        this.pushTemplateCommand();
    }
    ;
    pushTemplateCommand() {
        let templateCommand = inversify_config_1.default.get('Command');
        templateCommand.aliases = ['template', 't'];
        templateCommand.commandDesc = 'Create a template JSON spec for a container cluster';
        templateCommand.options = {
            get: {
                alias: 'g',
                type: 'string',
                desc: '.. get [templateName]. If no templateName is specified then lists available templates'
            },
            output: {
                alias: 'o',
                default: MakeCommandImpl_1.defaultConfigFilename,
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
        templateCommand.handler = (argv) => this.makeTemplate(argv);
        this.subCommands.push(templateCommand);
    }
    ;
    pushBuildCommand() {
        let buildCommand = inversify_config_1.default.get('Command');
        buildCommand.aliases = ['build', 'b'];
        buildCommand.commandDesc = 'Build Docker containers based on JSON spec';
        buildCommand.options = {
            input: {
                alias: 'i',
                default: MakeCommandImpl_1.defaultConfigFilename,
                type: 'string',
                desc: 'Name the config JSON file'
            }
        };
        buildCommand.handler = (argv) => this.buildTemplate(argv);
        this.subCommands.push(buildCommand);
    }
    ;
    buildTemplate(argv) {
        let fullInputPath = MakeCommandImpl_1.getJsonConfigFilePath(argv.input);
        console.log("Constructing Docker containers described in: '" + fullInputPath + "'");
        var jsonFile = require('jsonfile');
        var containerDescriptors = jsonFile.readFileSync(fullInputPath);
        this.processContainerConfigs(containerDescriptors);
    }
    makeTemplate(argv) {
        let fullOutputPath = MakeCommandImpl_1.getJsonConfigFilePath(argv.output);
        async.waterfall([
                (cb) => {
                if (argv.get === undefined) {
                    cb(null, argv.full
                        ? docker_descriptors_1.DockerDescriptors.dockerContainerDefaultTemplate
                        : docker_descriptors_1.DockerDescriptors.dockerContainerConfigTemplate);
                }
                else {
                    request(templateCatalogUrl, (err, res, body) => {
                        try {
                            let templateCatalog = JSON.parse(body);
                            let templateMap = {};
                            templateCatalog.forEach(template => {
                                templateMap[template.name] = template;
                            });
                            if (!argv.get.length) {
                                console.log('\nAvailable templates:\n');
                                for (let key in templateMap) {
                                    console.log('> ' + templateMap[key].name);
                                }
                                cb(null, null);
                            }
                            else if (argv.get) {
                                if (!templateMap[argv.get]) {
                                    cb(new Error("Could not find template '" + argv.get + "'"));
                                }
                                else {
                                    request(templateMap[argv.get].url, (err, res, body) => {
                                        try {
                                            cb(null, JSON.parse(body));
                                        }
                                        catch (e) {
                                            cb(new Error('Template found but is not valid (not JSON)' + e.message));
                                        }
                                    });
                                }
                            }
                        }
                        catch (e) {
                            cb(new Error('Error getting template catalog ' + e.message));
                        }
                    });
                }
            },
                (containerTemplatesToWrite, cb) => {
                if (containerTemplatesToWrite) {
                    var fs = require('fs');
                    if (fs.existsSync(fullOutputPath)
                        && !positive("Config file '" + fullOutputPath + "' already exists. Overwrite? [Y/n] ", true)) {
                        cb(null, 'Canceling JSON template creation!');
                    }
                    else {
                        MakeCommandImpl_1.writeJsonTemplateFile(containerTemplatesToWrite, fullOutputPath);
                    }
                }
                cb(null);
            }], (err, msg = null) => {
            this.commandUtil.processExitWithError(err, msg);
        });
    }
    static getJsonConfigFilePath(filename) {
        let path = require('path');
        let cwd = process.cwd();
        let regex = new RegExp('(.*)\\' + MakeCommandImpl_1.jsonFileExtension + '$', 'i');
        if (regex.test(filename)) {
            filename = filename.replace(regex, '$1' + MakeCommandImpl_1.jsonFileExtension);
        }
        else {
            filename = filename + MakeCommandImpl_1.jsonFileExtension;
        }
        return path.resolve(cwd, filename);
    }
    processContainerConfigs(containerConfigs) {
        let self = this;
        let containerConfigsByImageName = {};
        containerConfigs.forEach(containerConfig => {
            containerConfigsByImageName[containerConfig.Image] = containerConfig;
        });
        async.waterfall([
                (cb) => {
                this.firmamentDocker.removeContainers(containerConfigs.map(containerConfig => containerConfig.name), cb);
            },
                (containerRemoveResults, cb) => {
                this.firmamentDocker.listImages(false, (err, images) => {
                    if (self.commandUtil.callbackIfError(cb, err)) {
                        return;
                    }
                    let repoTags = {};
                    images.forEach(dockerImage => {
                        repoTags[dockerImage.RepoTags[0]] = true;
                    });
                    let missingImageNames = [];
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
                (missingImageNames, cb) => {
                async.mapSeries(missingImageNames, (missingImageName, cb) => {
                    this.firmamentDocker.pullImage(missingImageName, function (taskId, status, current, total) {
                        self.progressBar.showProgressForTask(taskId, status, current, total);
                    }, (err) => {
                        cb(null, err ? missingImageName : null);
                    });
                }, (err, missingImageNames) => {
                    if (self.commandUtil.callbackIfError(cb, err)) {
                        return;
                    }
                    cb(null, missingImageNames.filter(missingImageName => !!missingImageName));
                });
            },
                (missingImageNames, cb) => {
                async.mapSeries(missingImageNames, (missingImageName, cb) => {
                    var containerConfig = containerConfigsByImageName[missingImageName];
                    let path = require('path');
                    let cwd = process.cwd();
                    let dockerFilePath = path.join(cwd, containerConfig.DockerFilePath);
                    let dockerImageName = containerConfig.Image;
                    this.firmamentDocker.buildDockerFile(dockerFilePath, dockerImageName, function (taskId, status, current, total) {
                        self.progressBar.showProgressForTask(taskId, status, current, total);
                    }, (err) => {
                        cb(null, err
                            ? new Error('Unable to build Dockerfile at "' + dockerFilePath + '" because: ' + err.message)
                            : null);
                    });
                }, (err, errors) => {
                    if (self.commandUtil.callbackIfError(cb, err)) {
                        return;
                    }
                    errors = errors.filter(error => !!error);
                    cb(self.commandUtil.logErrors(errors).length ? new Error() : null, errors);
                });
            },
                (errs, cb) => {
                try {
                    let sortedContainerConfigs = self.containerDependencySort(containerConfigs);
                    async.mapSeries(sortedContainerConfigs, (containerConfig, cb) => {
                        this.firmamentDocker.createContainer(containerConfig, (err, container) => {
                            self.commandUtil.logAndCallback('Container "' + containerConfig.name + '" created.', cb, err, container);
                        });
                    }, (err, containers) => {
                        if (self.commandUtil.callbackIfError(cb, err)) {
                            return;
                        }
                        let sortedContainerNames = sortedContainerConfigs.map(containerConfig => containerConfig.name);
                        this.firmamentDocker.startOrStopContainers(sortedContainerNames, true, () => {
                            cb(null, null);
                        });
                    });
                }
                catch (err) {
                    self.commandUtil.callbackIfError(cb, err);
                }
            },
            function deployExpressApps(errs, cb) {
                async.mapSeries(containerConfigs, (containerConfig, cb) => {
                    async.mapSeries(containerConfig.ExpressApps || [], (expressApp, cb) => {
                        async.series([
                                (cb) => {
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
                                    }
                                    else if (serviceSourceFolders.length > 0) {
                                        expressApp.GitCloneFolder = cwd + '/' + serviceSourceFolders[0];
                                        cb(null);
                                        return;
                                    }
                                }
                                expressApp.GitCloneFolder = cwd + '/' + expressApp.ServiceName + (new Date()).getTime();
                                cb(null);
                            },
                                (cb) => {
                                fs.stat(expressApp.GitCloneFolder, (err, stats) => {
                                    if (err) {
                                        self.gitClone(expressApp.GitUrl, expressApp.GitSrcBranchName, expressApp.GitCloneFolder, (err) => {
                                            cb(err);
                                        });
                                    }
                                    else {
                                        cb(null);
                                    }
                                });
                            },
                                (cb) => {
                                let retries = 3;
                                (function checkForStrongloop() {
                                    self.remoteSlcCtlCommand('Looking for SLC PM ...', expressApp, ['info'], (err, result) => {
                                        --retries;
                                        const errorMsg = 'Strongloop not available';
                                        const readyResult = /Driver Status:\s+running/;
                                        if (err) {
                                            cb(new Error(err.message), errorMsg);
                                            setTimeout(checkForStrongloop, 3000);
                                        }
                                        else if (readyResult.test(result)) {
                                            cb(null, 'Strongloop ready.');
                                        }
                                        else if (retries < 0) {
                                            cb(new Error(errorMsg), errorMsg);
                                        }
                                        else {
                                            setTimeout(checkForStrongloop, 3000);
                                        }
                                    });
                                })();
                            },
                                (cb) => {
                                let serviceName = expressApp.ServiceName;
                                let msg = 'Creating ' + serviceName;
                                self.remoteSlcCtlCommand(msg, expressApp, ['create', serviceName], cb);
                            },
                                (cb) => {
                                if (!expressApp.ClusterSize) {
                                    cb(null);
                                    return;
                                }
                                let clusterSize = expressApp.ClusterSize.toString();
                                self.remoteSlcCtlCommand('Setting cluster size to: ' + clusterSize, expressApp, ['set-size', expressApp.ServiceName, clusterSize], cb);
                            },
                                (cb) => {
                                expressApp.EnvironmentVariables = expressApp.EnvironmentVariables || {};
                                let cmd = ['env-set', expressApp.ServiceName];
                                for (let environmentVariable in expressApp.EnvironmentVariables) {
                                    cmd.push(environmentVariable
                                        + '='
                                        + expressApp.EnvironmentVariables[environmentVariable]);
                                }
                                self.remoteSlcCtlCommand('Setting environment variables', expressApp, cmd, cb);
                            },
                                (cb) => {
                                if (!expressApp.DoBowerInstall) {
                                    cb(null);
                                    return;
                                }
                                let cwd = expressApp.GitCloneFolder;
                                self.spawn.spawnShellCommand(['bower', 'install', '--config.interactive=false'], {
                                    cwd,
                                    stdio: null
                                }, cb);
                            },
                                (cb) => {
                                let cwd = expressApp.GitCloneFolder;
                                self.spawn.spawnShellCommand(['npm', 'install', '--ignore-scripts'], { cwd, stdio: null }, cb);
                            },
                                (cb) => {
                                async.mapSeries(expressApp.Scripts || [], (script, cb) => {
                                    let cwd = expressApp.GitCloneFolder + '/' + script.RelativeWorkingDir;
                                    let cmd = [script.Command];
                                    cmd = cmd.concat(script.Args);
                                    self.spawn.spawnShellCommand(cmd, { cwd, stdio: null }, cb);
                                }, (err, results) => {
                                    cb(err, null);
                                });
                            },
                                (cb) => {
                                let cwd = expressApp.GitCloneFolder;
                                self.spawn.spawnShellCommand(['slc', 'build', '--scripts'], { cwd, stdio: null }, cb);
                            },
                                (cb) => {
                                let cwd = expressApp.GitCloneFolder;
                                console.log('StrongLoop Deploying @ ' + cwd);
                                self.spawn.spawnShellCommand(['slc', 'deploy', '--service=' + expressApp.ServiceName,
                                    expressApp.StrongLoopServerUrl], {
                                    cwd,
                                    stdio: null
                                }, cb);
                            }
                        ], cb);
                    }, cb);
                }, cb);
            }
        ], (err, results) => {
            self.commandUtil.processExitWithError(err);
        });
    }
    static writeJsonTemplateFile(objectToWrite, fullOutputPath) {
        console.log("Writing JSON template file '" + fullOutputPath + "' ...");
        var jsonFile = require('jsonfile');
        jsonFile.spaces = 2;
        jsonFile.writeFileSync(fullOutputPath, objectToWrite);
    }
    remoteSlcCtlCommand(msg, expressApp, cmd, cb) {
        let cwd = expressApp.GitCloneFolder;
        let serviceName = expressApp.ServiceName;
        let serverUrl = expressApp.StrongLoopServerUrl;
        console.log(msg + ' "' + serviceName + '" @ "' + cwd + '" via "' + serverUrl + '"');
        var baseCmd = ['slc', 'ctl', '-C', serverUrl];
        Array.prototype.push.apply(baseCmd, cmd);
        this.spawn.spawnShellCommandAsync(baseCmd, { cwd, stdio: 'pipe' }, (err, result) => {
            console.log(result);
            cb(err, result);
        });
    }
    containerDependencySort(containerConfigs) {
        var sortedContainerConfigs = [];
        var objectToSort = {};
        var containerConfigByNameMap = {};
        containerConfigs.forEach(function (containerConfig) {
            if (containerConfigByNameMap[containerConfig.name]) {
                console.error('Same name is used by more than one container.');
            }
            containerConfigByNameMap[containerConfig.name] = containerConfig;
            var dependencies = [];
            if (containerConfig.HostConfig && containerConfig.HostConfig.Links) {
                containerConfig.HostConfig.Links.forEach(function (link) {
                    var linkName = link.split(':')[0];
                    dependencies.push(linkName);
                });
            }
            objectToSort[containerConfig.name] = dependencies;
        });
        var sortedContainerNames = this.topologicalDependencySort(objectToSort);
        sortedContainerNames.forEach(function (sortedContainerName) {
            sortedContainerConfigs.push(containerConfigByNameMap[sortedContainerName]);
        });
        return sortedContainerConfigs;
    }
    topologicalDependencySort(graph) {
        var sorted = [], visited = {};
        try {
            Object.keys(graph).forEach(function visit(name, ancestors) {
                if (visited[name]) {
                    return;
                }
                if (!Array.isArray(ancestors)) {
                    ancestors = [];
                }
                ancestors.push(name);
                visited[name] = true;
                var deps = graph[name];
                deps.forEach(function (dep) {
                    if (ancestors.indexOf(dep) >= 0) {
                        console.error('Circular dependency "' + dep + '" is required by "' + name + '": ' + ancestors.join(' -> '));
                    }
                    visit(dep, ancestors.slice(0));
                });
                sorted.push(name);
            });
        }
        catch (ex) {
            throw new Error('Linked container dependency sort failed. You are probably trying to link to an unknown container.');
        }
        return sorted;
    }
    gitClone(gitUrl, gitBranch, localFolder, cb) {
        this.spawn.spawnShellCommand(['git', 'clone', '-b', gitBranch, '--single-branch', gitUrl, localFolder], { cwd: process.cwd(), stdio: 'pipe' }, cb);
    }
};
let MakeCommandImpl = MakeCommandImpl_1;
MakeCommandImpl.defaultConfigFilename = 'firmament.json';
MakeCommandImpl.jsonFileExtension = '.json';
MakeCommandImpl = MakeCommandImpl_1 = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject('CommandUtil')),
    __param(1, inversify_1.inject('Spawn')),
    __param(2, inversify_1.inject('CommandLine')),
    __param(3, inversify_1.inject('ProgressBar')),
    __param(4, inversify_1.inject('FirmamentDocker')), 
    __metadata('design:paramtypes', [Object, Object, Object, Object, Object])
], MakeCommandImpl);
exports.MakeCommandImpl = MakeCommandImpl;
//# sourceMappingURL=make-command.js.map