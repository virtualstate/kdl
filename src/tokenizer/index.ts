import Chevrotain from "chevrotain";
import {QueryParseTokens, Query, QueryAccessorParseTokens, QueryAccessor} from "./tokens";
import {isLike} from "@virtualstate/focus";

export { Query, QueryAccessor };

export interface SelectorToken {
    type: "Selector";
    text: string;
    image: string;
}

export interface WhiteSpaceToken {
    type: "WhiteSpace";
    text: string;
    image: string;
}

export interface AccessorToken {
    type: "Accessor";
    text: string;
    accessor: string;
    left?: QueryToken;
    right?: QueryToken;
    operator?: string;
    image: string;
}

export interface BooleanToken {
    type: "Boolean";
    boolean: boolean;
    image: string;
}

export interface StringToken {
    type: "String";
    text: string;
    image: string;
}

export interface NumberToken {
    type: "Number";
    number: number;
    image: string;
}

export interface GetTagToken {
    type: "GetTag";
    image: string;
}

export interface GetNameToken {
    type: "GetName";
    image: string;
}

export interface GetPropertyToken {
    type: "GetProperty";
    text: string;
    image: string;
}

export interface GetValueToken {
    type: "GetValue";
    index?: number;
    image: string;
}

export interface GetValuesToken {
    type: "GetValues";
    image: string;
}

export type QueryValueToken = (
    | BooleanToken
    | NumberToken
    | StringToken
);

export interface TagToken {
    type: "Tag";
    text: string;
    tag: string;
    image: string;
}

export interface DirectChildToken {
    type: "DirectChild";
    image: string;
}

export interface TopToken {
    type: "Top";
    image: string;
}

export interface FollowsToken {
    type: "Follows";
    image: string;
}

export interface ImmediatelyFollowsToken {
    type: "ImmediatelyFollows";
    image: string;
}

export interface OrToken {
    type: "Or";
    image: string;
}

export interface GenericToken extends Record<string, unknown> {
    type: string
    text: string;
    image: string;
}

export type QueryToken = (
    | SelectorToken
    | AccessorToken
    | QueryValueToken
    | TagToken
    | GetTagToken
    | GetNameToken
    | GetValuesToken
    | GetValueToken
    | GetPropertyToken
    | DirectChildToken
    | TopToken
    | FollowsToken
    | ImmediatelyFollowsToken
    | OrToken
    | WhiteSpaceToken
    | GenericToken
)

export function isSelectorToken(token: QueryToken): token is SelectorToken {
    return token.type === "Selector";
}

export function isAccessorToken(token: QueryToken): token is AccessorToken {
    return token.type === "Accessor";
}

export function isStringToken(token: QueryToken): token is StringToken {
    return token.type === "String";
}

export function isNumberToken(token: QueryToken): token is NumberToken {
    return token.type === "Number";
}

export function isBooleanToken(token: QueryToken): token is BooleanToken {
    return token.type === "Boolean";
}

export function isQueryValueToken(token: QueryToken): token is QueryValueToken {
    return (
        isStringToken(token) ||
        isNumberToken(token) ||
        isBooleanToken(token)
    );
}

export function isTagToken(token: QueryToken): token is TagToken {
    return token.type === "Tag";
}

export function isGetTagToken(token: QueryToken): token is GetTagToken {
    return token.type === "GetTag";
}

export function isGetNameToken(token: QueryToken): token is GetNameToken {
    return token.type === "GetName";
}

export function isGetPropertyToken(token: QueryToken): token is GetPropertyToken {
    return token.type === "GetProperty";
}

export function isGetValueToken(token: QueryToken): token is GetValueToken {
    return token.type === "GetValue";
}

export function isGetValuesToken(token: QueryToken): token is GetValuesToken {
    return token.type === "GetValues";
}

export function isTopToken(token: QueryToken): token is TopToken {
    return token.type === "Top";
}

export function isDirectChildToken(token: QueryToken): token is DirectChildToken {
    return token.type === "DirectChild";
}

export function isFollowsToken(token: QueryToken): token is FollowsToken {
    return token.type === "Follows";
}

export function isImmediatelyFollowsToken(token: QueryToken): token is ImmediatelyFollowsToken {
    return token.type === "ImmediatelyFollows";
}

export function isOrToken(token: QueryToken): token is OrToken {
    return token.type === "Or";
}

export function isQueryToken(value: unknown): value is QueryToken {
    return isLike<{ type: unknown }>(value) && typeof value.type === "string";
}

export function isWhiteSpaceToken(token: unknown): token is WhiteSpaceToken {
    return isQueryToken(token) && token.type === "WhiteSpace";
}

export function *query(value: string): Iterable<QueryToken> {

    const lexer = new Chevrotain.Lexer(QueryParseTokens);
    const accessorLexer = new Chevrotain.Lexer(QueryAccessorParseTokens);

    const { tokens, errors } = lexer.tokenize(value.trim());

    if (errors.length) {
        throw new Error(errors[0].message);
    }

    for (const token of tokens) {

        if (token.tokenType === Query.Selector) {
            const result: SelectorToken = {
                type: "Selector",
                text: token.image,
                image: token.image
            };
            yield result;
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

            // console.log({ left, operator, right, rest, accessor });

            if (rest.length) {
                throw new Error(`Expected accessor with left, right, and operator`);
            }

            const result: AccessorToken = {
                type: "Accessor",
                text: token.image,
                accessor,
                left: getValue(left),
                operator: operator?.image,
                right: getValue(right),
                image: token.image
            };

            yield result;
        } else {
            const result = getValue(token);
            if (result) {
                yield result;
            }
        }

    }

    function getValue(token?: Chevrotain.IToken): QueryToken | undefined {
        if (!token) return undefined;
        if (token.tokenType === Query.String || token.tokenType === QueryAccessor.String) {
            return {
                type: "String",
                text:  token.image.slice(1, -1),
                image: token.image
            };
        }
        if (token.tokenType === Query.Raw || token.tokenType === QueryAccessor.Raw) {
            return {
                type: "String",
                text: token.image.slice(3, -2),
                image: token.image
            };
        }
        if (token.tokenType === Query.Number || token.tokenType === QueryAccessor.Number) {
            return {
                type: "Number",
                number: +token.image,
                image: token.image
            };
        }
        if (token.tokenType === Query.Boolean || token.tokenType === QueryAccessor.Boolean) {
            return {
                type: "Boolean",
                boolean: token.image === "true",
                image: token.image
            };
        }
        if (token.tokenType === QueryAccessor.GetTag) {
            return {
                type: "GetTag",
                image: token.image
            };
        }
        if (token.tokenType === QueryAccessor.GetName) {
            return {
                type: "GetName",
                image: token.image
            };
        }
        if (token.tokenType === QueryAccessor.GetProperty) {
            const [, text] = token.image.slice(0, -1).split("(");
            return {
                type: "GetProperty",
                text,
                image: token.image
            };
        }
        if (token.tokenType === QueryAccessor.GetValue) {
            const [, index] = token.image.slice(0, -1).split("(");
            return {
                type: "GetValue",
                index: (
                    typeof index === "string" && /^\d+$/.test(index) ?
                        +index : undefined
                ),
                image: token.image
            };
        }
        if (token.tokenType === QueryAccessor.GetValues) {
            return {
                type: "GetValues",
                image: token.image
            };
        }
        if (token.tokenType === Query.Tag) {
            return {
                type: "Tag",
                text: token.image,
                tag: token.image.slice(1, -1),
                image: token.image
            };
        }
        return {
            type: token.tokenType.name,
            text: token.image,
            image: token.image
        };
    }


}