import {h} from "@virtualstate/focus";
import {Outputs} from "./package";
import {ResolveObjectAttributes} from "../../../string";

const Product = <product name="string" sku="string" />
const Order = <order product={<Product />} quantity="number" />

export const orderDocument = <Order />;

export const orderQueries = [
    "order"
] as const;

export const orderOutputs: Outputs<typeof orderQueries> = [
    orderDocument
];

export const orderOptions = {
    /**
     * @experimental
     */
    [ResolveObjectAttributes]: true
} as const;