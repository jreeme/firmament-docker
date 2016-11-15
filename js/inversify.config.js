"use strict";
const docker_image_management_impl_1 = require('./implementations/docker-image-management-impl');
const docker_ode_impl_1 = require("./implementations/util/docker-ode-impl");
const docker_util_impl_1 = require("./implementations/util/docker-util-impl");
const docker_container_management_impl_1 = require("./implementations/docker-container-management-impl");
const firmament_yargs_1 = require('firmament-yargs');
const docker_command_impl_1 = require("./implementations/commands/docker-command-impl");
const make_command_impl_1 = require("./implementations/commands/make-command-impl");
const docker_management_impl_1 = require("./implementations/docker-management-impl");
firmament_yargs_1.kernel.bind('DockerManagement').to(docker_management_impl_1.DockerManagementImpl);
firmament_yargs_1.kernel.bind('DockerImageManagement').to(docker_image_management_impl_1.DockerImageManagementImpl);
firmament_yargs_1.kernel.bind('DockerContainerManagement').to(docker_container_management_impl_1.DockerContainerManagementImpl);
firmament_yargs_1.kernel.bind('DockerOde').to(docker_ode_impl_1.DockerOdeImpl);
firmament_yargs_1.kernel.bind('DockerUtil').to(docker_util_impl_1.DockerUtilImpl);
firmament_yargs_1.kernel.bind('Command').to(docker_command_impl_1.DockerCommandImpl);
firmament_yargs_1.kernel.bind('Command').to(make_command_impl_1.MakeCommandImpl);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = firmament_yargs_1.kernel;
try {
}
catch (err) {
    var e = err;
}
//# sourceMappingURL=inversify.config.js.map