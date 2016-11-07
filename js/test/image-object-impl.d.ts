/// <reference types="node" />
import { ImageObject, Modem } from "../interfaces/dockerode";
export declare class ImageObjectImpl implements ImageObject {
    name: string;
    id: string;
    modem: Modem;
    constructor(_modem: Modem, _id: string);
    get(callback: (err: Error, obj: any) => void): void;
    history(callback: (err: Error, obj: any) => void): void;
    inspect(callback: (err: Error, obj: any) => void): void;
    push(opts: any, callback: (err: Error, obj: any) => void, auth: any): void;
    remove(opts: any, callback: (err: Error, obj: any) => void): void;
    tag(opts: any, callback: (err: Error, obj: any) => void): void;
}
