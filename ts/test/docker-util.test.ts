import "reflect-metadata";
import kernel from '../inversify.config';
import {expect} from 'chai';
import {
  DockerOde, ImageOrContainer, DockerImage, DockerContainer,
  ImageOrContainerRemoveResults
} from "../interfaces/dockerode";
import {DockerOdeMockImpl} from "./docker-ode-mock-impl";
import {DockerUtil} from "../interfaces/docker-util";
import {DockerUtilOptionsImpl} from "../implementations/util/docker-util-options-impl";
import {ForceError} from "../interfaces/force-error";
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
  //***************************** Images *******************************
  describe('DockerUtil.listImagesOrContainers (force error, images)', function () {
    it('should return non-null Error instance in callback', function (done) {
      expect(dockerUtil).to.not.equal(null);
      (<ForceError>dockerUtil).forceError = true;
      dockerUtil.listImagesOrContainers(
        new DockerUtilOptionsImpl(ImageOrContainer.Image, true),
        (err, images: any[])=> {
          expect(err).to.not.equal(null);
          expect(err.message).to.equal('force error: listImages');
          expect(images).to.equal(null);
          done();
        });
    });
  });
  describe('DockerUtil.listImagesOrContainers (all,  images)', function () {
    it('should return a list of all images', function (done) {
      expect(dockerUtil).to.not.equal(null);
      dockerUtil.listImagesOrContainers(
        new DockerUtilOptionsImpl(ImageOrContainer.Image, true),
        (err, images: any[])=> {
          expect(images.length).to.equal(9);
          //Check sorting
          for (let i = 0; i < images.length - 1; ++i) {
            let refId = images[i].RepoTags[0] + images[i].Id;
            let cmpId = images[i + 1].RepoTags[0] + images[i + 1].Id;
            let r = refId.localeCompare(cmpId);
            expect(r).to.equal(-1);//This means the array is sorted in ascending order
          }
          done();
        });
    });
  });
  describe('DockerUtil.listImagesOrContainers (not all, images)', function () {
    it('should return a list of non-intermediate images', function (done) {
      expect(dockerUtil).to.not.equal(null);
      dockerUtil.listImagesOrContainers(
        new DockerUtilOptionsImpl(ImageOrContainer.Image),
        (err, images: any[])=> {
          expect(images.length).to.equal(5);
          done();
        });
    });
  });
  //***************************** Containers *******************************
  describe('DockerUtil.listImagesOrContainers (force error, containers)', function () {
    it('should return non-null Error instance in callback', function (done) {
      expect(dockerUtil).to.not.equal(null);
      (<ForceError>dockerUtil).forceError = true;
      dockerUtil.listImagesOrContainers(
        new DockerUtilOptionsImpl(ImageOrContainer.Container, true),
        (err, containers: any[])=> {
          expect(err).to.not.equal(null);
          expect(err.message).to.equal('force error: listContainers');
          expect(containers).to.equal(null);
          done();
        });
    });
  });
  describe('DockerUtil.listImagesOrContainers (all,  containers)', function () {
    it('should return a list of all images', function (done) {
      expect(dockerUtil).to.not.equal(null);
      dockerUtil.listImagesOrContainers(
        new DockerUtilOptionsImpl(ImageOrContainer.Container, true),
        (err, containers: any[])=> {
          /*        var jsonFile = require('jsonfile');
           jsonFile.spaces = 2;
           jsonFile.writeFileSync('/home/jreeme/src/firmament-docker/test-data/docker-container-list.json', imagesOrContainers);*/
          //Check sorting
          for (let i = 0; i < containers.length - 1; ++i) {
            let refId = containers[i].Names[0];
            let cmpId = containers[i + 1].Names[0];
            let r = refId.localeCompare(cmpId);
            expect(r).to.equal(-1);//This means the array is sorted in ascending order
          }
          expect(containers.length).to.equal(3);
          done();
        });
    });
  });
  describe('DockerUtil.listImagesOrContainers (not all, containers)', function () {
    it('should return a list of all images', function (done) {
      expect(dockerUtil).to.not.equal(null);
      dockerUtil.listImagesOrContainers(
        new DockerUtilOptionsImpl(ImageOrContainer.Container),
        (err, containers: any[])=> {
          expect(containers.length).to.equal(1);
          done();
        });
    });
  });
  //
  //****************************** DockerUtil.getImageOrContainer
  //
  //***************************** Images *******************************
  describe('DockerUtil.getImageOrContainer (force error, image)', function () {
    it('should return non-null Error instance in callback', function (done) {
      expect(dockerUtil).to.not.equal(null);
      (<ForceError>dockerUtil).forceError = true;
      dockerUtil.getImageOrContainer(
        '5',
        new DockerUtilOptionsImpl(ImageOrContainer.Image, true),
        (err, image: DockerImage)=> {
          expect(err).to.not.equal(null);
          expect(err.message).to.equal('force error: listImages');
          expect(image).to.equal(null);
          done();
        });
    });
  });
  describe('DockerUtil.getImageOrContainer (non-existent, by firmamentId, image)', function () {
    it('should return string with bad firmamentId in callback', function (done) {
      expect(dockerUtil).to.not.equal(null);
      const unknownFirmamentId = '113';
      dockerUtil.getImageOrContainer(
        unknownFirmamentId,
        new DockerUtilOptionsImpl(ImageOrContainer.Image),
        (err, image: DockerImage)=> {
          expect(err).to.equal(null);
          expect(typeof image).to.equal('string');
          expect(image).to.equal('Unable to find: ' + unknownFirmamentId);
          done();
        });
    });
  });
  describe('DockerUtil.getImageOrContainer (by firmamentId, image)', function () {
    it('should return non-null Image instance in callback', function (done) {
      expect(dockerUtil).to.not.equal(null);
      dockerUtil.getImageOrContainer(
        '5',
        new DockerUtilOptionsImpl(ImageOrContainer.Image),
        (err, image: DockerImage)=> {
          expect(err).to.equal(null);
          expect(image.constructor.name).to.equal('DockerImageImpl');
          done();
        });
    });
  });
  //***************************** Containers *******************************
  describe('DockerUtil.getImageOrContainer (force error, container)', function () {
    it('should return non-null Error instance in callback', function (done) {
      expect(dockerUtil).to.not.equal(null);
      (<ForceError>dockerUtil).forceError = true;
      dockerUtil.getImageOrContainer(
        '5',
        new DockerUtilOptionsImpl(ImageOrContainer.Container, true),
        (err, container: DockerContainer)=> {
          expect(err).to.not.equal(null);
          expect(container).to.equal(null);
          done();
        });
    });
  });
  describe('DockerUtil.getImageOrContainer (non-existent, by firmamentId, container)', function () {
    it('should return string with bad firmamentId in callback', function (done) {
      expect(dockerUtil).to.not.equal(null);
      const unknownFirmamentId = '113';
      dockerUtil.getImageOrContainer(
        unknownFirmamentId,
        new DockerUtilOptionsImpl(ImageOrContainer.Container),
        (err, container: DockerContainer)=> {
          expect(err).to.equal(null);
          expect(typeof container).to.equal('string');
          expect(container).to.equal('Unable to find: ' + unknownFirmamentId);
          done();
        });
    });
  });
  describe('DockerUtil.getImageOrContainer (by firmamentId, container)', function () {
    it('should return non-null Container instance in callback', function (done) {
      expect(dockerUtil).to.not.equal(null);
      dockerUtil.getImageOrContainer(
        '2',
        new DockerUtilOptionsImpl(ImageOrContainer.Container),
        (err, image: DockerImage)=> {
          expect(err).to.equal(null);
          expect(image.constructor.name).to.equal('DockerContainerImpl');
          done();
        });
    });
  });
  //
  //****************************** DockerUtil.getImagesOrContainers
  //
  //***************************** Images *******************************
  describe('DockerUtil.getImagesOrContainers (force error, images)', function () {
    it('should return non-null Error instance in callback', function (done) {
      expect(dockerUtil).to.not.equal(null);
      (<ForceError>dockerUtil).forceError = true;
      dockerUtil.getImagesOrContainers(
        ['1', '3'],
        new DockerUtilOptionsImpl(ImageOrContainer.Image, true),
        (err, images: any[])=> {
          expect(err).to.not.equal(null);
          expect(err.message).to.equal('force error: listImages');
          expect(images).to.equal(null);
          done();
        });
    });
  });
  describe('DockerUtil.getImagesOrContainers (by firmamentId, images)', function () {
    it('should return 4 images and 1 unknown by firmamentId in callback', function (done) {
      expect(dockerUtil).to.not.equal(null);
      const unknownFirmamentId = 'xxx';
      dockerUtil.getImagesOrContainers(
        ['1', '3', '5', '7', unknownFirmamentId],
        new DockerUtilOptionsImpl(ImageOrContainer.Image),
        (err, images: any[])=> {
          expect(err).to.equal(null);
          expect(images).to.have.lengthOf(5);
          images.forEach(image=> {
            if (typeof image === 'string') {
              expect(image).to.equal('Unable to find: ' + unknownFirmamentId);
            } else {
              expect(image.constructor.name).to.equal('DockerImageImpl');
            }
          });
          done();
        });
    });
  });
  //***************************** Containers *******************************
  describe('DockerUtil.getImagesOrContainers (force error, images)', function () {
    it('should return non-null Error instance in callback', function (done) {
      expect(dockerUtil).to.not.equal(null);
      (<ForceError>dockerUtil).forceError = true;
      dockerUtil.getImagesOrContainers(
        ['1', '3'],
        new DockerUtilOptionsImpl(ImageOrContainer.Container, true),
        (err, containers: any[])=> {
          expect(err).to.not.equal(null);
          expect(containers).to.equal(null);
          done();
        });
    });
  });
  describe('DockerUtil.getImagesOrContainers (by firmamentId, containers)', function () {
    it('should return images by firmamentId', function (done) {
      expect(dockerUtil).to.not.equal(null);
      const unknownFirmamentId = 'xxx';
      dockerUtil.getImagesOrContainers(
        ['1', '2', unknownFirmamentId],
        new DockerUtilOptionsImpl(ImageOrContainer.Container),
        (err, containers: any[])=> {
          expect(err).to.equal(null);
          expect(containers).to.have.lengthOf(3);
          containers.forEach(container=> {
            if (typeof container === 'string') {
              expect(container).to.equal('Unable to find: ' + unknownFirmamentId);
            } else {
              expect(container.constructor.name).to.equal('DockerContainerImpl');
            }
          });
          done();
        });
    });
  });
  //
  //****************************** DockerUtil.removeImagesOrContainers
  //
  //***************************** Images *******************************
  describe('DockerUtil.removeImagesOrContainers (force error, images)', function () {
    it('should return non-null Error instance in callback', function (done) {
      expect(dockerUtil).to.not.equal(null);
      (<ForceError>dockerUtil).forceError = true;
      dockerUtil.removeImagesOrContainers(
        ['3','5'],
        new DockerUtilOptionsImpl(ImageOrContainer.Image),
        (err, imageOrContainerRemoveResults: ImageOrContainerRemoveResults[])=> {
          expect(err).to.not.equal(null);
          expect(err.message).to.equal('force error: listImages');
          expect(imageOrContainerRemoveResults).to.equal(null);
          done();
        });
    });
  });
  describe('DockerUtil.removeImagesOrContainers (all,  images)', function () {
    it('should remove all images', function (done) {
      expect(dockerUtil).to.not.equal(null);
      dockerUtil.removeImagesOrContainers(
        ['xxx','all','ooo'],
        new DockerUtilOptionsImpl(ImageOrContainer.Image),
        (err, imageOrContainerRemoveResults: ImageOrContainerRemoveResults[])=> {
          expect(err).to.equal(null);
          expect(imageOrContainerRemoveResults).to.be.instanceOf(Array);
          expect(imageOrContainerRemoveResults).to.have.lengthOf(9);
          done();
        });
    });
  });
  describe('DockerUtil.removeImagesOrContainers (not all, images)', function () {
    it('should specified images', function (done) {
      expect(dockerUtil).to.not.equal(null);
      dockerUtil.removeImagesOrContainers(
        ['3','5', 'xxx'],
        new DockerUtilOptionsImpl(ImageOrContainer.Image),
        (err, imageOrContainerRemoveResults: ImageOrContainerRemoveResults[])=> {
          expect(err).to.equal(null);
          expect(imageOrContainerRemoveResults).to.be.instanceOf(Array);
          expect(imageOrContainerRemoveResults).to.have.lengthOf(3);
          let removeCount = 0;
          let noFindCount = 0;
          imageOrContainerRemoveResults.forEach(res=>{
            if(/^Removing/.test(res.msg)){
              ++removeCount;
            }
            if(/^Unable/.test(res.msg)){
              ++noFindCount;
            }
          });
          expect(removeCount).to.equal(2);
          expect(noFindCount).to.equal(1);
          done();
        });
    });
  });
  //***************************** Containers *******************************
  describe('DockerUtil.removeImagesOrContainers (force error, containers)', function () {
    it('should return non-null Error instance in callback', function (done) {
      expect(dockerUtil).to.not.equal(null);
      (<ForceError>dockerUtil).forceError = true;
      dockerUtil.removeImagesOrContainers(
        ['3','1'],
        new DockerUtilOptionsImpl(ImageOrContainer.Container),
        (err, imageOrContainerRemoveResults: ImageOrContainerRemoveResults[])=> {
          expect(err).to.not.equal(null);
          expect(err.message).to.equal('force error: listContainers');
          expect(imageOrContainerRemoveResults).to.equal(null);
          done();
        });
    });
  });
  describe('DockerUtil.removeImagesOrContainers (all,  containers)', function () {
    it('should remove all containers', function (done) {
      expect(dockerUtil).to.not.equal(null);
      dockerUtil.removeImagesOrContainers(
        ['xxx','all','ooo'],
        new DockerUtilOptionsImpl(ImageOrContainer.Container),
        (err, imageOrContainerRemoveResults: ImageOrContainerRemoveResults[])=> {
          expect(err).to.equal(null);
          expect(imageOrContainerRemoveResults).to.be.instanceOf(Array);
          expect(imageOrContainerRemoveResults).to.have.lengthOf(3);
          done();
        });
    });
  });
  describe('DockerUtil.removeImagesOrContainers (not all, containers)', function () {
    it('should remove specified containers', function (done) {
      expect(dockerUtil).to.not.equal(null);
      dockerUtil.removeImagesOrContainers(
        ['1','3', 'xxx'],
        new DockerUtilOptionsImpl(ImageOrContainer.Container),
        (err, imageOrContainerRemoveResults: ImageOrContainerRemoveResults[])=> {
          expect(err).to.equal(null);
          expect(imageOrContainerRemoveResults).to.be.instanceOf(Array);
          expect(imageOrContainerRemoveResults).to.have.lengthOf(3);
          let removeCount = 0;
          let noFindCount = 0;
          imageOrContainerRemoveResults.forEach(res=>{
            if(/^Removing/.test(res.msg)){
              ++removeCount;
            }
            if(/^Unable/.test(res.msg)){
              ++noFindCount;
            }
          });
          expect(removeCount).to.equal(2);
          expect(noFindCount).to.equal(1);
          done();
        });
    });
  });
});

