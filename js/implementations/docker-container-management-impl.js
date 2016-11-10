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
const inversify_1 = require('inversify');
const dockerode_1 = require('../interfaces/dockerode');
const docker_util_options_impl_1 = require('./util/docker-util-options-impl');
const force_error_impl_1 = require('./util/force-error-impl');
const async = require('async');
const childProcess = require('child_process');
const deepExtend = require('deep-extend');
let DockerContainerManagementImpl = class DockerContainerManagementImpl extends force_error_impl_1.ForceErrorImpl {
    constructor(_dockerManagement) {
        super();
        this.DM = _dockerManagement;
    }
    listContainers(listAllContainers, cb) {
        let dockerUtilOptions = new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Container, listAllContainers);
        this.DM.dockerUtil.forceError = this.forceError;
        this.DM.dockerUtil.listImagesOrContainers(dockerUtilOptions, cb);
    }
    getContainers(ids, cb) {
        let dockerUtilOptions = new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Container);
        this.DM.dockerUtil.forceError = this.forceError;
        this.DM.dockerUtil.getImagesOrContainers(ids, dockerUtilOptions, cb);
    }
    getContainer(id, cb) {
        let dockerUtilOptions = new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Container);
        this.DM.dockerUtil.forceError = this.forceError;
        this.DM.dockerUtil.getImageOrContainer(id, dockerUtilOptions, cb);
    }
    removeContainers(ids, cb) {
        let dockerUtilOptions = new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Container);
        this.DM.dockerUtil.forceError = this.forceError;
        this.DM.dockerUtil.removeImagesOrContainers(ids, dockerUtilOptions, cb);
    }
    createContainer(dockerContainerConfig, cb) {
        this.DM.dockerode.forceError = this.forceError;
        var fullContainerConfigCopy = { ExpressApps: [] };
        deepExtend(fullContainerConfigCopy, dockerContainerConfig);
        this.DM.dockerode.createContainer(fullContainerConfigCopy, cb);
    }
    startOrStopContainers(ids, start, cb) {
        let me = this;
        me.getContainers(ids, (err, dockerContainersOrMessages) => {
            me.DM.commandUtil.logError(err);
            async.mapSeries(dockerContainersOrMessages, (dockerContainerOrMessage, cb) => {
                if (typeof dockerContainerOrMessage === 'string') {
                    me.DM.commandUtil.logAndCallback(dockerContainerOrMessage, cb);
                }
                else {
                    let dockerContainer = dockerContainerOrMessage;
                    let resultMessage = `Container '${dockerContainer.Name}' `;
                    resultMessage += start ? 'started.' : 'stopped.';
                    let fnStartStop = start
                        ? dockerContainer.start.bind(dockerContainer)
                        : dockerContainer.stop.bind(dockerContainer);
                    fnStartStop((err) => {
                        me.DM.commandUtil.logAndCallback(me.DM.commandUtil.returnErrorStringOrMessage(err, resultMessage), cb);
                    });
                }
            }, cb);
        });
    }
    exec(id, command, cb) {
        let me = this;
        me.getContainer(id, (err, dockerContainer) => {
            if (me.DM.commandUtil.callbackIfError(cb, err)) {
                return;
            }
            childProcess.spawnSync('docker', ['exec', '-it', dockerContainer.Name.slice(1), command], {
                stdio: 'inherit'
            });
            cb(null, 0);
        });
    }
};
DockerContainerManagementImpl = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject('DockerManagement')), 
    __metadata('design:paramtypes', [Object])
], DockerContainerManagementImpl);
exports.DockerContainerManagementImpl = DockerContainerManagementImpl;
//# sourceMappingURL=docker-container-management-impl.js.map