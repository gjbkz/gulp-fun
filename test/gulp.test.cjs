const assert = require('node:assert/strict');
const {test} = require('node:test');
const {mkdtemp, mkdir, writeFile, readFile, rm} = require('node:fs/promises');
const {tmpdir} = require('node:os');
const path = require('node:path');
const {pipeline} = require('node:stream/promises');
const gulp = require('gulp');
const {serial, parallel} = require('../lib');

for (const [name, create] of [['serial', serial], ['parallel', parallel]]) {
    test('Gulp 5 src → ' + name + ' → dest writes transformed Vinyl contents', async t => {
        const root = await mkdtemp(path.join(tmpdir(), 'gulp-fun-'));
        t.after(() => rm(root, {recursive: true, force: true}));
        const source = path.join(root, 'src');
        const destination = path.join(root, 'dest');
        await mkdir(source);
        await writeFile(path.join(source, 'a.txt'), 'hello');
        await writeFile(path.join(source, 'b.txt'), 'world');
        await pipeline(
            gulp.src('*.txt', {cwd: source}),
            create(async (file, stream) => {
                assert.equal(file.isBuffer(), true);
                file.contents = Buffer.from(file.contents.toString('utf8').toUpperCase());
                stream.push(file);
            }, {concurrency: 2}),
            gulp.dest(destination),
        );
        assert.equal(await readFile(path.join(destination, 'a.txt'), 'utf8'), 'HELLO');
        assert.equal(await readFile(path.join(destination, 'b.txt'), 'utf8'), 'WORLD');
    });
}
