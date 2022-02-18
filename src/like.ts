export function isLike<T>(value: unknown): value is T {
    return !!value;
}

export function ok<T>(value: unknown, message?: string): asserts value is T
export function ok(value: unknown, message?: string): asserts value
export function ok(value: unknown, message?: string): asserts value {
    if (!value) {
        throw new Error(message ?? "Expected value");
    }
}