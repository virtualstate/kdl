import {
    GenericNode, isGenericChildNode,
    ChildNode,
    toGenericNodeChildren,
    toGenericNodes,
    UnknownJSXNode, toGenericNode, isFragment, isStaticChildNode
} from "./node";
import {isLike} from "./like";
import {union} from "@virtualstate/union";
import {anAsyncThing} from "./the-thing";

export interface MatchFn {
    (node: GenericNode): boolean;
}
export type MatchFnPair = [MatchFn, MatchFn];

interface QueryContext {
    root: GenericNode;
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

    const Context = Symbol("Context");

    return async function *(options: Record<string | symbol, unknown>, input?: UnknownJSXNode) {
        if (!input) return;

        const node = toGenericNode(input);
        const root = asFragment(node);

        // console.log(await toGenericNodeChildren(input), await input.children);

        const context = options[Context] || {
            root,
        };

        assertQueryContext(context);

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

        async function *runQueryFragment(node: GenericNode, query: string): AsyncIterable<GenericNode[]> {
            if (!query) return;
            const nodes = await anAsyncThing(directChildren(node));
            // console.log({ nodes, subject, query });
            if (!nodes) return;

            if (query.startsWith(">")) {
                if (query.length === 1) {
                    throw new Error("Direct children query operator requires a right selector");
                }
                query = query.substring(1).trimStart();
            }

            let [next] = query.match(/^([^\s]+)/);
            let rest = query.substring(next.length).trim();

            {


                if (rest.startsWith("+")) {
                    if (query.length === 1) {
                        throw new Error("Next sibling query operator requires a right selector");
                    }




                    throw new Error("Siblings are not supported yet")
                    // const directSiblingSubject = subject;
                    // subject = toGenericNode({
                    //     name: Symbol.for(":kdl/fragment"),
                    //     children: {
                    //         [Symbol.asyncIterator]() {
                    //             return siblings(directSiblingSubject)
                    //         }
                    //     }
                    // })
                    // rest = rest.substring(1).trim();
                }


                if (rest.startsWith("~")) {
                    if (query.length === 1) {
                        throw new Error("Sibling query operator requires a right selector");
                    }
                    throw new Error("Siblings are not supported yet")
                }
            }

            for await (const results of union(nodes.map(node => runQuery(node, query)))) {
                const flat = results.flatMap(result => result);
                if (flat.length) {
                    yield flat;
                }
            }
        }

        async function *runQuery(node: GenericNode, query: string): AsyncIterable<GenericNode[]> {
            if (!query) return;

            if (isFragment(node)) {
                return yield * runQueryFragment(node, query);
            }

            let [next] = query.match(/^([^\s]+)/);
            let rest = query.substring(next.length).trim();

            next = withNamed(next);

            let match: unknown = true;
            let subject = node;

            for await (match of runMatch()) {
                if (!match) break;
            }

            // console.log({ match, rest, query, subject, input, node, fragment: isFragment(subject), name: subject.name, children: await toGenericNodeChildren(node), childrenInput: await toGenericNodeChildren(input) });

            // console.log({ match, name: subject.name });

            if (match) {
                if (rest) {
                    yield * runQueryFragment(subject, rest);
                } else {
                    yield [subject];
                }
            } else {
                yield * runQueryFragment(subject, query);
            }

            async function *runMatch(): AsyncIterable<unknown> {
                const topString = "top()";
                if (match && next.startsWith(topString)) {
                    subject = root;
                    next = next.substring(topString.length + 2);
                }

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


        function assertQueryContext(context: unknown): asserts context is QueryContext {
            if (!(isLike<QueryContext>(context) && context.root)) {
                throw new Error("Expected context");
            }
        }

    }
}

function asFragment(node: GenericNode) {
    return isFragment(node) ? node : toGenericNode({
        name: Symbol.for(":kdl/fragment"),
        children: [node]
    })
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
async function *directChildren(input: UnknownJSXNode) {
    for await (const children of toGenericNodeChildren(input)) {
        const withoutStatic = children
            .flatMap<ChildNode>(value => value)
            .filter(isGenericChildNode);
        // console.log({ withoutStatic });
        if (withoutStatic.length) {
            yield withoutStatic;
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
        val,
        values,
        prop,
        props,
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

async function *siblings(node: UnknownJSXNode, isMatching: MatchFnPair, mode: "immediately after" | "after"): AsyncIterable<GenericNode[]> {
    for await (const children of directChildren(node)) {
        const lefts = children
            .map((node, index): [number, boolean] => [index, isMatching[0](node)])
            .filter(([, match]) => match);
        let matches: GenericNode[] = [];
        if (lefts.length) {
            if (mode === "immediately after") {
                matches = lefts
                    .map(([index]): GenericNode => {
                        const right = children[index + 1];
                        const match = right && isMatching[1](right)
                        return match ? right : undefined
                    })
                    .filter(value => value);
            } else if (mode === "after") {
                const minimumIndex = Math.min(...lefts.map(([index]) => index));
                for (let rightIndex = minimumIndex + 1; rightIndex < children.length; rightIndex += 1) {
                    const right = children[rightIndex];
                    if (right && isMatching[1](right)) {
                        matches.push(right);
                    }
                }
            } else {
                break; // Unknown mode
            }
            yield matches;
        }
        for await (const childrenSiblings of union(children.map(node => siblings(node, isMatching, mode)))) {
            yield [...matches, ...childrenSiblings.flatMap(value => value)];
        }
    }
}

// a b: Selects any b element that is a descendant of an element.
async function *descendants(node: UnknownJSXNode) {
    for await (const nodes of toGenericNodes(node)) {
        const withoutStatic = nodes.filter(isGenericChildNode);
        if (!withoutStatic.length) continue;
        for await (const descendants of union(withoutStatic.map(node => internalDescendants(node)))) {
            yield descendants.flatMap<GenericNode>(value => value);
        }
    }

    async function *internalDescendants(node: GenericNode): AsyncIterable<GenericNode[]> {
        const children = await anAsyncThing(directChildren(node));

        let yielded = false;
        for await (const descendantsOf of union(children.map(child => internalDescendants(child)))) {
            yield [
                ...children,
                ...descendantsOf.flatMap(value => value)
            ];
            yielded = true;
        }
        if (!yielded) {
            yield children;
        }
    }

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

async function *select(context: QueryContext, node: GenericNode, selector: string) {
  const spaceSplit = selector.split(" ");

  const [start, ...rest] = spaceSplit;

  let subject = node;

  if (start === node.name) {
      subject = node;

      if (!rest.length) {

      }
  } else if (start === "top()") {
      subject = context.root;
  }


}