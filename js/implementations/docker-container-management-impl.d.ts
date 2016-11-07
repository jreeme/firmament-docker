/// <reference types="node" />
import { DockerOde, DockerContainer, ContainerRemoveResults, ContainerObject } from "../interfaces/dockerode";
import { CommandUtil } from 'firmament-yargs';
import { DockerContainerManagement } from "../interfaces/docker-container-management";
import { DockerUtil } from "../interfaces/docker-util";
import { ForceErrorImpl } from "./force-error-impl";
export declare class DockerContainerManagementImpl extends ForceErrorImpl implements DockerContainerManagement {
    private dockerode;
    private dockerUtil;
    private commandUtil;
    constructor(_dockerode: DockerOde, _dockerUtil: DockerUtil, _commandUtil: CommandUtil);
    listContainers(listAllContainers: boolean, cb: (err: Error, dockerContainers?: DockerContainer[]) => void): void;
    getContainers(ids: string[], cb: (err: Error, dockerContainers: ContainerObject[]) => void): void;
    getContainer(id: string, cb: (err: Error, dockerContainer: ContainerObject) => void): void;
    createContainer(dockerContainerConfig: any, cb: (err: Error, dockerContainer: ContainerObject) => void): void;
    startOrStopContainers(ids: string[], start: boolean, cb: () => void): void;
    removeContainers(ids: string[], cb: (err: Error, containerRemoveResults: ContainerRemoveResults[]) => void): void;
}
