export interface DockerProvision {
  extractYamlFromJson(argv: any, cb?: () => void);
  buildTemplate(argv: any, cb?: () => void);
  makeTemplate(argv: any, cb?: () => void);
}
