const path = require('path');
const t = require('tap');
const Logger = require('../-logger');
const vfs = require('vinyl-fs');
const {StartingGate} = require('@nlib/stream-tap');
const {sequential} = require('../..');

t.test('sequential', (t) => {

	t.test('work with StartingGate', (t) => {
		const called = [];
		const logger = new Logger();
		return new Promise((resolve, reject) => {
			const gate = new StartingGate();
			vfs.src('test/src/*.txt')
			.once('error', reject)
			.pipe(gate.put())
			.once('error', reject)
			.pipe(sequential((file, stream) => {
				called.push(file);
				stream.push(file);
				return new Promise((resolve) => setImmediate(() => {
					stream.push(file);
					resolve();
				}));
			}))
			.once('error', reject)
			.pipe(logger)
			.once('error', reject)
			.once('finish', resolve);
		})
		.then(() => {
			t.test('called', (t) => {
				t.deepEqual(
					called.map((file) => path.basename(file.path)),
					[
						'baz.txt',
						'foo.txt',
					]
				);
				t.end();
			});
			t.test('files', (t) => {
				t.deepEqual(
					logger.written.map((file) => path.basename(file.path)),
					[
						'baz.txt',
						'baz.txt',
						'foo.txt',
						'foo.txt',
					]
				);
				t.end();
			});
		});
	});

	t.test('emit an error if a promise is rejected', (t) => {

		t.test('sync', () => new Promise((resolve, reject) => {
			vfs.src('test/src/*.txt')
			.pipe(sequential((file, stream) => {
				stream.push(file);
				throw new Error('Expected');
			}))
			.once('error', () => resolve())
			.once('end', () => reject(new Error('ended unexpectedly')));
		}));

		t.test('async', () => new Promise((resolve, reject) => {
			vfs.src('test/src/*.txt')
			.pipe(sequential((file, stream) => {
				stream.push(file);
				return Promise.reject(new Error('Expected'));
			}))
			.once('error', () => resolve())
			.once('end', () => reject(new Error('ended unexpectedly')));
		}));

		t.end();

	});

	t.end();

});
