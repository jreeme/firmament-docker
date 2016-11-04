import {DockerContainer, ContainerRemoveResults, ContainerObject} from "./dockerode";
import {ForceError} from "./force-error";
export interface DockerContainerManagement extends ForceError {
  getContainers(ids: string[],
                cb: (err: Error, dockerContainers: ContainerObject[])=>void);
  getContainer(id: string,
               cb: (err: Error, dockerContainer: ContainerObject)=>void);
  listContainers(listAllContainers: boolean,
                 cb: (err: Error, dockerContainers?: DockerContainer[])=>void);
  createContainer(dockerContainerConfig: any,
                  cb: (err: Error, dockerContainer: ContainerObject)=>void);
  removeContainers(ids: string[],
                   cb: (err: Error, containerRemoveResults: ContainerRemoveResults[])=>void);
  startOrStopContainers(ids: string[],
                        start: boolean,
                        cb: ()=>void);
}

