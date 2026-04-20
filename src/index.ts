/**
 * Symbol for validating object keys against a schema.
 */
export const $keys = Symbol.for('@@keys');
/**
 * Symbol for validating object values against a schema.
 */
export const $values = Symbol.for('@@values');
/**
 * Symbol for enforcing strict object validation (no extra properties allowed).
 */
export const $strict = Symbol.for('@@strict');

const $op = Symbol.for('@@op');

const OR = Symbol.for('@@or');
const AND = Symbol.for('@@and');
const OPTIONAL = Symbol.for('@@optional');
const TUPLE = Symbol.for('@@tuple');
const DISCRIMINATED = Symbol.for('@@discriminated');
const CHECK = Symbol.for('@@check');
const ERR = Symbol.for('@@err');

interface ErrShape {
  readonly message: string;
  readonly [ERR]: true;
}
function ErrCtor(this: ErrShape, message: string): void {
  (this as { message: string }).message = message;
}
(ErrCtor.prototype as { [ERR]: true })[ERR] = true;

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

interface OrShape<T> {
  readonly schemas: Schema<T>[];
  readonly [$op]: typeof OR;
}
interface AndShape<T> {
  readonly schemas: Schema<T>[];
  readonly [$op]: typeof AND;
}
interface OptionalShape<T> {
  readonly schemas: Schema<T>[];
  readonly [$op]: typeof OPTIONAL;
}
interface TupleShape<T> {
  readonly schemas: Schema<T>[];
  readonly [$op]: typeof TUPLE;
}
interface DiscriminatedShape<T> {
  readonly schemas: Schema<T>[];
  readonly [$op]: typeof DISCRIMINATED;
  readonly key: string;
}
export interface CheckContext {
  ref(value: unknown): string;
}
interface CheckShape {
  readonly [$op]: typeof CHECK;
  readonly compile: (value: string, ctx: CheckContext) => { check: string; message: string };
}

type Tagged<T> = OrShape<T> | AndShape<T> | OptionalShape<T> | TupleShape<T> | DiscriminatedShape<T> | CheckShape;

const OrCtor = function <T>(this: OrShape<T>, schemas: Schema<T>[]) {
  (this as Mutable<OrShape<T>>).schemas = schemas;
} as unknown as { new <T>(schemas: Schema<T>[]): OrShape<T>; prototype: { [$op]: typeof OR } };
OrCtor.prototype[$op] = OR;

const AndCtor = function <T>(this: AndShape<T>, schemas: Schema<T>[]) {
  (this as Mutable<AndShape<T>>).schemas = schemas;
} as unknown as { new <T>(schemas: Schema<T>[]): AndShape<T>; prototype: { [$op]: typeof AND } };
AndCtor.prototype[$op] = AND;

const OptionalCtor = function <T>(this: OptionalShape<T>, schema: Schema<T>) {
  (this as Mutable<OptionalShape<T>>).schemas = [schema];
} as unknown as { new <T>(schema: Schema<T>): OptionalShape<T>; prototype: { [$op]: typeof OPTIONAL } };
OptionalCtor.prototype[$op] = OPTIONAL;

const TupleCtor = function <T>(this: TupleShape<T>, schemas: Schema<T>[]) {
  (this as Mutable<TupleShape<T>>).schemas = schemas;
} as unknown as { new <T>(schemas: Schema<T>[]): TupleShape<T>; prototype: { [$op]: typeof TUPLE } };
TupleCtor.prototype[$op] = TUPLE;

const DiscriminatedCtor = function <T>(this: DiscriminatedShape<T>, schemas: Schema<T>[], key: string) {
  (this as Mutable<DiscriminatedShape<T>>).schemas = schemas;
  (this as Mutable<DiscriminatedShape<T>>).key = key;
} as unknown as { new <T>(schemas: Schema<T>[], key: string): DiscriminatedShape<T>; prototype: { [$op]: typeof DISCRIMINATED } };
DiscriminatedCtor.prototype[$op] = DISCRIMINATED;

const CheckCtor = function (this: CheckShape, compileFn: CheckShape['compile']) {
  (this as Mutable<CheckShape>).compile = compileFn;
} as unknown as { new (compileFn: CheckShape['compile']): CheckShape; prototype: { [$op]: typeof CHECK } };
CheckCtor.prototype[$op] = CHECK;

/**
 * Represents a schema for validating data.
 *
 * Schemas can be defined for various data types, including objects, arrays, and primitives.
 *
 * @template T - The type of data the schema validates.
 */
export type Schema<T> =
  T extends Record<string | number | symbol, unknown>
    ? { [K in keyof T]?: Schema<T[K]> | unknown } & { [$keys]?: Schema<keyof T> } & { [$values]?: Schema<T[keyof T]> } & { [$strict]?: boolean }
    : T extends Array<infer A>
      ? Schema<A>[] | unknown
      : unknown;

/**
 * Operator for validating data against any of the provided schemas (logical OR).
 */
export const or = <T>(...schemas: Schema<T>[]): OrShape<T> => {
  if (schemas.length === 0) throw new TypeError('Operator requires at least one schema');
  return new OrCtor(schemas);
};

/**
 * Operator for validating data against all provided schemas (logical AND).
 */
export const and = <T>(...schemas: Schema<T>[]): AndShape<T> => {
  if (schemas.length === 0) throw new TypeError('Operator requires at least one schema');
  return new AndCtor(schemas);
};

/**
 * Operator for making a schema optional (nullable).
 */
export const optional = <T>(schema: Schema<T>): OptionalShape<T> => new OptionalCtor(schema);

/**
 * Operator for validating data against a fixed-length tuple of schemas.
 */
export const tuple = <T>(...schemas: Schema<T>[]): TupleShape<T> => {
  if (schemas.length === 0) throw new TypeError('Operator requires at least one schema');
  return new TupleCtor(schemas);
};

/**
 * Operator for validating data against a discriminated union.
 *
 * Optimizes validation by checking the discriminant field first and only
 * validating the matching variant. More efficient than `or()` for unions
 * where each variant has a common field with a unique literal value.
 *
 * @param schemas - Array of object schemas, each with a discriminant field containing a literal value.
 * @param key - The name of the discriminant field present in all variants.
 *
 * @example
 * ```typescript
 * const messageSchema = discriminated([
 *   { type: 'email', address: String },
 *   { type: 'sms', phone: String },
 *   { type: 'push', token: String },
 * ], 'type');
 * ```
 */
export const discriminated = <T>(schemas: Schema<T>[], key: string): DiscriminatedShape<T> => {
  if (schemas.length === 0) throw new TypeError('discriminated requires at least one schema');
  return new DiscriminatedCtor(schemas, key);
};

/**
 * Creates a custom validation check.
 * Accepts a predicate function or an object with a compile method for inlined checks.
 *
 * @param fnOrOpts - A predicate function `(value) => boolean` or an object with a `compile` method for code-generating checks.
 * @param message - Optional custom error message.
 */
export const check = (
  fnOrOpts: ((v: unknown) => boolean) | { compile: (value: string, ctx: CheckContext) => { check: string; message: string } },
  message?: string,
): CheckShape => {
  if (typeof fnOrOpts === 'function') {
    return new CheckCtor((v, ctx) => {
      const fnRef = ctx.ref(fnOrOpts);
      return {
        check: `!${fnRef}(${v})`,
        message: message ? JSON.stringify(message) : `\`check failed for value \${${v}}\``,
      };
    });
  }
  return new CheckCtor(fnOrOpts.compile);
};

/**
 * Validates that a numeric value is greater than or equal to `n`.
 *
 * @param n - The minimum allowed value (inclusive).
 * @param message - Optional custom error message.
 */
export const min = (n: number, message?: string): CheckShape =>
  new CheckCtor((v) => ({
    check: `${v} < ${n}`,
    message: message ? JSON.stringify(message) : `\`must be >= ${n}, got \${${v}}\``,
  }));

/**
 * Validates that a numeric value is less than or equal to `n`.
 *
 * @param n - The maximum allowed value (inclusive).
 * @param message - Optional custom error message.
 */
export const max = (n: number, message?: string): CheckShape =>
  new CheckCtor((v) => ({
    check: `${v} > ${n}`,
    message: message ? JSON.stringify(message) : `\`must be <= ${n}, got \${${v}}\``,
  }));

/**
 * Validates that a value is an integer.
 *
 * @param message - Optional custom error message.
 */
export const integer = (message?: string): CheckShape =>
  new CheckCtor((v) => ({
    check: `!Number.isInteger(${v})`,
    message: message ? JSON.stringify(message) : `\`must be an integer, got \${${v}}\``,
  }));

/**
 * Validates that a value's length is greater than or equal to `n`.
 *
 * @param n - The minimum allowed length (inclusive).
 * @param message - Optional custom error message.
 */
export const minLength = (n: number, message?: string): CheckShape =>
  new CheckCtor((v) => ({
    check: `${v}.length < ${n}`,
    message: message ? JSON.stringify(message) : `\`length must be >= ${n}, got \${${v}.length}\``,
  }));

/**
 * Validates that a value's length is less than or equal to `n`.
 *
 * @param n - The maximum allowed length (inclusive).
 * @param message - Optional custom error message.
 */
export const maxLength = (n: number, message?: string): CheckShape =>
  new CheckCtor((v) => ({
    check: `${v}.length > ${n}`,
    message: message ? JSON.stringify(message) : `\`length must be <= ${n}, got \${${v}.length}\``,
  }));

/**
 * Validates that a numeric value is strictly greater than `n`.
 *
 * @param n - The exclusive lower bound.
 * @param message - Optional custom error message.
 */
export const gt = (n: number, message?: string): CheckShape =>
  new CheckCtor((v) => ({
    check: `${v} <= ${n}`,
    message: message ? JSON.stringify(message) : `\`must be > ${n}, got \${${v}}\``,
  }));

/**
 * Validates that a numeric value is strictly less than `n`.
 *
 * @param n - The exclusive upper bound.
 * @param message - Optional custom error message.
 */
export const lt = (n: number, message?: string): CheckShape =>
  new CheckCtor((v) => ({
    check: `${v} >= ${n}`,
    message: message ? JSON.stringify(message) : `\`must be < ${n}, got \${${v}}\``,
  }));

/**
 * Validates that a numeric value is a multiple of `n`.
 *
 * @param n - The divisor to check against.
 * @param message - Optional custom error message.
 */
export const multipleOf = (n: number, message?: string): CheckShape =>
  new CheckCtor((v) => ({
    check: `${v} % ${n} !== 0`,
    message: message ? JSON.stringify(message) : `\`must be a multiple of ${n}, got \${${v}}\``,
  }));

/**
 * Validates that an array contains only unique items.
 *
 * @param message - Optional custom error message.
 */
export const uniqueItems = (message?: string): CheckShape =>
  new CheckCtor((v) => ({
    check: `new Set(${v}).size !== ${v}.length`,
    message: message ? JSON.stringify(message) : `\`must have unique items\``,
  }));

type EnumLike = { [k: string]: string | number; [n: number]: string };

/**
 * Validates that a value is one of the allowed values. Accepts an array or an enum-like object.
 *
 * @param values - Array of allowed values or an enum-like object.
 * @param message - Optional custom error message.
 */
export const oneOf = <T extends EnumLike>(values: (string | number)[] | T, message?: string): CheckShape => {
  const set = new Set(Array.isArray(values) ? values : Object.values(values));
  return new CheckCtor((v, ctx) => ({
    check: `!${ctx.ref(set)}.has(${v})`,
    message: message ? JSON.stringify(message) : `\`must be one of [${[...set].map(toLiteral).join(', ')}], got \${${v}}\``,
  }));
};

/**
 * Decodes a base64-encoded string to UTF-8.
 *
 * Uses `Buffer` in Node.js environments and `atob` in browsers.
 *
 * @param value - The base64-encoded string to decode.
 * @returns The decoded UTF-8 string.
 */
const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder('utf-8');

const fromBase64Bytes = (value: string): Uint8Array => {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

export const fromBase64 = (value: string): string => utf8Decoder.decode(fromBase64Bytes(value));

const HEX_LUT = (() => {
  const t = new Int8Array(256).fill(-1);
  for (let i = 0; i < 10; i++) t[48 + i] = i;
  for (let i = 0; i < 6; i++) {
    t[97 + i] = 10 + i;
    t[65 + i] = 10 + i;
  }
  return t;
})();

const fromHex = (value: string): Uint8Array => {
  let start = 0;
  if (value.length >= 2 && value.charCodeAt(0) === 48 && (value.charCodeAt(1) | 32) === 120) {
    start = 2;
  }
  const digits = value.length - start;
  if (digits === 0 || digits % 2 !== 0) throw new TypeError('invalid hex length');
  const out = new Uint8Array(digits / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = (HEX_LUT[value.charCodeAt(start + i * 2)] << 4) | HEX_LUT[value.charCodeAt(start + i * 2 + 1)];
    if (byte < 0) throw new TypeError('invalid hex digit');
    out[i] = byte;
  }
  return out;
};

const MULTIPLIERS = {
  ms: 1,
  s: 1000,
  m: 60000,
  h: 3600000,
  d: 86400000,
  w: 604800000,
};

const TIME_REGEX = /^(\d*\.?\d*)(ms|s|m|h|d|w)?$/;

/**
 * Creates a TypeError with the given message, typed as T for deferred error handling.
 *
 * Used by `as.*` conversion utilities to return errors that can be caught
 * during schema validation rather than throwing immediately.
 *
 * @template T - The expected return type (for type compatibility with conversion functions).
 * @param message - The error message.
 * @returns A TypeError instance typed as T.
 */
export const asError = <T>(message: string) => new (ErrCtor as unknown as new (m: string) => { message: string; [ERR]: true })(message) as unknown as T;

/**
 * Type casting utilities for parsing strings into typed values.
 * Useful for environment variables, query parameters, and other string inputs.
 * Returns a TypeError for invalid values, enabling deferred validation with `ascertain()`.
 */
export const as = {
  /**
   * Attempts to convert a value to a string.
   *
   * @param value - The value to convert.
   * @returns The value as a string, or a TypeError if not a string.
   */
  string: (value: string | undefined): string => {
    return typeof value === 'string' ? value : asError(`Invalid value "${value}", expected a string`);
  },
  /**
   * Attempts to convert a value to a number.
   *
   * Supports integers, floats, scientific notation (1e10), and prefixed formats:
   * - Hexadecimal: `0x` or `0X` (e.g., `'0xFF'` → 255)
   * - Octal: `0o` or `0O` (e.g., `'0o77'` → 63)
   * - Binary: `0b` or `0B` (e.g., `'0b1010'` → 10)
   *
   * All formats support optional leading sign (`+` or `-`).
   *
   * @param value - The value to convert (expected to be a string representation of a number).
   * @returns The value as a number, or a TypeError if not a valid number.
   */
  number: (value: string | undefined): number => {
    if (typeof value !== 'string') {
      return asError(`Invalid value ${value}, expected a valid number`);
    }
    const start = value[0] === '-' || value[0] === '+' ? 1 : 0;
    const c0 = value.charCodeAt(start);
    const c1 = value.charCodeAt(start + 1) | 32;

    if (c0 === 48 && (c1 === 120 || c1 === 111 || c1 === 98)) {
      // '0' followed by 'x', 'o', or 'b'
      const result = Number(start ? value.slice(1) : value);
      if (Number.isNaN(result)) return asError(`Invalid value ${value}, expected a valid number`);
      return value[0] === '-' ? -result : result;
    }

    const result = value.trim() ? Number(value) : NaN;
    return Number.isNaN(result) ? asError(`Invalid value ${value}, expected a valid number`) : result;
  },
  /**
   * Attempts to convert a value to a Date object.
   *
   * @param value - The value to convert (expected to be a string representation of a date).
   * @returns The value as a Date object, or a TypeError if not a valid date.
   */
  date: (value: string | undefined): Date => {
    const result = Date.parse(value as string);
    const date = new Date(result);
    return Number.isNaN(date.valueOf()) ? asError(`Invalid value "${value}", expected a valid date format`) : date;
  },
  /**
   * Attempts to convert a value to a time duration in milliseconds.
   *
   * @param value - The value to convert (e.g., "5s" for 5 seconds).
   * @param conversionFactor - Optional factor to divide the result by (default is 1).
   * @returns The time duration in milliseconds, or a TypeError if the format is invalid.
   */
  time: (value: string | undefined, conversionFactor = 1): number => {
    if (!value) return asError(`Invalid value ${value}, expected a valid time format`);

    const matches = value.match(TIME_REGEX);
    if (!matches) return asError(`Invalid value ${value}, expected a valid time format`);

    const [, amount, unit = 'ms'] = matches;
    const multiplier = MULTIPLIERS[unit as keyof typeof MULTIPLIERS];
    const parsed = parseFloat(amount);

    if (!multiplier || Number.isNaN(parsed)) {
      return asError(`Invalid value ${value}, expected a valid time format`);
    }

    return Math.floor((parsed * multiplier) / conversionFactor);
  },
  /**
   * Attempts to convert a value to a boolean.
   *
   * @param value - The boolean like value to convert (e.g., "true", "1", "enabled").
   * @returns The value as a boolean, or a TypeError if it could not be converted to a boolean.
   */
  boolean: (value: string | undefined): boolean =>
    /^(0|1|true|false|enabled|disabled)$/i.test(value as string)
      ? /^(1|true|enabled)$/i.test(value as string)
      : asError(`Invalid value ${value}, expected a boolean like`),
  /**
   * Attempts to convert a string into an array of strings by splitting it using the given delimiter.
   *
   * @param value - The string value to attempt to split into an array.
   * @param delimiter - The character or string used to separate elements in the input string.
   * @returns An array of strings if the conversion is successful, or a TypeError if the value is not a string.
   */
  array: (value: string | undefined, delimiter: string): string[] => value?.split?.(delimiter) ?? asError(`Invalid value ${value}, expected an array`),
  /**
   * Attempts to parse a JSON string into a JavaScript object.
   *
   * @template T - The expected type of the parsed JSON object.
   * @param value - The JSON string to attempt to parse.
   * @returns The parsed JSON object if successful, or a TypeError if the value is not valid JSON.
   */
  json: <T = object>(value: string | undefined): T => {
    try {
      return JSON.parse(value as string);
    } catch {
      return asError(`Invalid value ${value}, expected a valid JSON string`);
    }
  },
  /**
   * Attempts to decode a base64-encoded string.
   *
   * @param value - The base64-encoded string to attempt to decode.
   * @returns The decoded string if successful, or a TypeError if the value is not valid base64.
   */
  base64: (value: string | undefined): string => {
    try {
      return fromBase64(value as string);
    } catch {
      return asError(`Invalid value ${value}, expected a valid base64 string`);
    }
  },

  data: (value: string | undefined, type: 'utf-8' | 'hex' | 'base64' = 'utf-8'): Uint8Array => {
    if (typeof value !== 'string') return asError(`Invalid value ${value}, expected a string`);
    try {
      if (type === 'hex') return fromHex(value);
      if (type === 'base64') return fromBase64Bytes(value);
      return utf8Encoder.encode(value);
    } catch {
      return asError(`Invalid value ${value}, expected a valid ${type} string`);
    }
  },
};

const DATETIME_RE = /^\d{4}-[01]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d{2}(?::?\d{2})?)$/i;
const TIME_FMT_RE = /^(?:(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d{2}(?::?\d{2})?)$/i;
const DURATION_RE = /^P(?!$)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?$/;
const EMAIL_RE = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;
const IDN_EMAIL_RE =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF-]+)*@(?:[a-z0-9\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF](?:[a-z0-9\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF-]*[a-z0-9\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])?\.)+[a-z0-9\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF](?:[a-z0-9\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF-]*[a-z0-9\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])?$/i;
const HOSTNAME_RE = /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.?$/i;
const IDN_HOSTNAME_RE =
  /^(?=.{1,253}\.?$)[a-z0-9\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF](?:[a-z0-9\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF-]{0,61}[a-z0-9\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])?(?:\.[a-z0-9\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF](?:[a-z0-9\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF-]{0,61}[a-z0-9\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])?)*\.?$/i;
const IPV4_RE = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const IPV6_RE =
  /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?$/i;
const URI_RE =
  /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
const isUriRef = (s: string): boolean => URI_RE.test(s) || /^[a-z0-9\-._~:/?#\[\]@!$&'()*+,;=%]*$/i.test(s);
const IRI_RE =
  /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|%[0-9a-f]{2})*)?$/i;
const isIriRef = (s: string): boolean => IRI_RE.test(s) || /^[a-z0-9\-._~:/?#\[\]@!$&'()*+,;=\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF%]*$/i.test(s);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const URI_TEMPLATE_RE =
  /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i;
const JSON_POINTER_RE = /^(?:\/(?:[^~/]|~0|~1)*)*$/;
const REL_JSON_POINTER_RE = /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/;

const DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const isValidDate = (s: string): boolean => {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const month = +m[1],
    day = +m[2];
  if (month < 1 || month > 12 || day < 1) return false;
  if (month === 2) {
    const y = +s.slice(0, 4);
    return day <= (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28);
  }
  return day <= DAYS[month];
};

const isValidRegex = (s: string): boolean => {
  try {
    new RegExp(s);
    return true;
  } catch {
    return false;
  }
};

const regexFormat = (re: RegExp, name: string, message?: string): CheckShape =>
  new CheckCtor((v, ctx) => ({
    check: `!${ctx.ref(re)}.test(${v})`,
    message: message ? JSON.stringify(message) : `\`must be a valid ${name}, got \${${v}}\``,
  }));

const fnFormat = (fn: (s: string) => boolean, name: string, message?: string): CheckShape =>
  new CheckCtor((v, ctx) => ({
    check: `!${ctx.ref(fn)}(${v})`,
    message: message ? JSON.stringify(message) : `\`must be a valid ${name}, got \${${v}}\``,
  }));

/**
 * String format validators for common patterns (RFC 3339 date-time, email, URI, UUID, etc.).
 * Each method returns a CheckShape that can be composed with `and()` for schema validation.
 */
export const format = {
  dateTime: (message?: string): CheckShape => regexFormat(DATETIME_RE, 'date-time', message),
  date: (message?: string): CheckShape => fnFormat(isValidDate, 'date', message),
  time: (message?: string): CheckShape => regexFormat(TIME_FMT_RE, 'time', message),
  duration: (message?: string): CheckShape => regexFormat(DURATION_RE, 'duration', message),
  email: (message?: string): CheckShape => regexFormat(EMAIL_RE, 'email', message),
  idnEmail: (message?: string): CheckShape => regexFormat(IDN_EMAIL_RE, 'idn-email', message),
  hostname: (message?: string): CheckShape => regexFormat(HOSTNAME_RE, 'hostname', message),
  idnHostname: (message?: string): CheckShape => regexFormat(IDN_HOSTNAME_RE, 'idn-hostname', message),
  ipv4: (message?: string): CheckShape => regexFormat(IPV4_RE, 'ipv4', message),
  ipv6: (message?: string): CheckShape => regexFormat(IPV6_RE, 'ipv6', message),
  uri: (message?: string): CheckShape => regexFormat(URI_RE, 'uri', message),
  uriReference: (message?: string): CheckShape => fnFormat(isUriRef, 'uri-reference', message),
  iri: (message?: string): CheckShape => regexFormat(IRI_RE, 'iri', message),
  iriReference: (message?: string): CheckShape => fnFormat(isIriRef, 'iri-reference', message),
  uuid: (message?: string): CheckShape => regexFormat(UUID_RE, 'uuid', message),
  uriTemplate: (message?: string): CheckShape => regexFormat(URI_TEMPLATE_RE, 'uri-template', message),
  jsonPointer: (message?: string): CheckShape => regexFormat(JSON_POINTER_RE, 'json-pointer', message),
  relativeJsonPointer: (message?: string): CheckShape => regexFormat(REL_JSON_POINTER_RE, 'relative-json-pointer', message),
  regex: (message?: string): CheckShape => fnFormat(isValidRegex, 'regex', message),
};

/**
 * A class representing the context for schema validation.
 *
 * Stores a registry of values encountered during validation and provides methods for managing it.
 * @internal
 */
class Context {
  public readonly registry: unknown[] = [];
  private readonly lookupMap: Map<unknown, number> = new Map();
  private varIndex = 0;
  public pure = false;

  register(value: unknown): number {
    const index = this.lookupMap.get(value);
    if (index !== undefined) {
      return index;
    }
    {
      const index = this.registry.push(value) - 1;
      this.lookupMap.set(value, index);
      return index;
    }
  }

  unique(prefix: string) {
    return `${prefix}$$${this.varIndex++}`;
  }
}

type Mode =
  | { fast: true; onFail?: string; indexed?: boolean }
  | { fast: false; firstError: true; issues: string; path: PropertyKey[]; pathExpr: string; startVar?: string; dynamicParts?: string[] }
  | {
      fast: false;
      firstError: false;
      issues: string;
      path: PropertyKey[];
      pathExpr: string;
      startVar?: string;
      issuesReady?: boolean;
      dynamicParts?: string[];
    };

const isTagged = (schema: unknown): schema is Tagged<unknown> => (schema as Tagged<unknown>)?.[$op] !== undefined;

const buildDynamicPathExpr = (staticPath: PropertyKey[], dynamicParts: string[]): string =>
  `[${[...staticPath.map((k) => JSON.stringify(k)), ...dynamicParts].join(',')}]`;

const childMode = (mode: Exclude<Mode, { fast: true }>, key: PropertyKey | { dynamic: string }, ctx: Context): Mode => {
  const carryReady = !mode.firstError && mode.issuesReady;
  if (typeof key === 'object' && 'dynamic' in key) {
    const dynamicParts = [...(mode.dynamicParts ?? []), key.dynamic];
    const m: Mode = {
      fast: false,
      firstError: mode.firstError,
      issues: mode.issues,
      path: mode.path,
      pathExpr: buildDynamicPathExpr(mode.path, dynamicParts),
      dynamicParts,
    };
    if (carryReady) (m as { issuesReady: boolean }).issuesReady = true;
    return m;
  }
  if (mode.dynamicParts) {
    const dynamicParts = [...mode.dynamicParts, JSON.stringify(key)];
    const m: Mode = {
      fast: false,
      firstError: mode.firstError,
      issues: mode.issues,
      path: mode.path,
      pathExpr: buildDynamicPathExpr(mode.path, dynamicParts),
      dynamicParts,
    };
    if (carryReady) (m as { issuesReady: boolean }).issuesReady = true;
    return m;
  }
  const newPath = [...mode.path, key];
  const pathExpr = `reg[${ctx.register(Object.freeze(newPath))}]`;
  const m: Mode = { fast: false, firstError: mode.firstError, issues: mode.issues, path: newPath, pathExpr };
  if (carryReady) (m as { issuesReady: boolean }).issuesReady = true;
  return m;
};

const toLiteral = (value: unknown): string => (typeof value === 'bigint' ? `${value}n` : JSON.stringify(value));

const collapsibleTypeOf = (s: unknown): string | null =>
  s === String
    ? 'string'
    : s === Number
      ? 'number'
      : s === Boolean
        ? 'boolean'
        : s === BigInt
          ? 'bigint'
          : s === Symbol
            ? 'symbol'
            : typeof s === 'function' && (s as { name?: string })?.name === 'Function'
              ? 'function'
              : null;

const buildCollapsedOr = (schemas: unknown[], v: string): string => {
  let hasNull = false;
  let hasUndefined = false;
  const groups = new Map<string, { ctor: boolean; literals: unknown[] }>();
  for (const s of schemas) {
    if (s === null) {
      hasNull = true;
      continue;
    }
    if (s === undefined) {
      hasUndefined = true;
      continue;
    }
    const ct = collapsibleTypeOf(s);
    if (ct) {
      let g = groups.get(ct);
      if (!g) {
        g = { ctor: false, literals: [] };
        groups.set(ct, g);
      }
      g.ctor = true;
      continue;
    }
    const t = typeof s;
    let g = groups.get(t);
    if (!g) {
      g = { ctor: false, literals: [] };
      groups.set(t, g);
    }
    g.literals.push(s);
  }
  const clauses: string[] = [];
  if (hasNull) clauses.push(`${v} === null`);
  if (hasUndefined) clauses.push(`${v} === undefined`);
  for (const [type, { ctor, literals }] of groups) {
    if (ctor) {
      clauses.push(type === 'number' ? `(typeof ${v} === 'number' && ${v} === ${v})` : `typeof ${v} === '${type}'`);
    } else if (literals.length === 1) {
      clauses.push(`${v} === ${toLiteral(literals[0])}`);
    } else {
      clauses.push(`(typeof ${v} === '${type}' && (${literals.map((l) => `${v} === ${toLiteral(l)}`).join(' || ')}))`);
    }
  }
  return clauses.join(' || ');
};

const buildExpectedDesc = (schemas: unknown[]): string => {
  const parts: string[] = [];
  for (const s of schemas) {
    if (s === null) parts.push('null');
    else if (s === undefined) parts.push('undefined');
    else if (collapsibleTypeOf(s) !== null) parts.push((s as { name: string }).name);
    else parts.push(toLiteral(s) as string);
  }
  return parts.join(', ');
};

const isCollapsible = (s: unknown): boolean =>
  s === null || s === undefined || (typeof s !== 'object' && typeof s !== 'function' && typeof s !== 'symbol') || collapsibleTypeOf(s) !== null;

const codeGen = <T>(schema: Schema<T>, context: Context, valuePath: string, mode: Mode): string => {
  const emit = mode.fast
    ? null
    : mode.firstError
      ? (msg: string) => `${mode.issues} = [{ message: ${msg}, path: ${mode.pathExpr} }]; return ${mode.issues};`
      : !mode.firstError && mode.issuesReady
        ? (msg: string) => `${mode.issues}.push({ message: ${msg}, path: ${mode.pathExpr} });`
        : (msg: string) => `(${mode.issues} || (${mode.issues} = [])).push({ message: ${msg}, path: ${mode.pathExpr} });`;
  const fail = mode.fast ? (mode.onFail ?? 'return false;') : '';
  const errChk = (v: string) => (context.pure ? '' : ` || (typeof ${v} === 'object' && ${v} !== null && ${v}[err] === true)`);
  const errBranch = (v: string) =>
    context.pure ? '' : `else if (typeof ${v} === 'object' && ${v} !== null && ${v}[err] === true) { ${emit!(`\`\${${v}.message}\``)} }`;

  if (isTagged(schema)) {
    const tag = schema[$op];
    if (tag === AND) {
      const valueAlias = context.unique('v');
      const code = schema.schemas.map((s) => codeGen(s, context, valueAlias, mode)).join('\n');
      return `const ${valueAlias} = ${valuePath};\n${code}`;
    } else if (tag === OR) {
      const valueAlias = context.unique('v');
      const foundValid = context.unique('valid');
      if (mode.fast) {
        const collapsible: unknown[] = [];
        const complex: Schema<T>[] = [];
        for (const s of schema.schemas) {
          if (isCollapsible(s)) collapsible.push(s);
          else complex.push(s as Schema<T>);
        }
        if (collapsible.length > 0 && complex.length === 0) {
          return `const ${valueAlias} = ${valuePath};\nif (!(${buildCollapsedOr(collapsible, valueAlias)})) { ${fail} }`;
        }
        if (collapsible.length > 0) {
          const condition = buildCollapsedOr(collapsible, valueAlias);
          const branches = complex.map((s) => {
            const branchValid = context.unique('valid');
            const branchCode = codeGen(s, context, valueAlias, { ...mode, onFail: `${branchValid} = false;` });
            return `if (!${foundValid}) { let ${branchValid} = true; ${branchCode} if (${branchValid}) { ${foundValid} = true; } }`;
          });
          return `const ${valueAlias} = ${valuePath};\nlet ${foundValid} = ${condition};\n${branches.join('\n')}\nif (!${foundValid}) { ${fail} }`;
        }
        const branches = schema.schemas.map((s) => {
          const branchValid = context.unique('valid');
          const branchCode = codeGen(s, context, valueAlias, { ...mode, onFail: `${branchValid} = false;` });
          return `if (!${foundValid}) { let ${branchValid} = true; ${branchCode} if (${branchValid}) { ${foundValid} = true; } }`;
        });
        return `const ${valueAlias} = ${valuePath};\nlet ${foundValid} = false;\n${branches.join('\n')}\nif (!${foundValid}) { ${fail} }`;
      } else if (mode.firstError) {
        if (schema.schemas.every(isCollapsible)) {
          const condition = buildCollapsedOr(schema.schemas, valueAlias);
          const expected = buildExpectedDesc(schema.schemas);
          return `const ${valueAlias} = ${valuePath};\nif (!(${condition})) { ${mode.issues} = [{ message: \`Invalid value \${${valueAlias}}, expected one of: ${expected}\`, path: ${mode.pathExpr} }]; return ${mode.issues}; }`;
        }
        const firstBranchIssues = context.unique('iss');
        const branches = schema.schemas.map((s, idx) => {
          const branchIssues = context.unique('iss');
          const branchCode = codeGen(s, context, valueAlias, {
            fast: false,
            firstError: true,
            issues: branchIssues,
            path: mode.path,
            pathExpr: mode.pathExpr,
          }).replace(new RegExp(`; return ${branchIssues};`, 'g'), ';');
          if (idx === 0) {
            return `if (!${foundValid}) { let ${branchIssues}; ${branchCode} if (!${branchIssues}) { ${foundValid} = true; } else { ${firstBranchIssues} = ${branchIssues}; } }`;
          }
          return `if (!${foundValid}) { let ${branchIssues}; ${branchCode} if (!${branchIssues}) { ${foundValid} = true; } }`;
        });
        return `const ${valueAlias} = ${valuePath};\nlet ${firstBranchIssues};\nlet ${foundValid} = false;\n${branches.join('\n')}\nif (!${foundValid}) { return ${firstBranchIssues}; }`;
      } else {
        if (schema.schemas.every(isCollapsible)) {
          const condition = buildCollapsedOr(schema.schemas, valueAlias);
          const expected = buildExpectedDesc(schema.schemas);
          const push = mode.issuesReady
            ? `${mode.issues}.push({ message: \`Invalid value \${${valueAlias}}, expected one of: ${expected}\`, path: ${mode.pathExpr} });`
            : `(${mode.issues} || (${mode.issues} = [])).push({ message: \`Invalid value \${${valueAlias}}, expected one of: ${expected}\`, path: ${mode.pathExpr} });`;
          return `const ${valueAlias} = ${valuePath};\nif (!(${condition})) { ${push} }`;
        }
        const localIssues = context.unique('iss');
        const branches = schema.schemas.map((s) => {
          const branchIssues = context.unique('iss');
          const branchCode = codeGen(s, context, valueAlias, {
            fast: false,
            firstError: false,
            issues: branchIssues,
            path: mode.path,
            pathExpr: mode.pathExpr,
          });
          return `if (!${foundValid}) { let ${branchIssues}; ${branchCode} if (!${branchIssues}) { ${foundValid} = true; } else { ${localIssues}.push(...${branchIssues}); } }`;
        });
        const pushExpr =
          !mode.fast && !mode.firstError && mode.issuesReady
            ? `${mode.issues}.push(...${localIssues})`
            : `(${mode.issues} || (${mode.issues} = [])).push(...${localIssues})`;
        return `const ${valueAlias} = ${valuePath};\nconst ${localIssues} = [];\nlet ${foundValid} = false;\n${branches.join('\n')}\nif (!${foundValid}) { ${pushExpr}; }`;
      }
    } else if (tag === OPTIONAL) {
      const valueAlias = context.unique('v');
      const inner = (schema as OptionalShape<T>).schemas[0];
      if (!mode.fast && typeof inner === 'function') {
        const iname = (inner as { name?: string })?.name;
        const is = inner as unknown;
        const pt =
          is === String ? 'string' : is === Number ? 'number' : is === Boolean ? 'boolean' : is === BigInt ? 'bigint' : is === Symbol ? 'symbol' : null;
        if (pt) {
          const typeMsgs = Object.fromEntries(
            ['string', 'number', 'boolean', 'bigint', 'symbol', 'undefined', 'object', 'function'].map((t) => [t, `Invalid type ${t}, expected type ${iname}`]),
          );
          const typeMsgIdx = context.register(typeMsgs);
          const lines = [`const ${valueAlias} = ${valuePath};`, `if (${valueAlias} !== undefined && ${valueAlias} !== null) {`];
          lines.push(`if (typeof ${valueAlias} !== '${pt}') { ${emit!(`reg[${typeMsgIdx}][typeof ${valueAlias}]`)} }`);
          if (pt === 'number') lines.push(`else if (${valueAlias} !== ${valueAlias}) { ${emit!(`"Invalid value NaN, expected a valid ${iname}"`)} }`);
          lines.push(`}`);
          return lines.join('\n');
        }
      }
      return `const ${valueAlias} = ${valuePath};\nif (${valueAlias} !== undefined && ${valueAlias} !== null) { ${codeGen(inner, context, valueAlias, mode)} }`;
    } else if (tag === TUPLE) {
      const valueAlias = context.unique('v');
      if (mode.fast) {
        return `const ${valueAlias} = ${valuePath};\nif (${valueAlias} === null || typeof ${valueAlias} !== 'object' || !Array.isArray(${valueAlias}) || ${valueAlias}.length !== ${schema.schemas.length}) { ${fail} }\n${schema.schemas.map((s, idx) => codeGen(s, context, `${valueAlias}[${idx}]`, mode)).join('\n')}`;
      } else {
        return [
          `const ${valueAlias} = ${valuePath};`,
          `if (${valueAlias} === null || ${valueAlias} === undefined) { ${emit!(`\`Invalid value \${${valueAlias}}, expected non-nullable\``)} }`,
          `else if (typeof ${valueAlias} !== 'object') { ${emit!(`\`Invalid type \${typeof ${valueAlias}}, expected an instance of Array\``)} }`,
          `else if (!Array.isArray(${valueAlias})) { ${emit!(`\`Invalid instance of \${${valueAlias}.constructor?.name}, expected an instance of Array\``)} }`,
          `else if (${valueAlias}.length !== ${schema.schemas.length}) { ${emit!(`\`Invalid tuple length \${${valueAlias}.length}, expected ${schema.schemas.length}\``)} }`,
          `else { ${schema.schemas.map((s, idx) => codeGen(s, context, `${valueAlias}[${idx}]`, childMode(mode, idx, context))).join('\n')} }`,
        ].join('\n');
      }
    } else if (tag === CHECK) {
      const valueAlias = context.unique('v');
      const ref = (v: unknown) => `reg[${context.register(v)}]`;
      const { check: cond, message } = (schema as CheckShape).compile(valueAlias, { ref });
      if (mode.fast) {
        return `const ${valueAlias} = ${valuePath};\nif (${cond}) { ${fail} }`;
      }
      return `const ${valueAlias} = ${valuePath};\nif (${cond}) { ${emit!(message)} }`;
    } else {
      const { key, schemas } = schema as DiscriminatedShape<T>;
      const valueAlias = context.unique('v');
      const discriminantAlias = context.unique('d');
      const keyStr = JSON.stringify(key);

      const variants: { value: unknown; schema: Schema<T> }[] = [];
      for (const s of schemas) {
        if (typeof s !== 'object' || s === null || !(key in s)) {
          throw new TypeError(`discriminated: each schema must have the discriminant key "${key}"`);
        }
        const discriminantValue = (s as Record<string, unknown>)[key];
        if (typeof discriminantValue !== 'string' && typeof discriminantValue !== 'number' && typeof discriminantValue !== 'boolean') {
          throw new TypeError(`discriminated: discriminant value must be a string, number, or boolean literal`);
        }
        variants.push({ value: discriminantValue, schema: s });
      }

      const genVariantProps = (s: Schema<T>, variantMode: Mode) => {
        const obj = s as Record<string, unknown>;
        return Object.entries(obj)
          .filter(([k]) => k !== key)
          .map(([k, ps]) =>
            codeGen(ps as Schema<T>, context, `${valueAlias}[${JSON.stringify(k)}]`, variantMode.fast ? variantMode : childMode(variantMode, k, context)),
          )
          .join('\n');
      };

      if (mode.fast) {
        const branches = variants.map(({ value, schema: s }) => {
          return `if (${discriminantAlias} === ${JSON.stringify(value)}) { ${genVariantProps(s, mode)} }`;
        });
        return [
          `const ${valueAlias} = ${valuePath};`,
          `if (${valueAlias} === null || ${valueAlias} === undefined || typeof ${valueAlias} !== 'object'${errChk(valueAlias)}) { ${fail} }`,
          `const ${discriminantAlias} = ${valueAlias}[${keyStr}];`,
          branches.join(' else ') + ` else { ${fail} }`,
        ].join('\n');
      } else {
        const validValues = variants.map((v) => JSON.stringify(v.value)).join(', ');
        const branches = variants.map(({ value, schema: s }) => {
          return `if (${discriminantAlias} === ${JSON.stringify(value)}) { ${genVariantProps(s, mode)} }`;
        });
        return [
          `const ${valueAlias} = ${valuePath};`,
          `if (${valueAlias} === null || ${valueAlias} === undefined) { ${emit!(`\`Invalid value \${${valueAlias}}, expected non-nullable\``)} }`,
          `else if (typeof ${valueAlias} !== 'object') { ${emit!(`\`Invalid type \${typeof ${valueAlias}}, expected an object\``)} }`,
          `${errBranch(valueAlias)}`,
          `else {`,
          `  const ${discriminantAlias} = ${valueAlias}[${keyStr}];`,
          `  ${branches.join(' else ')} else { ${emit!(`"Invalid discriminant value " + String(${discriminantAlias}) + ", expected one of: ${validValues.replace(/"/g, "'")}"`)} }`,
          `}`,
        ].join('\n');
      }
    }
  }

  if (typeof schema === 'function') {
    const valueAlias = context.unique('v');
    const name = (schema as { name?: string })?.name;
    const s = schema as unknown;
    const primitiveType =
      s === String ? 'string' : s === Number ? 'number' : s === Boolean ? 'boolean' : s === BigInt ? 'bigint' : s === Symbol ? 'symbol' : null;

    if (mode.fast) {
      if (primitiveType) {
        const checks = [`typeof ${valueAlias} !== '${primitiveType}'`];
        if (primitiveType === 'number') checks.push(`${valueAlias} !== ${valueAlias}`);
        return `const ${valueAlias} = ${valuePath};\nif (${checks.join(' || ')}) { ${fail} }`;
      } else if (name === 'Function') {
        return `const ${valueAlias} = ${valuePath};\nif (typeof ${valueAlias} !== 'function') { ${fail} }`;
      } else {
        const isError = (schema as unknown) === Error || schema?.prototype instanceof Error;
        const index = context.register(schema);
        const registryAlias = context.unique('r');
        return `const ${valueAlias} = ${valuePath};\nconst ${registryAlias} = reg[${index}];\nif (${valueAlias} === null || ${valueAlias} === undefined${isError || context.pure ? '' : ` || (typeof ${valueAlias} === 'object' && ${valueAlias}[err] === true)`} || (typeof ${valueAlias} === 'object' && !(${valueAlias} instanceof ${registryAlias})) || (typeof ${valueAlias} !== 'object' && ${valueAlias}?.constructor !== ${registryAlias}) || Number.isNaN(${valueAlias}?.valueOf?.())) { ${fail} }`;
      }
    } else {
      const code: string[] = [`const ${valueAlias} = ${valuePath};`];
      if (primitiveType) {
        const typeMsgs = Object.fromEntries(
          ['string', 'number', 'boolean', 'bigint', 'symbol', 'undefined', 'object', 'function'].map((t) => [t, `Invalid type ${t}, expected type ${name}`]),
        );
        const typeMsgIdx = context.register(typeMsgs);
        code.push(
          `if (${valueAlias} === null || ${valueAlias} === undefined) { ${emit!(`${valueAlias} === null ? "Invalid value null, expected non-nullable" : "Invalid value undefined, expected non-nullable"`)} }`,
        );
        code.push(`${errBranch(valueAlias)}`);
        code.push(`else if (typeof ${valueAlias} !== '${primitiveType}') { ${emit!(`reg[${typeMsgIdx}][typeof ${valueAlias}]`)} }`);
        if (primitiveType === 'number') code.push(`else if (${valueAlias} !== ${valueAlias}) { ${emit!(`"Invalid value NaN, expected a valid ${name}"`)} }`);
      } else if (name === 'Function') {
        code.push(`if (${valueAlias} === null || ${valueAlias} === undefined) { ${emit!(`\`Invalid value \${${valueAlias}}, expected non-nullable\``)} }`);
        code.push(`${errBranch(valueAlias)}`);
        code.push(`else if (typeof ${valueAlias} !== 'function') { ${emit!(`\`Invalid type \${typeof ${valueAlias}}, expected type Function\``)} }`);
      } else {
        const isError = (schema as unknown) === Error || schema?.prototype instanceof Error;
        const index = context.register(schema);
        const registryAlias = context.unique('r');
        code.push(`const ${registryAlias} = reg[${index}];`);
        code.push(`if (${valueAlias} === null || ${valueAlias} === undefined) { ${emit!(`\`Invalid value \${${valueAlias}}, expected non-nullable\``)} }`);
        if (!isError) code.push(`${errBranch(valueAlias)}`);
        code.push(
          `else if (typeof ${valueAlias} === 'object' && !(${valueAlias} instanceof ${registryAlias})) { ${emit!(`\`Invalid instance of \${${valueAlias}?.constructor?.name}, expected an instance of ${name}\``)} }`,
        );
        code.push(
          `else if (typeof ${valueAlias} !== 'object' && ${valueAlias}?.constructor !== ${registryAlias}) { ${emit!(`\`Invalid type \${${valueAlias}?.constructor?.name}, expected type ${name}\``)} }`,
        );
        code.push(`else if (Number.isNaN(${valueAlias}?.valueOf?.())) { ${emit!(`\`Invalid value \${${valueAlias}}, expected a valid ${name}\``)} }`);
      }
      return code.join('\n');
    }
  }

  if (Array.isArray(schema)) {
    const valueAlias = context.unique('v');
    if (mode.fast) {
      let code = `const ${valueAlias} = ${valuePath};\nif (!Array.isArray(${valueAlias})) { ${fail} }`;
      if (schema.length === 1) {
        const value = context.unique('val');
        const key = context.unique('key');
        code += `\nfor (let ${key} = 0; ${key} < ${valueAlias}.length; ${key}++) { const ${value} = ${valueAlias}[${key}]; ${codeGen(schema[0], context, value, mode)} }`;
      } else if (schema.length > 1) {
        code += `\nif (${valueAlias}.length > ${schema.length}) { ${fail} }`;
        code += '\n' + schema.map((s, idx) => codeGen(s, context, `${valueAlias}[${idx}]`, mode)).join('\n');
      }
      return code;
    } else {
      const arrTypeMsgs = Object.fromEntries(
        ['string', 'number', 'boolean', 'bigint', 'symbol', 'undefined', 'function'].map((t) => [t, `Invalid type ${t}, expected an instance of Array`]),
      );
      const arrTypeMsgIdx = context.register(arrTypeMsgs);
      const code: string[] = [
        `const ${valueAlias} = ${valuePath};`,
        `if (${valueAlias} === null || ${valueAlias} === undefined) { ${emit!(`${valueAlias} === null ? "Invalid value null, expected non-nullable" : "Invalid value undefined, expected non-nullable"`)} }`,
        `${errBranch(valueAlias)}`,
        `else if (typeof ${valueAlias} !== 'object') { ${emit!(`reg[${arrTypeMsgIdx}][typeof ${valueAlias}]`)} }`,
        `else if (!Array.isArray(${valueAlias})) { ${emit!(`\`Invalid instance of \${${valueAlias}.constructor?.name}, expected an instance of Array\``)} }`,
      ];
      if (schema.length > 0) {
        const value = context.unique('val');
        const key = context.unique('key');
        if (schema.length === 1) {
          // Dynamic key - use runtime concat
          code.push(
            `else { for (let ${key} = 0; ${key} < ${valueAlias}.length; ${key}++) { const ${value} = ${valueAlias}[${key}]; ${codeGen(schema[0], context, value, childMode(mode, { dynamic: key }, context))} } }`,
          );
        } else {
          code.push(
            `else if (${valueAlias}.length > ${schema.length}) { ${emit!(`\`Invalid tuple length \${${valueAlias}.length}, expected ${schema.length}\``)} }`,
          );
          code.push(`else { ${schema.map((s, idx) => codeGen(s, context, `${valueAlias}[${idx}]`, childMode(mode, idx, context))).join('\n')} }`);
        }
      }
      return code.join('\n');
    }
  }

  if (typeof schema === 'object' && schema !== null) {
    if (schema instanceof RegExp) {
      const valueAlias = context.unique('v');
      if (mode.fast) {
        return `const ${valueAlias} = ${valuePath};\nif (${valueAlias} === null || ${valueAlias} === undefined${errChk(valueAlias)} || !${schema.toString()}.test(String(${valueAlias}))) { ${fail} }`;
      } else {
        return `const ${valueAlias} = ${valuePath};\nif (${valueAlias} === null || ${valueAlias} === undefined) { ${emit!(`\`Invalid value \${${valueAlias}}, expected non-nullable\``)} }\n${errBranch(valueAlias)}\n${context.pure ? '' : 'else '}if (!${schema.toString()}.test(String(${valueAlias}))) { ${emit!(`\`Invalid value \${${valueAlias}}, expected to match ${schema.toString()}\``)} }`;
      }
    } else {
      const valueAlias = context.unique('v');
      if (mode.fast) {
        const indexed = mode.indexed && !mode.onFail;
        const rootFail = indexed ? 'return 0;' : fail;
        let code = `const ${valueAlias} = ${valuePath};\nif (${valueAlias} === null || typeof ${valueAlias} !== 'object'${errChk(valueAlias)}) { ${rootFail} }`;
        if ($keys in schema) {
          const kAlias = context.unique('k');
          code += `\nfor (const ${kAlias} in ${valueAlias}) { ${codeGen(schema[$keys], context, kAlias, indexed ? { fast: true, onFail: 'return 0;' } : mode)} }`;
        }
        if ($values in schema) {
          const kAlias = context.unique('k');
          code += `\nfor (const ${kAlias} in ${valueAlias}) { ${codeGen(schema[$values], context, `${valueAlias}[${kAlias}]`, indexed ? { fast: true, onFail: 'return 0;' } : mode)} }`;
        }
        if ($strict in schema && schema[$strict]) {
          const allowedRef = `reg[${context.register(Object.fromEntries(Object.keys(schema).map((k) => [k, 1])))}]`;
          const kAlias = context.unique('k');
          code += `\nfor (const ${kAlias} in ${valueAlias}) { if (!Object.hasOwn(${allowedRef}, ${kAlias})) { ${rootFail} } }`;
        }
        const entries = Object.entries(schema);
        code +=
          '\n' +
          entries
            .map(([key, s], idx) => {
              const propMode: Mode = indexed ? { fast: true, onFail: `return ${idx + 1};` } : mode;
              return codeGen(s, context, `${valueAlias}[${JSON.stringify(key)}]`, propMode);
            })
            .join('\n');
        if (indexed) code += `\nreturn -1;`;
        return code;
      } else {
        const sv = !mode.fast && mode.startVar;
        const code: string[] = [`const ${valueAlias} = ${valuePath};`];

        if (sv) {
          const rootCase: string[] = [];
          if (mode.firstError) {
            rootCase.push(
              `if (${valueAlias} === null || ${valueAlias} === undefined) { ${emit!(`\`Invalid value \${${valueAlias}}, expected non-nullable\``)} }`,
            );
            rootCase.push(
              `else if (typeof ${valueAlias} !== 'object') { ${emit!(`\`Invalid type \${typeof ${valueAlias}}, expected an instance of Object\``)} }`,
            );
            rootCase.push(`${errBranch(valueAlias)}`);
          } else {
            rootCase.push(
              `if (${valueAlias} === null || ${valueAlias} === undefined) { ${emit!(`\`Invalid value \${${valueAlias}}, expected non-nullable\``)} break; }`,
            );
            rootCase.push(
              `else if (typeof ${valueAlias} !== 'object') { ${emit!(`\`Invalid type \${typeof ${valueAlias}}, expected an instance of Object\``)} break; }`,
            );
            if (!context.pure)
              rootCase.push(`else if (typeof ${valueAlias} === 'object' && ${valueAlias}[err] === true) { ${emit!(`\`\${${valueAlias}.message}\``)} break; }`);
          }
          if ($keys in schema) {
            const kAlias = context.unique('k');
            rootCase.push(
              `for (const ${kAlias} in ${valueAlias}) { ${codeGen(schema[$keys], context, kAlias, childMode(mode, { dynamic: kAlias }, context))} }`,
            );
          }
          if ($values in schema) {
            const kAlias = context.unique('k');
            rootCase.push(
              `for (const ${kAlias} in ${valueAlias}) { ${codeGen(schema[$values], context, `${valueAlias}[${kAlias}]`, childMode(mode, { dynamic: kAlias }, context))} }`,
            );
          }
          if ($strict in schema && schema[$strict]) {
            const allowedRef = `reg[${context.register(Object.fromEntries(Object.keys(schema).map((k) => [k, 1])))}]`;
            const kAlias = context.unique('k');
            const extraAlias = context.unique('ex');
            rootCase.push(`const ${extraAlias} = [];`);
            rootCase.push(`for (const ${kAlias} in ${valueAlias}) { if (!Object.hasOwn(${allowedRef}, ${kAlias})) ${extraAlias}.push(${kAlias}); }`);
            rootCase.push(`if (${extraAlias}.length !== 0) { ${emit!(`\`Extra properties: \${${extraAlias}}, are not allowed\``)} }`);
          }
          code.push(`switch (${sv}) {`);
          code.push(`case 0: { ${rootCase.join('\n')} }`);
          const entries = Object.entries(schema);
          entries.forEach(([key, s], idx) => {
            const propCode = codeGen(s, context, `${valueAlias}[${JSON.stringify(key)}]`, childMode(mode, key, context));
            code.push(`case ${idx + 1}: { ${propCode} }`);
          });
          code.push(`}`);
          return code.join('\n');
        }

        code.push(`if (${valueAlias} === null || ${valueAlias} === undefined) { ${emit!(`\`Invalid value \${${valueAlias}}, expected non-nullable\``)} }`);
        code.push(`else if (typeof ${valueAlias} !== 'object') { ${emit!(`\`Invalid type \${typeof ${valueAlias}}, expected an instance of Object\``)} }`);
        code.push(`${errBranch(valueAlias)}`);
        code.push('else {');
        const innerCode: string[] = [];
        if ($keys in schema) {
          const kAlias = context.unique('k');
          innerCode.push(
            `for (const ${kAlias} in ${valueAlias}) { ${codeGen(schema[$keys], context, kAlias, childMode(mode, { dynamic: kAlias }, context))} }`,
          );
        }
        if ($values in schema) {
          const kAlias = context.unique('k');
          innerCode.push(
            `for (const ${kAlias} in ${valueAlias}) { ${codeGen(schema[$values], context, `${valueAlias}[${kAlias}]`, childMode(mode, { dynamic: kAlias }, context))} }`,
          );
        }
        if ($strict in schema && schema[$strict]) {
          const allowedRef = `reg[${context.register(Object.fromEntries(Object.keys(schema).map((k) => [k, 1])))}]`;
          const kAlias = context.unique('k');
          const extraAlias = context.unique('ex');
          innerCode.push(`const ${extraAlias} = [];`);
          innerCode.push(`for (const ${kAlias} in ${valueAlias}) { if (!Object.hasOwn(${allowedRef}, ${kAlias})) ${extraAlias}.push(${kAlias}); }`);
          innerCode.push(`if (${extraAlias}.length !== 0) { ${emit!(`\`Extra properties: \${${extraAlias}}, are not allowed\``)} }`);
        }
        const entries = Object.entries(schema);
        innerCode.push(...entries.map(([key, s]) => codeGen(s, context, `${valueAlias}[${JSON.stringify(key)}]`, childMode(mode, key, context))));
        code.push(innerCode.join('\n'), '}');
        return code.join('\n');
      }
    }
  }

  if (typeof schema === 'symbol') {
    const index = context.register(schema);
    const valueAlias = context.unique('v');
    const registryAlias = context.unique('r');
    if (mode.fast) {
      return `const ${valueAlias} = ${valuePath};\nconst ${registryAlias} = reg[${index}];\nif (typeof ${valueAlias} !== 'symbol' || ${valueAlias} !== ${registryAlias}) { ${fail} }`;
    } else {
      return `const ${valueAlias} = ${valuePath};\nconst ${registryAlias} = reg[${index}];\nif (typeof ${valueAlias} !== 'symbol') { ${emit!(`\`Invalid type \${typeof ${valueAlias}}, expected symbol\``)} }\nelse if (${valueAlias} !== ${registryAlias}) { ${emit!(`\`Invalid value \${${valueAlias}.toString()}, expected ${schema.toString()}\``)} }`;
    }
  }

  if (schema === null || schema === undefined) {
    const valueAlias = context.unique('v');
    if (mode.fast) {
      return `const ${valueAlias} = ${valuePath};\nif (${valueAlias} !== null && ${valueAlias} !== undefined) { ${fail} }`;
    } else {
      return `const ${valueAlias} = ${valuePath};\nif (${valueAlias} !== null && ${valueAlias} !== undefined) { ${emit!(`\`Invalid value \${String(${valueAlias})}, expected nullable\``)} }`;
    }
  }

  const valueAlias = context.unique('v');
  if (mode.fast) {
    return `const ${valueAlias} = ${valuePath};\nif (typeof ${valueAlias} !== '${typeof schema}' || ${valueAlias} !== ${toLiteral(schema)}) { ${fail} }`;
  } else {
    const value = context.unique('val');
    return context.pure
      ? `const ${valueAlias} = ${valuePath};\nconst ${value} = ${toLiteral(schema)};\nif (typeof ${valueAlias} !== '${typeof schema}') { ${emit!(`\`Invalid type \${typeof ${valueAlias}}, expected ${typeof schema}\``)} }\nelse if (${valueAlias} !== ${value}) { ${emit!(`\`Invalid value \${String(${valueAlias})}, expected ${toLiteral(schema)}\``)} }`
      : `const ${valueAlias} = ${valuePath};\nconst ${value} = ${toLiteral(schema)};\nif (typeof ${valueAlias} === 'object' && ${valueAlias} !== null && ${valueAlias}[err] === true) { ${emit!(`\`\${${valueAlias}.message}\``)} }\nelse if (typeof ${valueAlias} !== '${typeof schema}') { ${emit!(`\`Invalid type \${typeof ${valueAlias}}, expected ${typeof schema}\``)} }\nelse if (${valueAlias} !== ${value}) { ${emit!(`\`Invalid value \${String(${valueAlias})}, expected ${toLiteral(schema)}\``)} }`;
  }
};

const emptyIssues: StandardSchemaV1.Issue[] = [];

/**
 * Validator function returned by compile().
 * Returns true if valid, false if invalid.
 * Access `.issues` property after validation to get error details.
 */
export interface Validator<T> {
  (data: T): boolean;
  issues: ReadonlyArray<StandardSchemaV1.Issue>;
}

/**
 * Options for the compile function.
 */
export interface CompileOptions {
  /**
   * When true, collects all validation errors instead of stopping at the first.
   * Default is false (first-error mode) for optimal performance.
   */
  allErrors?: boolean;
  /**
   * When true, skips `instanceof Error` checks in the fast validator.
   * Enable this when the data does not come from `as.*` converters for maximum performance.
   * Error messages in the issue validator are unaffected.
   */
  pure?: boolean;
}

/**
 * Compiles a schema into a high-performance validation function.
 *
 * By default uses first-error mode which stops at the first validation failure
 * and returns immediately. This provides optimal performance for invalid data.
 *
 * Set `allErrors: true` to collect all validation errors (slower but more informative).
 *
 * @template T - The type of data the schema validates.
 * @param schema - The schema to compile.
 * @param options - Optional configuration (allErrors: boolean).
 * @returns A validator function that returns boolean. Access `.issues` for error details.
 *
 * @example
 * ```typescript
 * import { compile, optional, or } from 'ascertain';
 *
 * const userSchema = {
 *   name: String,
 *   age: Number,
 *   email: optional(String),
 *   role: or('admin', 'user', 'guest')
 * };
 *
 * // First-error mode (default) - fastest for invalid data
 * const validate = compile(userSchema);
 *
 * // All-errors mode - collects all validation issues
 * const validateAll = compile(userSchema, { allErrors: true });
 *
 * // Valid data
 * if (validate({ name: 'John', age: 30, role: 'user' })) {
 *   console.log('Valid!');
 * }
 *
 * // Invalid data - check .issues for details
 * if (!validate({ name: 123, age: 'thirty' })) {
 *   console.log(validate.issues); // Array with first validation issue
 * }
 * ```
 */
export const compile = <T>(schema: Schema<T>, options?: CompileOptions): Validator<T> => {
  const allErrors = options?.allErrors ?? false;
  const pure = options?.pure ?? false;
  const canIndex = typeof schema === 'object' && schema !== null && !isTagged(schema) && !Array.isArray(schema) && !(schema instanceof RegExp);

  if (allErrors) {
    if (canIndex) {
      const fastContext = new Context();
      fastContext.pure = pure;
      const fastCode = codeGen(schema, fastContext, 'data', { fast: true, indexed: true });
      const indexedFast = new Function('reg', 'err', `return (data) => {\n${fastCode}\n};`)(fastContext.registry, ERR) as (data: T) => number;

      const issueContext = new Context();
      issueContext.pure = pure;
      const rootPath = `reg[${issueContext.register(Object.freeze([]))}]`;
      const issueCode = `let issues = [];\n${codeGen(schema, issueContext, 'data', { fast: false, firstError: false, issues: 'issues', path: [], pathExpr: rootPath, startVar: 'start', issuesReady: true })}\nreturn issues;`;
      const issueValidator = new Function('reg', 'err', `return (data, start) => {\n${issueCode}\n};`)(issueContext.registry, ERR) as (
        data: T,
        start: number,
      ) => StandardSchemaV1.Issue[];

      const validator = ((data: T): boolean => {
        const idx = indexedFast(data);
        if (idx === -1) return true;
        validator.issues = issueValidator(data, idx);
        return false;
      }) as Validator<T>;
      validator.issues = emptyIssues;
      return validator;
    }

    const fastContext = new Context();
    fastContext.pure = pure;
    const fastCode = `${codeGen(schema, fastContext, 'data', { fast: true })}\nreturn true;`;
    const fastValidator = new Function('reg', 'err', `return (data) => {\n${fastCode}\n};`)(fastContext.registry, ERR) as (data: T) => boolean;

    const issueContext = new Context();
    issueContext.pure = pure;
    const rootPath2 = `reg[${issueContext.register(Object.freeze([]))}]`;
    const issueCode = `let issues = [];\n${codeGen(schema, issueContext, 'data', { fast: false, firstError: false, issues: 'issues', path: [], pathExpr: rootPath2, issuesReady: true })}\nreturn issues;`;
    const issueValidator = new Function('reg', 'err', `return (data) => {\n${issueCode}\n};`)(issueContext.registry, ERR) as (
      data: T,
    ) => StandardSchemaV1.Issue[];

    const validator = ((data: T): boolean => {
      if (fastValidator(data)) {
        return true;
      }
      validator.issues = issueValidator(data);
      return false;
    }) as Validator<T>;
    validator.issues = emptyIssues;
    return validator;
  }

  if (canIndex) {
    const fastContext = new Context();
    fastContext.pure = pure;
    const fastCode = codeGen(schema, fastContext, 'data', { fast: true, indexed: true });
    const indexedFast = new Function('reg', 'err', `return (data) => {\n${fastCode}\n};`)(fastContext.registry, ERR) as (data: T) => number;

    const context = new Context();
    context.pure = pure;
    const rootPath = `reg[${context.register(Object.freeze([]))}]`;
    const code = codeGen(schema, context, 'data', { fast: false, firstError: true, issues: 'issues', path: [], pathExpr: rootPath, startVar: 'start' });
    const firstErrorValidator = new Function('reg', 'err', `return (data, start) => {\nlet issues;\n${code}\nreturn issues;\n};`)(context.registry, ERR) as (
      data: T,
      start: number,
    ) => StandardSchemaV1.Issue[] | undefined;

    const validator = ((data: T): boolean => {
      const idx = indexedFast(data);
      if (idx === -1) {
        return true;
      }
      validator.issues = firstErrorValidator(data, idx)!;
      return false;
    }) as Validator<T>;
    validator.issues = emptyIssues;
    return validator;
  }

  const fastContext = new Context();
  fastContext.pure = pure;
  const fastCode = `${codeGen(schema, fastContext, 'data', { fast: true })}\nreturn true;`;
  const fastValidator = new Function('reg', 'err', `return (data) => {\n${fastCode}\n};`)(fastContext.registry, ERR) as (data: T) => boolean;

  const context = new Context();
  context.pure = pure;
  const rootPath3 = `reg[${context.register(Object.freeze([]))}]`;
  const code = codeGen(schema, context, 'data', { fast: false, firstError: true, issues: 'issues', path: [], pathExpr: rootPath3 });
  const firstErrorValidator = new Function('reg', 'err', `return (data) => {\nlet issues;\n${code}\nreturn issues;\n};`)(context.registry, ERR) as (
    data: T,
  ) => StandardSchemaV1.Issue[] | undefined;

  const validator = ((data: T): boolean => {
    if (fastValidator(data)) {
      return true;
    }
    validator.issues = firstErrorValidator(data)!;
    return false;
  }) as Validator<T>;
  validator.issues = emptyIssues;
  return validator;
};

/**
 * Asserts that data conforms to a given schema.
 *
 * This function is a convenient wrapper around `compile`. It compiles the schema
 * and immediately validates the provided data against it.
 *
 * @template T - The type of data the schema validates.
 * @param schema - The schema to validate against.
 * @param data - The data to validate.
 * @throws `{TypeError}` If the data does not conform to the schema.
 *
 * @example
 * ```typescript
 * import { ascertain, optional, and, or } from 'ascertain';
 *
 * const userSchema = {
 *   name: String,
 *   age: Number,
 *   email: optional(String),
 *   active: Boolean
 * };
 *
 * const userData = {
 *   name: 'Alice',
 *   age: 25,
 *   email: 'alice@example.com',
 *   active: true
 * };
 *
 * // Validate data - throws if invalid, otherwise continues silently
 * ascertain(userSchema, userData);
 * console.log('User data is valid!');
 *
 * // Example with invalid data
 * try {
 *   ascertain(userSchema, {
 *     name: 'Bob',
 *     age: 'twenty-five', // Invalid: should be number
 *     active: true
 *   });
 * } catch (error) {
 *   console.error('Validation failed:', error.message);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Array validation
 * const numbersSchema = [Number];
 * const numbers = [1, 2, 3, 4, 5];
 *
 * ascertain(numbersSchema, numbers);
 *
 * // Tuple validation
 * const coordinateSchema = tuple(Number, Number);
 * const point = [10, 20];
 *
 * ascertain(coordinateSchema, point);
 * ```
 */
export const ascertain = <T>(schema: Schema<T>, data: T) => {
  const validator = compile(schema);
  if (!validator(data)) {
    throw new TypeError(validator.issues[0].message, { cause: { issues: validator.issues } });
  }
};

/**
 * Extracts the shape of a config object based on the schema keys.
 * Recursively picks only the properties defined in the schema.
 */
export type ExtractShape<C, S> = {
  [K in keyof S & keyof C]: S[K] extends object ? (C[K] extends object ? ExtractShape<C[K], S[K]> : C[K]) : C[K];
};

/**
 * Creates a typed validator function for a config object.
 *
 * Returns a function that validates a schema against the config and returns
 * the same config reference with a narrowed type containing only the validated fields.
 *
 * @template C - The type of the config object.
 * @param config - The config object to validate against.
 * @returns A validator function that takes a schema and returns the typed config subset.
 *
 * @example
 * ```typescript
 * import { createValidator, as } from 'ascertain';
 *
 * const config = {
 *   app: { name: as.string(process.env.APP_NAME) },
 *   kafka: { brokers: as.array(process.env.BROKERS, ',') },
 *   redis: { host: as.string(process.env.REDIS_HOST) },
 * };
 *
 * const validate = createValidator(config);
 *
 * // Consumer only validates what it needs
 * const { app, kafka } = validate({
 *   app: { name: String },
 *   kafka: { brokers: [String] },
 * });
 *
 * // app.name is typed as string
 * // kafka.brokers is typed as string[]
 * // redis is not accessible - TypeScript error
 * ```
 */
export const createValidator = <C>(config: C) => {
  return <S extends Schema<Partial<C>>>(schema: S): ExtractShape<C, S> => {
    ascertain(schema as Schema<C>, config);
    return config as ExtractShape<C, S>;
  };
};

export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': StandardSchemaV1.Props<Input, Output>;
}

export namespace StandardSchemaV1 {
  export interface Props<Input = unknown, Output = Input> {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown) => Result<Output> | Promise<Result<Output>>;
    readonly types?: { readonly input: Input; readonly output: Output };
  }

  export type Result<Output> = SuccessResult<Output> | FailureResult;

  export interface SuccessResult<Output> {
    readonly value: Output;
    readonly issues?: undefined;
  }

  export interface FailureResult {
    readonly issues: ReadonlyArray<Issue>;
  }

  export interface Issue {
    readonly message: string;
    readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
  }

  export interface PathSegment {
    readonly key: PropertyKey;
  }
}

/**
 * Wraps an Ascertain schema to make it Standard Schema v1 compliant.
 *
 * Creates a validator that implements the Standard Schema specification,
 * enabling interoperability with tools like tRPC, TanStack Form, and other
 * ecosystem libraries that consume Standard Schema-compliant validators.
 *
 * The returned function can be used both as a regular Ascertain validator
 * (throws on error) and as a Standard Schema validator (returns result object).
 *
 * @template T - The type of data the schema validates.
 * @param schema - The Ascertain schema to wrap.
 * @returns A function that validates data, with a `~standard` property for Standard Schema compliance.
 *
 * @see https://standardschema.dev/
 *
 * @example
 * ```typescript
 * import { standardSchema, or, optional } from 'ascertain';
 *
 * // Create a Standard Schema-compliant validator
 * const userValidator = standardSchema({
 *   name: String,
 *   age: Number,
 *   role: or('admin', 'user'),
 *   email: optional(String),
 * });
 *
 * // Use as regular Ascertain validator (throws on error)
 * userValidator({ name: 'Alice', age: 30, role: 'admin' });
 *
 * // Use Standard Schema interface (returns result object)
 * const result = userValidator['~standard'].validate(unknownData);
 * if (result.issues) {
 *   console.log(result.issues);
 * } else {
 *   console.log(result.value); // typed as User
 * }
 *
 * // Works with tRPC, TanStack Form, etc.
 * ```
 */
interface StandardSchemaFn<T> {
  (data: T): void;
  '~standard': StandardSchemaV1.Props<T, T>;
}

/**
 * Wraps a schema for Standard Schema v1 compliance.
 * The returned function throws on invalid data and exposes a `~standard` interface
 * for interoperability with tRPC, TanStack Form, and other ecosystem tools.
 *
 * @param schema - The schema to wrap.
 * @returns A validator function with a `~standard` property conforming to Standard Schema v1.
 */
export const standardSchema = <T>(schema: Schema<T>): StandardSchemaFn<T> => {
  const validator = compile(schema);

  const fn = ((data: T) => {
    if (!validator(data)) {
      throw new TypeError(validator.issues[0].message, { cause: { issues: validator.issues } });
    }
  }) as StandardSchemaFn<T>;
  fn['~standard'] = {
    version: 1 as const,
    vendor: 'ascertain',
    validate: (value: unknown): StandardSchemaV1.Result<T> => {
      if (validator(value as T)) {
        return { value: value as T };
      }
      return { issues: validator.issues };
    },
  };

  return fn;
};
