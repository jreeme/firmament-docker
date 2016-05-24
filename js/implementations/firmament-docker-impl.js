"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var _ = require('lodash');
var dockerode_1 = require('../interfaces/dockerode');
var firmament_yargs_1 = require('firmament-yargs');
var async = require('async');
var deepExtend = require('deep-extend');
var positive = require('positive');
var childProcess = require('child_process');
var FirmamentDockerImpl = (function (_super) {
    __extends(FirmamentDockerImpl, _super);
    function FirmamentDockerImpl() {
        _super.call(this);
        this.dockerode = new (require('dockerode'))({ socketPath: '/var/run/docker.sock' });
    }
    FirmamentDockerImpl.prototype.createContainer = function (dockerContainerConfig, cb) {
        var fullContainerConfigCopy = { ExpressApps: [] };
        deepExtend(fullContainerConfigCopy, dockerContainerConfig);
        this.dockerode.createContainer(fullContainerConfigCopy, function (err, dockerContainer) {
            cb(err, dockerContainer);
        });
    };
    FirmamentDockerImpl.prototype.removeImages = function (ids, cb) {
        var _this = this;
        var self = this;
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
        this.getImages(ids, function (err, images) {
            _this.logError(err);
            async.map(images, function (imageOrErrorMsg, cb) {
                if (typeof imageOrErrorMsg === 'string') {
                    _this.logAndCallback(imageOrErrorMsg, cb, null, { msg: imageOrErrorMsg });
                }
                else {
                    imageOrErrorMsg.remove({ force: 1 }, function (err) {
                        var msg = 'Removing image "' + imageOrErrorMsg.name + '"';
                        self.logAndCallback(msg, cb, err, { msg: imageOrErrorMsg.name });
                    });
                }
            }, cb);
        });
    };
    FirmamentDockerImpl.prototype.removeContainers = function (ids, cb) {
        var _this = this;
        var self = this;
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
        this.getContainers(ids, function (err, dockerContainer) {
            _this.logError(err);
            async.map(dockerContainer, function (containerOrErrorMsg, cb) {
                if (typeof containerOrErrorMsg === 'string') {
                    _this.logAndCallback(containerOrErrorMsg, cb, null, { msg: containerOrErrorMsg });
                }
                else {
                    containerOrErrorMsg.remove({ force: 1 }, function (err) {
                        var msg = 'Removing container "' + containerOrErrorMsg.name + '"';
                        self.logAndCallback(msg, cb, err, { msg: containerOrErrorMsg.name });
                    });
                }
            }, cb);
        });
    };
    FirmamentDockerImpl.prototype.startOrStopContainers = function (ids, start, cb) {
        var _this = this;
        this.getContainers(ids, function (err, dockerContainer) {
            _this.logError(err);
            async.mapSeries(dockerContainer, function (containerOrErrorMsg, cb) {
                if (typeof containerOrErrorMsg === 'string') {
                    _this.logAndCallback(containerOrErrorMsg, cb);
                }
                else {
                    var resultMessage_1 = 'Container "' + containerOrErrorMsg.name + '" ';
                    resultMessage_1 += start ? 'started.' : 'stopped.';
                    var fnStartStop = start
                        ? containerOrErrorMsg.start.bind(containerOrErrorMsg)
                        : containerOrErrorMsg.stop.bind(containerOrErrorMsg);
                    fnStartStop(function (err) {
                        _this.logAndCallback(_this.returnErrorStringOrMessage(err, resultMessage_1), cb);
                    });
                }
            }, cb);
        });
    };
    FirmamentDockerImpl.prototype.getImages = function (ids, cb) {
        this.getImagesOrContainers(ids, dockerode_1.ImageOrContainer.Image, cb);
    };
    FirmamentDockerImpl.prototype.getContainers = function (ids, cb) {
        this.getImagesOrContainers(ids, dockerode_1.ImageOrContainer.Container, cb);
    };
    FirmamentDockerImpl.prototype.getImagesOrContainers = function (ids, IorC, cb) {
        var _this = this;
        if (!ids) {
            this.listImagesOrContainers(true, IorC, function (err, imagesOrContainers) {
                if (_this.callbackIfError(cb, err)) {
                    return;
                }
                ids = [];
                imagesOrContainers.forEach(function (imageOrContainer) {
                    ids.push(imageOrContainer.firmamentId);
                });
                _this.getImagesOrContainers(ids, IorC, cb);
            });
            return;
        }
        var fnArray = ids.map(function (id) {
            return async.apply(_this.getImageOrContainer.bind(_this), id.toString(), IorC);
        });
        async.series(fnArray, function (err, results) {
            if (!_this.callbackIfError(cb, err)) {
                cb(err, results.filter(function (result) { return !!result; }));
            }
        });
    };
    FirmamentDockerImpl.prototype.getImage = function (id, cb) {
        this.getImageOrContainer(id, dockerode_1.ImageOrContainer.Image, cb);
    };
    FirmamentDockerImpl.prototype.getContainer = function (id, cb) {
        this.getImageOrContainer(id, dockerode_1.ImageOrContainer.Container, cb);
    };
    FirmamentDockerImpl.prototype.getImageOrContainer = function (id, IorC, cb) {
        var _this = this;
        var me = this;
        async.waterfall([
            function (cb) {
                me.listImagesOrContainers(true, IorC, cb);
            },
            function (imagesOrContainers, cb) {
                var foundImagesOrContainers = imagesOrContainers.filter(function (imageOrContainer) {
                    if (imageOrContainer.firmamentId === id) {
                        return true;
                    }
                    else {
                        if (IorC === dockerode_1.ImageOrContainer.Container) {
                            for (var i = 0; i < imageOrContainer.Names.length; ++i) {
                                if (imageOrContainer.Names[i] === (id[0] === '/' ? id : '/' + id)) {
                                    return true;
                                }
                            }
                        }
                        else if (IorC === dockerode_1.ImageOrContainer.Image) {
                            for (var i = 0; i < imageOrContainer.RepoTags.length; ++i) {
                                if (imageOrContainer.RepoTags[i] === id) {
                                    return true;
                                }
                            }
                        }
                        var lowerCaseId = id.toLowerCase();
                        var charCount = lowerCaseId.length;
                        if (charCount < 3) {
                            return false;
                        }
                        return imageOrContainer.Id.toLowerCase().substring(0, charCount) ===
                            lowerCaseId.substring(0, charCount);
                    }
                });
                if (foundImagesOrContainers.length > 0) {
                    if (IorC === dockerode_1.ImageOrContainer.Container) {
                        var imageOrContainer = _this.dockerode.getContainer(foundImagesOrContainers[0].Id);
                        imageOrContainer.name = foundImagesOrContainers[0].Names[0];
                        cb(null, imageOrContainer);
                    }
                    else if (IorC === dockerode_1.ImageOrContainer.Image) {
                        var imageOrContainer = _this.dockerode.getImage(foundImagesOrContainers[0].Id);
                        imageOrContainer.name = foundImagesOrContainers[0].RepoTags[0];
                        cb(null, imageOrContainer);
                    }
                }
                else {
                    cb(null, 'Unable to find: "' + id + '"');
                }
            }
        ], cb);
    };
    FirmamentDockerImpl.prototype.listContainers = function (listAllContainers, cb) {
        this.listImagesOrContainers(listAllContainers, dockerode_1.ImageOrContainer.Container, cb);
    };
    FirmamentDockerImpl.prototype.listImages = function (listAllImages, cb) {
        this.listImagesOrContainers(listAllImages, dockerode_1.ImageOrContainer.Image, cb);
    };
    FirmamentDockerImpl.prototype.listImagesOrContainers = function (listAll, IorC, cb) {
        var _this = this;
        var listFn;
        listFn = (IorC === dockerode_1.ImageOrContainer.Image)
            ? this.dockerode.listImages
            : this.dockerode.listContainers;
        listFn.call(this.dockerode, { all: true }, function (err, imagesOrContainers) {
            if (_this.callbackIfError(cb, err)) {
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
            var firmamentId = 0;
            imagesOrContainers = imagesOrContainers.map(function (imageOrContainer) {
                imageOrContainer.firmamentId = (++firmamentId).toString();
                if (IorC === dockerode_1.ImageOrContainer.Container) {
                    return (listAll || (imageOrContainer.Status.substring(0, 2) === 'Up')) ? imageOrContainer : null;
                }
                else {
                    return imageOrContainer;
                }
            }).filter(function (imageOrContainer) {
                return imageOrContainer !== null;
            });
            cb(null, imagesOrContainers);
        });
    };
    FirmamentDockerImpl.prototype.buildDockerFile = function (dockerFilePath, dockerImageName, progressCb, cb) {
        try {
            require('fs').statSync(dockerFilePath);
        }
        catch (err) {
            if (this.callbackIfError(cb, err)) {
                return;
            }
        }
        try {
            var tar = require('tar-fs');
            var tarStream = tar.pack(dockerFilePath);
            tarStream.on('error', function (err) {
                cb(err);
            });
            this.dockerode.buildImage(tarStream, {
                t: dockerImageName
            }, function (err, outputStream) {
                if (err) {
                    cb(err);
                    return;
                }
                var error = null;
                outputStream.on('data', function (chunk) {
                    try {
                        var data = JSON.parse(chunk);
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
    };
    FirmamentDockerImpl.prototype.pullImage = function (imageName, progressCb, cb) {
        this.dockerode.pull(imageName, function (err, outputStream) {
            var error = null;
            if (err) {
                cb(err);
                return;
            }
            outputStream.on('data', function (chunk) {
                try {
                    var data = JSON.parse(chunk);
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
            outputStream.on('end', function () {
                cb(error);
            });
            outputStream.on('error', function () {
                var msg = "Unable to pull image: '" + imageName + "'";
                cb(new Error(msg));
            });
        });
    };
    FirmamentDockerImpl.prototype.exec = function (id, command, cb) {
        var _this = this;
        this.getContainer(id, function (err, dockerContainer) {
            if (_this.callbackIfError(cb, err)) {
                return;
            }
            childProcess.spawnSync('docker', ['exec', '-it', dockerContainer.name.slice(1), command], {
                stdio: 'inherit'
            });
            cb(null, 0);
        });
    };
    return FirmamentDockerImpl;
}(firmament_yargs_1.CommandImpl));
exports.FirmamentDockerImpl = FirmamentDockerImpl;
//# sourceMappingURL=firmament-docker-impl.js.map