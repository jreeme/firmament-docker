/// <reference types="node" />
import { DockerContainer, ImageOrContainerRemoveResults } from '../interfaces/dockerode';
import { ForceErrorImpl } from './util/force-error-impl';
import { DockerManagement } from "../interfaces/docker-management";
import { DockerContainerManagement } from "../interfaces/docker-container-management";
export declare class DockerContainerManagementImpl extends ForceErrorImpl implements DockerContainerManagement {
    private DM;
    constructor(_dockerManagement: DockerManagement);
    listContainers(listAllContainers: boolean, cb: (err: Error, dockerContainers?: DockerContainer[]) => void): void;
    getContainers(ids: string[], cb: (err: Error, dockerContainers: DockerContainer[]) => void): void;
    getContainer(id: string, cb: (err: Error, dockerContainer: DockerContainer) => void): void;
    removeContainers(ids: string[], cb: (err: Error, containerRemoveResults: ImageOrContainerRemoveResults[]) => void): void;
    createContainer(dockerContainerConfig: any, cb: (err: Error, dockerContainer: DockerContainer) => void): void;
    startOrStopContainers(ids: string[], start: boolean, cb: () => void): void;
    exec(id: string, command: string, cb: (err: Error, result: any) => void): void;
}
