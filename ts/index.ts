export * from './interfaces/dockerode';
export * from './interfaces/docker-descriptors';
import kernel from "./inversify.config";
export {kernel};

//HACK so tools can get version to sync the firmament ecosystem
if(process.argv[2] && process.argv[2].toString() === '--version'){
  let package_json = require('../package.json');
  console.log(`${package_json.name}: ${package_json.version}`);
}
