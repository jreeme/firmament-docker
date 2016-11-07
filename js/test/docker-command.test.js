"use strict";
require('reflect-metadata');
const inversify_config_1 = require('../inversify.config');
const chai_1 = require('chai');
const docker_ode_mock_impl_1 = require('./docker-ode-mock-impl');
describe('DockerCommand', function () {
    let firmamentDocker;
    beforeEach(() => {
        inversify_config_1.default.unbind('DockerOde');
        inversify_config_1.default.bind('DockerOde').to(docker_ode_mock_impl_1.DockerOdeMockImpl);
        firmamentDocker = inversify_config_1.default.get('FirmamentDocker');
    });
    describe('DockerContainerManagement.listContainers (force error)', function () {
        it('should return non-null Error instance in callback', function (done) {
            chai_1.expect(firmamentDocker).to.not.equal(null);
            firmamentDocker.forceError = true;
            firmamentDocker.listContainers(true, (err, containers) => {
                chai_1.expect(err).to.not.equal(null);
                chai_1.expect(containers).to.equal(null);
                done();
            });
        });
    });
});
//# sourceMappingURL=docker-command.test.js.map