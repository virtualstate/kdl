import {union} from "@virtualstate/union";
import {anAsyncThing, TheAsyncThing} from "./the-thing";
import {
    toGenericNode,
    UnknownJSXNode,
    ChildNode,
    isStaticChildNode,
    isFragment,
} from "./node";
import {isAsyncIterable, isIterable} from "./is";

export function toKDLString(input: UnknownJSXNode): TheAsyncThing<string> {
    return anAsyncThing(toKDLStringInternal(input));
}

async function *toKDLStringInternal(input: UnknownJSXNode): AsyncIterable<string> {
    let yielded = false;
    const inputNode = toGenericNode(input);
    const {
        name: nameInput,
        props,
        children,
        values
    } = inputNode;
    let name: string;
    const nameInputOrEmpty = nameInput ?? "";

    if (typeof nameInputOrEmpty === "string") {
        name = nameInputOrEmpty;
        if (!name) {
            name = "";
        }
        if (!name || /[^a-z0-9]/.test(name)) {
            name = JSON.stringify(name)
        }
    } else {
        name = nameInputOrEmpty.toString(); // Non-standard symbol, for internal process documents
    }

    const valuesString = [...values].filter(isStaticChildNode).map(value => JSON.stringify(value)).join(" ");

    const propsString = Object.keys(props).map(key => `${key}=${JSON.stringify(props[key])}`).join(" ");

    if (isIterable(children)) {
        const childrenSnapshot = [...children];
        if (childrenSnapshot.length) {
            yield * toStringChildren(childrenSnapshot);
        }
    } else if (isAsyncIterable(children)) {
        for await (const childrenSnapshot of children) {
            yield * toStringChildren(childrenSnapshot);
        }
    }

    if (yielded) return;
    yield `${`${name} ${valuesString}`.trim()} ${propsString}`;

    async function *toStringChildren(children: ChildNode[]) {
        const withoutUndefined = children.filter(node => isStaticChildNode(node) || node);
        if (!withoutUndefined.length) return;

        const staticChildren = withoutUndefined.filter(isStaticChildNode);
        const staticChildrenStrings = [
            ...valuesString,
            ...staticChildren.map(value => JSON.stringify(value))
        ];
        const nonStaticChildren = staticChildren.length === withoutUndefined.length ? [] : children.filter(node => !isStaticChildNode(node));

        if (!nonStaticChildren.length) {
            yield withDetails([]);
            yielded = true;
        } else {
            for await (const strings of union(nonStaticChildren.map(toStringChildNode))) {
                const withoutEmpty = strings.filter(value => value);
                if (withoutEmpty.length) {
                    yield withDetails(strings);
                    yielded = true;
                }
            }
        }

        function withDetails(childrenStrings: string[]) {
            const childrenStringsFiltered = childrenStrings.filter(value => value);
            const padding = isFragment(inputNode) ? "" : "  ";
            const childrenStringBody = childrenStringsFiltered.map(value => padStartLines(padding, value)).join("\n");
            if (isFragment(inputNode)) return childrenStringBody;
            const childrenString = childrenStringsFiltered.length ? ` {\n${childrenStringBody}\n}` : ""
            return `${`${`${name} ${staticChildrenStrings.join(" ")}`.trim()} ${propsString}`.trim()}${childrenString}`
        }
    }

    async function *toStringChildNode(node: UnknownJSXNode): AsyncIterable<string> {
        if (!node) return;
        yield * toKDLStringInternal(node);
    }


    function padStartLines(padding: string, value: string) {
        return (value ?? "")
            .split("\n")
            .map(line => `${padding}${line}`)
            .join("\n");
    }
}