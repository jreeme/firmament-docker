export interface DockerMake {
  makeTemplate(argv: any);
  buildTemplate(argv: any, cb?:(err:Error,result:string)=>void);
}
