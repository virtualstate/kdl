import {f} from "@virtualstate/fringe";
import {UnknownJSXNode} from "./node";

export function h(tag: string | symbol, options?: Record<string, unknown>, ...children: unknown[]): UnknownJSXNode {
    const partialNode: {} = f(tag, options, children);
    return partialNode;
}