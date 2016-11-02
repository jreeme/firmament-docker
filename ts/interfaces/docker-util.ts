import {DockerUtilOptions} from "./docker-util-options";
export interface DockerUtil {
  getImagesOrContainers(ids: string[],
                        options: DockerUtilOptions,
                        cb: (err: Error, imagesOrContainers: any[])=>void)
  getImageOrContainer(id: string,
                      options: DockerUtilOptions,
                      cb: (err: Error, imageOrContainer: any)=>void)
  listImagesOrContainers(options: DockerUtilOptions,
                         cb: (err: Error, imagesOrContainers: any[])=>void)
}
