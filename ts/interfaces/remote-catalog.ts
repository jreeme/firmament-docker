import {ForceError} from 'firmament-yargs';
import {Url} from 'url';

export interface RemoteCatalogEntry {
  name: string,
  urls: string[]
}

export interface RemoteCatalog {
  entries: RemoteCatalogEntry[];
}

export interface RemoteCatalogGetter extends ForceError {
  getCatalogFromUrl(url: Url|string, cb: (err: Error, remoteCatalog: RemoteCatalog) => void);
}
