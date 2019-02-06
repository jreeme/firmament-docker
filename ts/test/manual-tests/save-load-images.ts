#!/usr/bin/env node
import 'reflect-metadata';
//import * as path from 'path';
import kernel from '../../inversify.config';
import {DockerImageManagement} from '../../interfaces/docker-image-management';

const dockerImageManagement = kernel.get<DockerImageManagement>('DockerImageManagement');

dockerImageManagement.loadImages('.*', '/home/jreeme/tmp', (err: Error) => {
  process.exit(0);
});

/*dockerImageManagement.saveImages('.*hadoop.*', '/home/jreeme/tmp', (err: Error) => {
  process.exit(0);
});*/

