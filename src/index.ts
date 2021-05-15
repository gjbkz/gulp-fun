import {Transform} from 'stream';
import type {BufferFile, DirectoryFile, NullFile, StreamFile, SymbolicFile} from 'vinyl';

export type File = BufferFile | DirectoryFile | NullFile | StreamFile | SymbolicFile;
export interface Handler<Type> {
    (data: Type, stream: Transform): Promise<void> | void,
}
export const parallel = <Type = File>(handler: Handler<Type>) => {
    const tasks: Array<Promise<void>> = [];
    const errors: Array<unknown> = [];
    return new Transform({
        objectMode: true,
        transform(data: Type, _encoding, callback) {
            tasks.push(
                (async () => await handler(data, this))()
                .catch((error: unknown) => {
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
export const serial = <Type = File>(handler: Handler<Type>) => new Transform({
    objectMode: true,
    transform(data: Type, _encoding, callback) {
        (async () => await handler(data, this))()
        .then(() => callback())
        .catch(callback);
    },
});
