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
const _ = require('lodash');
const inversify_1 = require("inversify");
const dockerode_1 = require('../interfaces/dockerode');
const firmament_yargs_1 = require('firmament-yargs');
const async = require('async');
const deepExtend = require('deep-extend');
const positive = require('positive');
const childProcess = require('child_process');
class FirmamentDockerImpl extends firmament_yargs_1.CommandImpl {
    constructor(_dockerImageManagement) {
        super();
        this.dockerImageManagement = _dockerImageManagement;
        this.dockerode = new (require('dockerode'))({ socketPath: '/var/run/docker.sock' });
    }
    createContainer(dockerContainerConfig, cb) {
        var fullContainerConfigCopy = { ExpressApps: [] };
        deepExtend(fullContainerConfigCopy, dockerContainerConfig);
        this.dockerode.createContainer(fullContainerConfigCopy, (err, dockerContainer) => {
            cb(err, dockerContainer);
        });
    }
    removeImages(ids, cb) {
        let self = this;
        if (!ids.length) {
            console.log('Specify images to remove by FirmamentId, Docker ID or Name. Or "all" to remove all.');
            return;
        }
        if (_.indexOf(ids, 'all') !== -1) {
            if (!positive("You're sure you want to remove all images? [y/N] ", false)) {
                console.log('Operation canceled.');
                cb(null, null);
                return;
            }
            ids = null;
        }
        this.getImages(ids, (err, images) => {
            this.logError(err);
            async.map(images, (imageOrErrorMsg, cb) => {
                if (typeof imageOrErrorMsg === 'string') {
                    this.logAndCallback(imageOrErrorMsg, cb, null, { msg: imageOrErrorMsg });
                }
                else {
                    imageOrErrorMsg.remove({ force: 1 }, (err) => {
                        var msg = 'Removing image "' + imageOrErrorMsg.name + '"';
                        self.logAndCallback(msg, cb, err, { msg: imageOrErrorMsg.name });
                    });
                }
            }, cb);
        });
    }
    removeContainers(ids, cb) {
        let self = this;
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
        this.getContainers(ids, (err, dockerContainer) => {
            this.logError(err);
            async.map(dockerContainer, (containerOrErrorMsg, cb) => {
                if (typeof containerOrErrorMsg === 'string') {
                    this.logAndCallback(containerOrErrorMsg, cb, null, { msg: containerOrErrorMsg });
                }
                else {
                    containerOrErrorMsg.remove({ force: 1 }, (err) => {
                        var msg = 'Removing container "' + containerOrErrorMsg.name + '"';
                        self.logAndCallback(msg, cb, err, { msg: containerOrErrorMsg.name });
                    });
                }
            }, cb);
        });
    }
    startOrStopContainers(ids, start, cb) {
        this.getContainers(ids, (err, dockerContainer) => {
            this.logError(err);
            async.mapSeries(dockerContainer, (containerOrErrorMsg, cb) => {
                if (typeof containerOrErrorMsg === 'string') {
                    this.logAndCallback(containerOrErrorMsg, cb);
                }
                else {
                    let resultMessage = 'Container "' + containerOrErrorMsg.name + '" ';
                    resultMessage += start ? 'started.' : 'stopped.';
                    let fnStartStop = start
                        ? containerOrErrorMsg.start.bind(containerOrErrorMsg)
                        : containerOrErrorMsg.stop.bind(containerOrErrorMsg);
                    fnStartStop((err) => {
                        this.logAndCallback(this.returnErrorStringOrMessage(err, resultMessage), cb);
                    });
                }
            }, cb);
        });
    }
    getImages(ids, cb) {
        this.getImagesOrContainers(ids, dockerode_1.ImageOrContainer.Image, cb);
    }
    getContainers(ids, cb) {
        this.getImagesOrContainers(ids, dockerode_1.ImageOrContainer.Container, cb);
    }
    getImagesOrContainers(ids, IorC, cb) {
        if (!ids) {
            this.listImagesOrContainers(true, IorC, (err, imagesOrContainers) => {
                if (this.callbackIfError(cb, err)) {
                    return;
                }
                ids = [];
                imagesOrContainers.forEach(imageOrContainer => {
                    ids.push(imageOrContainer.firmamentId);
                });
                this.getImagesOrContainers(ids, IorC, cb);
            });
            return;
        }
        let fnArray = ids.map(id => {
            return async.apply(this.getImageOrContainer.bind(this), id.toString(), IorC);
        });
        async.series(fnArray, (err, results) => {
            if (!this.callbackIfError(cb, err)) {
                cb(err, results.filter(result => !!result));
            }
        });
    }
    getImage(id, cb) {
        this.getImageOrContainer(id, dockerode_1.ImageOrContainer.Image, cb);
    }
    getContainer(id, cb) {
        this.getImageOrContainer(id, dockerode_1.ImageOrContainer.Container, cb);
    }
    getImageOrContainer(id, IorC, cb) {
        let me = this;
        async.waterfall([
                (cb) => {
                me.listImagesOrContainers(true, IorC, cb);
            },
                (imagesOrContainers, cb) => {
                let foundImagesOrContainers = imagesOrContainers.filter(imageOrContainer => {
                    if (imageOrContainer.firmamentId === id) {
                        return true;
                    }
                    else {
                        if (IorC === dockerode_1.ImageOrContainer.Container) {
                            for (let i = 0; i < imageOrContainer.Names.length; ++i) {
                                if (imageOrContainer.Names[i] === (id[0] === '/' ? id : '/' + id)) {
                                    return true;
                                }
                            }
                        }
                        else if (IorC === dockerode_1.ImageOrContainer.Image) {
                            for (let i = 0; i < imageOrContainer.RepoTags.length; ++i) {
                                if (imageOrContainer.RepoTags[i] === id) {
                                    return true;
                                }
                            }
                        }
                        let lowerCaseId = id.toLowerCase();
                        let charCount = lowerCaseId.length;
                        if (charCount < 3) {
                            return false;
                        }
                        return imageOrContainer.Id.toLowerCase().substring(0, charCount) ===
                            lowerCaseId.substring(0, charCount);
                    }
                });
                if (foundImagesOrContainers.length > 0) {
                    if (IorC === dockerode_1.ImageOrContainer.Container) {
                        let imageOrContainer = this.dockerode.getContainer(foundImagesOrContainers[0].Id);
                        imageOrContainer.name = foundImagesOrContainers[0].Names[0];
                        cb(null, imageOrContainer);
                    }
                    else if (IorC === dockerode_1.ImageOrContainer.Image) {
                        let imageOrContainer = this.dockerode.getImage(foundImagesOrContainers[0].Id);
                        imageOrContainer.name = foundImagesOrContainers[0].RepoTags[0];
                        cb(null, imageOrContainer);
                    }
                }
                else {
                    cb(null, 'Unable to find: "' + id + '"');
                }
            }
        ], cb);
    }
    listContainers(listAllContainers, cb) {
        this.listImagesOrContainers(listAllContainers, dockerode_1.ImageOrContainer.Container, cb);
    }
    listImages(listAllImages, cb) {
        this.dockerImageManagement.listImages(listAllImages, cb);
    }
    listImagesOrContainers(listAll, IorC, cb) {
        let listFn;
        listFn = (IorC === dockerode_1.ImageOrContainer.Image)
            ? this.dockerode.listImages
            : this.dockerode.listContainers;
        listFn.call(this.dockerode, { all: true }, (err, imagesOrContainers) => {
            if (this.callbackIfError(cb, err)) {
                return;
            }
            imagesOrContainers.sort(function (a, b) {
                if (IorC === dockerode_1.ImageOrContainer.Container) {
                    return a.Names[0].localeCompare(b.Names[0]);
                }
                else if (IorC === dockerode_1.ImageOrContainer.Image) {
                    return a.RepoTags[0].localeCompare(b.RepoTags[0]);
                }
            });
            let firmamentId = 0;
            imagesOrContainers = imagesOrContainers.map(imageOrContainer => {
                imageOrContainer.firmamentId = (++firmamentId).toString();
                if (IorC === dockerode_1.ImageOrContainer.Container) {
                    return (listAll || (imageOrContainer.Status.substring(0, 2) === 'Up')) ? imageOrContainer : null;
                }
                else {
                    return imageOrContainer;
                }
            }).filter(imageOrContainer => {
                return imageOrContainer !== null;
            });
            cb(null, imagesOrContainers);
        });
    }
    buildDockerFile(dockerFilePath, dockerImageName, progressCb, cb) {
        try {
            require('fs').statSync(dockerFilePath);
        }
        catch (err) {
            if (this.callbackIfError(cb, err)) {
                return;
            }
        }
        try {
            let tar = require('tar-fs');
            let tarStream = tar.pack(dockerFilePath);
            tarStream.on('error', (err) => {
                cb(err);
            });
            this.dockerode.buildImage(tarStream, {
                t: dockerImageName
            }, function (err, outputStream) {
                if (err) {
                    cb(err);
                    return;
                }
                let error = null;
                outputStream.on('data', function (chunk) {
                    try {
                        let data = JSON.parse(chunk);
                        if (data.error) {
                            error = data.error;
                            return;
                        }
                        if (data.status == 'Downloading' || data.status == 'Extracting') {
                            progressCb(data.id, data.status, data.progressDetail.current, data.progressDetail.total);
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
                    this.callbackIfError(cb, new Error("Error creating image: '" + dockerImageName + "'"));
                });
            });
        }
        catch (err) {
            this.callbackIfError(cb, err);
        }
    }
    pullImage(imageName, progressCb, cb) {
        this.dockerode.pull(imageName, (err, outputStream) => {
            let error = null;
            if (err) {
                cb(err);
                return;
            }
            outputStream.on('data', (chunk) => {
                try {
                    let data = JSON.parse(chunk);
                    if (data.error) {
                        error = new Error(data.error);
                        return;
                    }
                    if (data.status === 'Downloading' || data.status === 'Extracting') {
                        progressCb(data.id, data.status, data.progressDetail.current, data.progressDetail.total);
                    }
                }
                catch (err) {
                    error = err;
                }
            });
            outputStream.on('end', () => {
                cb(error);
            });
            outputStream.on('error', function () {
                let msg = "Unable to pull image: '" + imageName + "'";
                cb(new Error(msg));
            });
        });
    }
    exec(id, command, cb) {
        this.getContainer(id, (err, dockerContainer) => {
            if (this.callbackIfError(cb, err)) {
                return;
            }
            childProcess.spawnSync('docker', ['exec', '-it', dockerContainer.name.slice(1), command], {
                stdio: 'inherit'
            });
            cb(null, 0);
        });
    }
}
FirmamentDockerImpl = __decorate([
    __param(0, inversify_1.inject('DockerImageManagement')), 
    __metadata('design:paramtypes', [Object])
], FirmamentDockerImpl);
exports.FirmamentDockerImpl = FirmamentDockerImpl;
//# sourceMappingURL=firmament-docker-impl.js.map