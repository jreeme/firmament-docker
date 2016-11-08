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
const force_error_impl_1 = require("./force-error-impl");
const positive = require('positive');
const childProcess = require('child_process');
let FirmamentDockerImpl = class FirmamentDockerImpl extends force_error_impl_1.ForceErrorImpl {
    constructor(_dockerContainerManagement, _dockerImageManagement, _commandUtil) {
        super();
        this.dockerContainerManagement = _dockerContainerManagement;
        this.dockerImageManagement = _dockerImageManagement;
        this.commandUtil = _commandUtil;
    }
    listContainers(listAllContainers, cb) {
        this.dockerContainerManagement.forceError = this.forceError;
        this.dockerContainerManagement.listContainers(listAllContainers, cb);
    }
    createContainer(dockerContainerConfig, cb) {
        this.dockerContainerManagement.createContainer(dockerContainerConfig, cb);
    }
    removeImages(ids, cb) {
        this.dockerImageManagement.removeImages(ids, cb);
    }
    removeContainers(ids, cb) {
        this.dockerContainerManagement.removeContainers(ids, cb);
    }
    startOrStopContainers(ids, start, cb) {
        this.dockerContainerManagement.startOrStopContainers(ids, start, cb);
    }
    listImages(listAllImages, cb) {
        this.dockerImageManagement.listImages(listAllImages, cb);
    }
    getImages(ids, cb) {
        this.dockerImageManagement.getImages(ids, cb);
    }
    getImage(id, cb) {
        this.dockerImageManagement.getImage(id, cb);
    }
    getContainers(ids, cb) {
        this.dockerContainerManagement.getContainers(ids, cb);
    }
    getContainer(id, cb) {
        this.dockerContainerManagement.getContainer(id, cb);
    }
    buildDockerFile(dockerFilePath, dockerImageName, progressCb, cb) {
        this.dockerImageManagement.buildDockerFile(dockerFilePath, dockerImageName, progressCb, cb);
    }
    pullImage(imageName, progressCb, cb) {
        this.dockerImageManagement.pullImage(imageName, progressCb, cb);
    }
    exec(id, command, cb) {
        let me = this;
        me.getContainer(id, (err, dockerContainer) => {
            if (me.commandUtil.callbackIfError(cb, err)) {
                return;
            }
            childProcess.spawnSync('docker', ['exec', '-it', dockerContainer.Name.slice(1), command], {
                stdio: 'inherit'
            });
            cb(null, 0);
        });
    }
};
FirmamentDockerImpl = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject('DockerContainerManagement')),
    __param(1, inversify_1.inject('DockerImageManagement')),
    __param(2, inversify_1.inject('CommandUtil')), 
    __metadata('design:paramtypes', [Object, Object, Object])
], FirmamentDockerImpl);
exports.FirmamentDockerImpl = FirmamentDockerImpl;
//# sourceMappingURL=firmament-docker-impl.js.map