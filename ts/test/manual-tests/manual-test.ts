#!/usr/bin/env node
import 'reflect-metadata';
import kernel from '../../inversify.config';
import {DockerMake} from "../../interfaces/docker-make";
const dockerMake = kernel.get<DockerMake>('DockerMake');

process.on('uncaughtException', err => {
  console.log(err);
});

dockerMake.buildTemplate({input: '/home/jreeme/src/firmament-docker/docker/vita.06-DEC-2016/firmament.json'},
  (err: Error, result: string) => {
    var r = result;
  });
