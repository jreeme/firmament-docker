#!/usr/bin/env node
import 'reflect-metadata';
//import * as path from 'path';
import kernel from '../../inversify.config';
import {DockerImageManagement} from '../../interfaces/docker-image-management';

const dockerImageManagement = kernel.get<DockerImageManagement>('DockerImageManagement');

dockerImageManagement.loadImages('parrot-scif.*08.06', '/home/jreeme/tmp', (err: Error, restoredImages: string[]) => {
  process.exit(0);
});

/*dockerImageManagement.saveImages('docker-registry.parrot-scif.keyw:5000/.*:0.08.06', '/home/jreeme/tmp', (err: Error, savedImagePaths: string[]) => {
  process.exit(0);
});*/

