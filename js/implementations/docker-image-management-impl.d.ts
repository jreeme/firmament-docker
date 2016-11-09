/// <reference types="node" />
import { DockerImageManagement } from '../interfaces/docker-image-management';
import { DockerImage, ImageOrContainerRemoveResults } from '../interfaces/dockerode';
import { ForceErrorImpl } from './util/force-error-impl';
import { DockerManagement } from "../interfaces/docker-management";
export declare class DockerImageManagementImpl extends ForceErrorImpl implements DockerImageManagement {
    private DM;
    constructor(_dockerManagement: DockerManagement);
    listImages(listAllImages: boolean, cb: (err: Error, images: DockerImage[]) => void): void;
    getImages(ids: string[], cb: (err: Error, images: DockerImage[]) => void): void;
    getImage(id: string, cb: (err: Error, image: DockerImage) => void): void;
    removeImages(ids: string[], cb: (err: Error, imageRemoveResults: ImageOrContainerRemoveResults[]) => void): void;
    pullImage(imageName: string, progressCb: (taskId: string, status: string, current: number, total: number) => void, cb: (err: Error) => void): void;
    buildDockerFile(dockerFilePath: string, dockerImageName: string, progressCb: (taskId: string, status: string, current: number, total: number) => void, cb: (err: Error) => void): void;
}
