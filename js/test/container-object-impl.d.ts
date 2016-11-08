/// <reference types="node" />
import { ContainerObject, Modem } from "../interfaces/dockerode";
export declare class ContainerObjectImpl implements ContainerObject {
    name: string;
    id: string;
    modem: Modem;
    constructor(_modem: Modem, _id: string);
    start(opts: any, callback: (err: Error, obj: any) => void): void;
    stop(opts: any, callback: (err: Error, obj: any) => void): void;
    remove(opts: any, callback: (err: Error, obj: any) => void): void;
}
