import {union} from "@virtualstate/union";
import {anAsyncThing, TheAsyncThing} from "./the-thing";
import {
    toGenericNode,
    UnknownJSXNode,
    ChildNode,
    isStaticChildNode,
    AnyStaticChildNode,
    isFragment,
    toGenericNodeChildren
} from "./node";
import {isAsyncIterable, isIterable} from "./is";

export function toKDLString(input: UnknownJSXNode): TheAsyncThing<string> {
    return anAsyncThing(toKDLStringInternal(input));
}

async function *toKDLStringInternal(input: UnknownJSXNode): AsyncIterable<string> {
    let yielded = false;
    const {
        name,
        props,
        children,
        values
    } = toGenericNode(input);

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
    yield `${`${name.toString()} ${valuesString}`.trim()} ${propsString}`;

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
            const padding = isFragment(input) ? "" : "  ";
            const childrenStringBody = childrenStringsFiltered.map(value => padStartLines(padding, value)).join("\n");
            if (isFragment(input)) return childrenStringBody;
            const childrenString = childrenStringsFiltered.length ? ` {\n${childrenStringBody}\n}` : ""
            return `${`${`${name.toString()} ${staticChildrenStrings.join(" ")}`.trim()} ${propsString}`.trim()}${childrenString}`
        }
    }

    async function *toStringChildNode(node: UnknownJSXNode): AsyncIterable<string> {
        if (!node) return;
        yield * toKDLString(node);
    }


    function padStartLines(padding: string, value: string) {
        return (value ?? "")
            .split("\n")
            .map(line => `${padding}${line}`)
            .join("\n");
    }
}