import {Transform} from 'node:stream';
import type {TransformCallback} from 'node:stream';
import type {BufferFile, DirectoryFile, NullFile, StreamFile, SymbolicFile} from 'vinyl';

export type File = BufferFile | DirectoryFile | NullFile | StreamFile | SymbolicFile;
export interface Handler<Type> {
    (data: Type, stream: Transform): Promise<void> | void;
}
export interface ParallelOptions {
    concurrency?: number;
}

const asError = (error: unknown): Error => error instanceof Error ? error : new Error(String(error));

export const parallel = <Type = File>(handler: Handler<Type>, options: ParallelOptions = {}): Transform => {
    const concurrency = options.concurrency ?? Infinity;
    if (concurrency !== Infinity && (!Number.isSafeInteger(concurrency) || concurrency < 1)) {
        throw new RangeError('concurrency must be a positive safe integer or Infinity');
    }
    let active = 0;
    let waiting: TransformCallback | undefined;
    let flushing: TransformCallback | undefined;
    return new Transform({
        objectMode: true,
        transform(data: Type, _encoding, callback) {
            active += 1;
            // Defer invocation so synchronous throws and async rejections share one path.
            Promise.resolve().then(() => {
                if (!this.destroyed) {
                    return handler(data, this);
                }
            }).then(() => {
                active -= 1;
                if (this.destroyed) {
                    return;
                }
                const next = waiting;
                waiting = undefined;
                next?.();
                if (active === 0) {
                    const done = flushing;
                    flushing = undefined;
                    done?.();
                }
            }).catch((error: unknown) => {
                active -= 1;
                this.destroy(asError(error));
            });
            if (active < concurrency) {
                callback();
            } else {
                waiting = callback;
            }
        },
        flush(callback) {
            if (active === 0) {
                callback();
            } else {
                flushing = callback;
            }
        },
    });
};

export const serial = <Type = File>(handler: Handler<Type>): Transform => new Transform({
    objectMode: true,
    transform(data: Type, _encoding, callback) {
        Promise.resolve().then(() => handler(data, this))
        .then(() => callback(), (error: unknown) => callback(asError(error)));
    },
});
