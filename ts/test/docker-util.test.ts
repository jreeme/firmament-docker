import "reflect-metadata";
import kernel from '../inversify.config';
import {expect} from 'chai';
import {DockerOde, ImageOrContainer} from "../interfaces/dockerode";
import {DockerOdeMockImpl} from "./docker-ode-mock-impl";
import {DockerUtil} from "../interfaces/docker-util";
describe('DockerUtil', function () {
  let dockerUtil: DockerUtil;
  beforeEach(()=> {
    kernel.unbind('DockerOde');
    kernel.bind<DockerOde>('DockerOde').to(DockerOdeMockImpl);
    dockerUtil = kernel.get<DockerUtil>('DockerUtil');
  });
  //
  //****************************** DockerUtil.listImagesOrContainers
  //
  describe('DockerUtil.listImagesOrContainers (force error)', function () {
    it('should return a list of all images', function (done) {
      expect(dockerUtil).to.not.equal(null);
      dockerUtil.listImagesOrContainers(
        true,
        ImageOrContainer.Image,
        (err, imagesOrContainers: any[])=> {
          expect(err).to.not.equal(null);
          done();
        }, {forceError: true});
    });
  });
  describe('DockerUtil.listImagesOrContainers (all,  images)', function () {
    it('should return a list of all images', function (done) {
      expect(dockerUtil).to.not.equal(null);
      dockerUtil.listImagesOrContainers(true, ImageOrContainer.Image, (err, imagesOrContainers: any[])=> {
        expect(imagesOrContainers.length).to.equal(9);
        done();
      });
    });
  });
  describe('DockerUtil.listImagesOrContainers (not all, images)', function () {
    it('should return a list of all images', function (done) {
      expect(dockerUtil).to.not.equal(null);
      dockerUtil.listImagesOrContainers(false, ImageOrContainer.Image, (err, imagesOrContainers: any[])=> {
        expect(imagesOrContainers.length).to.equal(5);
        done();
      });
    });
  });
  describe('DockerUtil.listImagesOrContainers (force error)', function () {
    it('should return a list of all images', function (done) {
      expect(dockerUtil).to.not.equal(null);
      dockerUtil.listImagesOrContainers(
        true,
        ImageOrContainer.Container,
        (err, imagesOrContainers: any[])=> {
          expect(err).to.not.equal(null);
          done();
        }, {forceError: true});
    });
  });
  describe('DockerUtil.listImagesOrContainers (all,  containers)', function () {
    it('should return a list of all images', function (done) {
      expect(dockerUtil).to.not.equal(null);
      dockerUtil.listImagesOrContainers(true, ImageOrContainer.Container, (err, imagesOrContainers: any[])=> {
        /*        var jsonFile = require('jsonfile');
         jsonFile.spaces = 2;
         jsonFile.writeFileSync('/home/jreeme/src/firmament-docker/test-data/docker-container-list.json', imagesOrContainers);*/
        expect(imagesOrContainers.length).to.equal(3);
        done();
      });
    });
  });
  describe('DockerUtil.listImagesOrContainers (not all, containers)', function () {
    it('should return a list of all images', function (done) {
      expect(dockerUtil).to.not.equal(null);
      dockerUtil.listImagesOrContainers(false, ImageOrContainer.Container, (err, imagesOrContainers: any[])=> {
        expect(imagesOrContainers.length).to.equal(1);
        done();
      });
    });
  });
  //
  //****************************** DockerUtil.getImagesOrContainers
  //
  describe('DockerUtil.getImagesOrContainers (force error)', function () {
    it('should return images by firmamentId', function (done) {
      expect(dockerUtil).to.not.equal(null);
      dockerUtil.getImagesOrContainers(
        ['1','3'],
        ImageOrContainer.Image,
        (err, imagesOrContainers: any[])=> {
          expect(err).to.not.equal(null);
          done();
        }, {forceError: true});
    });
  });
  describe('DockerUtil.getImagesOrContainers (by firmamentId)', function () {
    it('should return images by firmamentId', function (done) {
      expect(dockerUtil).to.not.equal(null);
      dockerUtil.getImagesOrContainers(
        ['1','3'],
        ImageOrContainer.Image,
        (err, imagesOrContainers: any[])=> {
          done();
        }, {forceError: true});
    });
  });
  /*    it('should return non-null error on failure', function (done) {
   let dockerOde:DockerOde = kernel.get<DockerOde>('DockerOde');
   dockerOde.listImages({all: true, forceError: true}, (err, images)=> {
   expect(err).to.not.be.a('null');
   expect(images).to.be.an.instanceOf(Array);
   done();
   });
   });*/
  /*    it('should return non error on success and 2 images for {all:false}', function (done) {
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
   });*/
  /*  describe('Testing DockerOde.listContainers', function () {
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
   });*/

});
