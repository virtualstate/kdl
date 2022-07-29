import {
    AccessorToken,
    isGetValuesToken,
    isAccessorToken,
    isBooleanToken,
    isGetNameToken,
    isGetPropertyToken,
    isGetTagToken,
    isGetValueToken,
    isNumberToken,
    isSelectorToken,
    isStringToken,
    query,
    QueryToken, isTopToken, isWhiteSpaceToken, isOrToken, isDirectChildToken, isImmediatelyFollowsToken, isFollowsToken
} from "./tokenizer";
import {
    children,
    getChildrenFromRawNode,
    isFragment,
    isFragmentResult,
    name,
    ok,
    properties,
    tag,
    values
} from "@virtualstate/focus";
import {split, Split} from "@virtualstate/promise";
import {isOperation, operator} from "./accessor";
import {isDefined, isIteratorYieldResult} from "./is";

export function prepare(node: unknown, queryInput: string) {
    const root = split({
        async *[Symbol.asyncIterator]() {
            if (isFragment(node) && !isFragmentResult(node)) {
                yield * children(node);
            } else {
                yield node;
            }
        }
    })
    ok(root.mask);
    ok(root.filter);
    const tokens: QueryToken[] = [...query(queryInput)];
    const queries = splitAt(tokens, isOrToken);

    // const queries = baseQueries.flatMap(
    //     tokens => splitAt(tokens, token => token.type === "Top")
    // );

    // // Precache string keys to use over again
    // const strings = new Map(
    //     queries.map(
    //         query => ([
    //             query,
    //             getTokensStringBase(query)
    //         ] as const)
    //     )
    // );
    //
    // console.log(strings.values())
    //
    // const map = new Map(
    //     queries.map(query => [
    //         getTokensString(query),
    //         part(query)
    //     ] as const)
    // );

    let result: Split<unknown>;
    for (const query of queries) {
        if (result) {
            result = result.concat(part(query))
        } else {
            result = part(query);
        }
    }

    return split({
        async *[Symbol.asyncIterator]() {
            ok(result);
            let last: unknown[] | undefined = undefined;
            for await (const snapshot of result.filter(isDefined)) {
                if (isSameAsLast(snapshot)) {
                    continue;
                }
                yield snapshot;
                last = snapshot;
            }

            function isSameAsLast(snapshot: unknown[]) {
                if (!last) return false;
                if (last.length !== snapshot.length) return false;
                return last.every((value, index) => snapshot[index] === value);
            }
        }
    });



    // function getTokensString(query: QueryToken[]) {
    //     const existing = strings.get(query);
    //     if (existing) {
    //         return existing;
    //     }
    //     const result = getTokensStringBase(query);
    //     strings.set(query, result);
    //     return result;
    // }
    //
    // function getTokensStringBase(query: QueryToken[]): string {
    //     return query.map(token => token.image).join("");
    // }

    function startsWithSpace(query: QueryToken[]) {
        return isWhiteSpaceToken(query[0]);
    }

    function trimStart(query: QueryToken[]): QueryToken[] {
        if (!startsWithSpace(query)) return query;
        return trimStart(query.slice(1));
    }

    function getNext(query: QueryToken[]) {
        const spaceIndex = query.findIndex(isWhiteSpaceToken);
        const isSpace = spaceIndex > -1;
        const tokens = isSpace ? query.slice(0, spaceIndex) : query;
        const rest = isSpace ? query.slice(spaceIndex + 1) : [];
        return [tokens, rest];
    }

    function part(query: QueryToken[], result = root): Split<unknown> {
        if (!query.length) return result;
        if (startsWithSpace(query)) {
            const rest = query.slice(1);
            const [follows] = rest;
            // Let direct child be handled as a primary token type
            if (follows && isDirectChildToken(follows)) {
                return part(rest, result);
            } else {
                return part(rest, children(result));
            }
        }

        let [tokens, rest] = getNext(query);
        const [token] = tokens;

        ok(token);

        if (isDirectChildToken(token)) {
            ok(tokens.length === 1, "Please ensure there is a space after >");
            let [next, afterNext] = getNext(rest);
            const [follows] = afterNext;
            let nextResult;
            if (follows && (isImmediatelyFollowsToken(follows) || isFollowsToken(follows))) {
                afterNext = rest;
                nextResult = children(result).filter((_, __, nodes) => {
                    const foundIndex = nodes.findIndex(node => isMatch(node, next));
                    return foundIndex > -1;
                })
            } else {
                nextResult = children(result).filter((node) => {
                    console.log(name(node), tokens, query);
                    return isMatch(node, next)
                })
            }
            return part(afterNext, nextResult);
        }

        const [follows] = rest;

        let match: Split<unknown>;
        let unmatch: Split<unknown>;

        if (isTopToken(token)) {
            ok(tokens.length === 1, "Please ensure there is a space after top()")
            const masked = root.mask(mask(result))
            if (!follows) {
                return masked;
            }
            if (isDirectChildToken(follows)) {
                return part(rest, masked)
            }
            return part(rest, children(masked))
        } else if (follows && (isImmediatelyFollowsToken(follows) || isFollowsToken(follows))) {
            const [next, afterNext] = getNext(trimStart(rest.slice(1)));
            const left = tokens;
            const right = next;

            function isFollowsMatch(current: unknown, index: number, array: unknown[]) {
                const before = array.slice(0, index);
                if (!before.length) return false;
                if (!isMatch(current, right)) return false;
                if (isImmediatelyFollowsToken(follows)) {
                    return isMatch(
                        before.at(-1),
                        left
                    );
                }

                const foundIndex = before.findIndex(
                    (node) => isMatch(node, left)
                );
                return foundIndex > -1;
            }

            rest = afterNext;
            match = result.filter(isFollowsMatch);
            unmatch = result.filter((...args) => !isFollowsMatch(...args));
        } else {
            match = result.filter(node => isMatch(node, tokens));

            if (tokens.length === 1 && isAccessorToken(token) && !token.accessor) {
                unmatch = match;
            } else {
                unmatch = result.filter(node => !isMatch(node, tokens));
            }

        }

        ok(match);
        ok(unmatch);

        const unmatchResult = unmatch.flatMap(node => part(query, children(node)));
        if (!rest.length) {
            return match.concat(unmatchResult);
        }
        return part(rest, match).concat(unmatchResult);
    }
}

function isMatch(node: unknown, tokens: QueryToken[]) {
    for (const token of tokens) {
        const result = access(node, token);
        if (Array.isArray(result)) {
            if (!result.length) {
                return false;
            }
        } else {
            if (!result) {
                return false;
            }
        }
    }
    return true;
}

function access(node: unknown, token: QueryToken): unknown {
    if (isAccessorToken(token)) {
        return getFromAccessor(node, token);
    }
    if (isSelectorToken(token)) {
        return name(node) === token.text;
    }
    if (isBooleanToken(token)) {
        return token.boolean;
    }
    if (isStringToken(token)) {
        return token.text;
    }
    if (isNumberToken(token)) {
        return token.number;
    }
    if (isGetPropertyToken(token)) {
        return properties(node)[token.text];
    }
    if (isGetNameToken(token)) {
        return name(token);
    }
    if (isGetValueToken(token)) {
        const maybe = getValues();
        console.log({ maybe, token, node });
        if (!Array.isArray(maybe)) return undefined;
        return maybe[token.index ?? 0];
    }
    if (isGetValuesToken(token)) {
        return getValues();
    }
    if (isGetTagToken(token)) {
        return tag(node);
    }

    console.error({ token });
    throw new Error(`Unhandled accessor ${token}`);

    function getValues() {
        const iterable = values(node);
        const maybe = getChildrenFromRawNode(node);
        if (Array.isArray(iterable) && !iterable.length) {
            if (Array.isArray(maybe) && maybe.length) {
                return maybe;
            }
        }
        return iterable;
    }

    // return undefined
}

function getFromAccessor(node: unknown, token: AccessorToken): unknown {
    const { accessor, left, right, operator: op } = token;

    if (left && right && op) {
        ok(isOperation(op));
        return operator(
            access(node, left),
            access(node, right),
            op
        );
    }

    if (left) {
        return access(node, left);
    }


    return typeof accessor === "string" && accessor.length === 0;
}

function splitAt<T extends { type: string }>(array: T[], fn: (value: T) => boolean): T[][] {
    const result: T[][] = [];
    let working: T[] = [];
    for (const value of array) {
        if (fn(value)) {
            if (working.length) {
                if (isWhiteSpaceToken(working.at(-1))) {
                    working.splice(-1, 1);
                }
                result.push(working);
                working = [];
            }
            continue;
        }
        if (!working.length && isWhiteSpaceToken(value)) {
            continue;
        }
        working.push(value);
    }
    if (working.length) {
        result.push(working);
    }
    return result;
}

function mask(result: Split<unknown>) {
    return {
        async *[Symbol.asyncIterator]() {
            const iterator = result[Symbol.asyncIterator]();
            let iteratorResult = await iterator.next();

            if (!isIteratorYieldResult(iteratorResult)) return;

            let lastIteratorResult = iteratorResult;

            yield isVisible();

            /*
            After our first yield, we're going to just blindly return
            the last result we had found, so if we only ever found
            one version of our original, we can keep on providing the
            mask

            split is designed to grab one mask iteration for each possible
            yielding iteration, meaning the mask can block until it has a result
            which we did on the yield before
             */

            let error: unknown = undefined;

            let promise: Promise<unknown> | undefined = undefined;

            try {
                while (!iteratorResult.done) {
                    next()
                    yield isVisible();
                }
            } finally {
                await iterator.return?.();
            }

            function next() {
                if (error) {
                    throw error;
                }
                if (!promise) {
                    promise = iterator.next()
                        .finally(() => {
                            promise = undefined;
                        })
                        .then(value => {
                            iteratorResult = value;
                            if (isIteratorYieldResult(iteratorResult)) {
                                lastIteratorResult = iteratorResult;
                            }
                        })
                        .catch(reason => {
                            error = reason;
                        })
                }
            }

            function isVisible() {
                return lastIteratorResult.value.length > 0;
            }
        }
    }
}