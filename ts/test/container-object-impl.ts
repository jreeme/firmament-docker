import {Modem, DockerContainer} from "../interfaces/dockerode";
export class DockerContainerImpl implements DockerContainer {
  Status: string;
  Names: string[];
  firmamentId: string;
  Name: string;
  Id: string;
  modem: Modem;

  constructor(_modem: Modem, _id: string) {
    this.modem = _modem;
    this.Id = _id;
  }

  start(opts: any, callback: (err: Error, obj: any)=>void): void {
    callback(null,{});
  }

  stop(opts: any, callback: (err: Error, obj: any)=>void): void {
    callback(null,{});
  }

  remove(opts: any, callback: (err: Error, obj: any)=>void): void {
    callback(null,{});
  }
}
