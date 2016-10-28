import {ImageOrContainer} from "./dockerode";
export interface DockerUtil {
  getImagesOrContainers(ids: string[],
                        IorC: ImageOrContainer,
                        cb: (err: Error, imagesOrContainers: any[])=>void);
  getImageOrContainer(id: string,
                      IorC: ImageOrContainer,
                      cb: (err: Error, imageOrContainer: any)=>void);
  listImagesOrContainers(listAll: boolean,
                         IorC: ImageOrContainer,
                         cb: (err: Error, imagesOrContainers: any[])=>void);
}
