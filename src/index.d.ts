export type Schema = any;

export declare const $keys: unique symbol;
export declare const $values: unique symbol;

export function optional(schema: Schema): Schema;
export function and(...schema: Schema[]): Schema;
export function or(...schemas: Schema[]): Schema;

export interface Ascertain {
    (data: any): void;
}

type SchemaType = any;

export type ConfigSchema<T extends Record<string, unknown>> = {
  [L1 in keyof T]?: T[L1] extends Record<string, unknown>
  ? {
    [L2 in keyof T[L1]]?: T[L1][L2] extends Record<string, unknown>
    ? {
      [L3 in keyof T[L1][L2]]?: T[L1][L2][L3] extends Record<string, unknown>
      ? {
        [L4 in keyof T[L1][L2][L3]]?: T[L1][L2][L3][L4] extends Record<string, unknown>
        ? {
          [L5 in keyof T[L1][L2][L3][L4]]?: SchemaType
        }
        : SchemaType
      }
      : SchemaType
    }
    : SchemaType
  }
  : null
}

export default function <T extends Record<string | number, unknown>>(schema: ConfigSchema<T>, rootName?: string): Ascertain;
