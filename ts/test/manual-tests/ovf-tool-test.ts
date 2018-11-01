import kernel from '../../inversify.config';
import {VmwareMake} from "../../interfaces/vmware-make";

const vmwareMake = kernel.get<VmwareMake>('VmwareMake');
vmwareMake.import({
  name: 'NewMachineInstance',
  powerOn: true,
  //datastore: 'datastore2',
  ovaUrl: '/home/jreeme/Downloads/base-ubu16.04-8-32.ova',
  esxiHost: 'vmware.parrot-les.keyw',
  esxiUser: 'root',
  esxiPassword: 'run2walk!'
});
