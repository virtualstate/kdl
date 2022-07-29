import { union } from "@virtualstate/union";
import { anAsyncThing, TheAsyncThing } from "@virtualstate/promise/the-thing";
import * as jsx from "@virtualstate/focus";
import { isUnknownJSXNode } from "@virtualstate/focus";

/**
 * @experimental
 */
export const ResolveObjectAttributes = Symbol.for(
  "@virtualstate/kdl/resolveObjectAttributes"
);

export interface ToKDLStringOptions {
  /**
   * @experimental
   */
  [ResolveObjectAttributes]?: boolean;
}

/*
import { KDL } from "@virtualstate/focus";
// The returned type from KDL.ToString is currently only for IDE debugging, it may not match the runtime output completely
// I hope to expand it further to include all possible variations & then build in tests to match types to the implementation
export function toKDLString<N>(input: N): TheAsyncThing<KDL.ToString<N> extends ("" | never) ? string : KDL.ToString<N>>
 */
export function toKDLString(
  input: unknown,
  options?: ToKDLStringOptions
): TheAsyncThing<string>;
export function toKDLString(
  input: unknown,
  options?: unknown
): TheAsyncThing<string>;
export function toKDLString(
  input: unknown,
  options?: unknown
): TheAsyncThing<string> {
  return anAsyncThing(toKDLStringInternal(input, options));
}

async function* toKDLStringInternal(
  input: unknown,
  options?: unknown
): AsyncIterable<string> {
  let yielded = false;
  // const {
  //     name: nameInput,
  //     props,
  //     children,
  //     values
  // } = inputNode;
  const inputNode = input;
  const nameInput = jsx.name(input);
  const values = jsx.values(input);
  const props = jsx.properties(input);

  // console.log({ nameInput, values, props });

  let name: string;
  const nameInputOrEmpty = nameInput ?? "";

  if (typeof nameInputOrEmpty === "string") {
    name = nameInputOrEmpty;
    if (!name) {
      name = "";
    }
    if (!name || /[^a-z0-9]/i.test(name)) {
      name = JSON.stringify(name);
    }
  } else {
    name = nameInputOrEmpty.toString(); // Non-standard symbol, for internal process documents
  }

  const valuesString = [...values]
    .filter(jsx.isStaticChildNode)
    .map((value) => JSON.stringify(value))
    .join(" ");

  const propsEntries = Object.entries(props);

  const propsObjects = propsEntries.filter(([, value]) =>
    isUnknownJSXNode(value)
  );
  const propsObjectsStrings = new Map(
    option(ResolveObjectAttributes) && propsObjects.length
      ? await Promise.all(
          propsObjects.map(
            async ([key, object]) =>
              [key, `{${(await toKDLString(object)).trim()}}`] as const
          )
        )
      : []
  );

  const propsString = Object.keys(props)
    .map(
      (key) =>
        `${key}=${propsObjectsStrings.get(key) ?? JSON.stringify(props[key])}`
    )
    .join(" ");

  for await (const childrenSnapshot of jsx.children(input)) {
    // console.log({ childrenSnapshot });
    yield* toStringChildren(childrenSnapshot);
  }

  if (yielded) return;
  yield `${`${name} ${valuesString}`.trim()} ${propsString}`;

  async function* toStringChildren(children: unknown[]) {
    const withoutUndefined = children.filter(
      (node) => jsx.isStaticChildNode(node) || node
    );
    if (!withoutUndefined.length) return;

    const staticChildren = withoutUndefined.filter(jsx.isStaticChildNode);
    const staticChildrenStrings = [
      ...valuesString,
      ...staticChildren.map((value) => JSON.stringify(value)),
    ];
    const nonStaticChildren =
      staticChildren.length === withoutUndefined.length
        ? []
        : children.filter((node) => !jsx.isStaticChildNode(node));

    if (!nonStaticChildren.length) {
      yield withDetails([]);
      yielded = true;
    } else {
      for await (const strings of union(
        nonStaticChildren.map(toStringChildNode)
      )) {
        const withoutEmpty = strings.filter((value) => value);
        if (withoutEmpty.length) {
          yield withDetails(strings);
          yielded = true;
        }
      }
    }

    function withDetails(childrenStrings: string[]) {
      const childrenStringsFiltered = childrenStrings.filter((value) => value);
      const padding = jsx.isFragment(inputNode) ? "" : "  ";
      const childrenStringBody = childrenStringsFiltered
        .map((value) => padStartLines(padding, value))
        .join("\n");
      if (jsx.isFragment(inputNode)) return childrenStringBody;
      const childrenString = childrenStringsFiltered.length
        ? ` {\n${childrenStringBody}\n}`
        : "";
      return `${`${`${name} ${staticChildrenStrings.join(
        " "
      )}`.trim()} ${propsString}`.trim()}${childrenString}`;
    }
  }

  async function* toStringChildNode(node: unknown): AsyncIterable<string> {
    if (!node) return;
    yield* toKDLStringInternal(node, options);
  }

  function padStartLines(padding: string, value: string) {
    return (value ?? "")
      .split("\n")
      .map((line) => `${padding}${line}`)
      .join("\n");
  }

  function option(name: string | symbol) {
    if (!isOptions(options)) return undefined;
    return options[name];

    function isOptions(value: unknown): value is Record<typeof name, unknown> {
      return typeof options === "object" && !!options;
    }
  }
}
