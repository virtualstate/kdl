import { query, Query } from "./tokenizer";
import {children, name} from "@virtualstate/focus";
import {Split} from "@virtualstate/promise";

export function prepare(node: unknown, input: string) {

    const root = children(node);

    const tokens = [...query(input)];
    const queries = splitAt(tokens, token => token.type === "Or");

    console.log(queries)

    return queries.map(query => part(query, root));

    function part(query: typeof tokens, node = root): Split<unknown> {
        const [next, ...rest] = query;
        if (next.type === "Selector") {
            const { selector } = next;
            return part(rest, node.filter(node => name(node) === selector));
        }
        if (next.type === "Accessor") {
            const { accessor, left, right, operator } = next;

            if (left && right && operator) {
                return part(rest, node.filter(
                    node => {

                    }
                ))
            } else if (accessor) {

            }
        }

        console.log({ next });




    }

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

