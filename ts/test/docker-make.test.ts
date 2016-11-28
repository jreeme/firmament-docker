import 'reflect-metadata';
import kernel from '../inversify.config';
import {expect} from 'chai';
import {DockerMake} from "../interfaces/docker-make";
//"outDir": "/home/jreeme/src/firmament/node_modules/firmament-docker/js",
const path = require('path');
describe('DockerMake Tests', function () {
  let dockerMake: DockerMake;
  beforeEach(() => {
    dockerMake = kernel.get<DockerMake>('DockerMake');
  });
  describe('DockerMake.buildTemplate', function () {
    it('should build', function (done) {
      expect(dockerMake).to.not.equal(null);
      dockerMake.buildTemplate({input: 'test-data/firmament.json'},
        (err: Error, result: string) => {
          done();
        });
    });
  });
});
