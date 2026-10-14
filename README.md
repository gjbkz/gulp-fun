# gulp-fun

[![Test](https://github.com/gjbkz/gulp-fun/actions/workflows/test.yml/badge.svg)](https://github.com/gjbkz/gulp-fun/actions/workflows/test.yml)

Create object-mode transform streams from synchronous or asynchronous functions.
Use them in Gulp pipelines without writing a dedicated plugin.

## Maintenance status

This project is in maintenance mode. Bug fixes, security fixes, and changes
needed for supported Node.js and Gulp compatibility are in scope. New features,
new integrations, and performance work without a demonstrated problem are not
planned. Responses and releases are best effort; there is no support SLA.

Development and the next release require Node.js 22 or newer. CI covers Node.js
22, 24, and 26, with Gulp 5 integration tests. Older npm releases retain their
original requirements. See [MAINTAINING.md](./MAINTAINING.md) for the upkeep policy.

## Install

```sh
npm install --save-dev gulp-fun
```

## Usage

Use Vinyl's `contents` property and push each output explicitly. Returning a
value from the handler does not emit it. Skip a file by not pushing it; emit
multiple outputs by pushing more than once.

```javascript
const gulp = require('gulp');
const {pipeline} = require('node:stream/promises');
const {serial} = require('gulp-fun');

exports.uppercase = function uppercase() {
    return pipeline(
        gulp.src('src/*.txt'),
        serial((file, stream) => {
            if (file.isBuffer()) {
                file.contents = Buffer.from(file.contents.toString('utf8').toUpperCase());
            }
            stream.push(file);
        }),
        gulp.dest('dest'),
    );
};
```

Use `pipeline` to propagate errors and destroy the connected streams.

## API

```typescript
import {Transform} from 'node:stream';
import type {BufferFile, DirectoryFile, NullFile, StreamFile, SymbolicFile} from 'vinyl';

export type File = BufferFile | DirectoryFile | NullFile | StreamFile | SymbolicFile;
export interface Handler<Type> {
    (data: Type, stream: Transform): Promise<void> | void;
}
export interface ParallelOptions {
    concurrency?: number;
}
export const serial: <Type = File>(handler: Handler<Type>) => Transform;
export const parallel: <Type = File>(handler: Handler<Type>, options?: ParallelOptions) => Transform;
```

`serial` awaits each handler before starting the next input. `parallel` emits
outputs in handler completion order; it does not preserve input order.

### Bounded parallel processing (next release)

```javascript
const {parallel} = require('gulp-fun');

const transform = parallel(async (file, stream) => {
    // Await all work before resolving the handler.
    await processFile(file);
    stream.push(file);
}, {concurrency: 4});
```

`concurrency` must be a positive safe integer or `Infinity`. It limits active
handlers by holding the transform callback until a slot is available. For
backward compatibility the default is `Infinity`; specify a finite limit for
large inputs or external services. Handlers that emit many outputs must also
respect readable-side backpressure themselves.

### Errors and cancellation (next release)

Both modes report the first handler failure immediately, retaining the original
`Error`. Non-Error thrown values are wrapped in an `Error`. Parallel failures
are no longer delayed until all tasks finish or collected as a `CaughtErrors`
string. Already-running handlers cannot be automatically cancelled: they should
manage their own resources and cancellation, and avoid pushing after destruction.
A handler that never settles still prevents successful completion if no error
occurs. Async work must be returned or awaited by the handler.

## Development

```sh
npm ci
npm test
npm pack --dry-run
```

Tests use Node's built-in runner and the compiled CommonJS entry point.

## License

Apache-2.0.
