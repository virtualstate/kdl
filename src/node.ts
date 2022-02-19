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
    Symbol.for(":kdl/fragment"),
    Symbol.for(":jsx/fragment"),
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
        const fragments = Object.entries([...staticChildren]).filter(([, node]) => isFragment(node));
        // console.log({ staticChildren, fragments, children });
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
        for (const [index] of fragments) {
            nextChildren[+index] = undefined;
        }
        nextChildren = nextChildren.map(value => value ? (
            isGenericChildNode(value) ? toGenericNode(value) : value
        ) : undefined)
        for await (const updates of union(
            fragments.map(async function *([index, fragment]): AsyncIterable<[string, ChildNode[]]> {
                if (!isGenericChildNode(fragment)) return;
                for await (const children of toGenericNodeChildrenInternal(fragment)) {
                    yield [index, children];
                }
            })
        )) {
            nextChildren = [...nextChildren];
            for (const [index, children] of updates) {
                nextChildren[+index] = children;
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

export interface ToGenericNodeOptions {
    enumerable?: Key[]
}

export function toGenericNode(node: UnknownJSXNode | GenericNode, { enumerable = ["name", "tag", "props", "children", "values"] }: ToGenericNodeOptions = {}): GenericNode {
    if (!node) return undefined;
    const unknown: unknown = node;
    ok<UnknownJSXNode>(unknown);
    const referenceNode: Record<NameKey | TagKey | ChildrenKey | ValuesKey | PropertiesKey, unknown> = unknown;
    const targetNode = {};
    define(targetNode, possibleNameKeysKey, getName);
    define(targetNode, possibleTagKeys, getTag);
    define(targetNode, possiblePropertiesKeys, getProperties);
    define(targetNode, possibleValuesKeys, getValues);
    define(targetNode, possibleChildrenKeys, getChildren);
    return targetNode;

    function define(object: object, keys: Key[], fn: () => unknown): asserts object is GenericNode {
        let value: unknown;
        // console.log(keys);
        Object.defineProperties(object, Object.fromEntries(
            keys.map(
                (key): [Key, PropertyDescriptor] => [
                    key,
                    {
                        get() {
                            // console.log("getting ", key);
                            return value = value ?? fn();
                        },
                        enumerable: enumerable ? enumerable.includes(key) : undefined,
                        configurable: true,
                    }
                ]
            )
        ))
    }

    function getName() {
        const nameKey: NameKey = possibleNameKeysKey.find(isNameKey);
        const value = referenceNode[nameKey];
        if (isUnknownJSXNode(value)) {
            return toGenericNode(value).name;
        }

        return getStringOrSymbol(nameKey);

        function isUnknownJSXNode(value: unknown): value is UnknownJSXNode {
            return typeof value === "object" || typeof value === "function"
        }
    }

    function getTag() {
        const tagKey: TagKey = possibleTagKeys.find(isTagKey);
        return getStringOrSymbol(tagKey);
    }

    function getProperties() {
        const propertiesKey: PropertiesKey = possiblePropertiesKeys.find(isPropertiesKey);
        return getPropertiesRecord(propertiesKey);
    }

    function getValues() {
        const valuesKey: ValuesKey = possibleValuesKeys.find(isValuesKey);
        const value = referenceNode[valuesKey];
        if (isIterable(value)) return value;
        return [];
    }

    function getChildren() {
        const childrenKey: ChildrenKey = possibleChildrenKeys.find(isChildrenKey);
        return getSyncOrAsyncChildren(childrenKey);
    }

    function getSyncChildren() {
        const children = getChildren();
        if (isAsyncIterable(children)) return [];
        return children;
    }

    function getStringOrSymbol(key: NameKey | TagKey) {
        const value = referenceNode[key];
        if (typeof value !== "string" && typeof value !== "symbol") return undefined;
        return value;
    }

    function getSyncOrAsyncChildren(key: ChildrenKey) {
        if (!key) return [];
        const value = referenceNode[key];
        if (Array.isArray(value)) return value;
        if (isIterable(value)) return value;
        if (isAsyncIterable(value)) return value;
        return [];
    }

    function getPropertiesRecord(key: PropertiesKey): Record<string, unknown> {
        if (!key) return {};
        const value = referenceNode[key];
        if (!isProperties(value)) return {};
        return value;

        function isProperties(value: unknown): value is Record<string, unknown> {
            return typeof value === "object" || typeof value === "function";
        }
    }

    function isNameKey(key: Key): key is NameKey {
        return isKey(key);
    }

    function isTagKey(key: Key): key is TagKey {
        return isKey(key);
    }

    function isPropertiesKey(key: Key): key is PropertiesKey {
        return isKey(key);
    }

    function isValuesKey(key: Key): key is ValuesKey {
        return isKey(key);
    }

    function isChildrenKey(key: Key): key is ChildrenKey {
        return isKey(key);
    }

    function isKey<K extends Key>(key: Key): key is K {
        ok<UnknownJSXNode>(unknown);
        const value = unknown[key];
        return typeof value !== "undefined" && value !== null;
    }
}

export function isStaticChildNode(node: unknown): node is StaticChildNode {
    return typeof node === "string" || typeof node === "boolean" || typeof node === "number";
}

export function isGenericChildNode(node: unknown): node is GenericNode {
    return !isStaticChildNode(node);
}