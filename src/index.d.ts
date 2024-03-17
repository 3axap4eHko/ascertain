export const $keys: symbol;
export const $values: symbol;

type DataKeys = string | number | symbol;
type DataValue = any;
type Data = Record<DataKeys, unknown>;

export type Schema<T> = T extends Data
    ? { [S in keyof T]?: Schema<T[S]> }
    : DataValue;

export function optional<T = any>(schema: Schema<T>): Schema<any>;
export function and<T = any>(...schema: Schema<T>[]): Schema<any>;
export function or<T = any>(...schemas: Schema<T>[]): Schema<any>;

interface As {
    string: (value: string | undefined) => string,
    number: (value: string | undefined) => number,
    date: (value: string | undefined) => Date,
    time: (value: string | undefined) => number,
    boolean: (value: string | undefined) => boolean,
    array: (value: string | undefined, delimiter: string | RegExp) => string[];
    json: <T>(value: string | undefined) => T;
    base64: (value: string | undefined) => string;
}

export const as: As;

export interface Ascertain {
    (data: any): void;
}

export function ascertain<T extends Data = any>(schema: Schema<T>, data: any, rootName?: string): void;

export default function <T extends Data = any>(schema: Schema<T>, data: any, rootName?: string): void;
