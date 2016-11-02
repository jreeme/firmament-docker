import "reflect-metadata";
import kernel from '../inversify.config';
import {expect} from 'chai';
import {DockerOde, ImageOrContainer} from "../interfaces/dockerode";
import {DockerOdeMockImpl} from "./docker-ode-mock-impl";
import {DockerUtil} from "../interfaces/docker-util";
import {DockerUtilOptionsImpl} from "../implementations/docker-util-options-impl";
describe('DockerUtil', function () {
  let dockerUtil: DockerUtil;
  beforeEach(()=> {
/*    kernel.unbind('DockerOde');
    kernel.bind<DockerOde>('DockerOde').to(DockerOdeMockImpl);*/
    dockerUtil = kernel.get<DockerUtil>('DockerUtil');
  });
  //
  //****************************** DockerUtil.listImagesOrContainers
  //
  describe('DockerUtil.listImagesOrContainers (force error, images)', function () {
    it('should return a list of all images', function (done) {
      expect(dockerUtil).to.not.equal(null);
      dockerUtil.listImagesOrContainers(
        new DockerUtilOptionsImpl(ImageOrContainer.Image, true, true),
        (err, imagesOrContainers: any[])=> {
          expect(err).to.not.equal(null);
          done();
        });
    });
  });
  describe('DockerUtil.listImagesOrContainers (all,  images)', function () {
    it('should return a list of all images', function (done) {
      expect(dockerUtil).to.not.equal(null);
      dockerUtil.listImagesOrContainers(
        new DockerUtilOptionsImpl(ImageOrContainer.Image, true),
        (err, imagesOrContainers: any[])=> {
          expect(imagesOrContainers.length).to.equal(9);
          //Check sorting
          for(let i = 0;i < imagesOrContainers.length - 1;++i){
            let refId = imagesOrContainers[i].RepoTags[0] + imagesOrContainers[i].Id;
            let cmpId = imagesOrContainers[i + 1].RepoTags[0]+ imagesOrContainers[i + 1].Id;
            let r = refId.localeCompare(cmpId);
            expect(r).to.equal(-1);//This means the array is sorted in ascending order
          }
          done();
        });
    });
  });
  describe('DockerUtil.listImagesOrContainers (not all, images)', function () {
    it('should return a list of all images', function (done) {
      expect(dockerUtil).to.not.equal(null);
      dockerUtil.listImagesOrContainers(
        new DockerUtilOptionsImpl(ImageOrContainer.Image),
        (err, imagesOrContainers: any[])=> {
          expect(imagesOrContainers.length).to.equal(5);
          done();
        });
    });
  });
  describe('DockerUtil.listImagesOrContainers (force error, containers)', function () {
    it('should return a list of all images', function (done) {
      expect(dockerUtil).to.not.equal(null);
      dockerUtil.listImagesOrContainers(
        new DockerUtilOptionsImpl(ImageOrContainer.Container, true, true),
        (err, imagesOrContainers: any[])=> {
          expect(err).to.not.equal(null);
          done();
        });
    });
  });
  describe('DockerUtil.listImagesOrContainers (all,  containers)', function () {
    it('should return a list of all images', function (done) {
      expect(dockerUtil).to.not.equal(null);
      dockerUtil.listImagesOrContainers(
        new DockerUtilOptionsImpl(ImageOrContainer.Container, true),
        (err, imagesOrContainers: any[])=> {
          /*        var jsonFile = require('jsonfile');
           jsonFile.spaces = 2;
           jsonFile.writeFileSync('/home/jreeme/src/firmament-docker/test-data/docker-container-list.json', imagesOrContainers);*/
          //Check sorting
          for(let i = 0;i < imagesOrContainers.length - 1;++i){
            let refId = imagesOrContainers[i].Names[0];
            let cmpId = imagesOrContainers[i + 1].Names[0];
            let r = refId.localeCompare(cmpId);
            expect(r).to.equal(-1);//This means the array is sorted in ascending order
            console.log(r);
          }
          expect(imagesOrContainers.length).to.equal(3);
          done();
        });
    });
  });
  describe('DockerUtil.listImagesOrContainers (not all, containers)', function () {
    it('should return a list of all images', function (done) {
      expect(dockerUtil).to.not.equal(null);
      dockerUtil.listImagesOrContainers(
        new DockerUtilOptionsImpl(ImageOrContainer.Container),
        (err, imagesOrContainers: any[])=> {
          expect(imagesOrContainers.length).to.equal(1);
          done();
        });
    });
  });
  //
  //****************************** DockerUtil.getImagesOrContainers
  //
  describe('DockerUtil.getImagesOrContainers (force error, images)', function () {
    it('should return non-null Error instance in callback', function (done) {
      expect(dockerUtil).to.not.equal(null);
      dockerUtil.getImagesOrContainers(
        ['1', '3'],
        new DockerUtilOptionsImpl(ImageOrContainer.Image, true, true),
        (err, imagesOrContainers: any[])=> {
          expect(err).to.not.equal(null);
          done();
        });
    });
  });
  describe('DockerUtil.getImagesOrContainers (by firmamentId, images)', function () {
    it('should return images by firmamentId', function (done) {
      expect(dockerUtil).to.not.equal(null);
      dockerUtil.getImagesOrContainers(
        ['1', '3', '5', '7'],
        new DockerUtilOptionsImpl(ImageOrContainer.Image),
        (err, imagesOrContainers: any[])=> {
          done();
        });
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
