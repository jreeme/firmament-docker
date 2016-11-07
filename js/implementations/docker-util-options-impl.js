"use strict";
const dockerode_1 = require("../interfaces/dockerode");
class DockerUtilOptionsImpl {
    constructor(_IorC, _listAll = false) {
        this.IorC = dockerode_1.ImageOrContainer.Image;
        this.listAll = false;
        this.IorC = _IorC;
        this.listAll = _listAll;
    }
}
exports.DockerUtilOptionsImpl = DockerUtilOptionsImpl;
//# sourceMappingURL=docker-util-options-impl.js.map