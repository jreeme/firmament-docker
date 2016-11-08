"use strict";
class DockerContainerImpl {
    constructor(_modem, _id) {
        this.modem = _modem;
        this.Id = _id;
    }
    start(opts, callback) {
        callback(null, {});
    }
    stop(opts, callback) {
        callback(null, {});
    }
    remove(opts, callback) {
        callback(null, {});
    }
}
exports.DockerContainerImpl = DockerContainerImpl;
//# sourceMappingURL=container-object-impl.js.map