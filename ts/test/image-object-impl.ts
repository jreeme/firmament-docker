import {Modem, DockerImage} from "../interfaces/dockerode";
export class DockerImageImpl implements DockerImage {
  Created: number;
  Labels: any;
  ParentId: string;
  RepoDigests: any;
  RepoTags: string[];
  Size: number;
  VirtualSize: number;
  firmamentId: string;
  Name: string;
  Id: string;
  modem: Modem;

  constructor(_modem: Modem, _id: string) {
    this.modem = _modem;
    this.Id = _id;
  }

  get(callback: (err: Error, obj: any)=>void): void {
  }

  history(callback: (err: Error, obj: any)=>void): void {
  }

  inspect(callback: (err: Error, obj: any)=>void): void {
  }

  push(opts: any, callback: (err: Error, obj: any)=>void, auth: any): void {
  }

  remove(opts: any, callback: (err: Error, obj: any)=>void): void {
    callback(null, this);
  }

  tag(opts: any, callback: (err: Error, obj: any)=>void): void {
  }
}
