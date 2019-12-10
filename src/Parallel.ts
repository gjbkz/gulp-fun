import * as stream from 'stream';
import {Handler, File} from './types';

export class Parallel extends stream.Transform {

    public constructor(fn: Handler) {
        const tasks: Array<Promise<void>> = [];
        const errors: Array<Error> = [];
        super({
            objectMode: true,
            transform(file: File, _encoding, callback) {
                tasks.push(Promise.resolve(fn(file, this))
                .catch((error) => {
                    errors.push(error);
                }));
                callback();
            },
            flush(callback) {
                Promise.all(tasks)
                .then(() => callback(errors.length === 0 ? null : new Error(errors.join('\n'))))
                .catch(callback);
            },
        });
    }

}

export const parallel = (fn: Handler) => new Parallel(fn);
