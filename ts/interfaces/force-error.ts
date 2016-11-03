//Provides a way to set interface methods to always thrown an error. Good for testing.
export interface ForceError {
  forceError: boolean;
  checkForceError(cb: (err: Error, res: any)=>void, message?: string): boolean;
}
