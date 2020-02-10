import * as stream from 'stream';

export class Logger<TType> extends stream.Writable {

    protected received: Array<TType>;

    public constructor(
        cb: (result: Array<TType>) => void,
    ) {
        super({
            objectMode: true,
            write: (item: TType, _encoding, callback) => {
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

    public output(): Array<TType> {
        return this.received.slice();
    }

}
