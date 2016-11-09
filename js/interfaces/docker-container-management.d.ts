/// <reference types="node" />
import { DockerContainer, ImageOrContainerRemoveResults } from "./dockerode";
import { ForceError } from "./force-error";
export interface DockerContainerManagement extends ForceError {
    getContainers(ids: string[], cb: (err: Error, dockerContainers: DockerContainer[]) => void): any;
    getContainer(id: string, cb: (err: Error, dockerContainer: DockerContainer) => void): any;
    listContainers(listAllContainers: boolean, cb: (err: Error, dockerContainers?: DockerContainer[]) => void): any;
    createContainer(dockerContainerConfig: any, cb: (err: Error, dockerContainer: DockerContainer) => void): any;
    removeContainers(ids: string[], cb: (err: Error, containerRemoveResults: ImageOrContainerRemoveResults[]) => void): any;
    startOrStopContainers(ids: string[], start: boolean, cb: () => void): any;
    exec(id: string, command: string, cb: (err: Error, result: any) => void): void;
}
