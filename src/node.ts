import {isAsyncIterable, isIterable} from "./is";
import {anAsyncThing, TheAsyncThing} from "./the-thing";
import {ok} from "./like";
import {union} from "@virtualstate/union";

export type Key = string | symbol;
export type UnknownJSXNodeRecord = Record<Key, unknown>;
export type UnknownJSXNode = UnknownJSXNodeRecord | GenericNode;

const NameKeySymbol = Symbol();
const TagKeySymbol = Symbol();
const PropertiesKeySymbol = Symbol();
const ValuesKeySymbol = Symbol();
const ChildrenKeySymbol = Symbol();

export type NameKey = Key & { [NameKeySymbol]: true };
export type TagKey = Key & { [TagKeySymbol]: true };
export type PropertiesKey = Key & { [PropertiesKeySymbol]: true };
export type ValuesKey = Key & { [ValuesKeySymbol]: true };
export type ChildrenKey = Key & { [ChildrenKeySymbol]: true };

const possibleFragmentNamesSource = [
    Symbol.for(":jsx/fragment"),
    Symbol.for(":kdl/fragment"),
    Symbol.for("@virtualstate/fringe/fragment"),
    "Fragment",
    "fragment",
] as const;
const possibleFragmentNames: Key[] = [...possibleFragmentNamesSource];
export type FragmentName = typeof possibleFragmentNames[number];

export const possibleNameKeysKey: Key[] = [
    Symbol.for(":kdl/name"),
    Symbol.for(":jsx/type"),
    Symbol.for("@virtualstate/fringe/source"),
    "source",
    "type",
    "$$type",
    "reference",
    "name"
];
export const possibleTagKeys: Key[] = [Symbol.for(":kdl/tag"), "tag"];
export const possiblePropertiesKeys: Key[] = [
    Symbol.for(":kdl/properties"),
    Symbol.for(":kdl/props"),
    Symbol.for(":jsx/props"),
    Symbol.for(":jsx/properties"),
    Symbol.for(":jsx/options"),
    Symbol.for("@virtualstate/fringe/options"),
    "properties",
    "props",
    "options",
];
export const possibleValuesKeys: Key[] = [
    Symbol.for(":kdl/values"),
    Symbol.for(":jsx/values"),
    "values"
];
export const possibleChildrenKeys: Key[] = [
    Symbol.for(":kdl/children"),
    Symbol.for(":jsx/children"),
    Symbol.for("@virtualstate/fringe/children"),
    "children",
    "_children"
];
interface GenericGetFn {
    (this: GenericNode): unknown
}
function pair<A, B>(a: A, b: B): [A, B] {
    return [a, b];
}
const GenericNodeFunctions = new Map<Key, GenericGetFn>([
    ...possibleNameKeysKey
        .map((key) => pair(key, getName)),
    ...possibleTagKeys
        .map((key) => pair(key, getTag)),
    ...possibleChildrenKeys
        .map((key) => pair(key, getChildren)),
    ...possiblePropertiesKeys
        .map((key) => pair(key, getProperties)),
    ...possibleValuesKeys
        .map((key) => pair(key, getValues)),
]);

export type StaticChildNode = string | number | boolean;
export type AnyStaticChildNode = string | number | boolean | null | undefined;
export type ChildNode = AnyStaticChildNode | UnknownJSXNode;

export interface GenericNode extends UnknownJSXNodeRecord {
    name?: string | symbol;
    tag?: string | symbol;
    props: Record<string, unknown>;
    values: Iterable<AnyStaticChildNode>;
    children: AsyncIterable<ChildNode[]> | Iterable<ChildNode>;
}

export interface FragmentNode extends GenericNode {
    name: FragmentName
}

export function isFragment(node: GenericNode | ChildNode): node is FragmentNode {
    if (!node) return false;
    if (!isGenericChildNode(node)) return false;
    return possibleFragmentNames.includes(node.name);
}

export function toGenericNodeChildren(node: UnknownJSXNode | GenericNode): TheAsyncThing<ChildNode[]> {
    return anAsyncThing(toGenericNodeChildrenInternal(toGenericNode(node)));
}

async function *toGenericNodeChildrenInternal(node: GenericNode): AsyncIterable<ChildNode[]> {
    const { children } = node;
    // console.log({ children });
    if (!children) return;
    if (isIterable<ChildNode>(children)) {
        // console.log("Children is iterable");
        return yield * unionChildren(children);
    }
    // console.log("Children is async iterable");
    for await (const snapshot of children) {
        yield * unionChildren(snapshot);
    }
    // console.log("Children is async iterable and finished");
    async function *unionChildren(children: Iterable<ChildNode>): AsyncIterable<ChildNode[]> {
        const staticChildren = [...children];
        const fragments = staticChildren.filter(isFragment);
        if (!fragments.length) {
            if (staticChildren.length) {
                yield staticChildren
                    .map(value => isGenericChildNode(value) ? toGenericNode(value) : value);
            }
            return;
        }
        let nextChildren: (ChildNode[] | ChildNode)[] = [
            ...children
        ];

        for (const fragment of fragments) {
            nextChildren[+staticChildren.indexOf(fragment)] = undefined;
        }
        nextChildren = nextChildren.map(value => value ? (
            isGenericChildNode(value) ? toGenericNode(value) : value
        ) : undefined)
        for await (const updates of union(
            fragments.map(async function *(fragment): AsyncIterable<[number, ChildNode[]]> {
                if (!isGenericChildNode(fragment)) return;
                const index = staticChildren.indexOf(fragment);
                for await (const children of toGenericNodeChildrenInternal(fragment)) {
                    yield [index, children];
                }
            })
        )) {
            nextChildren = [...nextChildren];
            for (const [index, children] of updates) {
                nextChildren[index] = children;
            }
            yield nextChildren.flatMap<ChildNode>(value => value);
        }
    }
}

export function toGenericNodes(node: UnknownJSXNode): TheAsyncThing<(GenericNode | ChildNode)[]> {
    return anAsyncThing(asNodes(toGenericNode(node)));

    async function *asNodes(node: GenericNode): AsyncIterable<(GenericNode | ChildNode)[]> {
        if (!isFragment(node)) {
            return yield [node];
        } else {
            return yield * toGenericNodeChildrenInternal(node);
        }
    }
}

export interface ToGenericNodeOptions<N> {
    keys?: ((keyof N) & Key)[];
    sample?: N
    cache?: boolean /* default true */
}

export function toGenericChildNode<N = GenericNode>(node: unknown, options: ToGenericNodeOptions<N> = {}): N | StaticChildNode {
    if (isStaticChildNode(node)) {
        return node;
    }
    return toGenericNode(node, options);
}

export function toGenericNode<N = GenericNode>(node: unknown, options: ToGenericNodeOptions<N> = {}): N {
    if (!node) return undefined;
    if (Array.isArray(node)/* || isIterable(node)*/) {
        return toGenericNode({
            name: possibleFragmentNames[0],
            children: {
                *[Symbol.iterator]() {
                    yield * [...node].map(item => toGenericChildNode(item, options))
                }
            }
        })
    } else if (isAsyncIterable(node)) {
        return toGenericNode({
            name: possibleFragmentNames[0],
            children: {
                async *[Symbol.asyncIterator]() {
                    for await (const snapshot of node) {
                        const node = toGenericChildNode(snapshot);
                        // TODO provide flatten children function to remove fragments
                        yield [node];
                    }
                }
            }
        })
    }

    const cache = options.cache ?? true;

    let keys: Key[] = options.keys ?? ["name", "tag", "props", "children", "values"];

    if (keys.length === 0 && options.sample) {
        keys = getSampleKeys(options.sample);
    }

    keys = keys.filter(key => GenericNodeFunctions.has(key));

    ok<UnknownJSXNode>(node);

    const cached = new Map<unknown, unknown>();
    const targetNode = new Proxy({}, {
        get(target, key) {
            const fn = GenericNodeFunctions.get(key);
            if (typeof fn !== "function" || (keys.length && !keys.includes(key))) {
                return node[key];
            }
            const existing = cache ? cached.get(fn) : undefined;
            if (existing) {
                return existing;
            }
            const value = fn.call(node);
            if (cache) {
                cached.set(fn, value);
            }
            return value;
        }
    });
    ok<GenericNode>(targetNode);

    const fn: unknown = node;
    if (!targetNode.name && typeof fn === "function") {
        return toGenericNode(fn());
    }

    ok<N>(targetNode);

    return targetNode;

    function getSampleKeys(sample?: unknown): Key[] {
        if (!sample) return [];
        if (!Array.isArray(sample)) return Object.keys(sample);
        return sample.flatMap(sample => getSampleKeys(sample));
    }
}


function getName(this: UnknownJSXNode) {
    const isNameKey = (key: Key): key is NameKey => {
        return isKey(this, key);
    }
    const nameKey: NameKey = possibleNameKeysKey.find(isNameKey);
    const value = this[nameKey];
    if (isUnknownJSXNode(value)) {
        return toGenericNode(value).name;
    }
    return getStringOrSymbol(this, nameKey);

    function isUnknownJSXNode(value: unknown): value is UnknownJSXNode {
        return typeof value === "object" || typeof value === "function"
    }
}

function getTag(this: UnknownJSXNode) {
    const isTagKey = (key: Key): key is TagKey => {
        return isKey(this, key);
    }
    const tagKey: TagKey = possibleTagKeys.find(isTagKey);
    return getStringOrSymbol(this, tagKey);
}

function getProperties(this: UnknownJSXNode) {
    const isPropertiesKey = (key: Key): key is PropertiesKey => {
        return isKey(this, key);
    }
    const propertiesKey: PropertiesKey = possiblePropertiesKeys.find(isPropertiesKey);
    return getPropertiesRecord(this, propertiesKey);
}

function getValues(this: UnknownJSXNode) {
    const isValuesKey = (key: Key): key is ValuesKey => {
        return isKey(this, key);
    }
    const valuesKey: ValuesKey = possibleValuesKeys.find(isValuesKey);
    const value = this[valuesKey];
    if (isIterable(value)) return value;
    return [];
}

function getChildren(this: UnknownJSXNode) {
    const isChildrenKey = (key: Key): key is ChildrenKey => {
        return isKey(this, key);
    }
    const childrenKey: ChildrenKey = possibleChildrenKeys.find(isChildrenKey);
    return getSyncOrAsyncChildren(this, childrenKey);
}

function getSyncOrAsyncChildren(node: UnknownJSXNode, key: ChildrenKey) {
    if (!key) return [];
    const value = node[key];
    if (Array.isArray(value)) return value;
    if (isIterable(value)) return value;
    if (isAsyncIterable(value)) return value;
    return [];
}

function getPropertiesRecord(node: UnknownJSXNode, key: PropertiesKey): Record<string, unknown> {
    if (!key) return {};
    const value = node[key];
    if (!isProperties(value)) return {};
    return value;
    function isProperties(value: unknown): value is Record<string, unknown> {
        return typeof value === "object" || typeof value === "function";
    }
}

function getStringOrSymbol(node: UnknownJSXNode, key: NameKey | TagKey) {
    const value = node[key];
    if (typeof value !== "string" && typeof value !== "symbol") return undefined;
    return value;
}

function isKey<K extends Key>(unknown: unknown, key: Key): key is K {
    ok<UnknownJSXNode>(unknown);
    const value = unknown[key];
    return typeof value !== "undefined" && value !== null;
}

export function isStaticChildNode(node: unknown): node is StaticChildNode {
    return typeof node === "string" || typeof node === "boolean" || typeof node === "number";
}

export function isGenericChildNode(node: unknown): node is GenericNode {
    return !isStaticChildNode(node);
}

export function isUnknownJSXNode(node: unknown): node is UnknownJSXNode {
    return typeof node === "object" || typeof node === "function";
}