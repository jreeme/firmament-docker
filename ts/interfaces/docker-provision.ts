import {DockerStackConfigTemplate} from "./docker-descriptors";

export interface DockerProvision {
  validateDockerStackConfigTemplate(
    dockerStackConfigTemplate: DockerStackConfigTemplate,
    cb: (err: Error, dockerStackConfigTemplate: DockerStackConfigTemplate) => void
  );
  extractYamlFromJson(argv: any, cb?: () => void);
  buildTemplate(argv: any, cb?: () => void);
  makeTemplate(argv: any, cb?: () => void);
}
