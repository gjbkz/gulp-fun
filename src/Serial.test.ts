import test from 'ava';
import * as path from 'path';
import * as fs from 'fs';
import * as vfs from 'vinyl-fs';
import {serial} from './Serial';
import {File} from './types';
import {Logger} from './Logger';

const files = fs.readdirSync(__dirname).map((name) => path.join(__dirname, name));

test('load files', async (t) => {
    const called: Array<string> = [];
    const output = await new Promise<Array<File>>((resolve, reject) => {
        const logger = new Logger<File>();
        vfs.src(path.join(__dirname, '*'), {
            buffer: false,
            read: false,
        })
        .pipe(serial(async (file, stream) => {
            called.push(file.path);
            const duration = 20 * (files.length - files.indexOf(file.path));
            await new Promise((resolve) => setTimeout(resolve, duration));
            stream.push(file);
        }))
        .pipe(logger)
        .once('finish', () => resolve(logger.output()))
        .once('error', reject);
    });
    t.deepEqual(
        output.map((file) => file.path),
        called,
    );
});
