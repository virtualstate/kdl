export const operators = {
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
export type Operation = typeof operators[keyof typeof operators]
export const operatorSymbols: Operation[] = Object.values(operators)
    .sort((a, b) => a.length < b.length ? 1 : -1);



const unknownOperatorSymbols: unknown[] = operatorSymbols;

export function isOperation(value: unknown): value is Operation {
    return unknownOperatorSymbols.includes(value);
}

export function operator(left: unknown, right: unknown, op: Operation) {

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