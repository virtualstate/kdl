import {f, VNode} from "@virtualstate/fringe";
import {UnknownJSXNode} from "./index";

export function h(source: unknown, options: Record<string, unknown>, ...children: unknown[]): UnknownJSXNode {
    return {
        source,
        options,
        children
    };
}