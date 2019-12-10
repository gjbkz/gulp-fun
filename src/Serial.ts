import * as stream from 'stream';
import {Handler, File} from './types';

export class Serial extends stream.Transform {

    public constructor(fn: Handler) {
        super({
            objectMode: true,
            transform(file: File, _encoding, callback) {
                (async () => {
                    await fn(file, this);
                    callback();
                })().catch(callback);
            },
        });
    }

}

export const serial = (fn: Handler) => new Serial(fn);
