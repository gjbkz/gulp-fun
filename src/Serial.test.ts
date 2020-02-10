import test from 'ava';
import * as path from 'path';
import * as vfs from 'vinyl-fs';
import {serial} from './Serial';
import {File} from './types';
import {Logger} from './Logger';

test('Load files', async (t) => {
    const called: Array<string> = [];
    const output = await new Promise<Array<File>>((resolve, reject) => {
        const logger = new Logger<File>(resolve);
        vfs.src(path.join(__dirname, '*'), {buffer: false, read: false})
        .pipe(serial((file, stream) => {
            t.log(`Start: ${file.path}`);
            called.push(file.path);
            stream.push(file);
            t.log(`Done: ${file.path}`);
        }))
        .pipe(logger)
        .once('error', reject);
    });
    t.deepEqual(output.map((file) => file.path), called);
});

test('stop at an errored item', async (t) => {
    const called: Array<string> = [];
    const output = await new Promise<Array<File>>((resolve, reject) => {
        vfs.src(
            path.join(__dirname, '*'),
            {buffer: false, read: false},
        )
        .pipe(serial((file, stream) => {
            called.push(file.path);
            if (called.length < 3) {
                stream.push(file);
            } else {
                throw new Error('Foo');
            }
        }))
        .once('end', () => reject(new Error('UnexpectedResolution')))
        .once('error', resolve);
    });
    t.is(called.length, 3);
    t.true(`${output}`.endsWith('Foo'));
});
