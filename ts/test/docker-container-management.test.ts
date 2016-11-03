import "reflect-metadata";
import kernel from '../inversify.config';
import {expect} from 'chai';
import {DockerOde, DockerContainer} from "../interfaces/dockerode";
import {DockerOdeMockImpl} from "./docker-ode-mock-impl";
import {DockerContainerManagement} from "../interfaces/docker-container-management";
import {ForceError} from "../interfaces/force-error";
describe('DockerContainerManagement', function () {
  let dockerContainerManagement: DockerContainerManagement;
  beforeEach(()=> {
    kernel.unbind('DockerOde');
    kernel.bind<DockerOde>('DockerOde').to(DockerOdeMockImpl);
    dockerContainerManagement = kernel.get<DockerContainerManagement>('DockerContainerManagement');
  });
  //
  //****************************** DockerContainerManagement.listContainers
  //
  describe('DockerContainerManagement.listContainers (force error)', function () {
    it('should return non-null Error instance in callback', function (done) {
      expect(dockerContainerManagement).to.not.equal(null);
      (<ForceError>dockerContainerManagement).forceError = true;
      dockerContainerManagement.listContainers(
        true,
        (err: Error, containers: DockerContainer[])=> {
          expect(err).to.not.equal(null);
          expect(containers).to.equal(null);
          done();
        });
    });
  });
  describe('DockerContainerManagement.listContainers (all)', function () {
    it('should return array of all (3) Containers in callback', function (done) {
      expect(dockerContainerManagement).to.not.equal(null);
      dockerContainerManagement.listContainers(
        true,
        (err: Error, containers: DockerContainer[])=> {
          expect(err).to.equal(null);
          expect(containers).to.have.lengthOf(3);
          done();
        });
    });
  });
  describe('DockerContainerManagement.listContainers (not-all)', function () {
    it('should return array of all (1) Containers in callback', function (done) {
      expect(dockerContainerManagement).to.not.equal(null);
      dockerContainerManagement.listContainers(
        false,
        (err: Error, containers: DockerContainer[])=> {
          expect(err).to.equal(null);
          expect(containers).to.have.lengthOf(1);
          done();
        });
    });
  });
  describe('DockerContainerManagement.getContainer (force error)', function () {
    it('should return non-null Error instance in callback', function (done) {
      expect(dockerContainerManagement).to.not.equal(null);
      (<ForceError>dockerContainerManagement).forceError = true;
      dockerContainerManagement.getContainer(
        '2',
        (err: Error, container: DockerContainer)=> {
          expect(err).to.not.equal(null);
          expect(container).to.equal(null);
          done();
        });
    });
  });
  describe('DockerContainerManagement.getContainer (by firmamentId)', function () {
    it(`should return ContainerObject with name: 'jstnldrs/caffedata:1.0'`, function (done) {
      expect(dockerContainerManagement).to.not.equal(null);
      dockerContainerManagement.getContainer(
        '2',
        (err: Error, container: DockerContainer)=> {
          expect(err).to.equal(null);
          expect(container.constructor.name).to.equal('ContainerObjectImpl');
          expect(container.name).to.equal('/mysql');
          done();
        });
    });
  });
  describe('DockerContainerManagement.getContainers (force error)', function () {
    it('should return non-null Error instance in callback', function (done) {
      expect(dockerContainerManagement).to.not.equal(null);
      (<ForceError>dockerContainerManagement).forceError = true;
      dockerContainerManagement.getContainers(
        ['2', '3'],
        (err: Error, containers: DockerContainer[])=> {
          expect(err).to.not.equal(null);
          expect(containers).to.equal(null);
          done();
        });
    });
  });
  describe('DockerContainerManagement.getContainers (by firmamentId)', function () {
    let containerNames = ['/mysql','/ubuntu'];
    it(`should return array of ContainerObjects (length 2)`, function (done) {
      expect(dockerContainerManagement).to.not.equal(null);
      dockerContainerManagement.getContainers(
        ['2', '3'],
        (err: Error, containers: DockerContainer[])=> {
          expect(err).to.equal(null);
          expect(containers).to.have.lengthOf(2)
          for(let i = 0;i < containers.length;++i){
            expect(containers[i].constructor.name).to.equal('ContainerObjectImpl');
            expect(containers[i].name).to.equal(containerNames[i]);
          }
          done();
        });
    });
  });
});
