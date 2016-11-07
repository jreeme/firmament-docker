/// <reference types="node" />
import { ForceError } from "../interfaces/force-error";
export declare class ForceErrorImpl implements ForceError {
    forceError: boolean;
    checkForceError(cb: (err: Error, res: any) => void, message?: string): boolean;
}
