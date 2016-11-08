"use strict";
class DockerImageImpl {
    constructor(_modem, _id) {
        this.modem = _modem;
        this.Id = _id;
    }
    get(callback) {
    }
    history(callback) {
    }
    inspect(callback) {
    }
    push(opts, callback, auth) {
    }
    remove(opts, callback) {
        callback(null, this);
    }
    tag(opts, callback) {
    }
}
exports.DockerImageImpl = DockerImageImpl;
//# sourceMappingURL=image-object-impl.js.map