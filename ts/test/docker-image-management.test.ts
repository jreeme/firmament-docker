import "reflect-metadata";
import kernel from '../inversify.config';
import {expect} from 'chai';
import {DockerOde, DockerImage} from "../interfaces/dockerode";
import {DockerOdeMockImpl} from "./docker-ode-mock-impl";
import {DockerImageManagement} from "../interfaces/docker-image-management";
import {ForceError} from "../interfaces/force-error";
describe('DockerImageManagement', function () {
  let dockerImageManagement: DockerImageManagement;
  beforeEach(()=> {
    kernel.unbind('DockerOde');
    kernel.bind<DockerOde>('DockerOde').to(DockerOdeMockImpl);
    dockerImageManagement = kernel.get<DockerImageManagement>('DockerImageManagement');
  });
  //
  //****************************** DockerImageManagement.listImages
  //
  describe('DockerImageManagement.listImages (force error)', function () {
    it('should return non-null Error instance in callback', function (done) {
      expect(dockerImageManagement).to.not.equal(null);
      (<ForceError>dockerImageManagement).forceError = true;
      dockerImageManagement.listImages(
        true,
        (err: Error, images: DockerImage[])=> {
          expect(err).to.not.equal(null);
          expect(images).to.equal(null);
          done();
        });
    });
  });
  describe('DockerImageManagement.listImages (all)', function () {
    it('should return array of all (9) Images in callback', function (done) {
      expect(dockerImageManagement).to.not.equal(null);
      dockerImageManagement.listImages(
        true,
        (err: Error, images: DockerImage[])=> {
          expect(err).to.equal(null);
          expect(images).to.have.lengthOf(9);
          done();
        });
    });
  });
  describe('DockerImageManagement.listImages (not-all)', function () {
    it('should return array of all (5) Images in callback', function (done) {
      expect(dockerImageManagement).to.not.equal(null);
      dockerImageManagement.listImages(
        false,
        (err: Error, images: DockerImage[])=> {
          expect(err).to.equal(null);
          expect(images).to.have.lengthOf(5);
          done();
        });
    });
  });
  describe('DockerImageManagement.getImage (force error)', function () {
    it('should return non-null Error instance in callback', function (done) {
      expect(dockerImageManagement).to.not.equal(null);
      (<ForceError>dockerImageManagement).forceError = true;
      dockerImageManagement.getImage(
        '3',
        (err: Error, image: DockerImage)=> {
          expect(err).to.not.equal(null);
          expect(image).to.equal(null);
          done();
        });
    });
  });
  describe('DockerImageManagement.getImage (by firmamentId)', function () {
    it(`should return ImageObject with name: 'jstnldrs/caffedata:1.0'`, function (done) {
      expect(dockerImageManagement).to.not.equal(null);
      dockerImageManagement.getImage(
        '7',
        (err: Error, image: DockerImage)=> {
          expect(err).to.equal(null);
          expect(image.constructor.name).to.equal('ImageObjectImpl');
          expect(image.name).to.equal('jstnldrs/caffedata:1.0');
          done();
        });
    });
  });
  describe('DockerImageManagement.getImages (force error)', function () {
    it('should return non-null Error instance in callback', function (done) {
      expect(dockerImageManagement).to.not.equal(null);
      (<ForceError>dockerImageManagement).forceError = true;
      dockerImageManagement.getImages(
        ['7', '8'],
        (err: Error, images: DockerImage[])=> {
          expect(err).to.not.equal(null);
          expect(images).to.equal(null);
          done();
        });
    });
  });
  describe('DockerImageManagement.getImages (by firmamentId)', function () {
    let imageNames = ['jstnldrs/caffedata:1.0','mongo:2.6'];
    it(`should return array of ImageObjects (length 2)`, function (done) {
      expect(dockerImageManagement).to.not.equal(null);
      dockerImageManagement.getImages(
        ['7', '8'],
        (err: Error, images: DockerImage[])=> {
          expect(err).to.equal(null);
          expect(images).to.have.lengthOf(2)
          for(let i = 0;i < images.length;++i){
            expect(images[i].constructor.name).to.equal('ImageObjectImpl');
            expect(images[i].name).to.equal(imageNames[i]);
          }
          done();
        });
    });
  });
});
