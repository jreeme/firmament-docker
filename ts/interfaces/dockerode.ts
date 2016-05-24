export enum ImageOrContainer{
  Image,
  Container
}
export interface ImageRemoveResults {
  msg:string
}
export interface ContainerRemoveResults {
  msg:string
}
export interface DockerImageOrContainer {
  Id:string,
  name:string,
  firmamentId:string
}
export interface DockerImage extends DockerImageOrContainer {
  Created:number,
  Labels:any,
  ParentId:string,
  RepoDigests:any,
  RepoTags:string[],
  Size:number,
  VirtualSize:number,
}
export interface DockerContainer extends DockerImageOrContainer {
  id:string,
  Status:string,
  Names:string[]
}
export interface SpawnOptions {
  cwd:string,
  stdio:string
}
export interface Script {
  RelativeWorkingDir:string,
  Command:string,
  Args:string[]
}
export interface ExpressApp {
  GitUrl:string,
  GitSrcBranchName:string,
  StrongLoopBranchName:string,
  StrongLoopServerUrl:string,
  ServiceName:string,
  GitCloneFolder:string,
  Scripts:Script[]
}
export interface DockerOde {
  listImages(options:any, cb:(err:Error, images:DockerImage[])=>void):void;
  listContainers(options:any, cb:(err:Error, containers:DockerContainer[])=>void):void;
  getContainer(id:string):DockerContainer;
  getImage(id:string):DockerImage;
  buildImage(tarStream:any, options:any, cb:(err:Error, outputStream:any)=>void);
  createContainer(containerConfig:any, cb:(err:Error, container:DockerContainer)=>void):void;
  pull(imageName:string, cb:(err:Error, outputStream:any)=>void);
}
export interface ContainerConfig {
  name:string,
  Image:string,
  DockerFilePath:string,
  Hostname:string,
  HostConfig:{
    Links:string[],
    PortBindings:{}
  },
  ExpressApps:ExpressApp[]
}
