import { prepare } from "../prepare";
import {h, name, ok} from "@virtualstate/focus";

const node = (
    <main>
        <h1>@virtualstate/focus</h1>
        <blockquote>Version: <span>1.0.0</span></blockquote>
    </main>
);

{
    const result = prepare(
        node,
        `main blockquote > span`
    );
    const [span] = await result
    console.log(span); // Is the node for <span>1.0.0</span>
    ok(name(span) === "span");

}

{
    const result = prepare(
        node,
        `main blockquote > span`
    );
    let count = 0;
    for await (const [span] of result) {
        if (!span) continue;
        // We have at least one span!
        console.log(span) // Is the node for <span>1.0.0</span>
        ok(name(span) === "span");
        count += 1;
    }
    ok(count);

}
{
    const result = prepare(
        node,
        `main blockquote > span`
    );
    const [firstSpan] = result;
    const span = await firstSpan;
    console.log(span) // Is the node for <span>1.0.0</span>
    ok(name(span) === "span");

}
{
    const result = prepare(
        node,
        `main blockquote > span`
    );
    const [firstSpan] = result;
    let count = 0;
    for await (const span of firstSpan) {
        console.log(span) // Is the node for <span>1.0.0</span>
        ok(name(span) === "span");
        count += 1;
    }
    ok(count);

}

{

    const result = prepare(
        node,
        `main blockquote > span`
    );
    ok(typeof result.at === "function");
    ok(typeof result.filter === "function");
    ok(typeof result.map === "function");
    ok(typeof result.group === "function");
    ok(typeof result.flatMap === "function");
}