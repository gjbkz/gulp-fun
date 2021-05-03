import ava from 'ava';
import * as path from 'path';
import * as fs from 'fs';
import * as vfs from 'vinyl-fs';
import {Logger} from './Logger';
import {parallel} from '../src';
import type {File} from '../src';

const files = fs.readdirSync(__dirname).map((name) => path.join(__dirname, name));
const interval = 50;
const pattern = path.join(__dirname, '*').split(path.sep).join('/');

ava('Load files', async (t) => {
    t.timeout(files.length * interval * 2);
    const called: Array<string> = [];
    const output = await new Promise<Array<File>>((resolve, reject) => {
        const logger = new Logger<File>(resolve);
        vfs.src(pattern, {buffer: false, read: false})
        .pipe(parallel(async (file, stream) => {
            t.log(`Start: ${file.path}`);
            called.push(file.path);
            const duration = interval * (files.length - files.indexOf(file.path));
            await new Promise((res) => {
                setTimeout(res, duration);
            });
            stream.push(file);
            t.log(`Done: ${file.path}`);
        }))
        .pipe(logger)
        .once('error', reject);
    });
    t.deepEqual(output.map((file) => file.path), called.reverse());
});

ava('report errors', async (t) => {
    const called: Array<string> = [];
    const output = await new Promise<Array<File>>((resolve, reject) => {
        vfs.src(pattern, {buffer: false, read: false})
        .pipe(parallel((file) => {
            called.push(file.path);
            throw new Error(file.path);
        }))
        .once('end', () => reject(new Error('UnexpectedResolution')))
        .once('error', resolve);
    });
    t.true(`${output}`.trim().split('\n').slice(1).every((line, index) => line.endsWith(called[index])));
});
