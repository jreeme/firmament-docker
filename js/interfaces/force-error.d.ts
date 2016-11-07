/// <reference types="node" />
export interface ForceError {
    forceError: boolean;
    checkForceError(cb: (err: Error, res: any) => void, message?: string): boolean;
}
