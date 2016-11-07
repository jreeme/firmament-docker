/// <reference types="node" />
import { DockerImageManagement } from "./docker-image-management";
import { DockerContainerManagement } from "./docker-container-management";
export interface FirmamentDocker extends DockerImageManagement, DockerContainerManagement {
    exec(id: string, command: string, cb: (err: Error, result: any) => void): void;
}
