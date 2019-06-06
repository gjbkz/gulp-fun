import * as stream from 'stream';
import {Handler, File} from './types';

export class Parallel extends stream.Transform {

    public constructor(fn: Handler) {
        const promises: Array<Promise<Error | void>> = [];
        super({
            objectMode: true,
            transform(file: File, _encoding, callback) {
                promises.push(
                    Promise.resolve()
                    .then(() => fn(file, this))
                    .then(() => {})
                    .catch((error) => error)
                );
                callback();
            },
            flush(callback) {
                Promise.all(promises)
                .then((errors) => {
                    for (const error of errors) {
                        if (error) {
                            throw error;
                        }
                    }
                    callback();
                })
                .catch(callback);
            },
        });
    }

}

export const parallel = (fn: Handler) => new Parallel(fn);
