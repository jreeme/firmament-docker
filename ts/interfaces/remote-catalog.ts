import {ForceError} from 'firmament-yargs';
import {Url} from 'url';

export interface RemoteCatalogResource {
  name: string;
  parentCatalogEntryName: string;
  absoluteUrl: string,
  text: string;
  parsedObject: any;
}

export interface RemoteCatalogEntry {
  name: string;
  urls: string[];
  resources: RemoteCatalogResource[];
}

export interface RemoteCatalog {
  entries: RemoteCatalogEntry[];
}

export interface RemoteCatalogGetter extends ForceError {
  getCatalogFromUrl(url: Url|string, cb: (err: Error, remoteCatalog: RemoteCatalog) => void);
}
