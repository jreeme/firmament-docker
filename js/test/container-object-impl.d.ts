/// <reference types="node" />
import { Modem, DockerContainer } from "../interfaces/dockerode";
export declare class DockerContainerImpl implements DockerContainer {
    Status: string;
    Names: string[];
    firmamentId: string;
    Name: string;
    Id: string;
    modem: Modem;
    constructor(_modem: Modem, _id: string);
    start(opts: any, callback: (err: Error, obj: any) => void): void;
    stop(opts: any, callback: (err: Error, obj: any) => void): void;
    remove(opts: any, callback: (err: Error, obj: any) => void): void;
}
