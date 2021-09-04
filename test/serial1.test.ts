import ava from 'ava';
import * as path from 'path';
import * as vfs from 'vinyl-fs';
import {Logger} from './Logger';
import {serial} from '../src';
import type {File} from '../src';

const pattern = path.join(__dirname, '*').split(path.sep).join('/');

ava('load files', async (t) => {
    const called: Array<string> = [];
    const output = await new Promise<Array<File>>((resolve, reject) => {
        const logger = new Logger<File>(resolve);
        vfs.src(pattern, {buffer: false, read: false})
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

ava('stop at an errored item', async (t) => {
    const called: Array<string> = [];
    const output = await new Promise<Array<File>>((resolve, reject) => {
        vfs.src(pattern, {buffer: false, read: false})
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
