const assert = require('node:assert/strict');
const {test} = require('node:test');
const {Readable, Writable} = require('node:stream');
const {pipeline} = require('node:stream/promises');
const {once} = require('node:events');
const {setTimeout: delay} = require('node:timers/promises');
const {serial, parallel} = require('../lib');

async function collect(source, transform) {
    const output = [];
    await pipeline(Readable.from(source), transform, new Writable({
        objectMode: true,
        write(value, _encoding, callback) {
            output.push(value);
            callback();
        },
    }));
    return output;
}

test('serial awaits handlers and preserves input order', async () => {
    let active = 0;
    let peak = 0;
    const output = await collect([1, 2, 3], serial(async (value, stream) => {
        peak = Math.max(peak, ++active);
        await delay(1);
        stream.push(value);
        active -= 1;
    }));
    assert.deepEqual(output, [1, 2, 3]);
    assert.equal(peak, 1);
});

test('parallel emits in completion order and waits for all handlers', async () => {
    const releases = [];
    const stream = parallel(async (value, target) => {
        await new Promise(resolve => { releases[value] = resolve; });
        target.push(value);
    });
    const completion = collect([0, 1, 2], stream);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(releases.length, 3);
    releases[2]();
    await new Promise(resolve => setImmediate(resolve));
    releases[1]();
    await new Promise(resolve => setImmediate(resolve));
    releases[0]();
    assert.deepEqual(await completion, [2, 1, 0]);
});

for (const concurrency of [1, 4]) {
    test('parallel limits active handlers to ' + concurrency, async () => {
        let active = 0;
        let peak = 0;
        const output = await collect(Array.from({length: 100}, (_, i) => i),
            parallel(async (value, stream) => {
                peak = Math.max(peak, ++active);
                await delay(1);
                stream.push(value);
                active -= 1;
            }, {concurrency}));
        assert.equal(peak, concurrency);
        assert.equal(output.length, 100);
        assert.deepEqual(output.slice().sort((a, b) => a - b), Array.from({length: 100}, (_, i) => i));
    });
}

for (const [name, create] of [['serial', serial], ['parallel', parallel]]) {
    test(name + ' supports empty input and zero/multiple outputs', async () => {
        assert.deepEqual(await collect([], create(() => {})), []);
        assert.deepEqual(await collect([1, 2], create((value, stream) => {
            if (value === 2) {
                stream.push(value);
                stream.push(value * 10);
            }
        })), [2, 20]);
    });
    for (const asynchronous of [false, true]) {
        test(name + ' preserves ' + (asynchronous ? 'async' : 'sync') + ' errors', async () => {
            const error = new Error('sentinel');
            const handler = asynchronous ? async () => { throw error; } : () => { throw error; };
            await assert.rejects(collect([1], create(handler)), actual => actual === error);
        });
    }
    test(name + ' reports non-Error rejections', async () => {
        await assert.rejects(collect([1], create(async () => { throw undefined; })), /undefined/);
    });
}

test('parallel reports an error even when another handler never finishes', {timeout: 1000}, async () => {
    const error = new Error('first failure');
    await assert.rejects(collect([0, 1], parallel(async value => {
        if (value === 0) {
            throw error;
        }
        await new Promise(() => {});
    })), actual => actual === error);
});

test('serial stops processing after the first error', async () => {
    const called = [];
    await assert.rejects(collect([1, 2, 3], serial(value => {
        called.push(value);
        if (value === 2) {
            throw new Error('stop');
        }
    })), /stop/);
    assert.deepEqual(called, [1, 2]);
});

test('parallel does not start queued handlers after destruction', async () => {
    let called = 0;
    let release;
    const stream = parallel(async () => {
        called += 1;
        await new Promise(resolve => { release = resolve; });
    }, {concurrency: 1});
    stream.write(1);
    stream.write(2);
    await new Promise(resolve => setImmediate(resolve));
    const closed = once(stream, 'close');
    stream.destroy();
    await closed;
    release();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(called, 1);
});

test('parallel validates concurrency', () => {
    for (const concurrency of [0, -1, 1.5, NaN, -Infinity, Number.MAX_SAFE_INTEGER + 1]) {
        assert.throws(() => parallel(() => {}, {concurrency}), RangeError);
    }
    parallel(() => {}, {concurrency: Infinity}).destroy();
});

test('bounded parallel reports failures and stops queued inputs', async () => {
    const called = [];
    const error = new Error('bounded failure');
    await assert.rejects(collect([1, 2, 3], parallel(async value => {
        called.push(value);
        throw error;
    }, {concurrency: 1})), actual => actual === error);
    assert.deepEqual(called, [1]);
});

test('parallel processes many synchronous inputs without losing output', async () => {
    const output = await collect(Array.from({length: 10000}, (_, i) => i),
        parallel((value, stream) => stream.push(value), {concurrency: 16}));
    assert.equal(output.length, 10000);
    assert.equal(new Set(output).size, 10000);
});
