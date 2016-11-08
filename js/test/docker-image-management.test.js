"use strict";
require("reflect-metadata");
const inversify_config_1 = require('../inversify.config');
const chai_1 = require('chai');
const docker_ode_mock_impl_1 = require("./docker-ode-mock-impl");
const path = require('path');
describe('DockerImageManagement', function () {
    let dockerImageManagement;
    beforeEach(() => {
        inversify_config_1.default.unbind('DockerOde');
        inversify_config_1.default.bind('DockerOde').to(docker_ode_mock_impl_1.DockerOdeMockImpl);
        dockerImageManagement = inversify_config_1.default.get('DockerImageManagement');
    });
    describe('DockerImageManagement.listImages (force error)', function () {
        it('should return non-null Error instance in callback', function (done) {
            chai_1.expect(dockerImageManagement).to.not.equal(null);
            dockerImageManagement.forceError = true;
            dockerImageManagement.listImages(true, (err, images) => {
                chai_1.expect(err).to.not.equal(null);
                chai_1.expect(images).to.equal(null);
                done();
            });
        });
    });
    describe('DockerImageManagement.listImages (all)', function () {
        it('should return array of all (9) Images in callback', function (done) {
            chai_1.expect(dockerImageManagement).to.not.equal(null);
            dockerImageManagement.listImages(true, (err, images) => {
                chai_1.expect(err).to.equal(null);
                chai_1.expect(images).to.have.lengthOf(9);
                done();
            });
        });
    });
    describe('DockerImageManagement.listImages (not-all)', function () {
        it('should return array of all (5) Images in callback', function (done) {
            chai_1.expect(dockerImageManagement).to.not.equal(null);
            dockerImageManagement.listImages(false, (err, images) => {
                chai_1.expect(err).to.equal(null);
                chai_1.expect(images).to.have.lengthOf(5);
                done();
            });
        });
    });
    describe('DockerImageManagement.getImage (force error)', function () {
        it('should return non-null Error instance in callback', function (done) {
            chai_1.expect(dockerImageManagement).to.not.equal(null);
            dockerImageManagement.forceError = true;
            dockerImageManagement.getImage('3', (err, image) => {
                chai_1.expect(err).to.not.equal(null);
                chai_1.expect(image).to.equal(null);
                done();
            });
        });
    });
    describe('DockerImageManagement.getImage (by firmamentId)', function () {
        it(`should return ImageObject with name: 'jstnldrs/caffedata:1.0'`, function (done) {
            chai_1.expect(dockerImageManagement).to.not.equal(null);
            dockerImageManagement.getImage('7', (err, image) => {
                chai_1.expect(err).to.equal(null);
                chai_1.expect(image.constructor.name).to.equal('DockerImageImpl');
                chai_1.expect(image.Name).to.equal('jstnldrs/caffedata:1.0');
                done();
            });
        });
    });
    describe('DockerImageManagement.getImages (force error)', function () {
        it('should return non-null Error instance in callback', function (done) {
            chai_1.expect(dockerImageManagement).to.not.equal(null);
            dockerImageManagement.forceError = true;
            dockerImageManagement.getImages(['7', '8'], (err, images) => {
                chai_1.expect(err).to.not.equal(null);
                chai_1.expect(images).to.equal(null);
                done();
            });
        });
    });
    describe('DockerImageManagement.getImages (by firmamentId)', function () {
        let imageNames = ['jstnldrs/caffedata:1.0', 'mongo:2.6'];
        it(`should return array of ImageObjects (length 2)`, function (done) {
            chai_1.expect(dockerImageManagement).to.not.equal(null);
            dockerImageManagement.getImages(['7', '8'], (err, images) => {
                chai_1.expect(err).to.equal(null);
                chai_1.expect(images).to.have.lengthOf(2);
                for (let i = 0; i < images.length; ++i) {
                    chai_1.expect(images[i].constructor.name).to.equal('DockerImageImpl');
                    chai_1.expect(images[i].Name).to.equal(imageNames[i]);
                }
                done();
            });
        });
    });
    describe('DockerImageManagement.pullImage (force error)', function () {
        it('should return non-null Error instance in callback', function (done) {
            chai_1.expect(dockerImageManagement).to.not.equal(null);
            dockerImageManagement.forceError = true;
            dockerImageManagement.pullImage('mysql:5.6', (taskId, status, current, total) => {
            }, (err) => {
                chai_1.expect(err).to.not.equal(null);
                done();
            });
        });
    });
    describe('DockerImageManagement.pullImage (force error)', function () {
        it(`should pull an image from hub.docker.com`, function (done) {
            let progressCallbackCalledWithErrorCount = 0;
            let progressCallbackCalledWithDownloadingCount = 0;
            chai_1.expect(dockerImageManagement).to.not.equal(null);
            dockerImageManagement.pullImage('mysql:5.6', (taskId, status, current, total) => {
                if (status === 'Downloading') {
                    ++progressCallbackCalledWithDownloadingCount;
                }
                if (taskId === '**error**') {
                    ++progressCallbackCalledWithErrorCount;
                }
            }, (err) => {
                chai_1.expect(err).to.equal(null);
                chai_1.expect(progressCallbackCalledWithErrorCount).to.equal(4);
                chai_1.expect(progressCallbackCalledWithDownloadingCount).to.equal(6);
                done();
            });
        });
    });
    describe('DockerImageManagement.buildDockerFile (force error)', function () {
        it('should return non-null Error instance in callback', function (done) {
            chai_1.expect(dockerImageManagement).to.not.equal(null);
            dockerImageManagement.forceError = true;
            let pathToDockerFile = path.resolve(__dirname, '../../test-data');
            dockerImageManagement.buildDockerFile(pathToDockerFile, 'mysql:5.5', (taskId, status, current, total) => {
            }, (err) => {
                chai_1.expect(err).to.not.equal(null);
                done();
            });
        });
    });
    describe('DockerImageManagement.buildDockerFile', function () {
        it('report that image was built from Dockerfile', function (done) {
            let pathToDockerFile = path.resolve(__dirname, '../../test-data');
            let progressCallbackCalledWithDownloadingCount = 0;
            chai_1.expect(dockerImageManagement).to.not.equal(null);
            dockerImageManagement.buildDockerFile(pathToDockerFile, 'mysql:5.5', (taskId, status, current, total) => {
                if (status === 'Downloading') {
                    ++progressCallbackCalledWithDownloadingCount;
                }
            }, (err) => {
                chai_1.expect(err).to.equal(null);
                chai_1.expect(progressCallbackCalledWithDownloadingCount).to.equal(6);
                done();
            });
        });
    });
    describe('DockerImageManagement.removeImages (force error)', function () {
        it('should return non-null Error instance in callback', function (done) {
            chai_1.expect(dockerImageManagement).to.not.equal(null);
            dockerImageManagement.forceError = true;
            dockerImageManagement.removeImages(['2', '3', '113'], (err, imageRemoveResult) => {
                chai_1.expect(err).to.not.equal(null);
                done();
            });
        });
    });
    describe('DockerImageManagement.removeImages (by firmamentId)', function () {
        it('should return non-null Error instance in callback', function (done) {
            chai_1.expect(dockerImageManagement).to.not.equal(null);
            dockerImageManagement.removeImages(['2', '3', '5', '113'], (err, imageRemoveResults) => {
                chai_1.expect(err).to.equal(null);
                chai_1.expect(imageRemoveResults).to.be.instanceOf(Array);
                chai_1.expect(imageRemoveResults).to.have.lengthOf(4);
                for (let i = 0; i < imageRemoveResults.length - 1; ++i) {
                    chai_1.expect(imageRemoveResults[i].msg.substring(0, 8)).to.equal('Removing');
                }
                chai_1.expect(imageRemoveResults[imageRemoveResults.length - 1].msg.substring(0, 6)).to.equal('Unable');
                done();
            });
        });
    });
    describe('DockerImageManagement.removeImages (by Docker Id)', function () {
        it('should return non-null Error instance in callback', function (done) {
            chai_1.expect(dockerImageManagement).to.not.equal(null);
            dockerImageManagement.removeImages(['f55', '817', '248', 'xxx'], (err, imageRemoveResults) => {
                chai_1.expect(err).to.equal(null);
                chai_1.expect(imageRemoveResults).to.be.instanceOf(Array);
                chai_1.expect(imageRemoveResults).to.have.lengthOf(4);
                for (let i = 0; i < imageRemoveResults.length - 1; ++i) {
                    chai_1.expect(imageRemoveResults[i].msg.substring(0, 8)).to.equal('Removing');
                }
                chai_1.expect(imageRemoveResults[imageRemoveResults.length - 1].msg.substring(0, 6)).to.equal('Unable');
                done();
            });
        });
    });
    describe('DockerImageManagement.removeImages (all)', function () {
        it('should return non-null Error instance in callback', function (done) {
            chai_1.expect(dockerImageManagement).to.not.equal(null);
            dockerImageManagement.removeImages(['???', 'all', 'xxx'], (err, imageRemoveResults) => {
                chai_1.expect(err).to.equal(null);
                chai_1.expect(imageRemoveResults).to.be.instanceOf(Array);
                chai_1.expect(imageRemoveResults).to.have.lengthOf(9);
                for (let i = 0; i < imageRemoveResults.length; ++i) {
                    chai_1.expect(imageRemoveResults[i].msg.substring(0, 8)).to.equal('Removing');
                }
                done();
            });
        });
    });
});
//# sourceMappingURL=docker-image-management.test.js.map