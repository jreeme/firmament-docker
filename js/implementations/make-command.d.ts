import { Command, CommandLine, CommandUtil, Spawn, ProgressBar } from 'firmament-yargs';
import { DockerImageManagement } from "../interfaces/docker-image-management";
import { DockerContainerManagement } from "../interfaces/docker-container-management";
export declare class MakeCommandImpl implements Command {
    aliases: string[];
    command: string;
    commandDesc: string;
    handler: (argv: any) => void;
    options: any;
    subCommands: Command[];
    static defaultConfigFilename: string;
    static jsonFileExtension: string;
    private progressBar;
    private commandUtil;
    private dockerImageManagement;
    private dockerContainerManagement;
    private commandLine;
    private spawn;
    constructor(_commandUtil: CommandUtil, _spawn: Spawn, _dockerImageManagement: DockerImageManagement, _dockerContainerManagement: DockerContainerManagement, _commandLine: CommandLine, _progressBar: ProgressBar);
    private buildCommandTree();
    private pushTemplateCommand();
    private pushBuildCommand();
    private buildTemplate(argv);
    private makeTemplate(argv);
    private static getJsonConfigFilePath(filename);
    private processContainerConfigs(containerConfigs);
    private static writeJsonTemplateFile(objectToWrite, fullOutputPath);
    private remoteSlcCtlCommand(msg, expressApp, cmd, cb);
    private containerDependencySort(containerConfigs);
    private topologicalDependencySort(graph);
    private gitClone(gitUrl, gitBranch, localFolder, cb);
}
