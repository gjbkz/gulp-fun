import * as stream from 'stream';
import {Handler, File} from './types';

export class Parallel extends stream.Transform {

    public constructor(fn: Handler) {
        const tasks: Array<Promise<void>> = [];
        const errors: Array<Error> = [];
        super({
            objectMode: true,
            transform(file: File, _encoding, callback) {
                tasks.push(
                    (async () => {
                        await fn(file, this);
                    })()
                    .catch((error) => {
                        errors.push(error);
                    }),
                );
                callback();
            },
            flush(callback) {
                Promise.all(tasks)
                .then(() => {
                    if (0 < errors.length) {
                        throw new Error(`CaughtErrors:\n${errors.join('\n')}`);
                    }
                    callback();
                })
                .catch(callback);
            },
        });
    }

}

export const parallel = (fn: Handler) => new Parallel(fn);
