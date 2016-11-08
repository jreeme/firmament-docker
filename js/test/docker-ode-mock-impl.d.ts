/// <reference types="node" />
import "reflect-metadata";
import { DockerOde, DockerImage, DockerContainer } from "../interfaces/dockerode";
import { ForceErrorImpl } from "../implementations/force-error-impl";
export declare class DockerOdeMockImpl extends ForceErrorImpl implements DockerOde {
    listImages(options: any, cb: (err: Error, images: DockerImage[]) => void): void;
    listContainers(options: any, cb: (err: Error, containers: DockerContainer[]) => void): void;
    getContainer(id: string, options?: any): DockerContainer;
    getImage(id: string, options?: any): DockerImage;
    buildImage(tarStream: any, options: any, cb: (err: Error, outputStream: any) => void): void;
    createContainer(containerConfig: any, cb: (err: Error, container: DockerContainer) => void): void;
    pull(imageName: string, cb: (err: Error, outputStream: any) => void): void;
    private readonly testImageList;
    private readonly testContainerList;
}
