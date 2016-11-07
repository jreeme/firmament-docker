/// <reference types="node" />
import { DockerImageManagement } from "../interfaces/docker-image-management";
import { DockerImage, ImageRemoveResults, DockerOde } from "../interfaces/dockerode";
import { CommandUtil } from 'firmament-yargs';
import { DockerUtil } from "../interfaces/docker-util";
import { ForceErrorImpl } from "./force-error-impl";
export declare class DockerImageManagementImpl extends ForceErrorImpl implements DockerImageManagement {
    private dockerode;
    private commandUtil;
    private dockerUtil;
    constructor(_dockerode: DockerOde, _dockerUtil: DockerUtil, _commandUtil: CommandUtil);
    listImages(listAllImages: boolean, cb: (err: Error, images: DockerImage[]) => void): void;
    getImage(id: string, cb: (err: Error, image: DockerImage) => void): void;
    getImages(ids: string[], cb: (err: Error, images: DockerImage[]) => void): void;
    pullImage(imageName: string, progressCb: (taskId: string, status: string, current: number, total: number) => void, cb: (err: Error) => void): void;
    buildDockerFile(dockerFilePath: string, dockerImageName: string, progressCb: (taskId: string, status: string, current: number, total: number) => void, cb: (err: Error) => void): void;
    removeImages(ids: string[], cb: (err: Error, imageRemoveResults: ImageRemoveResults[]) => void): void;
}
