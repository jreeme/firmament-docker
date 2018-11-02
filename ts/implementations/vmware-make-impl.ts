import {injectable, inject} from 'inversify';
import {CommandUtil, FailureRetVal, ForceErrorImpl, Positive, SafeJson, Spawn} from 'firmament-yargs';
import {VmwareMake} from '../interfaces/vmware-make';
import * as encodeUrl from 'encodeurl';
import * as path from 'path';
import {ProcessCommandJson} from "firmament-bash/js/interfaces/process-command-json";

@injectable()
export class VmwareMakeImpl extends ForceErrorImpl implements VmwareMake {
  constructor(@inject('CommandUtil') private commandUtil:CommandUtil,
              @inject('SafeJson') private safeJson:SafeJson,
              @inject('ProcessCommandJson') private processCommandJson:ProcessCommandJson,
              @inject('Positive') private positive:Positive,
              @inject('Spawn') private spawn:Spawn) {
    super();
  }

  export(argv:any) {
    const me = this;

    const ovfToolCmd = [
      'ovftool',
      '--compress=9',
      '--diskMode=thin',
      '--targetType=OVA',
      '--datastore=datastore1'
    ];

    me.commandUtil.processExit();
    me.spawn.spawnShellCommandAsync(
      ovfToolCmd,
      {},
      (err, result) => {
        me.commandUtil.log(result.toString());
      },
      (err) => {
        if(err) {
          return me.handleOvfToolExecutionFailure(err, (err:Error) => {
            me.commandUtil.processExit();
          });
        }
      });
  }

  uninstallOvfTool(argv:any) {
    const me = this;
    const uninstallOvfToolJson = path.resolve(__dirname, '../../firmament-bash/uninstall-ovftool.json');
    me.processCommandJson.processAbsoluteUrl(uninstallOvfToolJson, (err) => {
      me.commandUtil.processExitWithError(err, `'ovftool' uninstalled.`);
    });
  }

  import(argv:any) {
    const me = this;
    const {name, powerOn, datastore, ovaUrl, esxiHost, esxiUser, esxiPassword} = argv;
    const ovfToolCmd = [
      'ovftool',
      '--acceptAllEulas',
      '--diskMode=thin',
      '--noSSLVerify',
      '--vmFolder=/',
    ];
    if(name && name != 'OVA filename') {
      ovfToolCmd.push(`--name=${name}`);
    }
    if(powerOn) {
      ovfToolCmd.push('--powerOn');
    }
    const ds = datastore ? datastore : 'datastore1';
    ovfToolCmd.push(`--datastore=${ds}`);
    ovfToolCmd.push(ovaUrl);
    const encodedUser = encodeUrl(esxiUser);
    const encodedPassword = encodeUrl(esxiPassword);
    const esxiUrl = `vi://${encodedUser}:${encodedPassword}@${esxiHost}/`;
    ovfToolCmd.push(esxiUrl);

    me.spawn.spawnShellCommandAsync(
      ovfToolCmd,
      {},
      (err, result) => {
        me.commandUtil.log(result.toString());
      },
      (err) => {
        if(err) {
          return me.handleOvfToolExecutionFailure(err, (err:Error) => {
            me.commandUtil.processExitWithError(err);
          });
        }
        me.commandUtil.processExit();
      });
  }

  private handleOvfToolExecutionFailure(err:Error, cb:(err:Error) => void) {
    const me = this;
    me.safeJson.safeParse(err.message, (err:Error, obj:any) => {
      try {
        if(obj.code.code === 'ENOENT') {
          if(me.positive.areYouSure(
            `Looks like 'ovftool' is not installed. Want me to try to install it?`,
            'Operation canceled.',
            true,
            FailureRetVal.TRUE)) {
            const installOvfToolJson = path.resolve(__dirname, '../../firmament-bash/install-ovftool.json');
            return me.processCommandJson.processAbsoluteUrl(installOvfToolJson, (err) => {
              if(!err) {
                me.commandUtil.log(`'ovftool' installed. Try operation again.`);
              }
              cb(err);
            });
          }
        }
        cb(err);
      } catch(err) {
        cb(err);
      }
    });
  }
}
