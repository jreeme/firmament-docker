/// <reference types="node" />
import { DockerUtilOptions } from "./docker-util-options";
import { ForceError } from "./force-error";
import { ImageOrContainerRemoveResults } from "./dockerode";
export interface DockerUtil extends ForceError {
    getImagesOrContainers(ids: string[], options: DockerUtilOptions, cb: (err: Error, imagesOrContainers: any[]) => void): any;
    getImageOrContainer(id: string, options: DockerUtilOptions, cb: (err: Error, imageOrContainer: any) => void): any;
    listImagesOrContainers(options: DockerUtilOptions, cb: (err: Error, imagesOrContainers: any[]) => void): any;
    removeImagesOrContainers(ids: string[], options: DockerUtilOptions, cb: (err: Error, imageOrContainerRemoveResults: ImageOrContainerRemoveResults[]) => void): any;
}
