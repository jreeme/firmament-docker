"use strict";
require('reflect-metadata');
const inversify_config_1 = require('../inversify.config');
const chai_1 = require('chai');
const docker_ode_mock_impl_1 = require('./docker-ode-mock-impl');
const docker_descriptors_1 = require('../interfaces/docker-descriptors');
describe('DockerContainerManagement', function () {
    let dockerContainerManagement;
    beforeEach(() => {
        inversify_config_1.default.unbind('DockerOde');
        inversify_config_1.default.bind('DockerOde').to(docker_ode_mock_impl_1.DockerOdeMockImpl);
        dockerContainerManagement = inversify_config_1.default.get('DockerContainerManagement');
    });
    describe('DockerContainerManagement.listContainers (force error)', function () {
        it('should return non-null Error instance in callback', function (done) {
            chai_1.expect(dockerContainerManagement).to.not.equal(null);
            dockerContainerManagement.forceError = true;
            dockerContainerManagement.listContainers(true, (err, containers) => {
                chai_1.expect(err).to.not.equal(null);
                chai_1.expect(containers).to.equal(null);
                done();
            });
        });
    });
    describe('DockerContainerManagement.listContainers (all)', function () {
        it('should return array of all (3) Containers in callback', function (done) {
            chai_1.expect(dockerContainerManagement).to.not.equal(null);
            dockerContainerManagement.listContainers(true, (err, containers) => {
                chai_1.expect(err).to.equal(null);
                chai_1.expect(containers).to.have.lengthOf(3);
                done();
            });
        });
    });
    describe('DockerContainerManagement.listContainers (not-all)', function () {
        it('should return array of all (1) Containers in callback', function (done) {
            chai_1.expect(dockerContainerManagement).to.not.equal(null);
            dockerContainerManagement.listContainers(false, (err, containers) => {
                chai_1.expect(err).to.equal(null);
                chai_1.expect(containers).to.have.lengthOf(1);
                done();
            });
        });
    });
    describe('DockerContainerManagement.getContainer (force error)', function () {
        it('should return non-null Error instance in callback', function (done) {
            chai_1.expect(dockerContainerManagement).to.not.equal(null);
            dockerContainerManagement.forceError = true;
            dockerContainerManagement.getContainer('2', (err, container) => {
                chai_1.expect(err).to.not.equal(null);
                chai_1.expect(container).to.equal(null);
                done();
            });
        });
    });
    describe('DockerContainerManagement.getContainer (by firmamentId)', function () {
        it(`should return ContainerObject with name: 'jstnldrs/caffedata:1.0'`, function (done) {
            chai_1.expect(dockerContainerManagement).to.not.equal(null);
            dockerContainerManagement.getContainer('2', (err, container) => {
                chai_1.expect(err).to.equal(null);
                chai_1.expect(container.constructor.name).to.equal('ContainerObjectImpl');
                chai_1.expect(container.name).to.equal('/mysql');
                done();
            });
        });
    });
    describe('DockerContainerManagement.getContainers (force error)', function () {
        it('should return non-null Error instance in callback', function (done) {
            chai_1.expect(dockerContainerManagement).to.not.equal(null);
            dockerContainerManagement.forceError = true;
            dockerContainerManagement.getContainers(['2', '3'], (err, containers) => {
                chai_1.expect(err).to.not.equal(null);
                chai_1.expect(containers).to.equal(null);
                done();
            });
        });
    });
    describe('DockerContainerManagement.getContainers (by firmamentId)', function () {
        let containerNames = ['/mysql', '/ubuntu'];
        it(`should return array of ContainerObjects (length 2)`, function (done) {
            chai_1.expect(dockerContainerManagement).to.not.equal(null);
            dockerContainerManagement.getContainers(['2', '3'], (err, containers) => {
                chai_1.expect(err).to.equal(null);
                chai_1.expect(containers).to.have.lengthOf(2);
                for (let i = 0; i < containers.length; ++i) {
                    chai_1.expect(containers[i].constructor.name).to.equal('ContainerObjectImpl');
                    chai_1.expect(containers[i].name).to.equal(containerNames[i]);
                }
                done();
            });
        });
    });
    describe('DockerContainerManagement.createContainer (force error)', function () {
        it('should return non-null Error instance in callback', function (done) {
            chai_1.expect(dockerContainerManagement).to.not.equal(null);
            dockerContainerManagement.forceError = true;
            dockerContainerManagement.createContainer(docker_descriptors_1.DockerDescriptors.dockerContainerConfigTemplate[0], (err, container) => {
                chai_1.expect(err).to.not.equal(null);
                chai_1.expect(container).to.equal(null);
                done();
            });
        });
    });
    describe('DockerContainerManagement.createContainer', function () {
        it('should return DockerContainer description in callback', function (done) {
            chai_1.expect(dockerContainerManagement).to.not.equal(null);
            dockerContainerManagement.createContainer(docker_descriptors_1.DockerDescriptors.dockerContainerConfigTemplate[0], (err, container) => {
                chai_1.expect(err).to.equal(null);
                chai_1.expect(container).to.not.equal(null);
                done();
            });
        });
    });
    describe('DockerContainerManagement.removeContainers (force error)', function () {
        it('should return non-null Error instance in callback', function (done) {
            chai_1.expect(dockerContainerManagement).to.not.equal(null);
            dockerContainerManagement.forceError = true;
            dockerContainerManagement.removeContainers(['1', '2'], (err, containerRemoveResults) => {
                chai_1.expect(err).to.not.equal(null);
                chai_1.expect(containerRemoveResults).to.equal(null);
                done();
            });
        });
    });
    describe('DockerContainerManagement.removeContainers', function () {
        it('should return ContainerRemoveResult array in callback', function (done) {
            chai_1.expect(dockerContainerManagement).to.not.equal(null);
            dockerContainerManagement.removeContainers(['1', '2'], (err, containerRemoveResults) => {
                chai_1.expect(err).to.equal(null);
                chai_1.expect(containerRemoveResults).to.be.instanceOf(Array);
                chai_1.expect(containerRemoveResults).to.have.lengthOf(3);
                done();
            });
        });
    });
});
//# sourceMappingURL=docker-container-management.test.js.map