#!/usr/bin/env node
import 'reflect-metadata';
//import * as path from 'path';
import kernel from '../../inversify.config';
import {DockerUtil} from "../../interfaces/docker-util";
import {ImageOrContainer} from "../..";
//import {DockerMake} from '../../interfaces/docker-make';
//import {RemoteCatalogGetter, Command} from 'firmament-yargs';
//const templateCatalogUrl = '/home/jreeme/src/firmament-docker/docker/templateCatalog.json';
//const templateCatalogUrl = 'https://raw.githubusercontent.com/jreeme/firmament-docker/master/docker/templateCatalog.json';
//const dockerCommand = <DockerCommandImpl>kernel.get<Command>('DockerCommandImpl');
//const dockerMake = kernel.get<DockerMake>('DockerMake');
//const remoteCatalogGetter = kernel.get<RemoteCatalogGetter>('RemoteCatalogGetter');
//import {Url, parse as urlParse} from 'url';
//import {DockerCommandImpl} from '../../implementations/commands/docker-command-impl';
import {DockerProvision} from '../../interfaces/docker-provision';
//import {ProvisionCommandImpl} from '../../implementations/commands/provision-command-impl';
//import {DockerContainerManagement} from '../../interfaces/docker-container-management';

//const dockerMake = kernel.get<DockerMake>('DockerMake');
const dockerProvision = kernel.get<DockerProvision>('DockerProvision');
//dockerMake.makeTemplate({});

//const dockerContainerManagement = kernel.get<DockerContainerManagement>('DockerContainerManagement');
/*const dockerUtil = kernel.get<DockerUtil>('DockerUtil');
dockerUtil.removeImagesOrContainers(['all'], {
  IorC: ImageOrContainer.Image,
  listAll: false
}, (err:Error, results:any) => {
  process.exit(0);
});*/

/*dockerProvision.extractYamlFromJson({
    inputJsonFile: '/home/jreeme/src/parrot-stack/firmament/docker/deploy/vmwarevsphere-parrot.json',
    outputYamlFile: '/tmp/baz/outOfThisWorld.goo'//.yaml'
  },
  () => {
    process.exit(0);
  }
);*/
/*dockerProvision.makeTemplate({
  output: ProvisionCommandImpl.defaultConfigFilename,
  yaml: path.resolve(__dirname, '../../../docker/merlin.yml'),
  //yaml: path.resolve(__dirname, '../../../docker/elasticsearch/5.6.6/elasticsearch-service.yml'),
  //dm: 'vmwarevsphere'
  dm: 'virtualbox'
  //yaml: ProvisionCommandImpl.defaultComposeYamlFilename
}, () => {*/
dockerProvision.buildTemplate({
  //username: 'root',
  //password: 'run2walk!',
  //input: ProvisionCommandImpl.defaultConfigFilename
  //noports: false,
  //input: '/home/jreeme/src/merlin-stack/firmament/deploy/openstack/openstack.merlin.keyw/two-web-servers.json'
  noNfs: false,
  input: '/home/jreeme/src/merlin-stack/firmament/deploy/vmware/vmware.parrot-scif.keyw/full-stack-thin-08.06.json'
  //input: '/home/jreeme/src/parrot-stack/firmament/deploy/virtualbox/virtualbox.parrot.keyw/elasticsearch-only.json'
  //input: '/home/jreeme/src/parrot-stack/firmament/deploy/virtualbox/virtualbox.parrot.keyw/two-web-servers.json'
  //input: '/home/jreeme/src/parrot-stack/firmament/deploy/virtualbox/virtualbox.parrot.keyw/two-phusions-0.08.03.json'
  //input: '/home/jreeme/src/parrot-stack/firmament/deploy/vmware/vmware.parrot-les.keyw/postgres-thin.json',
}, (err?: Error) => {
  if(err) {
    console.error(err);
  }
  process.exit(0);
});
//process.exit(0);
//});

process.on('uncaughtException', err => {
  console.log(err);
});
/*dockerCommand.startOrStopContainers({input: '/home/jreeme/tmp/deploy.json'});*/
/*remoteCatalogGetter.getCatalogFromUrl(templateCatalogUrl, (err, remoteCatalog) => {
 let e = err;
 });*/
/*dockerMake.makeTemplate({get: ''}); */
/*dockerMake.buildTemplate({input: '/home/jreeme/src/firmament-docker/docker/vita.25-DEC-2016/firmament.json'},
 (err: Error, result: string) => {
 var r = result;
 });*/

/*dockerContainerManagement.exec('2da1', '/bin/bash', (err, result) => {
  process.exit(3);
});*/
