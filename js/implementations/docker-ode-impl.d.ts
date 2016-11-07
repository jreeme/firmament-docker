/// <reference types="node" />
import "reflect-metadata";
import { DockerOde, DockerImage, DockerContainer, ImageObject, ContainerObject } from "../interfaces/dockerode";
import { ForceErrorImpl } from "./force-error-impl";
export declare class DockerOdeImpl extends ForceErrorImpl implements DockerOde {
    private dockerode;
    constructor();
    listImages(options: any, cb: (err: Error, images: DockerImage[]) => void): void;
    listContainers(options: any, cb: (err: Error, containers: DockerContainer[]) => void): void;
    getContainer(id: string): ContainerObject;
    getImage(id: string): ImageObject;
    buildImage(tarStream: any, options: any, cb: (err: Error, outputStream: any) => void): void;
    createContainer(containerConfig: any, cb: (err: Error, container: ContainerObject) => void): void;
    pull(imageName: string, cb: (err: Error, outputStream: any) => void): void;
}
