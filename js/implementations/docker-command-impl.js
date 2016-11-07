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
let DockerCommandImpl = class DockerCommandImpl {
    constructor(_commandUtil, _spawn, _commandLine, _firmamentDocker) {
        this.buildCommandTree();
        this.commandUtil = _commandUtil;
        this.commandLine = _commandLine;
        this.spawn = _spawn;
        this.firmamentDocker = _firmamentDocker;
    }
    buildCommandTree() {
        this.aliases = ['docker', 'd'];
        this.command = '<subCommand>';
        this.commandDesc = 'Support for working with Docker containers';
        (() => { this.pushCleanVolumesCommand(); })();
        this.pushImagesCommand();
        this.pushPsCommand();
        this.pushStartCommand();
        this.pushStopCommand();
        this.pushRemoveContainersCommand();
        this.pushRemoveImagesCommand();
        this.pushShellCommand();
    }
    pushCleanVolumesCommand() {
        let me = this;
        let cleanVolumesCommand = inversify_config_1.default.get('Command');
        cleanVolumesCommand.aliases = ['clean-volumes', 'cv'];
        cleanVolumesCommand.commandDesc = 'Clean orphaned Docker resources';
        cleanVolumesCommand.handler = (argv) => {
            var script = require('path').join(__dirname, '../../legacy/_docker-cleanup-volumes.sh');
            me.spawn.sudoSpawn(['/bin/bash', '-c', script], (err) => {
                me.commandUtil.processExitWithError(err);
            });
        };
        me.subCommands.push(cleanVolumesCommand);
    }
    pushRemoveImagesCommand() {
        let me = this;
        let removeCommand = inversify_config_1.default.get('Command');
        removeCommand.aliases = ['rmi'];
        removeCommand.commandDesc = 'Remove Docker images';
        removeCommand.handler = (argv) => {
            me.firmamentDocker.removeImages(argv._.slice(2), (err) => {
                me.commandUtil.processExitWithError(err);
            });
        };
        me.subCommands.push(removeCommand);
    }
    pushRemoveContainersCommand() {
        let me = this;
        let removeCommand = inversify_config_1.default.get('Command');
        removeCommand.aliases = ['rm'];
        removeCommand.commandDesc = 'Remove Docker containers';
        removeCommand.handler = (argv) => {
            me.firmamentDocker.removeContainers(argv._.slice(2), (err) => {
                me.commandUtil.processExitWithError(err);
            });
        };
        me.subCommands.push(removeCommand);
    }
    pushShellCommand() {
        let me = this;
        let shellCommand = inversify_config_1.default.get('Command');
        shellCommand.aliases = ['sh'];
        shellCommand.commandDesc = 'Run bash shell in Docker container';
        shellCommand.handler = (argv) => {
            me.bashInToContainer(argv._.slice(2), (err) => {
                me.commandUtil.processExitWithError(err);
            });
        };
        this.subCommands.push(shellCommand);
    }
    pushStartCommand() {
        let me = this;
        let startCommand = inversify_config_1.default.get('Command');
        startCommand.aliases = ['start'];
        startCommand.commandDesc = 'Start Docker containers';
        startCommand.handler = (argv) => {
            me.firmamentDocker.startOrStopContainers(argv._.slice(2), true, () => me.commandUtil.processExit());
        };
        me.subCommands.push(startCommand);
    }
    pushStopCommand() {
        let me = this;
        let stopCommand = inversify_config_1.default.get('Command');
        stopCommand.aliases = ['stop'];
        stopCommand.commandDesc = 'Stop Docker containers';
        stopCommand.handler = argv => {
            me.firmamentDocker.startOrStopContainers(argv._.slice(2), false, () => me.commandUtil.processExit());
        };
        me.subCommands.push(stopCommand);
    }
    pushImagesCommand() {
        let me = this;
        let imagesCommand = inversify_config_1.default.get('Command');
        imagesCommand.aliases = ['images'];
        imagesCommand.commandDesc = 'List Docker images';
        imagesCommand.options = {
            all: {
                alias: 'a',
                boolean: true,
                default: false,
                desc: 'Show intermediate images also'
            }
        };
        imagesCommand.handler = argv => me.printImagesList(argv, () => me.commandUtil.processExit());
        this.subCommands.push(imagesCommand);
    }
    pushPsCommand() {
        let me = this;
        let psCommand = inversify_config_1.default.get('Command');
        psCommand.aliases = ['ps'];
        psCommand.commandDesc = 'List Docker containers';
        psCommand.options = {
            all: {
                alias: 'a',
                boolean: true,
                default: false,
                desc: 'Show non-running containers also'
            }
        };
        psCommand.handler = argv => me.printContainerList(argv, () => me.commandUtil.processExit());
        this.subCommands.push(psCommand);
    }
    printImagesList(argv, cb) {
        this.firmamentDocker.listImages(argv.a, (err, images) => {
            this.prettyPrintDockerImagesList(err, images, cb);
        });
    }
    printContainerList(argv, cb) {
        this.firmamentDocker.listContainers(argv.a, (err, containers) => {
            this.prettyPrintDockerContainerList(err, containers, argv.a, cb);
        });
    }
    bashInToContainer(ids, cb) {
        if (ids.length !== 1) {
            let msg = '\nSpecify container to shell into by FirmamentId, Docker ID or Name.\n';
            msg += '\nExample: $ ... d sh 2  <= Open bash shell in container with FirmamentId "2"\n';
            cb(new Error(msg));
            return;
        }
        this.firmamentDocker.exec(ids[0].toString(), '/bin/bash', cb);
    }
    prettyPrintDockerImagesList(err, images, cb) {
        let me = this;
        if (!images || !images.length) {
            let msg = me.commandUtil.returnErrorStringOrMessage(err, '\nNo images\n');
            console.log(msg);
        }
        else {
            var timeAgo = require('time-ago')();
            var fileSize = require('filesize');
            me.commandLine.printTable(images.map(image => {
                try {
                    var ID = image.firmamentId;
                    var repoTags = image.RepoTags[0].split(':');
                    var Repository = repoTags[0];
                    var Tag = repoTags[1];
                    var ImageId = image.Id.substring(7, 19);
                    var nowTicks = +new Date();
                    var tickDiff = nowTicks - (1000 * image.Created);
                    var Created = timeAgo.ago(nowTicks - tickDiff);
                    var Size = fileSize(image.Size);
                }
                catch (err) {
                    console.log(err.message);
                }
                return { ID, Repository, Tag, ImageId, Created, Size };
            }));
        }
        cb();
    }
    prettyPrintDockerContainerList(err, containers, all, cb) {
        let me = this;
        if (!containers || !containers.length) {
            let msg = me.commandUtil.returnErrorStringOrMessage(err, '\nNo ' + (all ? '' : 'Running ') + 'Containers\n');
            console.log(msg);
        }
        else {
            me.commandLine.printTable(containers.map(container => {
                return {
                    ID: container.firmamentId,
                    Name: container.Names[0],
                    Image: container.Image,
                    DockerId: container.Id.substring(0, 11),
                    Status: container.Status
                };
            }));
        }
        cb();
    }
};
DockerCommandImpl = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject('CommandUtil')),
    __param(1, inversify_1.inject('Spawn')),
    __param(2, inversify_1.inject('CommandLine')),
    __param(3, inversify_1.inject('FirmamentDocker')), 
    __metadata('design:paramtypes', [Object, Object, Object, Object])
], DockerCommandImpl);
exports.DockerCommandImpl = DockerCommandImpl;
//# sourceMappingURL=docker-command-impl.js.map