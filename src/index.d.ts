export type Schema = any;

export declare const $keys: unique symbol;
export declare const $values: unique symbol;

export function optional(schema: Schema): Schema;
export function and(...schema: Schema[]): Schema;
export function or(...schemas: Schema[]): Schema;

export interface Ascertain {
    (data: any): void;
}

export default function (schema: Schema, rootName?: string): Ascertain;
