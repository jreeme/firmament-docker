import {ContainerObject, Modem} from "../interfaces/dockerode";
export class ContainerObjectImpl implements ContainerObject {
  name: string;
  id: string;
  modem: Modem;

  constructor(_modem: Modem, _id: string) {
    this.modem = _modem;
    this.id = _id;
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
