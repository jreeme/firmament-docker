import "reflect-metadata";
import kernel from '../inversify.config';
import {expect} from 'chai';
import {DockerOde, DockerImage, ImageRemoveResults} from "../interfaces/dockerode";
import {DockerOdeMockImpl} from "./docker-ode-mock-impl";
import {DockerImageManagement} from "../interfaces/docker-image-management";
import {ForceError} from "../interfaces/force-error";
import {DockerOdeImpl} from "../implementations/docker-ode-impl";
const path = require('path');
describe('DockerImageManagement', function () {
  let dockerImageManagement: DockerImageManagement;
  beforeEach(()=> {
    kernel.unbind('DockerOde');
    //kernel.bind<DockerOde>('DockerOde').to(DockerOdeImpl);
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
  describe('DockerImageManagement.pullImage (force error)', function () {
    it('should return non-null Error instance in callback', function (done) {
      expect(dockerImageManagement).to.not.equal(null);
      (<ForceError>dockerImageManagement).forceError = true;
      dockerImageManagement.pullImage(
        'mysql:5.6',
        (taskId:string,status:string,current:number,total:number)=>{
        },
        (err: Error)=> {
          expect(err).to.not.equal(null);
          done();
        });
    });
  });
  describe('DockerImageManagement.pullImage (force error)', function () {
    it(`should pull an image from hub.docker.com`, function (done) {
      let progressCallbackCalledWithErrorCount = 0;
      let progressCallbackCalledWithDownloadingCount = 0;
      expect(dockerImageManagement).to.not.equal(null);
      dockerImageManagement.pullImage(
        'mysql:5.6',
        (taskId:string,status:string,current:number,total:number)=>{
          if(status === 'Downloading'){
            ++progressCallbackCalledWithDownloadingCount;
          }
          if(taskId === '**error**'){
            ++progressCallbackCalledWithErrorCount;
          }
        },
        (err: Error)=> {
          expect(err).to.equal(null);
          expect(progressCallbackCalledWithErrorCount).to.equal(4);
          expect(progressCallbackCalledWithDownloadingCount).to.equal(6);
          done();
        });
    });
  });
  describe('DockerImageManagement.buildDockerFile (force error)', function () {
    it('should return non-null Error instance in callback', function (done) {
      expect(dockerImageManagement).to.not.equal(null);
      (<ForceError>dockerImageManagement).forceError = true;
      let pathToDockerFile = path.resolve(__dirname, '../../test-data');
      dockerImageManagement.buildDockerFile(
        pathToDockerFile,
        'mysql:5.5',
        (taskId:string,status:string,current:number,total:number)=>{
        },
        (err: Error)=> {
          expect(err).to.not.equal(null);
          done();
        });
    });
  });
  describe('DockerImageManagement.buildDockerFile', function () {
    it('report that image was built from Dockerfile', function (done) {
      let pathToDockerFile = path.resolve(__dirname, '../../test-data');
      let progressCallbackCalledWithDownloadingCount = 0;
      expect(dockerImageManagement).to.not.equal(null);
      dockerImageManagement.buildDockerFile(
        pathToDockerFile,
        'mysql:5.5',
        (taskId:string,status:string,current:number,total:number)=>{
          if(status === 'Downloading'){
            ++progressCallbackCalledWithDownloadingCount;
          }
        },
        (err: Error)=> {
          expect(err).to.equal(null);
          expect(progressCallbackCalledWithDownloadingCount).to.equal(6);
          done();
        });
    });
  });
  describe('DockerImageManagement.removeImages (force error)', function () {
    it('should return non-null Error instance in callback', function (done) {
      expect(dockerImageManagement).to.not.equal(null);
      (<ForceError>dockerImageManagement).forceError = true;
      dockerImageManagement.removeImages(
        ['2','3', '113'],
        (err: Error, imageRemoveResult:ImageRemoveResults[])=> {
          expect(err).to.not.equal(null);
          done();
        });
    });
  });
  describe('DockerImageManagement.removeImages (by firmamentId)', function () {
    it('should return non-null Error instance in callback', function (done) {
      expect(dockerImageManagement).to.not.equal(null);
      dockerImageManagement.removeImages(
        //['all'],
        ['2','3', '113'],
        (err: Error, imageRemoveResult:ImageRemoveResults[])=> {
          expect(err).to.equal(null);
          done();
        });
    });
  });
});
