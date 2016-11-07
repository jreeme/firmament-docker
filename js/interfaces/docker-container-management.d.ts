/// <reference types="node" />
import { DockerContainer, ContainerRemoveResults, ContainerObject } from "./dockerode";
import { ForceError } from "./force-error";
export interface DockerContainerManagement extends ForceError {
    getContainers(ids: string[], cb: (err: Error, dockerContainers: ContainerObject[]) => void): any;
    getContainer(id: string, cb: (err: Error, dockerContainer: ContainerObject) => void): any;
    listContainers(listAllContainers: boolean, cb: (err: Error, dockerContainers?: DockerContainer[]) => void): any;
    createContainer(dockerContainerConfig: any, cb: (err: Error, dockerContainer: ContainerObject) => void): any;
    removeContainers(ids: string[], cb: (err: Error, containerRemoveResults: ContainerRemoveResults[]) => void): any;
    startOrStopContainers(ids: string[], start: boolean, cb: () => void): any;
}
