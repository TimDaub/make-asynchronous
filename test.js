import test from 'ava';
import timeSpan from 'time-span';
import inRange from 'in-range';
import makeAsynchronous, {makeAsynchronousIterable} from './index.js';

const abortError = new Error('Aborted');

test('main', async t => {
	const fixture = {x: '🦄'};
	const end = timeSpan();

	const result = await makeAsynchronous(fixture => {
		let x = '1';

		while (true) { // eslint-disable-line no-constant-condition
			x += Math.random() < 0.5 ? Date.now().toString() : '0';

			if (x >= 9_999_999_999_999) {
				break;
			}
		}

		return fixture;
	})(fixture);

	t.true(inRange(end(), {start: 10, end: 1000}), `${end()}`);
	t.deepEqual(result, fixture);
});

test('with pre-aborted AbortSignal', async t => {
	const controller = new AbortController();

	controller.abort(abortError);

	await t.throwsAsync(makeAsynchronous(() => {
		while (true) {} // eslint-disable-line no-constant-condition, no-empty
	}).withSignal(controller.signal), {
		message: abortError.message,
	});
});

test('with interrupting abortion of AbortSignal', async t => {
	const controller = new AbortController();

	const promise = makeAsynchronous(() => {
		while (true) {} // eslint-disable-line no-constant-condition, no-empty
	}).withSignal(controller.signal)();

	controller.abort(abortError);

	await t.throwsAsync(promise, {
		message: abortError.message,
	});
});

test('error', async t => {
	await t.throwsAsync(
		makeAsynchronous(() => {
			throw new TypeError('unicorn');
		})(),
		{
			instanceOf: TypeError,
			message: 'unicorn',
		},
	);
});

test.failing('dynamic import works', async t => {
	await t.notThrowsAsync(
		makeAsynchronous(async () => {
			await import('time-span');
		})(),
	);
});

test('iterator object', async t => {
	const fixture = [1, 2];

	const asyncIterable = makeAsynchronousIterable(fixture => fixture[Symbol.iterator]())(fixture);
	const result = [];

	for await (const value of asyncIterable) {
		result.push(value);
	}

	t.deepEqual(result, fixture);
});

test('iterator object with pre-aborted AbortSignal', async t => {
	const controller = new AbortController();

	controller.abort(abortError);

	const asyncIterable = makeAsynchronousIterable(function * () { // eslint-disable-line require-yield
		while (true) {} // eslint-disable-line no-constant-condition, no-empty
	}).withSignal(controller.signal)();

	await t.throwsAsync(async () => {
		for await (const _ of asyncIterable) {} // eslint-disable-line no-unused-vars, no-empty
	}, {
		message: abortError.message,
	});
});

test('iterator object with interrupting abortion of AbortSignal', async t => {
	const controller = new AbortController();

	const asyncIterable = makeAsynchronousIterable(function * () { // eslint-disable-line require-yield
		while (true) {} // eslint-disable-line no-constant-condition, no-empty
	}).withSignal(controller.signal)();

	controller.abort(abortError);

	await t.throwsAsync(async () => {
		for await (const _ of asyncIterable) {} // eslint-disable-line no-unused-vars, no-empty
	}, {
		message: abortError.message,
	});
});

test('generator function', async t => {
	const fixture = [1, 2];

	const asyncIterable = makeAsynchronousIterable(function * (fixture) {
		for (const value of fixture) {
			yield value;
		}
	})(fixture);

	const result = [];

	for await (const value of asyncIterable) {
		result.push(value);
	}

	t.deepEqual(result, fixture);
});

test('generator function that throws', async t => {
	const fixture = [1, 2];
	const errorMessage = 'Catch me if you can!';

	const asyncIterable = makeAsynchronousIterable(function * (fixture, errorMessage) {
		for (const value of fixture) {
			yield value;
		}

		throw new Error(errorMessage);
	})(fixture, errorMessage);

	const result = [];

	await t.throwsAsync(async () => {
		for await (const value of asyncIterable) {
			result.push(value);
		}
	}, {
		message: errorMessage,
	}, 'error is propagated');

	t.deepEqual(result, fixture);
});
