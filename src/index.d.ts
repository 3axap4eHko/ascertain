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

export interface Ascertain {
    (data: any): void;
}

export default function <T extends Data = any>(schema: Schema<T>, data: any, rootName?: string): void;
