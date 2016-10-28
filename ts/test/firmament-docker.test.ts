import "reflect-metadata";
import {Kernel} from "inversify";
import {expect} from 'chai';
import {FirmamentDocker} from "../interfaces/firmament-docker";
import {FirmamentDockerImpl} from "../implementations/firmament-docker-impl";
import {DockerOde} from "../interfaces/dockerode";
import {DockerOdeImpl} from "../implementations/docker-ode-impl";
import {DockerOdeMockImpl} from "./docker-ode-impl.test";
/*let firmamentDocker:FirmamentDocker = new FirmamentDockerImpl();
 import kernel from '../inversify.config';
 describe('FirmamentDocker instance', () => {
 it('should be FirmamentDockerImpl', () => {
 expect(firmamentDocker).to.be.an.instanceOf(FirmamentDockerImpl);
 });
 });
 describe('FirmamentDocker instance', () => {
 it('should be FirmamentDockerImpl', () => {
 var ninja = kernel.get<INinja>('INinja');
 expect(ninja.fight()).eql('cut!');
 expect(ninja.sneak()).eql('hit!');
 });
 });*/
let kernel = new Kernel();
before(function (done) {
  console.log('Setting InversifyJS bindings for test ...');
  kernel.bind<DockerOde>('DockerOde').to(DockerOdeImpl);
  //kernel.bind<DockerOde>('DockerOde').to(DockerOdeMockImpl);
  done();
});
describe('Testing DockerOde.listContainers', function () {
  it('should return non-null error on failure', function (done) {
    let dockerOde:DockerOde = kernel.get<DockerOde>('DockerOde');
    dockerOde.listContainers({all: true, forceError: true}, (err, containers)=> {
      expect(err).to.not.be.a('null');
      expect(containers).to.be.an.instanceOf(Array);
      done();
    });
  });
  it('should return non error on success and 2 containers for {all:false}', function (done) {
    let dockerOde:DockerOde = kernel.get<DockerOde>('DockerOde');
    dockerOde.listContainers({all: false}, (err, containers)=> {
      expect(err).to.be.a('null');
      expect(containers).to.be.an.instanceOf(Array);
      expect(containers).to.have.lengthOf(2);
      done();
    });
  });
  it('should return non error on success and 9 containers for {all:true}', function (done) {
    let dockerOde:DockerOde = kernel.get<DockerOde>('DockerOde');
    dockerOde.listContainers({all: true}, (err, containers)=> {
      var jsonFile = require('jsonfile');
      jsonFile.spaces = 2;
      jsonFile.writeFileSync('/home/jreeme/src/firmament-docker/test-data/docker-container-list.json', containers);
      expect(err).to.be.a('null');
      expect(containers).to.be.an.instanceOf(Array);
      expect(containers).to.have.lengthOf(9);
      done();
    });
  });
});
describe('Testing DockerOde.listImages', function () {
  it('should return non-null error on failure', function (done) {
    let dockerOde:DockerOde = kernel.get<DockerOde>('DockerOde');
    dockerOde.listImages({all: true, forceError: true}, (err, images)=> {
      expect(err).to.not.be.a('null');
      expect(images).to.be.an.instanceOf(Array);
      done();
    });
  });
  it('should return non error on success and 2 images for {all:false}', function (done) {
    let dockerOde:DockerOde = kernel.get<DockerOde>('DockerOde');
    dockerOde.listImages({all: false}, (err, images)=> {
      expect(err).to.be.a('null');
      expect(images).to.be.an.instanceOf(Array);
      expect(images).to.have.lengthOf(2);
      done();
    });
  });
  it('should return non error on success and 9 images for {all:true}', function (done) {
    let dockerOde:DockerOde = kernel.get<DockerOde>('DockerOde');
    dockerOde.listImages({all: true}, (err, images)=> {
      expect(err).to.be.a('null');
      expect(images).to.be.an.instanceOf(Array);
      expect(images).to.have.lengthOf(9);
      done();
    });
  });
});
