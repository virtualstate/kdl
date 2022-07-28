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
    QueryToken
} from "./tokenizer";
import {children, name, ok, properties, tag, values} from "@virtualstate/focus";
import {split, Split} from "@virtualstate/promise";
import {isOperation, operator} from "./accessor";
import {isIteratorYieldResult} from "./is";

export function prepare(node: unknown, input: string) {
    const root = children(node);
    const tokens: QueryToken[] = [...query(input)];
    const queries = splitAt(tokens, token => token.type === "Or");
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
            console.log("concat")
            result = result.concat(part(query))
        } else {
            result = part(query);
        }
    }

    return split({
        async *[Symbol.asyncIterator]() {
            ok(result);
            let last;
            for await (const snapshot of result.filter(node => typeof node !== "undefined")) {
                if (last?.length === snapshot.length) {
                    const same = last.every((value, index) => snapshot[index] === value);
                    if (same) continue;
                }
                yield snapshot;
                last = snapshot;
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

    function part(query: QueryToken[], result = root): Split<unknown> {
        if (!query.length) return result;
        const spaceIndex = query.findIndex(token => token.type === "WhiteSpace");
        if (spaceIndex === 0) {
            return part(query.slice(1), children(result));
        }
        const isSpace = spaceIndex > -1;
        const tokens = isSpace ? query.slice(0, spaceIndex) : query;
        const rest = isSpace ? query.slice(spaceIndex + 1) : [];

        const [token] = tokens;

        if (token?.type === "Top") {
            ok(tokens.length === 1, "Please ensure there is a space after top()")
            return part(rest, root.mask(mask(result)));
        }

        const match = result.filter(node => isMatch(node, tokens));
        const unmatch = result.filter(node => !isMatch(node, tokens));
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
        const maybe = values(node);
        if (!Array.isArray(maybe)) return undefined;
        return maybe[token.index ?? 0];
    }
    if (isGetValuesToken(token)) {
        return values(node);
    }
    if (isGetTagToken(token)) {
        return tag(node);
    }

    console.log({ token });
    throw new Error(`Unhandled accessor ${token}`);

    // return undefined
}

function getFromAccessor(node: unknown, token: AccessorToken): unknown {
    const { left, right, operator: op } = token;

    if (left && right && op) {
        ok(isOperation(op));
        // console.log({
        //     left, right,
        //     node, props: properties(node),
        //     result:  operator(
        //         accessToken(left),
        //         accessToken(right),
        //         op
        //     )
        // })
        return operator(
            access(node, left),
            access(node, right),
            op
        );
    }

    if (left) {
        return access(node, left);
    }

    return false;
}

function splitAt<T extends { type: string }>(array: T[], fn: (value: T) => boolean): T[][] {
    const result: T[][] = [];
    let working: T[] = [];
    for (const value of array) {
        if (fn(value)) {
            if (working.length) {
                if (working.at(-1).type === "WhiteSpace") {
                    working.splice(-1, 1);
                }
                result.push(working);
                working = [];
            }
            continue;
        }
        if (!working.length && value.type === "WhiteSpace") {
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