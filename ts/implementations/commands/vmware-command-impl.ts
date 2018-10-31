import {injectable, inject} from 'inversify';
import kernel from '../../inversify.config';
import {Command} from 'firmament-yargs';
import {VmwareMake} from "../../interfaces/vmware-make";

@injectable()
export class VmwareCommandImpl implements Command {
  aliases:string[] = [];
  command:string = '';
  commandDesc:string = '';
  handler:(argv:any) => void = (argv:any) => {
  };
  options:any = {};
  subCommands:Command[] = [];
  static defaultConfigFilename = 'vmware-control.json';

  constructor(@inject('VmwareMake') private vmwareMake:VmwareMake) {
    this.buildCommandTree();
  }

  private buildCommandTree() {
    this.aliases = ['vmware'];
    this.command = '<subCommand>';
    this.commandDesc = 'Support for importing and exporting OVA machines to ESXi server';
    this.pushExportCommand();
    this.pushTemplateCommand();
  };

  private pushTemplateCommand() {
    /*    let templateCommand = kernel.get<Command>('CommandImpl');
        templateCommand.aliases = ['template', 't'];
        templateCommand.commandDesc = 'Create a template JSON spec for a container cluster';
        //noinspection ReservedWordAsName
        templateCommand.options = {
          get: {
            alias: 'g',
            type: 'string',
            desc: '.. get [templateName]. If no templateName is specified then lists available templates'
          },
          output: {
            alias: 'o',
            default: VmwareCommandImpl.defaultConfigFilename,
            type: 'string',
            desc: 'Name the output JSON file'
          },
          full: {
            alias: 'f',
            type: 'boolean',
            default: false,
            desc: 'Create a full JSON template with all Docker options set to reasonable defaults'
          }
        };
        templateCommand.handler = this.dockerMake.makeTemplate.bind(this.dockerMake);
        this.subCommands.push(templateCommand);*/
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
        default: `machine-${Math.random()}`,
        type: 'string',
        desc: 'Name of the VM in ESXi inventory'
      }
    };
    exportCommand.handler = me.vmwareMake.export.bind(me.vmwareMake);
    this.subCommands.push(exportCommand);
  };
}

