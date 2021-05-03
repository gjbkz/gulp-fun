import * as stream from 'stream';
import type {BufferFile, DirectoryFile, NullFile, StreamFile, SymbolicFile} from 'vinyl';
export type File = BufferFile | DirectoryFile | NullFile | StreamFile | SymbolicFile;
export type Handler = (file: File, stream: stream.Transform) => Promise<void> | void;
export class Parallel extends stream.Transform {

    public constructor(fn: Handler) {
        const tasks: Array<Promise<void>> = [];
        const errors: Array<Error> = [];
        super({
            objectMode: true,
            transform(file: File, _encoding, callback) {
                tasks.push(
                    (async () => await fn(file, this))()
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
export class Serial extends stream.Transform {

    public constructor(fn: Handler) {
        super({
            objectMode: true,
            transform(file: File, _encoding, callback) {
                (async () => await fn(file, this))()
                .then(() => callback())
                .catch(callback);
            },
        });
    }

}
export const serial = (fn: Handler) => new Serial(fn);
