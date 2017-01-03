import {ForceErrorImpl, CommandUtil} from 'firmament-yargs';
import {RemoteCatalog, RemoteCatalogGetter} from '../interfaces/remote-catalog';
import request = require('request');
import {inject} from 'inversify';
import {Url} from 'url';
const async = require('async');
export class RemoteCatalogGetterImpl extends ForceErrorImpl implements RemoteCatalogGetter {
  constructor(@inject('CommandUtil') private commandUtil: CommandUtil) {
    super();
  }

  getCatalogFromUrl(url: Url|string, cb: (err: Error, remoteCatalog: RemoteCatalog) => void) {
    let me = this;
    let urlString = <string>((url.constructor.name === 'Url')
      ? (<Url>url).href
      : url);
    request(urlString + `?${(new Date()).getTime()}`,
      (err, res, body) => {
        if (me.commandUtil.callbackIfError(cb, err)) {
          return;
        }
        if (res.statusCode !== 200) {
          me.commandUtil.callbackIfError(cb, new Error(res.statusMessage));
          return;
        }
        try {
          let remoteCatalog: RemoteCatalog = JSON.parse(body);
          let fnArray: any[] = [];
          remoteCatalog.entries.forEach(entry => {
            entry.urls.forEach(url=>{

            });
          });
          async.parallel(fnArray, (err, result) => {

          });
        } catch (err) {
          me.commandUtil.callbackIfError(cb, err);
        }
      });
  }
}
