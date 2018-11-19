import {injectable, inject} from 'inversify';
import kernel from '../../inversify.config';
import {Command} from 'firmament-yargs';
import {VmwareMake} from "../../interfaces/vmware-make";

@injectable()
export class VmwareCommandImpl implements Command {
  aliases: string[] = [];
  command: string = '';
  commandDesc: string = '';
  handler: (argv: any) => void = (argv: any) => {
  };
  options: any = {};
  subCommands: Command[] = [];
  static defaultConfigFilename = 'vmware-control.json';

  constructor(@inject('VmwareMake') private vmwareMake: VmwareMake) {
    this.buildCommandTree();
  }

  private buildCommandTree() {
    this.aliases = ['vmware'];
    this.command = '<subCommand>';
    this.commandDesc = 'Support for importing and exporting OVA machines to ESXi server';
    this.pushExportCommand();
    this.pushImportCommand();
    this.pushUninstallOvfToolCommand()
  };

  private pushUninstallOvfToolCommand() {
    const me = this;
    let uninstallOvfToolCommand = kernel.get<Command>('CommandImpl');
    uninstallOvfToolCommand.aliases = ['uninstall-ovf-tool', 'u'];
    uninstallOvfToolCommand.commandDesc = `Uninstall VMware 'ovftool'`;
    //noinspection ReservedWordAsName
    uninstallOvfToolCommand.handler = me.vmwareMake.uninstallOvfTool.bind(me.vmwareMake);
    this.subCommands.push(uninstallOvfToolCommand);
  };

  private pushImportCommand() {
    const me = this;
    let importCommand = kernel.get<Command>('CommandImpl');
    importCommand.aliases = ['import', 'i'];
    importCommand.commandDesc = 'Import virtual machine from an OVA file to an ESXi server';
    //noinspection ReservedWordAsName
    importCommand.options = {
      name: {
        alias: 'n',
        default: 'OVA filename',
        type: 'string',
        desc: 'Name VM will have in ESXi inventory'
      },
      powerOn: {
        alias: 'p',
        default: false,
        type: 'boolean',
        desc: `If 'true' then machine will be powered on after being imported`
      },
      datastore: {
        alias: 'd',
        default: 'datastore1',
        type: 'string',
        desc: 'ESXi datastore to put the VM into'
      },
      ovaUrl: {
        type: 'string',
        default: 'https://s3.amazonaws.com/merlin-jreeme/base-ubu16.04-8-32.ova',
        desc: 'Url of OVA file'
      },
      esxiHost: {
        type: 'string',
        required: true,
        desc: 'ESXi Server Hostname/IP address'
      },
      esxiUser: {
        type: 'string',
        required: true,
        desc: 'User to perform action as on ESXi server'
      },
      esxiPassword: {
        type: 'string',
        required: true,
        desc: 'Password for ESXi User'
      }
    };
    importCommand.handler = me.vmwareMake.import.bind(me.vmwareMake);
    this.subCommands.push(importCommand);
  };

  private pushExportCommand() {
    const me = this;
    let exportCommand = kernel.get<Command>('CommandImpl');
    exportCommand.aliases = ['export'];
    exportCommand.commandDesc = 'Export virtual machine as an OVA file from ESXi server';
    //noinspection ReservedWordAsName
    exportCommand.options = {
      name: {
        alias: 'n',
        default: 'OVA filename',
        type: 'string',
        desc: 'Name of the VM in ESXi inventory'
      }
    };
    exportCommand.handler = me.vmwareMake.export.bind(me.vmwareMake);
    this.subCommands.push(exportCommand);
  };
}

