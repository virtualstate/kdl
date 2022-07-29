# `@virtualstate/kdl`

[KDL](https://github.com/kdl-org/kdl) Tooling for [JSX](https://github.com/virtualstate/focus)

[//]: # (badges)

### Support

 ![Node.js supported](https://img.shields.io/badge/node-%3E%3D16.0.0-blue) ![Deno supported](https://img.shields.io/badge/deno-%3E%3D1.17.0-blue) 

### Test Coverage

 ![96.06%25 lines covered](https://img.shields.io/badge/lines-96.06%25-brightgreen) ![96.06%25 statements covered](https://img.shields.io/badge/statements-96.06%25-brightgreen) ![94.44%25 functions covered](https://img.shields.io/badge/functions-94.44%25-brightgreen) ![89.55%25 branches covered](https://img.shields.io/badge/branches-89.55%25-brightgreen)

[//]: # (badges)

# Preparing queries

Queries are not preformed as soon as they are created, but they are partially prepared. 
While the query runs, additional parts to the query will be included in as needed. 

To prepare a query for a JSX node, import and use `prepare`

```typescript jsx
import {prepare} from "@virtualstate/kdl";

const node = (
    <main>
        <h1>@virtualstate/focus</h1>
        <blockquote>Version: <span>1.0.0</span></blockquote>
    </main>
);
```

The first parameter, is the JSX node you want to query
The second parameter, is a string containing [KDL Query Language](https://github.com/kdl-org/kdl/blob/main/QUERY-SPEC.md)

```typescript jsx
const result = prepare(
    node,
    `main blockquote > span`
);
```

The result is an async object that can be resolved in many ways

First, if used as a promise, will result in an array of matching JSX nodes

```typescript jsx
const [span] = await result
console.log(span); // Is the node for <span>1.0.0</span>
```

If used as an async iterable, then snapshots of results can be accessed, allowing for earlier processing
of earlier found JSX nodes

```typescript jsx
for await (const [span] of result) {
    if (!span) continue;
    // We have at least one span!
    console.log(span) // Is the node for <span>1.0.0</span>
}
```

If used as an iterable, and destructuring is used, the individual destructured values will
be async objects too, which can be used as a promise or async iterable

```typescript jsx
const [firstSpan] = result;
const span = await firstSpan;
console.log(span) // Is the node for <span>1.0.0</span>
```
```typescript jsx
const [firstSpan] = result;
for await (const span of firstSpan) {
    console.log(span) // Is the node for <span>1.0.0</span>
}
```

The async object returned from prepare supports many array like operations, 
like `.at`, `.filter`, `.map`, `.group`, `.flatMap`, and [more](https://github.com/virtualstate/promise/blob/143b070e298b3417ac13b891b818d567c7346522/src/split/type.ts#L104-L138)

These operations are performed on the individual snapshots yielded across the lifecycle of the query process