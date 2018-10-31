import {injectable, inject} from 'inversify';
import {CommandUtil, ForceErrorImpl} from 'firmament-yargs';
import {VmwareMake} from "../interfaces/vmware-make";

@injectable()
export class VmwareMakeImpl extends ForceErrorImpl implements VmwareMake {
  constructor(@inject('CommandUtil') private commandUtil:CommandUtil) {
    super();
  }

  export(argv:any) {
    let me = this;
    console.error(`<NOT_IMPLEMENTED> name=${argv.name}`);
    me.commandUtil.processExit();
  }

  import(argv:any) {
    let me = this;
    console.error('<NOT_IMPLEMENTED>');
    me.commandUtil.processExit();
  }
}
