/// <reference types="node" />
import { FirmamentDocker } from '../interfaces/firmament-docker';
import { CommandUtil } from 'firmament-yargs';
import { DockerImage, DockerContainer, ContainerRemoveResults, ImageRemoveResults } from '../interfaces/dockerode';
import { DockerImageManagement } from "../interfaces/docker-image-management";
import { DockerContainerManagement } from "../interfaces/docker-container-management";
import { ForceErrorImpl } from "./force-error-impl";
export declare class FirmamentDockerImpl extends ForceErrorImpl implements FirmamentDocker {
    private dockerContainerManagement;
    private dockerImageManagement;
    private commandUtil;
    constructor(_dockerContainerManagement: DockerContainerManagement, _dockerImageManagement: DockerImageManagement, _commandUtil: CommandUtil);
    listContainers(listAllContainers: boolean, cb: (err: Error, dockerContainers?: DockerContainer[]) => void): void;
    createContainer(dockerContainerConfig: any, cb: (err: Error, dockerContainer: DockerContainer) => void): void;
    removeImages(ids: string[], cb: (err: Error, imageRemoveResults: ImageRemoveResults[]) => void): void;
    removeContainers(ids: string[], cb: (err: Error, containerRemoveResults: ContainerRemoveResults[]) => void): void;
    startOrStopContainers(ids: string[], start: boolean, cb: () => void): void;
    listImages(listAllImages: boolean, cb: (err: Error, images: DockerImage[]) => void): void;
    getImages(ids: string[], cb: (err: Error, images: DockerImage[]) => void): void;
    getImage(id: string, cb: (err: Error, image: DockerImage) => void): void;
    getContainers(ids: string[], cb: (err: Error, dockerContainers: DockerContainer[]) => void): void;
    getContainer(id: string, cb: (err: Error, dockerContainer: DockerContainer) => void): void;
    buildDockerFile(dockerFilePath: string, dockerImageName: string, progressCb: (taskId: string, status: string, current: number, total: number) => void, cb: (err: Error) => void): void;
    pullImage(imageName: string, progressCb: (taskId: string, status: string, current: number, total: number) => void, cb: (err: Error) => void): void;
    exec(id: string, command: string, cb: (err: Error, result: any) => void): void;
}
