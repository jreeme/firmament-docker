/// <reference types="node" />
import { DockerUtil } from '../interfaces/docker-util';
import { DockerOde } from '../interfaces/dockerode';
import { CommandUtil } from 'firmament-yargs';
import { DockerUtilOptions } from "../interfaces/docker-util-options";
import { ForceErrorImpl } from "./force-error-impl";
export declare class DockerUtilImpl extends ForceErrorImpl implements DockerUtil {
    private dockerode;
    private commandUtil;
    constructor(_dockerode: DockerOde, _commandUtil: CommandUtil);
    listImagesOrContainers(options: DockerUtilOptions, cb: (err: Error, imagesOrContainers: any[]) => void): void;
    getImagesOrContainers(ids: string[], options: DockerUtilOptions, cb: (err: Error, imagesOrContainers: any[]) => void): void;
    getImageOrContainer(id: string, options: DockerUtilOptions, cb: (err: Error, imageOrContainer: any) => void): void;
    private static compareIds(id0, id1);
    private static stripSha256(id);
}
