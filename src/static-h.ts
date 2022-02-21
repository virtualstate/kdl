import {UnknownJSXNode} from "./index";

export function h(source: unknown, options: Record<string, unknown>, ...children: unknown[]): UnknownJSXNode {
    return {
        source,
        options,
        children
    };
}

export function createFragment(options: Record<string, unknown>, ...children: unknown[]) {
    return h(Symbol.for(":kdl/fragment"), options, ...children);
}