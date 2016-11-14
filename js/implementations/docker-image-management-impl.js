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
let DockerImageManagementImpl = class DockerImageManagementImpl extends force_error_impl_1.ForceErrorImpl {
    constructor(_dockerManagement) {
        super();
        this.DM = _dockerManagement;
    }
    listImages(listAllImages, cb) {
        let dockerUtilOptions = new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Image, listAllImages);
        this.DM.dockerUtil.forceError = this.forceError;
        this.DM.dockerUtil.listImagesOrContainers(dockerUtilOptions, cb);
    }
    getImages(ids, cb) {
        let dockerUtilOptions = new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Image);
        this.DM.dockerUtil.forceError = this.forceError;
        this.DM.dockerUtil.getImagesOrContainers(ids, dockerUtilOptions, cb);
    }
    getImage(id, cb) {
        let dockerUtilOptions = new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Image);
        this.DM.dockerUtil.forceError = this.forceError;
        this.DM.dockerUtil.getImageOrContainer(id, dockerUtilOptions, cb);
    }
    removeImages(ids, cb) {
        let dockerUtilOptions = new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Image);
        this.DM.dockerUtil.forceError = this.forceError;
        this.DM.dockerUtil.removeImagesOrContainers(ids, dockerUtilOptions, cb);
    }
    pullImage(imageName, progressCb, cb) {
        this.DM.dockerode.forceError = this.forceError;
        let me = this;
        me.DM.dockerode.pull(imageName, (err, outputStream) => {
            if (me.DM.commandUtil.callbackIfError(cb, err)) {
                return;
            }
            outputStream.on('data', (chunk) => {
                try {
                    let data = JSON.parse(chunk);
                    if (data.error) {
                        throw new Error(data.error);
                    }
                    if (data.status === 'Downloading' || data.status === 'Extracting') {
                        progressCb(data.id, data.status, data.progressDetail.current, data.progressDetail.total);
                    }
                }
                catch (err) {
                    progressCb('**error**', err.message, 0, 10);
                }
            });
            outputStream.on('end', () => {
                cb(null);
            });
            outputStream.on('error', function (err) {
                let msg = `Encountered error '${err.message}' while pulling image: '${imageName}'`;
                me.DM.commandUtil.logError(new Error(msg), true);
            });
        });
    }
    buildDockerFile(dockerFilePath, dockerImageName, progressCb, cb) {
        this.DM.dockerode.forceError = this.forceError;
        let me = this;
        try {
            require('fs').statSync(dockerFilePath);
        }
        catch (err) {
            if (me.DM.commandUtil.callbackIfError(cb, err)) {
                return;
            }
        }
        try {
            let tar = require('tar-fs');
            let tarStream = tar.pack(dockerFilePath);
            tarStream.on('error', (err) => {
                cb(err);
            });
            me.DM.dockerode.buildImage(tarStream, {
                t: dockerImageName
            }, function (err, outputStream) {
                if (me.DM.commandUtil.callbackIfError(cb, err)) {
                    return;
                }
                let error = null;
                outputStream.on('data', function (chunk) {
                    try {
                        let data = JSON.parse(chunk);
                        if (data.stream) {
                            progressCb('start', data.stream, 0, 10);
                        }
                        else {
                            if (data.error) {
                                error = data.error;
                                return;
                            }
                            if (data.status == 'Downloading' || data.status == 'Extracting') {
                                progressCb(data.id, data.status, data.progressDetail.current, data.progressDetail.total);
                            }
                        }
                    }
                    catch (err) {
                        error = err;
                    }
                });
                outputStream.on('end', function () {
                    cb(error
                        && error.message
                        && error.message.indexOf('not found in repository') === -1
                        ? error
                        : null);
                });
                outputStream.on('error', function (err) {
                    let msg = `Encountered error '${err.message}' while building: '${dockerImageName}'`;
                    me.DM.commandUtil.logError(new Error(msg), true);
                });
            });
        }
        catch (err) {
            me.DM.commandUtil.callbackIfError(cb, err);
        }
    }
};
DockerImageManagementImpl = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject('DockerManagement')), 
    __metadata('design:paramtypes', [Object])
], DockerImageManagementImpl);
exports.DockerImageManagementImpl = DockerImageManagementImpl;
//# sourceMappingURL=docker-image-management-impl.js.map