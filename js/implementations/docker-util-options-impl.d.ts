import { DockerUtilOptions } from "../interfaces/docker-util-options";
import { ImageOrContainer } from "../interfaces/dockerode";
export declare class DockerUtilOptionsImpl implements DockerUtilOptions {
    constructor(_IorC: ImageOrContainer, _listAll?: boolean);
    IorC: ImageOrContainer;
    listAll: boolean;
}
