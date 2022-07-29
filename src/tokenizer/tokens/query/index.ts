import Chevrotain from "chevrotain";
import type {TokenType} from "chevrotain";

const  { createToken } = Chevrotain;

export const QueryParseTokens: TokenType[] = [];

export const WhiteSpace = createToken({
    name: "WhiteSpace",
    pattern: /[\s\n]+/
});
QueryParseTokens.push(WhiteSpace);
export const Raw = createToken({
    name: "Raw",
    pattern: /r#".*"#/,
    line_breaks: true
});
QueryParseTokens.push(Raw);
export const String = createToken({
    name: "String",
    pattern: /"[^"]*"/,
    line_breaks: true
});
QueryParseTokens.push(String);
export const Number = createToken({
    name: "Number",
    pattern: /[+-]?\d+(?:\.\d+)?/
});
QueryParseTokens.push(Number);
export const Boolean = createToken({
    name: "Boolean",
    pattern: /true|false/
});
QueryParseTokens.push(Boolean);

export const Accessor = createToken({
    name: "Accessor",
    pattern: /\[[^\]]*]/
});
QueryParseTokens.push(Accessor);
export const Top = createToken({
    name: "Top",
    pattern: /top\(\)/
});
QueryParseTokens.push(Top);

export const Selector = createToken({
    name: "Selector",
    pattern: /[a-z]+[^(\[\s]*/i
});
QueryParseTokens.push(Selector);

export const Tag = createToken({
    name: "Tag",
    pattern: /\([^)]*\)?/i
});
QueryParseTokens.push(Tag);

export const Or = createToken({
    name: "Or",
    pattern: /\|\|/
});
QueryParseTokens.push(Or);
export const ImmediatelyFollows = createToken({
    name: "ImmediatelyFollows",
    pattern: /\+/
});
QueryParseTokens.push(ImmediatelyFollows);
export const Follows = createToken({
    name: "Follows",
    pattern: /~/
});
QueryParseTokens.push(Follows);

export const DirectChild = createToken({
    name: "DirectChild",
    pattern: />/
});
QueryParseTokens.push(DirectChild);

