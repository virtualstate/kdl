export function h(source: unknown, options: Record<string, unknown>, ...children: unknown[]): unknown {
    return {
        source,
        options,
        children
    };
}

export function createFragment(options: Record<string, unknown>, ...children: unknown[]) {
    return h(Symbol.for(":kdl/fragment"), options, ...children);
}

export function named(name: string) {
    return (options: Record<string, unknown>, ...children: unknown[]) => {
        return h(name, options, ...children);
    }
}