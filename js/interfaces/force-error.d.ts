/// <reference types="node" />
export interface ForceError {
    forceError: boolean;
    checkForceError(message: string, cb?: (err: Error, res: any) => void): boolean;
}
