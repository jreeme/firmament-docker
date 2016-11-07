import { Command, CommandLine, CommandUtil, Spawn } from 'firmament-yargs';
import { FirmamentDocker } from "../interfaces/firmament-docker";
export declare class DockerCommandImpl implements Command {
    aliases: string[];
    command: string;
    commandDesc: string;
    handler: (argv: any) => void;
    options: any;
    subCommands: Command[];
    private firmamentDocker;
    private commandUtil;
    private commandLine;
    private spawn;
    constructor(_commandUtil: CommandUtil, _spawn: Spawn, _commandLine: CommandLine, _firmamentDocker: FirmamentDocker);
    private buildCommandTree();
    private pushCleanVolumesCommand();
    private pushRemoveImagesCommand();
    private pushRemoveContainersCommand();
    private pushShellCommand();
    private pushStartCommand();
    private pushStopCommand();
    private pushImagesCommand();
    private pushPsCommand();
    private printImagesList(argv, cb);
    private printContainerList(argv, cb);
    private bashInToContainer(ids, cb);
    private prettyPrintDockerImagesList(err, images, cb);
    private prettyPrintDockerContainerList(err, containers, all, cb);
}
