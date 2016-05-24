import { FirmamentDocker } from '../interfaces/firmament-docker';
import { CommandImpl } from 'firmament-yargs';
import { DockerImage, DockerContainer, ContainerRemoveResults, ImageRemoveResults } from '../interfaces/dockerode';
export declare class FirmamentDockerImpl extends CommandImpl implements FirmamentDocker {
    private dockerode;
    constructor();
    createContainer(dockerContainerConfig: any, cb: (err: Error, dockerContainer: DockerContainer) => void): void;
    removeImages(ids: string[], cb: (err: Error, imageRemoveResults: ImageRemoveResults[]) => void): void;
    removeContainers(ids: string[], cb: (err: Error, containerRemoveResults: ContainerRemoveResults[]) => void): void;
    startOrStopContainers(ids: string[], start: boolean, cb: () => void): void;
    getImages(ids: string[], cb: (err: Error, images: DockerImage[]) => void): void;
    getContainers(ids: string[], cb: (err: Error, dockerContainers: DockerContainer[]) => void): void;
    private getImagesOrContainers(ids, IorC, cb);
    getImage(id: string, cb: (err: Error, image: DockerImage) => void): void;
    getContainer(id: string, cb: (err: Error, dockerContainer: DockerContainer) => void): void;
    private getImageOrContainer(id, IorC, cb);
    listContainers(listAllContainers: boolean, cb: (err: Error, dockerContainers?: DockerContainer[]) => void): void;
    listImages(listAllImages: boolean, cb: (err: Error, images: DockerImage[]) => void): void;
    private listImagesOrContainers(listAll, IorC, cb);
    buildDockerFile(dockerFilePath: string, dockerImageName: string, progressCb: (taskId: string, status: string, current: number, total: number) => void, cb: (err: Error) => void): void;
    pullImage(imageName: string, progressCb: (taskId: string, status: string, current: number, total: number) => void, cb: (err: Error) => void): void;
    exec(id: string, command: string, cb: (err: Error, result: any) => void): void;
}
