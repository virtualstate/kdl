import Chevrotain from "chevrotain";
import type {TokenType} from "chevrotain";

const  { createToken } = Chevrotain;

export const QueryAccessorParseTokens: TokenType[] = [];

export const WhiteSpace = createToken({
    name: "WhiteSpace",
    pattern: /[\s\n]+/,
    group: Chevrotain.Lexer.SKIPPED
});
QueryAccessorParseTokens.push(WhiteSpace);
export const Raw = createToken({
    name: "Raw",
    pattern: /r#".*"/,
    line_breaks: true
});
QueryAccessorParseTokens.push(Raw);
export const String = createToken({
    name: "String",
    pattern: /"[^"]*"/,
    line_breaks: true
});
QueryAccessorParseTokens.push(String);
export const Number = createToken({
    name: "Number",
    pattern: /[+-]?\d+(?:\.\d+)?/
});
QueryAccessorParseTokens.push(Number);
export const Boolean = createToken({
    name: "Boolean",
    pattern: /true|false/
});
QueryAccessorParseTokens.push(Boolean);

export const Value = createToken({
    name: "Value",
    pattern: /val\((\d+)?\)/
});
QueryAccessorParseTokens.push(Value);
export const Tag = createToken({
    name: "Tag",
    pattern: /tag\(\)/
});
QueryAccessorParseTokens.push(Tag);
export const Name = createToken({
    name: "Name",
    pattern: /name\(\)/
});
QueryAccessorParseTokens.push(Name);
export const Property = createToken({
    name: "Property",
    pattern: /prop(?:\(([^)]+)?\))?/
});
QueryAccessorParseTokens.push(Property);
export const Values = createToken({
    name: "Values",
    pattern: /values\(\)/
});
QueryAccessorParseTokens.push(Values);

export const Selector = createToken({
    name: "Selector",
    pattern: /[^\s=!><^$*]+/
});
QueryAccessorParseTokens.push(Selector);

export const Equals = createToken({
    name: "Equals",
    pattern: /=/
})
QueryAccessorParseTokens.push(Equals);
export const NotEquals = createToken({
    name: "NotEquals",
    pattern: /!=/
});
QueryAccessorParseTokens.push(NotEquals);

export const GreaterThanOrEqual = createToken({
    name: "GreaterThanOrEqual",
    pattern: />=/
});
QueryAccessorParseTokens.push(GreaterThanOrEqual);
export const LessThanOrEqual = createToken({
    name: "LessThanOrEqual",
    pattern: /<=/
});
QueryAccessorParseTokens.push(LessThanOrEqual);
export const GreaterThan = createToken({
    name: "GreaterThan",
    pattern: />/
});
QueryAccessorParseTokens.push(GreaterThan);
export const LessThan = createToken({
    name: "LessThan",
    pattern: /</
});
QueryAccessorParseTokens.push(LessThan);

export const StringStartsWith = createToken({
    name: "StringStartsWith",
    pattern: /\^=/
});
QueryAccessorParseTokens.push(StringStartsWith);
export const StringEndsWith = createToken({
    name: "StringEndsWith",
    pattern: /\$=/
});
QueryAccessorParseTokens.push(StringEndsWith);
export const StringContains = createToken({
    name: "StringContains",
    pattern: /\*=/
});
QueryAccessorParseTokens.push(StringContains);

// export const PropertyName = createToken({
//     name: "PropertyName",
//     pattern: /.+/
// });
// QueryAccessorParseTokens.push(PropertyName);