import {DockerContainer, ImageOrContainerRemoveResults} from './dockerode';
import {ForceError} from 'firmament-yargs';
export interface DockerContainerManagement extends ForceError {
  getContainers(ids: string[],
                cb: (err: Error, dockerContainers: DockerContainer[])=>void);
  getContainer(id: string,
               cb: (err: Error, dockerContainer: DockerContainer)=>void);
  listContainers(listAllContainers: boolean,
                 cb: (err: Error, dockerContainers?: DockerContainer[])=>void);
  createContainer(dockerContainerConfig: any,
                  cb: (err: Error, dockerContainer: DockerContainer)=>void);
  removeContainers(ids: string[],
                   cb: (err: Error, containerRemoveResults: ImageOrContainerRemoveResults[])=>void);
  startOrStopContainers(ids: string[],
                        start: boolean,
                        cb: ()=>void);
  exec(id:string, command:string, cb:(err:Error, result:any)=>void):void;
}

