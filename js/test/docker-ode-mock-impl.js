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
require("reflect-metadata");
const inversify_1 = require("inversify");
const image_object_impl_1 = require("./image-object-impl");
const container_object_impl_1 = require("./container-object-impl");
const force_error_impl_1 = require("../implementations/util/force-error-impl");
const jsonFile = require('jsonfile');
let DockerOdeMockImpl = class DockerOdeMockImpl extends force_error_impl_1.ForceErrorImpl {
    listImages(options, cb) {
        if (this.checkForceError('listImages', cb)) {
            return;
        }
        let images = options.all
            ? this.testImageList
            : this.testImageList.filter(image => {
                return image.RepoTags[0] !== '<none>:<none>';
            });
        cb(null, images);
    }
    listContainers(options, cb) {
        if (this.checkForceError('listContainers', cb)) {
            return;
        }
        let containers = options.all
            ? this.testContainerList
            : this.testContainerList.filter(container => {
                return container.Status.substring(0, 2) === 'Up';
            });
        cb(null, containers);
    }
    getContainer(id, options = {}) {
        if (this.checkForceError('getContainer')) {
            return;
        }
        var containerArray = this.testContainerList.filter(container => {
            return id === container.Id;
        });
        return containerArray.length
            ? new container_object_impl_1.DockerContainerImpl(null, containerArray[0].Id)
            : null;
    }
    getImage(id, options = {}) {
        if (this.checkForceError('getImage')) {
            return;
        }
        var imageArray = this.testImageList.filter(image => {
            return id === image.Id;
        });
        return imageArray.length
            ? new image_object_impl_1.DockerImageImpl(null, imageArray[0].Id)
            : null;
    }
    buildImage(tarStream, options, cb) {
        if (this.checkForceError('buildImage', cb)) {
            return;
        }
        let streamMock = new (require('events').EventEmitter)();
        let eventCount = 10;
        let interval = setInterval(() => {
            if (!(eventCount % 4)) {
                streamMock.emit('error', new Error('Test Error'));
            }
            if (!(eventCount % 2)) {
                streamMock.emit('data', JSON.stringify({
                    id: 'baadf00d',
                    status: 'Downloading',
                    progressDetail: {
                        current: eventCount,
                        total: 10
                    }
                }));
            }
            if (--eventCount < 0) {
                streamMock.emit('end', new Error('not found in repository'));
                clearInterval(interval);
            }
        }, 200);
        cb(null, streamMock);
    }
    createContainer(containerConfig, cb) {
        if (this.checkForceError('createContainer', cb)) {
            return;
        }
        let testContainer = this.testContainerList.filter(container => {
            return container.Image = 'mongo:2.6';
        })[0];
        cb(null, new container_object_impl_1.DockerContainerImpl(null, testContainer.Id));
    }
    pull(imageName, cb) {
        if (this.checkForceError('pull', cb)) {
            return;
        }
        let streamMock = new (require('events').EventEmitter)();
        let eventCount = 10;
        let interval = setInterval(() => {
            if (!(eventCount % 4)) {
                streamMock.emit('error', new Error('Test Error'));
            }
            if (!(eventCount % 2)) {
                streamMock.emit('data', JSON.stringify({
                    id: 'baadf00d',
                    status: 'Downloading',
                    progressDetail: {
                        current: eventCount,
                        total: 10
                    }
                }));
            }
            if (!(eventCount % 3)) {
                streamMock.emit('data', JSON.stringify({
                    error: 'Big Error! Sorry.'
                }));
            }
            if (--eventCount < 0) {
                streamMock.emit('end', JSON.stringify({
                    id: 'baadf00d',
                    status: 'Finished',
                    progressDetail: {
                        current: 10,
                        total: 10
                    }
                }));
                clearInterval(interval);
            }
        }, 200);
        cb(null, streamMock);
    }
    get testImageList() {
        return jsonFile.readFileSync(__dirname + '/../../test-data/docker-image-list.json');
    }
    get testContainerList() {
        return jsonFile.readFileSync(__dirname + '/../../test-data/docker-container-list.json');
    }
};
DockerOdeMockImpl = __decorate([
    inversify_1.injectable(), 
    __metadata('design:paramtypes', [])
], DockerOdeMockImpl);
exports.DockerOdeMockImpl = DockerOdeMockImpl;
//# sourceMappingURL=docker-ode-mock-impl.js.map