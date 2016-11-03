import {injectable} from 'inversify';
import {ForceError} from "../interfaces/force-error";
@injectable()
export class ForceErrorImpl implements ForceError{
  forceError: boolean = false;

  checkForceError(cb: (err:Error, res:any)=>void, message:string = ''): boolean {
    if(this.forceError){
      cb(new Error(`force error: ${message}`), null);
    }
    return this.forceError;
  }
}
