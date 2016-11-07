"use strict";
class ImageObjectImpl {
    constructor(_modem, _id) {
        this.modem = _modem;
        this.id = _id;
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
exports.ImageObjectImpl = ImageObjectImpl;
//# sourceMappingURL=image-object-impl.js.map