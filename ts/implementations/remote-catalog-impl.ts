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
  private baseUrl: string;

  constructor(@inject('CommandUtil') private commandUtil: CommandUtil) {
    super();
  }

  getCatalogFromUrl(url: Url|string, cb: (err, remoteCatalog) => void) {
    let me = this;
    let parsedUrl = me.getParsedUrl(url);
    if(parsedUrl.protocol){
      me.baseUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}${path.dirname(parsedUrl.path)}`;
    }else{
      me.baseUrl = path.dirname(parsedUrl.path);
    }
    me.getRemoteCatalogResource(parsedUrl, 'root', (err, remoteCatalogResource) => {
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
        async.parallel(fnArray, (err, results) => {
          //Now collate results into catalog and send it back
          remoteCatalog.entries.forEach(entry => {
            entry.resources =
              <RemoteCatalogResource[]>_.filter(results, ['parentCatalogEntryName', entry.name]);
          });
          cb(null, remoteCatalog);
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
                                   cb: (err: Error, remoteCatalogResource?: RemoteCatalogResource) => void) {
    let me = this;
    cb = me.checkCallback(cb);
    try {
      let parsedUrl = me.getParsedUrl(url);
      if (!parsedUrl) {
        //Now this is a problem. Don't know what to do with random objects
        cb(new Error(`Url: '${url}' is unusable`));
        return;
      }
      if (!parsedUrl.protocol) {
        let urlString = parsedUrl.path;
        //Not a web address, maybe a local file
        urlString = path.isAbsolute(urlString) ? urlString : path.resolve(me.baseUrl, urlString);
        if (!fileExists(urlString)) {
          cb(new Error(`${urlString} doesn't exist`), null);
          return;
        }
        let text = fs.readFileSync(urlString, 'utf8');
        safeJsonParse(text, (err, parsedObject) => {
          let name = path.basename(urlString);
          cb(null, {
            absoluteUrl: urlString,
            name, text, parsedObject, parentCatalogEntryName
          });
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
            absoluteUrl: parsedUrl.href,
            name, text, parsedObject, parentCatalogEntryName
          });
        });
      });
    }
    catch (err) {
      cb(err, null);
    }
  }

  private getParsedUrl(url: Url | string) {
    let parsedUrl: Url;
    if (url.constructor.name === 'Url') {
      parsedUrl = <Url>url;
    }
    else if (url.constructor.name === 'String') {
      parsedUrl = nodeUrl.parse(<string>url);
    }
    return parsedUrl;
  }
}

