import {DockerUtilOptions} from "./docker-util-options";
import {ForceError} from "./force-error";
import {ImageOrContainerRemoveResults} from "./dockerode";
export interface DockerUtil extends ForceError {
  getImagesOrContainers(ids: string[],
                        options: DockerUtilOptions,
                        cb: (err: Error, imagesOrContainers: any[])=>void);
  getImageOrContainer(id: string,
                      options: DockerUtilOptions,
                      cb: (err: Error, imageOrContainer: any)=>void);
  listImagesOrContainers(options: DockerUtilOptions,
                         cb: (err: Error, imagesOrContainers: any[])=>void);
  removeImagesOrContainers(ids: string[],
                           options: DockerUtilOptions,
                           cb: (err: Error, imageOrContainerRemoveResults: ImageOrContainerRemoveResults[])=>void);
}
