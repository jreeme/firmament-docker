export interface DockerProvision {
  buildTemplate(argv: any);
  makeTemplate(argv: any, cb?: () => void);
}
