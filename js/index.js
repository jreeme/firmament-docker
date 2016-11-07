"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
__export(require('./interfaces/dockerode'));
__export(require('./interfaces/docker-descriptors'));
const inversify_config_1 = require("./inversify.config");
exports.kernel = inversify_config_1.default;
//# sourceMappingURL=index.js.map