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
const docker_util_options_impl_1 = require('./docker-util-options-impl');
const force_error_impl_1 = require('./force-error-impl');
const _ = require('lodash');
const async = require('async');
const positive = require('positive');
let DockerImageManagementImpl = class DockerImageManagementImpl extends force_error_impl_1.ForceErrorImpl {
    constructor(_dockerode, _dockerUtil, _commandUtil) {
        super();
        this.dockerode = _dockerode;
        this.dockerUtil = _dockerUtil;
        this.commandUtil = _commandUtil;
    }
    listImages(listAllImages, cb) {
        let dockerUtilOptions = new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Image, listAllImages);
        this.dockerUtil.forceError = this.forceError;
        this.dockerUtil.listImagesOrContainers(dockerUtilOptions, cb);
    }
    getImage(id, cb) {
        let dockerUtilOptions = new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Image);
        this.dockerUtil.forceError = this.forceError;
        this.dockerUtil.getImageOrContainer(id, dockerUtilOptions, cb);
    }
    getImages(ids, cb) {
        let dockerUtilOptions = new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Image);
        this.dockerUtil.forceError = this.forceError;
        this.dockerUtil.getImagesOrContainers(ids, dockerUtilOptions, cb);
    }
    pullImage(imageName, progressCb, cb) {
        this.dockerode.forceError = this.forceError;
        let me = this;
        me.dockerode.pull(imageName, (err, outputStream) => {
            if (me.commandUtil.callbackIfError(cb, err)) {
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
            outputStream.on('error', function () {
                me.commandUtil.callbackIfError(cb, new Error(`Unable to pull image: '${imageName}'`));
            });
        });
    }
    buildDockerFile(dockerFilePath, dockerImageName, progressCb, cb) {
        this.dockerode.forceError = this.forceError;
        let me = this;
        try {
            require('fs').statSync(dockerFilePath);
        }
        catch (err) {
            if (me.commandUtil.callbackIfError(cb, err)) {
                return;
            }
        }
        try {
            let tar = require('tar-fs');
            let tarStream = tar.pack(dockerFilePath);
            tarStream.on('error', (err) => {
                cb(err);
            });
            me.dockerode.buildImage(tarStream, {
                t: dockerImageName
            }, function (err, outputStream) {
                if (me.commandUtil.callbackIfError(cb, err)) {
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
                outputStream.on('error', function () {
                    me.commandUtil.callbackIfError(cb, new Error(`Error creating image: '${dockerImageName}'`));
                });
            });
        }
        catch (err) {
            me.commandUtil.callbackIfError(cb, err);
        }
    }
    removeImages(ids, cb) {
        if (this.checkForceError(cb)) {
            return;
        }
        let me = this;
        if (!ids.length) {
            console.log(`Specify images to remove by FirmamentId, Docker ID or Name. Or 'all' to remove all.`);
            return;
        }
        if (_.indexOf(ids, 'all') !== -1) {
            try {
                if (!positive(`You're sure you want to remove all images? [y/N] `, false)) {
                    console.log('Operation canceled.');
                    cb(null, null);
                    return;
                }
            }
            catch (err) {
                console.log(err.message);
            }
            ids = null;
        }
        me.getImages(ids, (err, images) => {
            me.commandUtil.logError(err);
            async.map(images, (imageOrErrorMsg, cb) => {
                if (typeof imageOrErrorMsg === 'string') {
                    me.commandUtil.logAndCallback(imageOrErrorMsg, cb, null, { msg: imageOrErrorMsg });
                }
                else {
                    let image = imageOrErrorMsg;
                    image.remove({ force: 1 }, (err, _image) => {
                        let id = _image.Id;
                        let msg = `Removing image '${_image.Name}' with id: '${id}'`;
                        me.commandUtil.logAndCallback(msg, cb, err, { msg });
                    });
                }
            }, cb);
        });
    }
};
DockerImageManagementImpl = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject('DockerOde')),
    __param(1, inversify_1.inject('DockerUtil')),
    __param(2, inversify_1.inject('CommandUtil')), 
    __metadata('design:paramtypes', [Object, Object, Object])
], DockerImageManagementImpl);
exports.DockerImageManagementImpl = DockerImageManagementImpl;
//# sourceMappingURL=docker-image-management-impl.js.map