import {
    GenericNode, isGenericChildNode,
    ChildNode,
    toGenericNodeChildren,
    toGenericNodes,
    UnknownJSXNode, toGenericNode, isFragment, isStaticChildNode, FragmentNode
} from "./node";
import {union} from "@virtualstate/union";
import {anAsyncThing} from "./the-thing";

export function runKDLQuery(query: string, input?: UnknownJSXNode) {
    const Query = rawKDLQuery(query);
    return {
        name: Symbol.for(":kdl/fragment"),
        children: {
            [Symbol.asyncIterator]() {
                return Query({}, input)[Symbol.asyncIterator]()
            }
        }
    }
}

export function rawKDLQuery(input: string | TemplateStringsArray, ...args: unknown[]) {

    let query: string;
    if (typeof input === "string") {
        query = input;
    } else {
        query = input.reduce((string, value, index) => {
            return `${string}${value}${args[index] ?? ""}`
        }, "");
    }

    return async function *(options: Record<string | symbol, unknown>, input?: UnknownJSXNode): AsyncIterable<GenericNode[]> {
        if (!input) return;

        const node = toGenericNode(input);
        const root = asFragment(node);

        // console.log(await toGenericNodeChildren(input), await input.children);

        const accessorRegex = /(\[[^\]]*])/g;
        const rawStringRegex = /(r#"[^"]*"#)/g;
        const stringRegex = /("[^"]*")/g;

        const { query: queryNoStrings, names } = getNamesQuery({
            ...getNamesQuery({
                ...getNamesQuery({
                    query,
                    match: rawStringRegex,
                    prefix: "${rawString",
                    suffix: "}",
                }),
                prefix: "${string",
                suffix: "}",
                match: stringRegex
            }),
            prefix: "${accessor",
            suffix: "}",
            match: accessorRegex
        });

        const queries = queryNoStrings.split(/\s*\|\|\s*/)
            .map(value => value.trim())
            .filter(value => value);

        // console.log({ queries });

        if (queries.length === 1) {
            yield * runQuery(root, queries[0]);
        } else if (queries.length) {
            for await (const results of union(queries.map((query, index) => runQuery(root, query)))) {
                const flat = results.flatMap(result => result);
                if (flat.length) {
                    yield flat;
                }
            }
        }

        type FragmentPair = [FragmentNode, GenericNode, GenericNode[], number];
        type FragmentPairs = FragmentPair[];

        async function *runQueryFragmentForFragment(node: GenericNode, query: string): AsyncIterable<FragmentPairs> {
            const parentFragment = asFragment(node);

            const nodes = await anAsyncThing(directChildren(node));
            // console.log({ nodes, query });
            if (!nodes) return;

            let match = false;
            let nodeMatches: FragmentPairs = [];
            for await (const results of union(nodes.map(runQueryForFragment))) {
                nodeMatches = results.reduce((array, pairs) => array.concat(pairs), []).filter(value => value);
                if (nodeMatches.length) {
                    yield nodeMatches;
                    match = true;
                }
            }

            // Do we want to keep searching till we have more? Probably, TODO
            // if (match) return;
            //
            // for await (const results of union(nodes.map(node => runQueryFragmentForFragment(node, query)))) {
            //     const nodeChildrenMatches = results.reduce((array, pairs) => array.concat(pairs), []);
            //     const allMatches = [...nodeMatches, ...nodeChildrenMatches].filter(value => value);
            //     if (allMatches.length) {
            //         yield allMatches;
            //         match = true;
            //     }
            // }

            async function *runQueryForFragment(node: GenericNode): AsyncIterable<FragmentPairs> {
                if (isFragment(node)) {
                    throw new Error("Unexpected child fragment, directChildren should be filtering these");
                }
                const index = nodes.indexOf(node);
                if (index === -1) throw new Error("Expected node to be an item of nodes");
                for await (const match of runQuery(node, query, false)) {
                    if (match.length === 0) continue;
                    if (match.length !== 1) throw new Error("Expected only node to match, or not match");
                    yield [[parentFragment, node, nodes, index]];
                }
            }
        }

        function readQuery(query: string) {
            const [next] = query.match(/^([^\s]+)/);
            const rest = query.substring(next.length).trim();
            return { next, rest };
        }

        async function *runQueryFragment(node: GenericNode, query: string, tree: boolean): AsyncIterable<GenericNode[]> {
            if (!query) return;

            if (query.startsWith(">")) {
                if (query.length === 1) {
                    throw new Error("Direct children query operator requires a right selector");
                }
                query = query.substring(1).trimStart();
            }

            let { next, rest } = readQuery(query);

            const isImmediateSibling = rest.startsWith("+");
            const isAfterSibling = rest.startsWith("~");
            if (isImmediateSibling || isAfterSibling) {
                if (query.length === 1) {
                    throw new Error("Sibling query operator requires a right selector");
                }

                const matching = await anAsyncThing(runQueryFragmentForFragment(node, next));

                if (matching?.length) {

                    let { next: restNext, rest: restRest } = readQuery(rest.substring(1).trimStart());

                    let possible;
                    if (isImmediateSibling) {
                        possible = matching.map(([,,array, index]) => array[index + 1]).filter(value => value);
                    } else {
                        const arrays = new Set(matching.map(([,,array]) => array));
                        const indexes = matching.reduce(
                            (map, [,,array, index]) => {
                                const current = map.get(array) ?? -1;
                                if (current === -1) {
                                    map.set(array, index);
                                } else {
                                    map.set(array, Math.min(index, current));
                                }
                                return map;
                            },
                            new Map<GenericNode[], number>()
                        );
                        if (arrays.size !== 1) {
                            // TODO
                            throw new Error("Only expected a single array");
                        }
                        const arraysArray = [...arrays.values()];
                        const minIndexes = arraysArray.map(array => indexes.get(array));
                        if (minIndexes.length !== 1) {
                            // TODO
                            throw new Error("Only expected a single array");
                        }
                        possible = arraysArray[0].slice(minIndexes[0]);
                    }

                    if (possible.length) {
                        let match = false;
                        for await (const matches of union(possible.map(node => runQueryForRightOfSibling(node, restNext)))) {
                            const flat = matches.flatMap(value => value).filter(value => value);
                            if (!flat.length) continue;
                            if (restRest) {
                                for await (const results of union(flat.map(node => runQueryFragment(node, restRest, tree)))) {
                                    const flat = matches.flatMap(value => value).filter(value => value);
                                    if (!flat.length) continue;
                                    yield flat;
                                    match = true;
                                }
                            } else {
                                yield flat;
                                match = true;
                            }
                        }
                        if (match) return;
                    }

                    async function *runQueryForRightOfSibling(node: GenericNode, query: string) {
                        if (isFragment(node)) throw new Error("Unexpected child fragment");
                        for await (const match of runQuery(node, query, false)) {
                            if (match.length === 0) continue;
                            if (match.length !== 1) throw new Error("Expected only node to match, or not match");
                            yield [node];
                        }
                    }

                } else {

                }

            }

            const nodes = await anAsyncThing(directChildren(node));
            // console.log({ nodes, subject, query });
            if (!nodes) return;
            for await (const results of union(nodes.map(node => runQuery(node, query, tree)))) {
                const flat = results.flatMap(result => result);
                if (flat.length) {
                    yield flat;
                }
            }
        }

        async function *runQuery(node: GenericNode, query: string, tree = true): AsyncIterable<GenericNode[]> {
            if (!query) return;

            if (isFragment(node)) {
                return yield * runQueryFragment(node, query, tree);
            }

            let { next, rest } = readQuery(query);

            next = withNamed(next);

            if (next === "top()") {
                return yield * runQuery(root, rest, tree);
            }

            let match: unknown = true;
            let subject = node;

            for await (match of runMatch()) {
                if (!match) break;
            }

            // console.log({ match, rest, query, subject, input, node, fragment: isFragment(subject), name: subject.name, children: await toGenericNodeChildren(node), childrenInput: await toGenericNodeChildren(input) });

            // console.log({ match, name: subject.name });

            if (match) {
                if (rest && tree) {
                    yield * runQueryFragment(subject, rest, tree);
                } else {
                    yield [subject];
                }
            } else if (tree) {
                yield * runQueryFragment(subject, query, tree);
            }

            async function *runMatch(): AsyncIterable<unknown> {
                // console.log({ next });

                if (match && next.startsWith("()")) {
                    next = next.substring(2);
                }

                if (match && next.startsWith("[]")) {
                    next = next.substring(2);
                }

                const tagMatch = next.match(/\(([^)]+)\)/)
                const tag = tagMatch?.[0];

                if (match && tag) {
                    if (isFragment(node)) {

                    } else {
                        if (node.tag) {
                            yield match = node.tag === tag;
                        }
                        /* else the node doesn't support tags, so it should auto match and be ignored */
                        /* tags are optionally supported */
                    }
                    next = next.replaceAll(`(${tag})`, "");
                }

                const accessorMatch = next.match(/\[([^\]]+)]/)
                const accessor = accessorMatch?.[1];

                // console.log({ accessorMatch, accessor, next });

                if (match && accessor) {
                    match = await anyAccessor(node, accessor);
                    if (typeof match === "boolean") {
                        yield match;
                    } else {
                        yield match = !!(match || isStaticChildNode(match));
                    }
                    next = next.replaceAll(`[${accessor}]`, "");
                }

                if (next) {
                    yield match = next === node.name;
                }
            }

        }

        type Names = Map<string, string>;
        interface PartialNamesQuery {
            query: string;
            names?: Names;
            prefix?: string;
            suffix?: string;
            match?: RegExp
        }
        interface NamesQuery extends PartialNamesQuery {
            names: Names;
            prefix: string;
            suffix: string;
            match: RegExp;
        }

        function withNamed(string: string) {

            const keys = [...names.keys()];

            let output = string;

            do {
                output = [...names.keys()].reduce(
                    (string, key) => string.replaceAll(key, names.get(key)),
                    output
                );
            } while (keys.find(key => output.includes(key)));

            // console.log(string, keys, output);

            return output;
        }

        function getNamesQuery({
            query: input,
            names: inputNames = new Map(),
            prefix = "${string",
            suffix = "}",
            match = /"[^"]*"/
        }: PartialNamesQuery): NamesQuery {
            const names = getNamedStrings(input);
            const query = [...names.keys()].reduce(
                (query, key) => {
                    return query.replaceAll(names.get(key), key);
                },
                input
            );
            return {
                names: new Map([
                    ...inputNames.entries(),
                    ...names.entries()
                ]),
                query,
                prefix,
                suffix,
                match
            } as const;

            function getNamedStrings(query: string) {
                return new Map(
                    [...new Set(query.match(match))]
                        .map((string, index): [string, string] => [
                            `${prefix}${index}${suffix}`,
                            string
                        ])
                )
            }
        }
    }
}

function asFragment(node: GenericNode): FragmentNode {
    if (isFragment(node)) return node;
    const fragment = toGenericNode({
        name: Symbol.for(":kdl/fragment"),
        children: [node]
    });
    if (!isFragment(fragment)) throw new Error("Expected node to be a fragment");
    return fragment;
}

const operators = {
    notEquals: "!=",
    startsWithString: "^=",
    endsWithString: "$=",
    containsString: "*=",
    greaterThanOrEqualsNumber: ">=",
    lessThanOrEqualsNumber: "<=",
    greaterThanNumber: ">",
    lessThanNumber: "<",
    equals: "=",
} as const;
type Operation = typeof operators[keyof typeof operators]
const operatorSymbols: Operation[] = Object.values(operators)
    .sort((a, b) => a.length < b.length ? 1 : -1);

function operator(left: unknown, right: unknown, op: Operation) {

    // console.log({ left, right, op }, Object.keys(operators).find((key: keyof typeof operators) => operators[key] === op));

    if (op === operators.equals) {
        return left === right;
    }

    if (op === operators.notEquals) {
        return left !== right;
    }

    const number = numberOperator();

    if (typeof number === "boolean") {
        return number;
    }

    const string = stringOperator();

    if (typeof string === "boolean") {
        return string;
    }

    throw new Error(`Unknown operator ${op}`);

    function stringOperator() {
        const pair = getStringPair();
        if (op === operators.startsWithString) {
            if (!pair) return false;
            const [left, right] = pair;
            return left.startsWith(right);
        }
        if (op === operators.endsWithString) {
            if (!pair) return false;
            const [left, right] = pair;
            return left.endsWith(right);
        }
        if (op === operators.containsString) {
            if (!pair) return false;
            const [left, right] = pair;
            return left.includes(right);
        }
    }

    function numberOperator() {
        const pair = getNumberPair();
        if (op === operators.greaterThanNumber) {
            if (!pair) return false;
            const [left, right] = pair;
            return left > right;
        }
        if (op === operators.lessThanNumber) {
            if (!pair) return false;
            const [left, right] = pair;
            return left < right;
        }
        if (op === operators.greaterThanOrEqualsNumber) {
            if (!pair) return false;
            const [left, right] = pair;
            return left >= right;
        }
        if (op === operators.lessThanOrEqualsNumber) {
            if (!pair) return false;
            const [left, right] = pair;
            return left <= right;
        }
    }

    function getNumberPair() {
        if (typeof left !== "number" || typeof right !== "number") {
            return false;
        }
        return [left, right];
    }

    function getStringPair() {
        if (typeof left !== "string" || typeof right !== "string") {
            return false;
        }
        return [left, right];
    }

}

// a > b: Selects any b element that is a direct child of an element.
async function *directChildren(input: UnknownJSXNode): AsyncIterable<GenericNode[]> {
    for await (const children of toGenericNodeChildren(input)) {
        const withoutStatic = children
            .flatMap<ChildNode>(value => value)
            .filter(isGenericChildNode);

        if (!withoutStatic.length) continue;

        const fragments = withoutStatic.filter(isFragment);

        if (!fragments.length) {
            yield withoutStatic;
            continue;
        }

        const fragmentIndexes = fragments.reduce(
            (map, fragment) => {
                map.set(fragment, withoutStatic.indexOf(fragment));
                return map;
            },
            new Map<FragmentNode, number>()
        )

        const nextChildren: (GenericNode | GenericNode[])[] = [...withoutStatic];

        for (const index of fragmentIndexes.values()) {
            nextChildren[index] = undefined;
        }

        for await (const fragmentChildren of union(fragments.map(
            async function* (fragment): AsyncIterable<[FragmentNode, GenericNode[]]> {
                for await (const children of directChildren(fragment)) {
                    yield [fragment, children];
                }
            }
        )) ) {
            for (const [fragment, children] of fragmentChildren) {
                nextChildren[fragmentIndexes.get(fragment)] = children;
            }

            yield nextChildren
                .filter(Boolean)
                .flatMap(value => value)
        }

    }
    // console.log("Direct children finished");
}

function getOperation(accessor: string): Operation {
    return operatorSymbols.find(symbol => accessor.includes(symbol))
}

function splitOperation(accessor: string, op: Operation): [string, string] {
    const [left, right, ...rest] = accessor.split(op);
    if (rest.length) {
        throw new Error(`Multiple ${op} symbols found in "${accessor}"`);
    }
    if (!left && !right) {
        throw new Error(`Expected both left and right hand values are required for ${op}`);
    }
    return [left, right];
}

async function operationAccessor(node: UnknownJSXNode, accessor: string, op: Operation): Promise<boolean> {
    const [left, right] = await Promise.all(splitOperation(accessor, op).map(accessor => anyAccessor(node, accessor)));
    return operator(left, right, op);
}

async function anyAccessor(node: UnknownJSXNode, input: string): Promise<unknown> {
    const accessor = input.trim();

    if (accessor === "") {
        return true;
    }

    const quote = `"`;
    if (accessor.startsWith(quote) && accessor.endsWith(quote)) {
        return JSON.parse(accessor);
    }
    if (accessor.startsWith(`r#${quote}`) && accessor.endsWith(`${quote}#`)) {
        return JSON.parse(accessor.substring(2, accessor.length - 1));
    }

    const operation = getOperation(accessor);

    if (operation) {
        return operationAccessor(node, accessor, operation);
    }

    const isTrue = accessor === "true";
    if (isTrue || accessor === "false") {
        return isTrue;
    }

    if (/^\d+(\.\d+)?$/.test(accessor)) {
        return +accessor;
    }


    const generic = toGenericNode(node);

    const namedAccessors = {
        name,
        tag,
        val,
        // values,
        prop,
        // props,
    };

    for (const key of Object.keys(namedAccessors).filter((key): key is keyof typeof namedAccessors => key in namedAccessors)) {
        if (!accessor.startsWith(key)) continue;
        const argumentsHopefully = accessor.substr(key.length).trim();
        const isArgumentsBrackets = argumentsHopefully.startsWith("(") && argumentsHopefully.endsWith(")");
        const argumentsString = argumentsHopefully.substring(1, argumentsHopefully.length - 1).trim();
        const isArguments = isArgumentsBrackets && !!argumentsString.length;
        const fn = namedAccessors[key];

        // console.log({ argumentsHopefully, key, accessor, isArguments });

        if (!isArguments) {
            return fn(generic);
        }

        const [arg, ...rest] = argumentsString.split(/\s*,\s*/);

        // console.log({ arg });

        if (rest.length) {
            throw new Error(`Unexpected second argument for ${key}`);
        }
        const value = /^\d+$/.test(arg) ? +arg : arg;
        return fn(generic, value); // We have a named accessor, so we don't need to do anything more
    }

    return prop(generic, accessor);
}

async function name(node: UnknownJSXNode) {
    const generic = toGenericNode(node);
    if (!isFragment(generic)) {
        return generic.name;
    }
    const [child] = await anAsyncThing(toGenericNodes(node));
    if (!child) return undefined;
    if (!isGenericChildNode(child)) return undefined;
    return child.name;
}

async function tag(node: UnknownJSXNode) {
    const generic = toGenericNode(node);
    if (!isFragment(generic)) {
        return generic.tag;
    }
    const [child] = await anAsyncThing(toGenericNodes(node));
    if (!child) return undefined;
    if (!isGenericChildNode(child)) return undefined;
    return child.tag;
}

async function values(node: UnknownJSXNode) {
    const generic = toGenericNode(node);
    if (!isFragment(generic)) {
        return getChildrenValues(generic);
    }
    const nodes = await toGenericNodes(node);
    if (!nodes.length) return [];
    const all = await Promise.all(
        nodes.map(getChildrenValues)
    );
    return all.flatMap(value => value);
}

async function getChildrenValues(node: GenericNode): Promise<unknown[]> {
    const children = await toGenericNodeChildren(node);
    const childrenValues = children.filter(isStaticChildNode);
    return [
        ...node.values,
        ...childrenValues
    ];
}

async function prop(node: UnknownJSXNode, name?: unknown) {
    // console.log({ name });
    if (typeof name !== "string" && typeof name !== "symbol") throw new Error("Expected name for prop accessor");
    const { [name]: value } = await props(node);
    return value;
}

type Props = Record<string | symbol, unknown>;

async function props(node: UnknownJSXNode): Promise<Props> {
    const generic = toGenericNode(node);
    if (!isFragment(generic)) {
        return getProps(generic);
    }
    const nodes = await toGenericNodes(node);
    return nodes
        .map(getProps)
        .reduce(
            (props: Props, next) => Object.assign(props, next),
            {}
        );

    function getProps(node: ChildNode): Props {
        if (!isGenericChildNode(node)) return {};
        return node.props;
    }
}

async function val(node: UnknownJSXNode, index?: unknown) {
    const array = await values(node);
    // console.log({ array });
    return array[typeof index === "number" ? index : 0];
}