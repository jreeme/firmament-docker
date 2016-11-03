import {DockerUtilOptions} from "./docker-util-options";
import {ForceError} from "./force-error";
export interface DockerUtil extends ForceError {
  getImagesOrContainers(ids: string[],
                        options: DockerUtilOptions,
                        cb: (err: Error, imagesOrContainers: any[])=>void)
  getImageOrContainer(id: string,
                      options: DockerUtilOptions,
                      cb: (err: Error, imageOrContainer: any)=>void)
  listImagesOrContainers(options: DockerUtilOptions,
                         cb: (err: Error, imagesOrContainers: any[])=>void)
}
