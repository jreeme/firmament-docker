"use strict";
require("reflect-metadata");
const inversify_config_1 = require('../inversify.config');
const chai_1 = require('chai');
const dockerode_1 = require("../interfaces/dockerode");
const docker_ode_mock_impl_1 = require("./docker-ode-mock-impl");
const docker_util_options_impl_1 = require("../implementations/util/docker-util-options-impl");
describe('DockerUtil', function () {
    let dockerUtil;
    beforeEach(() => {
        inversify_config_1.default.unbind('DockerOde');
        inversify_config_1.default.bind('DockerOde').to(docker_ode_mock_impl_1.DockerOdeMockImpl);
        dockerUtil = inversify_config_1.default.get('DockerUtil');
    });
    describe('DockerUtil.listImagesOrContainers (force error, images)', function () {
        it('should return non-null Error instance in callback', function (done) {
            chai_1.expect(dockerUtil).to.not.equal(null);
            dockerUtil.forceError = true;
            dockerUtil.listImagesOrContainers(new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Image, true), (err, images) => {
                chai_1.expect(err).to.not.equal(null);
                chai_1.expect(err.message).to.equal('force error: listImages');
                chai_1.expect(images).to.equal(null);
                done();
            });
        });
    });
    describe('DockerUtil.listImagesOrContainers (all,  images)', function () {
        it('should return a list of all images', function (done) {
            chai_1.expect(dockerUtil).to.not.equal(null);
            dockerUtil.listImagesOrContainers(new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Image, true), (err, images) => {
                chai_1.expect(images.length).to.equal(9);
                for (let i = 0; i < images.length - 1; ++i) {
                    let refId = images[i].RepoTags[0] + images[i].Id;
                    let cmpId = images[i + 1].RepoTags[0] + images[i + 1].Id;
                    let r = refId.localeCompare(cmpId);
                    chai_1.expect(r).to.equal(-1);
                }
                done();
            });
        });
    });
    describe('DockerUtil.listImagesOrContainers (not all, images)', function () {
        it('should return a list of non-intermediate images', function (done) {
            chai_1.expect(dockerUtil).to.not.equal(null);
            dockerUtil.listImagesOrContainers(new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Image), (err, images) => {
                chai_1.expect(images.length).to.equal(5);
                done();
            });
        });
    });
    describe('DockerUtil.listImagesOrContainers (force error, containers)', function () {
        it('should return non-null Error instance in callback', function (done) {
            chai_1.expect(dockerUtil).to.not.equal(null);
            dockerUtil.forceError = true;
            dockerUtil.listImagesOrContainers(new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Container, true), (err, containers) => {
                chai_1.expect(err).to.not.equal(null);
                chai_1.expect(err.message).to.equal('force error: listContainers');
                chai_1.expect(containers).to.equal(null);
                done();
            });
        });
    });
    describe('DockerUtil.listImagesOrContainers (all,  containers)', function () {
        it('should return a list of all images', function (done) {
            chai_1.expect(dockerUtil).to.not.equal(null);
            dockerUtil.listImagesOrContainers(new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Container, true), (err, containers) => {
                for (let i = 0; i < containers.length - 1; ++i) {
                    let refId = containers[i].Names[0];
                    let cmpId = containers[i + 1].Names[0];
                    let r = refId.localeCompare(cmpId);
                    chai_1.expect(r).to.equal(-1);
                }
                chai_1.expect(containers.length).to.equal(3);
                done();
            });
        });
    });
    describe('DockerUtil.listImagesOrContainers (not all, containers)', function () {
        it('should return a list of all images', function (done) {
            chai_1.expect(dockerUtil).to.not.equal(null);
            dockerUtil.listImagesOrContainers(new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Container), (err, containers) => {
                chai_1.expect(containers.length).to.equal(1);
                done();
            });
        });
    });
    describe('DockerUtil.getImageOrContainer (force error, image)', function () {
        it('should return non-null Error instance in callback', function (done) {
            chai_1.expect(dockerUtil).to.not.equal(null);
            dockerUtil.forceError = true;
            dockerUtil.getImageOrContainer('5', new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Image, true), (err, image) => {
                chai_1.expect(err).to.not.equal(null);
                chai_1.expect(err.message).to.equal('force error: listImages');
                chai_1.expect(image).to.equal(null);
                done();
            });
        });
    });
    describe('DockerUtil.getImageOrContainer (non-existent, by firmamentId, image)', function () {
        it('should return string with bad firmamentId in callback', function (done) {
            chai_1.expect(dockerUtil).to.not.equal(null);
            const unknownFirmamentId = '113';
            dockerUtil.getImageOrContainer(unknownFirmamentId, new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Image), (err, image) => {
                chai_1.expect(err).to.equal(null);
                chai_1.expect(typeof image).to.equal('string');
                chai_1.expect(image).to.equal('Unable to find: ' + unknownFirmamentId);
                done();
            });
        });
    });
    describe('DockerUtil.getImageOrContainer (by firmamentId, image)', function () {
        it('should return non-null Image instance in callback', function (done) {
            chai_1.expect(dockerUtil).to.not.equal(null);
            dockerUtil.getImageOrContainer('5', new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Image), (err, image) => {
                chai_1.expect(err).to.equal(null);
                chai_1.expect(image.constructor.name).to.equal('DockerImageImpl');
                done();
            });
        });
    });
    describe('DockerUtil.getImageOrContainer (force error, container)', function () {
        it('should return non-null Error instance in callback', function (done) {
            chai_1.expect(dockerUtil).to.not.equal(null);
            dockerUtil.forceError = true;
            dockerUtil.getImageOrContainer('5', new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Container, true), (err, container) => {
                chai_1.expect(err).to.not.equal(null);
                chai_1.expect(container).to.equal(null);
                done();
            });
        });
    });
    describe('DockerUtil.getImageOrContainer (non-existent, by firmamentId, container)', function () {
        it('should return string with bad firmamentId in callback', function (done) {
            chai_1.expect(dockerUtil).to.not.equal(null);
            const unknownFirmamentId = '113';
            dockerUtil.getImageOrContainer(unknownFirmamentId, new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Container), (err, container) => {
                chai_1.expect(err).to.equal(null);
                chai_1.expect(typeof container).to.equal('string');
                chai_1.expect(container).to.equal('Unable to find: ' + unknownFirmamentId);
                done();
            });
        });
    });
    describe('DockerUtil.getImageOrContainer (by firmamentId, container)', function () {
        it('should return non-null Container instance in callback', function (done) {
            chai_1.expect(dockerUtil).to.not.equal(null);
            dockerUtil.getImageOrContainer('2', new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Container), (err, image) => {
                chai_1.expect(err).to.equal(null);
                chai_1.expect(image.constructor.name).to.equal('DockerContainerImpl');
                done();
            });
        });
    });
    describe('DockerUtil.getImagesOrContainers (force error, images)', function () {
        it('should return non-null Error instance in callback', function (done) {
            chai_1.expect(dockerUtil).to.not.equal(null);
            dockerUtil.forceError = true;
            dockerUtil.getImagesOrContainers(['1', '3'], new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Image, true), (err, images) => {
                chai_1.expect(err).to.not.equal(null);
                chai_1.expect(err.message).to.equal('force error: listImages');
                chai_1.expect(images).to.equal(null);
                done();
            });
        });
    });
    describe('DockerUtil.getImagesOrContainers (by firmamentId, images)', function () {
        it('should return 4 images and 1 unknown by firmamentId in callback', function (done) {
            chai_1.expect(dockerUtil).to.not.equal(null);
            const unknownFirmamentId = 'xxx';
            dockerUtil.getImagesOrContainers(['1', '3', '5', '7', unknownFirmamentId], new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Image), (err, images) => {
                chai_1.expect(err).to.equal(null);
                chai_1.expect(images).to.have.lengthOf(5);
                images.forEach(image => {
                    if (typeof image === 'string') {
                        chai_1.expect(image).to.equal('Unable to find: ' + unknownFirmamentId);
                    }
                    else {
                        chai_1.expect(image.constructor.name).to.equal('DockerImageImpl');
                    }
                });
                done();
            });
        });
    });
    describe('DockerUtil.getImagesOrContainers (force error, images)', function () {
        it('should return non-null Error instance in callback', function (done) {
            chai_1.expect(dockerUtil).to.not.equal(null);
            dockerUtil.forceError = true;
            dockerUtil.getImagesOrContainers(['1', '3'], new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Container, true), (err, containers) => {
                chai_1.expect(err).to.not.equal(null);
                chai_1.expect(containers).to.equal(null);
                done();
            });
        });
    });
    describe('DockerUtil.getImagesOrContainers (by firmamentId, containers)', function () {
        it('should return images by firmamentId', function (done) {
            chai_1.expect(dockerUtil).to.not.equal(null);
            const unknownFirmamentId = 'xxx';
            dockerUtil.getImagesOrContainers(['1', '2', unknownFirmamentId], new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Container), (err, containers) => {
                chai_1.expect(err).to.equal(null);
                chai_1.expect(containers).to.have.lengthOf(3);
                containers.forEach(container => {
                    if (typeof container === 'string') {
                        chai_1.expect(container).to.equal('Unable to find: ' + unknownFirmamentId);
                    }
                    else {
                        chai_1.expect(container.constructor.name).to.equal('DockerContainerImpl');
                    }
                });
                done();
            });
        });
    });
    describe('DockerUtil.removeImagesOrContainers (force error, images)', function () {
        it('should return non-null Error instance in callback', function (done) {
            chai_1.expect(dockerUtil).to.not.equal(null);
            dockerUtil.forceError = true;
            dockerUtil.removeImagesOrContainers(['3', '5'], new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Image), (err, imageOrContainerRemoveResults) => {
                chai_1.expect(err).to.not.equal(null);
                chai_1.expect(err.message).to.equal('force error: listImages');
                chai_1.expect(imageOrContainerRemoveResults).to.equal(null);
                done();
            });
        });
    });
    describe('DockerUtil.removeImagesOrContainers (all,  images)', function () {
        it('should remove all images', function (done) {
            chai_1.expect(dockerUtil).to.not.equal(null);
            dockerUtil.removeImagesOrContainers(['xxx', 'all', 'ooo'], new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Image), (err, imageOrContainerRemoveResults) => {
                chai_1.expect(err).to.equal(null);
                chai_1.expect(imageOrContainerRemoveResults).to.be.instanceOf(Array);
                chai_1.expect(imageOrContainerRemoveResults).to.have.lengthOf(9);
                done();
            });
        });
    });
    describe('DockerUtil.removeImagesOrContainers (not all, images)', function () {
        it('should specified images', function (done) {
            chai_1.expect(dockerUtil).to.not.equal(null);
            dockerUtil.removeImagesOrContainers(['3', '5', 'xxx'], new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Image), (err, imageOrContainerRemoveResults) => {
                chai_1.expect(err).to.equal(null);
                chai_1.expect(imageOrContainerRemoveResults).to.be.instanceOf(Array);
                chai_1.expect(imageOrContainerRemoveResults).to.have.lengthOf(3);
                let removeCount = 0;
                let noFindCount = 0;
                imageOrContainerRemoveResults.forEach(res => {
                    if (/^Removing/.test(res.msg)) {
                        ++removeCount;
                    }
                    if (/^Unable/.test(res.msg)) {
                        ++noFindCount;
                    }
                });
                chai_1.expect(removeCount).to.equal(2);
                chai_1.expect(noFindCount).to.equal(1);
                done();
            });
        });
    });
    describe('DockerUtil.removeImagesOrContainers (force error, containers)', function () {
        it('should return non-null Error instance in callback', function (done) {
            chai_1.expect(dockerUtil).to.not.equal(null);
            dockerUtil.forceError = true;
            dockerUtil.removeImagesOrContainers(['3', '1'], new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Container), (err, imageOrContainerRemoveResults) => {
                chai_1.expect(err).to.not.equal(null);
                chai_1.expect(err.message).to.equal('force error: listContainers');
                chai_1.expect(imageOrContainerRemoveResults).to.equal(null);
                done();
            });
        });
    });
    describe('DockerUtil.removeImagesOrContainers (all,  containers)', function () {
        it('should remove all containers', function (done) {
            chai_1.expect(dockerUtil).to.not.equal(null);
            dockerUtil.removeImagesOrContainers(['xxx', 'all', 'ooo'], new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Container), (err, imageOrContainerRemoveResults) => {
                chai_1.expect(err).to.equal(null);
                chai_1.expect(imageOrContainerRemoveResults).to.be.instanceOf(Array);
                chai_1.expect(imageOrContainerRemoveResults).to.have.lengthOf(3);
                done();
            });
        });
    });
    describe('DockerUtil.removeImagesOrContainers (not all, containers)', function () {
        it('should remove specified containers', function (done) {
            chai_1.expect(dockerUtil).to.not.equal(null);
            dockerUtil.removeImagesOrContainers(['1', '3', 'xxx'], new docker_util_options_impl_1.DockerUtilOptionsImpl(dockerode_1.ImageOrContainer.Container), (err, imageOrContainerRemoveResults) => {
                chai_1.expect(err).to.equal(null);
                chai_1.expect(imageOrContainerRemoveResults).to.be.instanceOf(Array);
                chai_1.expect(imageOrContainerRemoveResults).to.have.lengthOf(3);
                let removeCount = 0;
                let noFindCount = 0;
                imageOrContainerRemoveResults.forEach(res => {
                    if (/^Removing/.test(res.msg)) {
                        ++removeCount;
                    }
                    if (/^Unable/.test(res.msg)) {
                        ++noFindCount;
                    }
                });
                chai_1.expect(removeCount).to.equal(2);
                chai_1.expect(noFindCount).to.equal(1);
                done();
            });
        });
    });
});
//# sourceMappingURL=docker-util.test.js.map