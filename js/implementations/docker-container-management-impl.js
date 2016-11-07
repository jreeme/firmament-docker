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
const dockerode_1 = require("../interfaces/dockerode");
const docker_util_options_impl_1 = require("./docker-util-options-impl");
const force_error_impl_1 = require("./force-error-impl");
const deepExtend = require('deep-extend');
const positive = require('positive');
let DockerContainerManagementImpl = class DockerContainerManagementImpl extends force_error_impl_1.ForceErrorImpl {
    constructor(_dockerode, _dockerUtil, _commandUtil) {
        super();
        this.dockerode = _dockerode;
        this.dockerUtil = _dockerUtil;
        this.commandUtil = _commandUtil;
    }
    listContainers(listAllContainers, cb) {
        let dockerUtilOptions = new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Container, listAllContainers);
        this.dockerUtil.forceError = this.forceError;
        this.dockerUtil.listImagesOrContainers(dockerUtilOptions, cb);
    }
    getContainers(ids, cb) {
        let dockerUtilOptions = new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Container);
        this.dockerUtil.forceError = this.forceError;
        this.dockerUtil.getImagesOrContainers(ids, dockerUtilOptions, cb);
    }
    getContainer(id, cb) {
        let dockerUtilOptions = new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Container);
        this.dockerUtil.forceError = this.forceError;
        this.dockerUtil.getImageOrContainer(id, dockerUtilOptions, cb);
    }
    createContainer(dockerContainerConfig, cb) {
        this.dockerode.forceError = this.forceError;
        var fullContainerConfigCopy = { ExpressApps: [] };
        deepExtend(fullContainerConfigCopy, dockerContainerConfig);
        this.dockerode.createContainer(fullContainerConfigCopy, (err, dockerContainer) => {
            cb(err, dockerContainer);
        });
    }
    startOrStopContainers(ids, start, cb) {
        let me = this;
        me.getContainers(ids, (err, dockerContainer) => {
            me.commandUtil.logError(err);
            async.mapSeries(dockerContainer, (containerOrErrorMsg, cb) => {
                if (typeof containerOrErrorMsg === 'string') {
                    me.commandUtil.logAndCallback(containerOrErrorMsg, cb);
                }
                else {
                    let resultMessage = 'Container "' + containerOrErrorMsg.name + '" ';
                    resultMessage += start ? 'started.' : 'stopped.';
                    let fnStartStop = start
                        ? containerOrErrorMsg.start.bind(containerOrErrorMsg)
                        : containerOrErrorMsg.stop.bind(containerOrErrorMsg);
                    fnStartStop((err) => {
                        me.commandUtil.logAndCallback(me.commandUtil.returnErrorStringOrMessage(err, resultMessage), cb);
                    });
                }
            }, cb);
        });
    }
    removeContainers(ids, cb) {
        let me = this;
        if (!ids.length) {
            console.log('Specify containers to remove by FirmamentId, Docker ID or Name. Or "all" to remove all.');
            return;
        }
        if (_.indexOf(ids, 'all') !== -1) {
            if (!positive("You're sure you want to remove all containers? [y/N] ", false)) {
                console.log('Operation canceled.');
                cb(null, null);
                return;
            }
            ids = null;
        }
        me.getContainers(ids, (err, dockerContainer) => {
            me.commandUtil.logError(err);
            async.map(dockerContainer, (containerOrErrorMsg, cb) => {
                if (typeof containerOrErrorMsg === 'string') {
                    me.commandUtil.logAndCallback(containerOrErrorMsg, cb, null, { msg: containerOrErrorMsg });
                }
                else {
                    containerOrErrorMsg.remove({ force: 1 }, (err) => {
                        var msg = 'Removing container "' + containerOrErrorMsg.name + '"';
                        me.commandUtil.logAndCallback(msg, cb, err, { msg: containerOrErrorMsg.name });
                    });
                }
            }, cb);
        });
    }
};
DockerContainerManagementImpl = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject('DockerOde')),
    __param(1, inversify_1.inject('DockerUtil')),
    __param(2, inversify_1.inject('CommandUtil')), 
    __metadata('design:paramtypes', [Object, Object, Object])
], DockerContainerManagementImpl);
exports.DockerContainerManagementImpl = DockerContainerManagementImpl;
//# sourceMappingURL=docker-container-management-impl.js.map