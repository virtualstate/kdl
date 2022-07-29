import {prepare} from "./prepare";

export function runKDLQuery(query: string, input?: unknown) {
    const Query = rawKDLQuery(query);
    return {
        name: Symbol.for(":kdl/fragment"),
        children: {
            [Symbol.asyncIterator]() {
                return Query({}, input)[Symbol.asyncIterator]()
            }
        }
    }
}

export function rawKDLQuery(input: string | TemplateStringsArray, ...args: unknown[]) {
    let query: string;
    if (typeof input === "string") {
        query = input;
    } else {
        query = input.reduce((string, value, index) => {
            return `${string}${value}${args[index] ?? ""}`
        }, "");
    }
    return function (options: Record<string | symbol, unknown>, input?: unknown): AsyncIterable<unknown[]> {
        return prepare(input, query);
    }
}