/* c8 ignore start */

import { isLike } from "@virtualstate/focus";

export function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
  return !!(
    isLike<AsyncIterable<unknown>>(value) &&
    typeof value[Symbol.asyncIterator] === "function"
  );
}

export function isIterable<T>(value: unknown): value is Iterable<T> {
  return !!(
    isLike<Iterable<unknown>>(value) &&
    typeof value[Symbol.iterator] === "function"
  );
}

export function isIteratorYieldResult<T>(
  value: unknown
): value is IteratorYieldResult<T> {
  return !!(
    isLike<Partial<IteratorResult<T>>>(value) &&
    typeof value.done === "boolean" &&
    !value.done
  );
}

export function isIteratorResult<T>(
  value: unknown
): value is IteratorYieldResult<T> {
  return !!(
    isLike<Partial<IteratorResult<T>>>(value) && typeof value.done === "boolean"
  );
}

export function isRejected(
  value: PromiseSettledResult<unknown>
): value is PromiseRejectedResult;
export function isRejected<R extends PromiseRejectedResult>(
  value: PromiseSettledResult<unknown>
): value is R;
export function isRejected<R extends PromiseRejectedResult>(
  value: PromiseSettledResult<unknown>
): value is R {
  return value?.status === "rejected";
}

export function isFulfilled<T>(
  value: PromiseSettledResult<T>
): value is PromiseFulfilledResult<T> {
  return value?.status === "fulfilled";
}

export function isPromise<T>(value: unknown): value is Promise<T> {
  return isLike<Promise<unknown>>(value) && typeof value.then === "function";
}

export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value);
}

export function isDefined<T = unknown>(value?: T): value is T {
  return typeof value !== "undefined";
}
