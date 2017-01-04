import {ForceErrorImpl, CommandUtil} from 'firmament-yargs';
import {RemoteCatalog, RemoteCatalogGetter, RemoteCatalogResource} from '../interfaces/remote-catalog';
import request = require('request');
import {inject} from 'inversify';
import {Url} from 'url';
import path = require('path');
import fs = require('fs');
import nodeUrl = require('url');
import * as _ from 'lodash';
const fileExists = require('file-exists');
const safeJsonParse = require('safe-json-parse/callback');
const async = require('async');
export class RemoteCatalogGetterImpl extends ForceErrorImpl implements RemoteCatalogGetter {
  constructor(@inject('CommandUtil') private commandUtil: CommandUtil) {
    super();
  }

  getCatalogFromUrl(url: Url|string, cb: (err, remoteCatalog) => void) {
    let me = this;
    me.getRemoteCatalogResource(url, 'root', (err, remoteCatalogResource) => {
      if (me.commandUtil.callbackIfError(cb, err)) {
        return;
      }
      try {
        let remoteCatalog: RemoteCatalog = remoteCatalogResource.parsedObject;
        let fnArray: any[] = [];
        remoteCatalog.entries.forEach(entry => {
          entry.urls.forEach(url => {
            fnArray.push(async.apply(me.getRemoteCatalogResource.bind(me), url, entry.name));
          });
        });
        async.parallel(fnArray, (err, result) => {
          //Now collate results into catalog and send it back
          remoteCatalog.entries.forEach(entry => {
            //entry.resources = _.
          });
        });
      } catch (err) {
        me.commandUtil.callbackIfError(cb, err);
      }
    });
  }

  //Right now uri can be a web address (http(s)://somewhere.com/some.json) or an absolute path (/tmp/some.json)
  //or a path relative to cwd (subdir/some.json)
  private getRemoteCatalogResource(url: Url | string,
                                   parentCatalogEntryName: string,
                                   cb: (err: Error, remoteCatalogResource?: RemoteCatalogResource)=>void) {
    let me = this;
    cb = this.checkCallback(cb);
    //let me = this;
    let parsedUrl: Url;
    if (url.constructor.name === 'Url') {
      parsedUrl = <Url>url;
    }
    else if (url.constructor.name === 'String') {
      try {
        parsedUrl = nodeUrl.parse(<string>url);
      } catch (err) {
        //No big deal, probably a file path
      }
    } else {
      //Now this is a problem. Don't know what to do with random objects
      cb(new Error(`Url: '${url}' is unusable`));
      return;
    }
    try {
      if (!parsedUrl || !parsedUrl.protocol) {
        let urlString = <string>url;
        //Not a web address, maybe a local file
        urlString = path.isAbsolute(urlString) ? urlString : path.resolve(process.cwd(), urlString);
        if (!fileExists(urlString)) {
          cb(new Error(`${urlString} doesn't exist`), null);
          return;
        }
        safeJsonParse(fs.readFileSync(urlString, 'utf8'), (err, json) => {
        });
        return;
      }
      //Let's look on the web
      request(parsedUrl.href, (err, res, text) => {
        if (res.statusCode !== 200) {
          cb(new Error(`Error retrieving '${parsedUrl.href}'`), null);
          return;
        }
        safeJsonParse(text, (err, parsedObject) => {
          let name = path.basename(parsedUrl.path);
          cb(null, {
            url: parsedUrl.href,
            name, text, parsedObject, parentCatalogEntryName
          });
        });
      });
    }
    catch (err) {
      cb(err, null);
    }
  }
}
