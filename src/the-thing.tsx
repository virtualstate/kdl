export type TheAsyncThing<T = unknown> =
  & Promise<T>
  & AsyncIterable<T>
  & AsyncIterator<T, unknown, unknown>;

export function anAsyncThing<T>(async: Partial<TheAsyncThing<T>>): TheAsyncThing<T> {
  let iterator: AsyncIterator<T, unknown, unknown>,
      promise: Promise<T>;

  const thing: TheAsyncThing<T> = {
    async then(resolve, reject) {
      return getPromise().then(resolve, reject);
    },
    async catch(reject) {
      return getPromise().catch(reject);
    },
    async finally(fn) {
      return getPromise().finally(fn);
    },
    async *[Symbol.asyncIterator]() {
      if (isAsyncIterable(async)) {
        return yield * async;
      } else if (async.then) {
        yield await new Promise((resolve, reject) => async.then(resolve, reject));
      } else if (async.next) {
        let result;
        let nextValue;
        do {
          result = await async.next();
          if (isYieldedResult(result)) {
            nextValue = yield result.value;
          }
        } while (result.done);
      }
    },
    async next(...args: [] | [unknown]) {
      iterator = iterator ?? thing[Symbol.asyncIterator]();
      return iterator.next(...args);
    },
    async return(...args: [] | [unknown]) {
      if (!iterator) return;
      return iterator.return(...args);
    },
    async throw(...args: [] | [unknown]) {
      if (!iterator) return;
      return iterator.throw(...args);
    },
    get [Symbol.toStringTag]() {
      return "TheAsyncThing"
    }
  }
  return thing;

  function getPromise(): Promise<T> {
    promise = promise || asPromise();
    return promise;
    async function asPromise() {
      let value: T;
      for await (value of thing) {}
      return value;
    }
  }

  function isYieldedResult(value: IteratorResult<T>): value is IteratorYieldResult<T> {
    return !value.done;
  }

  function isAsyncIterable(value: Partial<TheAsyncThing<T>>): value is AsyncIterable<T> {
    return typeof async[Symbol.asyncIterator] === "function"
  }
}