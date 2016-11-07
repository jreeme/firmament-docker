import 'reflect-metadata';
import kernel from '../inversify.config';
import {expect} from 'chai';
import {DockerOde, DockerContainer} from '../interfaces/dockerode';
import {DockerOdeMockImpl} from './docker-ode-mock-impl';
import {DockerContainerManagement} from '../interfaces/docker-container-management';
import {FirmamentDocker} from "../interfaces/firmament-docker";
import {ForceError} from "../interfaces/force-error";
describe('DockerCommand', function () {
  let firmamentDocker: FirmamentDocker;
  beforeEach(()=> {
    kernel.unbind('DockerOde');
    //kernel.bind<DockerOde>('DockerOde').to(DockerOdeImpl);
    kernel.bind<DockerOde>('DockerOde').to(DockerOdeMockImpl);
    firmamentDocker = kernel.get<FirmamentDocker>('FirmamentDocker');
  });
  //
  //****************************** DockerContainerManagement.listContainers
  //
  describe('DockerContainerManagement.listContainers (force error)', function () {
    it('should return non-null Error instance in callback', function (done) {
      expect(firmamentDocker).to.not.equal(null);
      (<ForceError>firmamentDocker).forceError = true;
      firmamentDocker.listContainers(
        true,
        (err: Error, containers: DockerContainer[])=> {
          expect(err).to.not.equal(null);
          expect(containers).to.equal(null);
          done();
        });
    });
  });
});
