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
const force_error_impl_1 = require("./force-error-impl");
let DockerOdeImpl = class DockerOdeImpl extends force_error_impl_1.ForceErrorImpl {
    constructor() {
        super();
        this.dockerode = new (require('dockerode'))({ socketPath: '/var/run/docker.sock' });
    }
    listImages(options, cb) {
        if (this.checkForceError(cb)) {
            return;
        }
        this.dockerode.listImages(options, cb);
    }
    listContainers(options, cb) {
        if (this.checkForceError(cb)) {
            return;
        }
        this.dockerode.listContainers(options, cb);
    }
    getContainer(id) {
        return this.dockerode.getContainer(id);
    }
    getImage(id) {
        return this.dockerode.getImage(id);
    }
    buildImage(tarStream, options, cb) {
        if (this.checkForceError(cb)) {
            return;
        }
        this.dockerode.buildImage(tarStream, options, cb);
    }
    createContainer(containerConfig, cb) {
        if (this.checkForceError(cb)) {
            return;
        }
        this.dockerode.createContainer(containerConfig, (err, container) => {
            cb(err, container);
        });
    }
    pull(imageName, cb) {
        if (this.checkForceError(cb)) {
            return;
        }
        this.dockerode.pull(imageName, cb);
    }
};
DockerOdeImpl = __decorate([
    inversify_1.injectable(), 
    __metadata('design:paramtypes', [])
], DockerOdeImpl);
exports.DockerOdeImpl = DockerOdeImpl;
//# sourceMappingURL=docker-ode-impl.js.map