import {Transform} from 'stream';
import type {BufferFile, DirectoryFile, NullFile, StreamFile, SymbolicFile} from 'vinyl';

export type File = BufferFile | DirectoryFile | NullFile | StreamFile | SymbolicFile;
export interface Handler {
    (file: File, stream: Transform): Promise<void> | void,
}

export const parallel = (fn: Handler) => {
    const tasks: Array<Promise<void>> = [];
    const errors: Array<Error> = [];
    return new Transform({
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
};

export const serial = (fn: Handler) => new Transform({
    objectMode: true,
    transform(file: File, _encoding, callback) {
        (async () => await fn(file, this))()
        .then(() => callback())
        .catch(callback);
    },
});
