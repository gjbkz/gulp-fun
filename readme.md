# gulp-fun

A helper for developers who like [gulp](https://www.npmjs.com/package/gulp) but want/need to write transformations without plugins.

## Install

```
npm install gulp-fun --save-dev
```

## Usage

```javascript
const gulp = require('gulp');
const {sequential} = require('gulp-fun');
const {rollup} = require('rollup');
const UglifyJS = require('uglify-js');

gulp.src('src/*.js')
.pipe(sequential(async (file, stream) => {
  // async middleware
  const bundle = await rollup({input: file.path});
  ({code: file.content} = await bundle.generate({format: 'es'}));
  stream.push(file);
}))
.pipe(sequential((file, stream) => {
  // sync middleware
  file.content = UglifyJS.minify(file.content);
  stream.push(file);
}))
.pipe(gulp.dest('dest'));
```

## Javascript API

`require('gulp-fun')` returns `{sequential, parallel}`.

#### sequential(fn), parallel(fn)

Return a transform stream.

- **fn**<br>
  type: [`Function`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Function)<br>
  The function transforms incoming data.

## sequential or parallel

```javascript
const {PassThrough} = require('stream');
const source = new PassThrough();
setImmediate(() => {
  source.write('foo');
  source.write('bar');
});
source
.pipe(sequential(async (file, stream) => {
// .pipe(parallel(async (file, stream) => {
  stream.push(`${file}-1`);
  await new Promise(setImmediate);
  stream.push(`${file}-2`);
})
.on('data', console.log);
// sequential mode (parallel: false)
// foo-1 → foo-2 → bar-1 → bar-2
// parallel mode (parallel: true)
// foo-1 → bar-1 → foo-2 → bar-2
```

In sequential mode, transform function is called sequentially.
If the function is an async function,
the next call is after the previous call is resolved.

In parallel mode, transform function is called when new data is available.
Even if the function is an async function,
the next call doesn't wait the previous call is resolved.

## License

MIT
