import Chevrotain from "chevrotain";
import type { TokenType } from "chevrotain";

const { createToken } = Chevrotain;

export const KDLDocumentParseTokens: TokenType[] = [];

export const WhiteSpace = createToken({
    name: "WhiteSpace",
    pattern: /[\s\n]+/,
});
KDLDocumentParseTokens.push(WhiteSpace);
export const Raw = createToken({
    name: "Raw",
    pattern: /r#".*"#/,
    line_breaks: true,
});
KDLDocumentParseTokens.push(Raw);
export const String = createToken({
    name: "String",
    pattern: /"[^"]*"/,
    line_breaks: true,
});
KDLDocumentParseTokens.push(String);
export const Number = createToken({
    name: "Number",
    pattern: /[+-]?\d+(?:\.\d+)?/,
});
KDLDocumentParseTokens.push(Number);
export const Boolean = createToken({
    name: "Boolean",
    pattern: /true|false/,
});
KDLDocumentParseTokens.push(Boolean);

export const Part = createToken({
    name: "Part",
    pattern: /[a-z]+[^(\[\s]*/i,
});
KDLDocumentParseTokens.push(Part);

export const Open = createToken({
    name: "Open",
    pattern: /{/,
});
KDLDocumentParseTokens.push(Open);
export const Close = createToken({
    name: "Close",
    pattern: /}/,
});
KDLDocumentParseTokens.push(Close);

export const KDXDocumentParseTokens: TokenType[] = [
];
export const Import = createToken({
    name: "Import",
    pattern: /import .+ from ".+"/,
});
KDXDocumentParseTokens.push(Import);
export const Export = createToken({
    name: "Export",
    pattern: /export (?:(?:const|let) (?:[a-zA-Z][^\s]*)\s*=\s*|.+ from ".+")?/,
});
KDXDocumentParseTokens.push(Export);

// Define rest of KDL document tokens after import/export
KDXDocumentParseTokens.push(...KDLDocumentParseTokens);