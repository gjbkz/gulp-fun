import * as stream from 'stream';

export class Logger<Type> extends stream.Writable {

    protected received: Array<Type>;

    public constructor(cb: (result: Array<Type>) => void) {
        super({
            objectMode: true,
            write: (item: Type, _encoding, callback) => {
                this.received.push(item);
                callback();
            },
            final: (callback) => {
                callback();
                cb(this.output());
            },
        });
        this.received = [];
    }

    public output(): Array<Type> {
        return this.received.slice();
    }

}
