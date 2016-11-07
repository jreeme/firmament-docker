"use strict";
class ContainerObjectImpl {
    constructor(_modem, _id) {
        this.modem = _modem;
        this.id = _id;
    }
    start(opts, callback) {
        callback(null, {});
    }
    stop(opts, callback) {
        callback(null, {});
    }
}
exports.ContainerObjectImpl = ContainerObjectImpl;
//# sourceMappingURL=container-object-impl.js.map