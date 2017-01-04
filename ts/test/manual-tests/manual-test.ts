#!/usr/bin/env node
import 'reflect-metadata';
import kernel from '../../inversify.config';
import {DockerMake} from "../../interfaces/docker-make";
import {RemoteCatalogGetter} from "../../interfaces/remote-catalog";
//const templateCatalogUrl = '/home/jreeme/src/firmament-docker/docker/templateCatalog.json';
const templateCatalogUrl = 'https://raw.githubusercontent.com/jreeme/firmament-docker/master/docker/templateCatalog.json';
const dockerMake = kernel.get<DockerMake>('DockerMake');
const remoteCatalogGetter = kernel.get<RemoteCatalogGetter>('RemoteCatalogGetter');
import {Url, parse as urlParse} from 'url';
process.on('uncaughtException', err => {
  console.log(err);
});


remoteCatalogGetter.getCatalogFromUrl(templateCatalogUrl, (err, remoteCatalog) => {
  let e = err;
});
/*dockerMake.makeTemplate({get:''});*/

/*dockerMake.buildTemplate({input: '/home/jreeme/src/firmament-docker/docker/vita.06-DEC-2016/firmament.json'},
 (err: Error, result: string) => {
 var r = result;
 });*/
