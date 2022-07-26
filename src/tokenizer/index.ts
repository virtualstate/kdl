import Chevrotain from "chevrotain";
import {QueryParseTokens, Query, QueryAccessorParseTokens, QueryAccessor} from "./tokens";

export { Query, QueryAccessor };

export type Parsed = (
    | {
        type: "Selector",
        selector: string
        }
    | {
        type: "Accessor",
        text: string;
        accessor: string;
        left?: Parsed;
        right?: string;
        operator?: Parsed;
}
    | {
    type: "Boolean",
    boolean: boolean
}| {
    type: "Number",
    boolean: number
}| {
    type: "String",
    text: string
}| {
    type: "Tag",
    text: string,
    tag: string
}
| { type: string } & Record<string, unknown>
    )

export function *query(value: string): Iterable<Parsed> {

    const lexer = new Chevrotain.Lexer(QueryParseTokens);
    const accessorLexer = new Chevrotain.Lexer(QueryAccessorParseTokens);

    const { tokens, errors } = lexer.tokenize(value.trim());

    if (errors.length) {
        throw new Error(errors[0].message);
    }

    for (const token of tokens) {

        if (token.tokenType === Query.Selector) {
            yield {
                type: "Selector",
                selector: token.image
            } as const;
        } else if (token.tokenType === Query.Accessor) {
            const accessor = token.image.slice(1, -1);

            const {
                tokens: [
                    left,
                    operator,
                    right,
                    ...rest
                ]
            } = accessorLexer.tokenize(accessor);

            if (rest.length) {
                throw new Error(`Expected accessor with left, right, and operator`);
            }

            yield {
                type: "Accessor",
                text: token.image,
                accessor,
                left: getValue(left),
                operator: getValue(operator),
                right: getValue(right)
            } as const;
        } else {
            yield  getValue(token)!;
        }

    }

    function getValue(token?: Chevrotain.IToken) {
        if (!token) return undefined;
        if (token.tokenType === Query.String || token.tokenType === QueryAccessor.String) {
            return {
                type: "String",
                text:  token.image.slice(1, -1)
            } as const;
        }
        if (token.tokenType === Query.Raw || token.tokenType === QueryAccessor.Raw) {
            return {
                type: "String",
                text: token.image.slice(3, -1)
            } as const;
        }
        if (token.tokenType === Query.Number || token.tokenType === QueryAccessor.Number) {
            return {
                type: "Number",
                number: +token.image
            } as const;
        }
        if (token.tokenType === Query.Boolean || token.tokenType === QueryAccessor.Boolean) {
            return {
                type: "Boolean",
                boolean: token.image === "true"
            } as const;
        }
        if (token.tokenType === Query.Tag) {
            return {
                type: "Tag",
                text: token.image,
                tag: token.image.slice(1, -1)
            } as const;
        }
        return {
            type: token.tokenType.name,
            text: token.image
        } as const;
    }


}