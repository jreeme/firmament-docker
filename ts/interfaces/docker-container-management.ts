import {DockerContainer, ContainerRemoveResults} from "./dockerode";
export interface DockerContainerManagement {
  getContainers(ids: string[], cb: (err: Error, dockerContainers: DockerContainer[])=>void);
  getContainer(id: string, cb: (err: Error, dockerContainer: DockerContainer)=>void);
  listContainers(listAllContainers: boolean, cb: (err: Error, dockerContainers?: DockerContainer[])=>void);
  createContainer(dockerContainerConfig: any, cb: (err: Error, dockerContainer: DockerContainer)=>void);
  removeContainers(ids: string[], cb: (err: Error, containerRemoveResults: ContainerRemoveResults[])=>void);
  startOrStopContainers(ids: string[], start: boolean, cb: ()=>void);
}

