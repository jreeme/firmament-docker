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
const force_error_impl_1 = require("./force-error-impl");
const deepExtend = require('deep-extend');
const async = require('async');
let DockerUtilImpl = class DockerUtilImpl extends force_error_impl_1.ForceErrorImpl {
    constructor(_dockerode, _commandUtil) {
        super();
        this.dockerode = _dockerode;
        this.commandUtil = _commandUtil;
    }
    listImagesOrContainers(options, cb) {
        let me = this;
        me.dockerode.forceError = this.forceError;
        let listFn;
        deepExtend(options, { all: true });
        listFn = (options.IorC === dockerode_1.ImageOrContainer.Image)
            ? me.dockerode.listImages
            : me.dockerode.listContainers;
        listFn.call(me.dockerode, {
            all: true
        }, (err, imagesOrContainers) => {
            if (me.commandUtil.callbackIfError(cb, err)) {
                return;
            }
            imagesOrContainers.sort(function (a, b) {
                if (options.IorC === dockerode_1.ImageOrContainer.Container) {
                    return a.Names[0].localeCompare(b.Names[0]);
                }
                else if (options.IorC === dockerode_1.ImageOrContainer.Image) {
                    let ref = a.RepoTags[0] + a.Id;
                    let cmp = b.RepoTags[0] + b.Id;
                    return ref.localeCompare(cmp);
                }
            });
            let firmamentId = 0;
            imagesOrContainers = imagesOrContainers.map(imageOrContainer => {
                imageOrContainer.firmamentId = (++firmamentId).toString();
                if (options.IorC === dockerode_1.ImageOrContainer.Container) {
                    return (options.listAll || (imageOrContainer.Status.substring(0, 2) === 'Up')) ? imageOrContainer : null;
                }
                else {
                    return (options.listAll || (imageOrContainer.RepoTags[0] !== '<none>:<none>')) ? imageOrContainer : null;
                }
            }).filter(imageOrContainer => {
                return imageOrContainer !== null;
            });
            cb(null, imagesOrContainers);
        });
    }
    getImagesOrContainers(ids, options, cb) {
        let me = this;
        if (!ids) {
            options.listAll = true;
            me.listImagesOrContainers(options, (err, imagesOrContainers) => {
                if (me.commandUtil.callbackIfError(cb, err)) {
                    return;
                }
                ids = [];
                imagesOrContainers.forEach(imageOrContainer => {
                    ids.push(imageOrContainer.firmamentId);
                });
                me.getImagesOrContainers(ids, options, cb);
            });
            return;
        }
        let fnArray = ids.map(id => {
            return async.apply(me.getImageOrContainer.bind(me), id.toString(), options);
        });
        async.series(fnArray, (err, results) => {
            if (!me.commandUtil.callbackIfError(cb, err)) {
                cb(err, results.filter(result => !!result));
            }
        });
    }
    getImageOrContainer(id, options, cb) {
        let me = this;
        async.waterfall([
                (cb) => {
                options.listAll = true;
                me.listImagesOrContainers(options, cb);
            },
                (imagesOrContainers, cb) => {
                let foundImagesOrContainers = imagesOrContainers.filter(imageOrContainer => {
                    if (imageOrContainer.firmamentId === id) {
                        return true;
                    }
                    else {
                        if (options.IorC === dockerode_1.ImageOrContainer.Container) {
                            for (let i = 0; i < imageOrContainer.Names.length; ++i) {
                                if (imageOrContainer.Names[i] === (id[0] === '/' ? id : '/' + id)) {
                                    return true;
                                }
                            }
                        }
                        else if (options.IorC === dockerode_1.ImageOrContainer.Image) {
                            for (let i = 0; i < imageOrContainer.RepoTags.length; ++i) {
                                if (imageOrContainer.RepoTags[i] === '<none>:<none>') {
                                    continue;
                                }
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
                        const testPrefix = 'sha256:';
                        let imageOrContainerId = imageOrContainer.Id.toLowerCase();
                        let startIdx = (testPrefix === imageOrContainerId.substr(0, testPrefix.length))
                            ? testPrefix.length
                            : 0;
                        let str0 = imageOrContainerId.substring(startIdx, startIdx + charCount);
                        let str1 = lowerCaseId.substring(0, charCount);
                        return str0 === str1;
                    }
                });
                if (foundImagesOrContainers.length > 0) {
                    let imageOrContainer;
                    if (options.IorC === dockerode_1.ImageOrContainer.Container) {
                        imageOrContainer = me.dockerode.getContainer(foundImagesOrContainers[0].Id, options);
                        imageOrContainer.name = foundImagesOrContainers[0].Names[0];
                    }
                    else if (options.IorC === dockerode_1.ImageOrContainer.Image) {
                        imageOrContainer = me.dockerode.getImage(foundImagesOrContainers[0].Id, options);
                        imageOrContainer.name = foundImagesOrContainers[0].RepoTags[0];
                    }
                    cb(null, imageOrContainer);
                }
                else {
                    cb(null, `Unable to find: ${id}`);
                }
            }
        ], cb);
    }
};
DockerUtilImpl = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject('DockerOde')),
    __param(1, inversify_1.inject('CommandUtil')), 
    __metadata('design:paramtypes', [Object, Object])
], DockerUtilImpl);
exports.DockerUtilImpl = DockerUtilImpl;
//# sourceMappingURL=docker-util-impl.js.map