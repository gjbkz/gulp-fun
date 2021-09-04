# gulp-fun

[![Test](https://github.com/kei-ito/gulp-fun/actions/workflows/test.yml/badge.svg)](https://github.com/kei-ito/gulp-fun/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/kei-ito/gulp-fun/branch/master/graph/badge.svg)](https://codecov.io/gh/kei-ito/gulp-fun)

A helper for developers who like [gulp](https://www.npmjs.com/package/gulp) but want/need to write transformations without plugins.

## Install

```
npm install gulp-fun --save-dev
```

## Usage

```javascript
const gulp = require('gulp');
const {serial} = require('gulp-fun');
const {rollup} = require('rollup');
const UglifyJS = require('uglify-js');

gulp.src('src/*.js')
.pipe(serial(async (file, stream) => {
  // async middleware
  const bundle = await rollup({input: file.path});
  ({code: file.content} = await bundle.generate({format: 'es'}));
  stream.push(file);
}))
.pipe(serial((file, stream) => {
  // sync middleware
  file.content = UglifyJS.minify(file.content);
  stream.push(file);
}))
.pipe(gulp.dest('dest'));
```

## Javascript API

```typescript
import {Transform} from 'stream';
import type {BufferFile, DirectoryFile, NullFile, StreamFile, SymbolicFile} from 'vinyl';
export type File = BufferFile | DirectoryFile | NullFile | StreamFile | SymbolicFile;
export interface Handler<Type> {
    (data: Type, stream: Transform): Promise<void> | void,
}
export const parallel: <Type = File>(handler: Handler<Type>) => Transform;
export const serial: <Type = File>(handler: Handler<Type>) => Transform;
```

## serial or parallel

```typescript
import {PassThrough} from 'stream';
import type {Handler} from 'gulp-fun';
const wait = async (t: number) => await new Promise((resolve) => setTimeout(resolve, t));
const handler: Handler<string> = async (data, stream) => {
  stream.push(`${data}-1`);
  await wait(100);
  stream.push(`${data}-2`);
};
const source = new PassThrough();
setImmediate(() => {
  source.write('foo');
  source.write('bar');
});
source.pipe(serial(handler)).on('data', console.log);
// foo-1 → foo-2 → bar-1 → bar-2
source.pipe(parallel(handler)).on('data', console.log);
// foo-1 → bar-1 → foo-2 → bar-2
```

In serial mode, transform function is called serially.
If the function is an async function,
the next call is after the previous call is resolved.

In parallel mode, transform function is called when new data is available.
Even if the function is an async function,
the next call doesn't wait the previous call is resolved.

## LICENSE

The gulp-fun project is licensed under the terms of the Apache 2.0 License.
