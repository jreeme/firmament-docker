export interface DockerProvision {
  buildTemplate(argv: any, cb?: () => void);
  makeTemplate(argv: any, cb?: () => void);
}
