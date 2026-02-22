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

type Tagged<T> = OrShape<T> | AndShape<T> | OptionalShape<T> | TupleShape<T> | DiscriminatedShape<T>;

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
 * Decodes a base64-encoded string to UTF-8.
 *
 * Uses `Buffer` in Node.js environments and `atob` in browsers.
 *
 * @param value - The base64-encoded string to decode.
 * @returns The decoded UTF-8 string.
 */
export const fromBase64 =
  /* c8 ignore next */
  typeof Buffer === 'undefined' ? (value: string) => atob(value) : (value: string) => Buffer.from(value, 'base64').toString('utf-8');

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
export const asError = <T>(message: string) => new TypeError(message) as unknown as T;

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
  | { fast: true; onFail?: string }
  | { fast: false; firstError: true; issues: string; path: PropertyKey[]; pathExpr: string }
  | { fast: false; firstError: false; issues: string; path: PropertyKey[]; pathExpr: string };

const isTagged = (schema: unknown): schema is Tagged<unknown> => (schema as Tagged<unknown>)?.[$op] !== undefined;

const childMode = (mode: Exclude<Mode, { fast: true }>, key: PropertyKey | { dynamic: string }): Mode => {
  if (typeof key === 'object' && 'dynamic' in key) {
    return {
      fast: false,
      firstError: mode.firstError,
      issues: mode.issues,
      path: mode.path,
      pathExpr: `[${mode.path.map((k) => JSON.stringify(k)).join(',')}${mode.path.length ? ',' : ''}${key.dynamic}]`,
    };
  }
  const newPath = [...mode.path, key];
  return { fast: false, firstError: mode.firstError, issues: mode.issues, path: newPath, pathExpr: JSON.stringify(newPath) };
};

const toLiteral = (value: unknown): string => (typeof value === 'bigint' ? `${value}n` : JSON.stringify(value));

const codeGen = <T>(schema: Schema<T>, context: Context, valuePath: string, mode: Mode): string => {
  const emit = mode.fast
    ? null
    : mode.firstError
      ? (msg: string) => `${mode.issues} = [{ message: ${msg}, path: ${mode.pathExpr} }]; return ${mode.issues};`
      : (msg: string) => `(${mode.issues} || (${mode.issues} = [])).push({ message: ${msg}, path: ${mode.pathExpr} });`;
  const fail = mode.fast ? (mode.onFail ?? 'return false;') : '';

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
        const branches = schema.schemas.map((s) => {
          const branchValid = context.unique('valid');
          const branchCode = codeGen(s, context, valueAlias, { ...mode, onFail: `${branchValid} = false;` });
          return `if (!${foundValid}) { let ${branchValid} = true; ${branchCode} if (${branchValid}) { ${foundValid} = true; } }`;
        });
        return `const ${valueAlias} = ${valuePath};\nlet ${foundValid} = false;\n${branches.join('\n')}\nif (!${foundValid}) { ${fail} }`;
      } else if (mode.firstError) {
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
        return `const ${valueAlias} = ${valuePath};\nconst ${localIssues} = [];\nlet ${foundValid} = false;\n${branches.join('\n')}\nif (!${foundValid}) { (${mode.issues} || (${mode.issues} = [])).push(...${localIssues}); }`;
      }
    } else if (tag === OPTIONAL) {
      const valueAlias = context.unique('v');
      return `const ${valueAlias} = ${valuePath};\nif (${valueAlias} !== undefined && ${valueAlias} !== null) { ${codeGen((schema as OptionalShape<T>).schemas[0], context, valueAlias, mode)} }`;
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
          `else { ${schema.schemas.map((s, idx) => codeGen(s, context, `${valueAlias}[${idx}]`, childMode(mode, idx))).join('\n')} }`,
        ].join('\n');
      }
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

      if (mode.fast) {
        const branches = variants.map(({ value, schema: s }) => {
          const branchCode = codeGen(s, context, valueAlias, mode);
          return `if (${discriminantAlias} === ${JSON.stringify(value)}) { ${branchCode} }`;
        });
        return [
          `const ${valueAlias} = ${valuePath};`,
          `if (${valueAlias} === null || ${valueAlias} === undefined || typeof ${valueAlias} !== 'object' || ${valueAlias} instanceof Error) { ${fail} }`,
          `const ${discriminantAlias} = ${valueAlias}[${keyStr}];`,
          branches.join(' else ') + ` else { ${fail} }`,
        ].join('\n');
      } else {
        const validValues = variants.map((v) => JSON.stringify(v.value)).join(', ');
        const branches = variants.map(({ value, schema: s }) => {
          const branchCode = codeGen(s, context, valueAlias, mode);
          return `if (${discriminantAlias} === ${JSON.stringify(value)}) { ${branchCode} }`;
        });
        return [
          `const ${valueAlias} = ${valuePath};`,
          `if (${valueAlias} === null || ${valueAlias} === undefined) { ${emit!(`\`Invalid value \${${valueAlias}}, expected non-nullable\``)} }`,
          `else if (typeof ${valueAlias} !== 'object') { ${emit!(`\`Invalid type \${typeof ${valueAlias}}, expected an object\``)} }`,
          `else if (${valueAlias} instanceof Error) { ${emit!(`\`\${${valueAlias}.message}\``)} }`,
          `else {`,
          `  const ${discriminantAlias} = ${valueAlias}[${keyStr}];`,
          `  ${branches.join(' else ')} else { ${emit!(`\`Invalid discriminant value \${JSON.stringify(${discriminantAlias})}, expected one of: ${validValues}\``)} }`,
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
        if (primitiveType === 'number') checks.push(`Number.isNaN(${valueAlias})`);
        return `const ${valueAlias} = ${valuePath};\nif (${checks.join(' || ')}) { ${fail} }`;
      } else if (name === 'Function') {
        return `const ${valueAlias} = ${valuePath};\nif (typeof ${valueAlias} !== 'function') { ${fail} }`;
      } else {
        const isError = (schema as unknown) === Error || schema?.prototype instanceof Error;
        const index = context.register(schema);
        const registryAlias = context.unique('r');
        return `const ${valueAlias} = ${valuePath};\nconst ${registryAlias} = ctx.registry[${index}];\nif (${valueAlias} === null || ${valueAlias} === undefined${isError ? '' : ` || ${valueAlias} instanceof Error`} || (typeof ${valueAlias} === 'object' && !(${valueAlias} instanceof ${registryAlias})) || (typeof ${valueAlias} !== 'object' && ${valueAlias}?.constructor !== ${registryAlias}) || Number.isNaN(${valueAlias}?.valueOf?.())) { ${fail} }`;
      }
    } else {
      const code: string[] = [`const ${valueAlias} = ${valuePath};`];
      if (primitiveType) {
        code.push(`if (${valueAlias} === null || ${valueAlias} === undefined) { ${emit!(`\`Invalid value \${${valueAlias}}, expected non-nullable\``)} }`);
        code.push(`else if (${valueAlias} instanceof Error) { ${emit!(`\`\${${valueAlias}.message}\``)} }`);
        code.push(`else if (typeof ${valueAlias} !== '${primitiveType}') { ${emit!(`\`Invalid type \${typeof ${valueAlias}}, expected type ${name}\``)} }`);
        if (primitiveType === 'number')
          code.push(`else if (Number.isNaN(${valueAlias})) { ${emit!(`\`Invalid value \${${valueAlias}}, expected a valid ${name}\``)} }`);
      } else if (name === 'Function') {
        code.push(`if (${valueAlias} === null || ${valueAlias} === undefined) { ${emit!(`\`Invalid value \${${valueAlias}}, expected non-nullable\``)} }`);
        code.push(`else if (${valueAlias} instanceof Error) { ${emit!(`\`\${${valueAlias}.message}\``)} }`);
        code.push(`else if (typeof ${valueAlias} !== 'function') { ${emit!(`\`Invalid type \${typeof ${valueAlias}}, expected type Function\``)} }`);
      } else {
        const isError = (schema as unknown) === Error || schema?.prototype instanceof Error;
        const index = context.register(schema);
        const registryAlias = context.unique('r');
        code.push(`const ${registryAlias} = ctx.registry[${index}];`);
        code.push(`if (${valueAlias} === null || ${valueAlias} === undefined) { ${emit!(`\`Invalid value \${${valueAlias}}, expected non-nullable\``)} }`);
        if (!isError) code.push(`else if (${valueAlias} instanceof Error) { ${emit!(`\`\${${valueAlias}.message}\``)} }`);
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
      const code: string[] = [
        `const ${valueAlias} = ${valuePath};`,
        `if (${valueAlias} === null || ${valueAlias} === undefined) { ${emit!(`\`Invalid value \${${valueAlias}}, expected non-nullable\``)} }`,
        `else if (${valueAlias} instanceof Error) { ${emit!(`\`\${${valueAlias}.message}\``)} }`,
        `else if (typeof ${valueAlias} !== 'object') { ${emit!(`\`Invalid type \${typeof ${valueAlias}}, expected an instance of Array\``)} }`,
        `else if (!Array.isArray(${valueAlias})) { ${emit!(`\`Invalid instance of \${${valueAlias}.constructor?.name}, expected an instance of Array\``)} }`,
      ];
      if (schema.length > 0) {
        const value = context.unique('val');
        const key = context.unique('key');
        if (schema.length === 1) {
          // Dynamic key - use runtime concat
          code.push(
            `else { for (let ${key} = 0; ${key} < ${valueAlias}.length; ${key}++) { const ${value} = ${valueAlias}[${key}]; ${codeGen(schema[0], context, value, childMode(mode, { dynamic: key }))} } }`,
          );
        } else {
          code.push(
            `else if (${valueAlias}.length > ${schema.length}) { ${emit!(`\`Invalid tuple length \${${valueAlias}.length}, expected ${schema.length}\``)} }`,
          );
          code.push(`else { ${schema.map((s, idx) => codeGen(s, context, `${valueAlias}[${idx}]`, childMode(mode, idx))).join('\n')} }`);
        }
      }
      return code.join('\n');
    }
  }

  if (typeof schema === 'object' && schema !== null) {
    if (schema instanceof RegExp) {
      const valueAlias = context.unique('v');
      if (mode.fast) {
        return `const ${valueAlias} = ${valuePath};\nif (${valueAlias} === null || ${valueAlias} === undefined || ${valueAlias} instanceof Error || !${schema.toString()}.test(String(${valueAlias}))) { ${fail} }`;
      } else {
        return `const ${valueAlias} = ${valuePath};\nif (${valueAlias} === null || ${valueAlias} === undefined) { ${emit!(`\`Invalid value \${${valueAlias}}, expected non-nullable\``)} }\nelse if (${valueAlias} instanceof Error) { ${emit!(`\`\${${valueAlias}.message}\``)} }\nelse if (!${schema.toString()}.test(String(${valueAlias}))) { ${emit!(`\`Invalid value \${${valueAlias}}, expected to match ${schema.toString()}\``)} }`;
      }
    } else {
      const valueAlias = context.unique('v');
      if (mode.fast) {
        let code = `const ${valueAlias} = ${valuePath};\nif (${valueAlias} === null || typeof ${valueAlias} !== 'object' || ${valueAlias} instanceof Error) { ${fail} }`;
        if ($keys in schema) {
          const keysAlias = context.unique('k');
          const kAlias = context.unique('k');
          code += `\nconst ${keysAlias} = Object.keys(${valueAlias});\nfor (const ${kAlias} of ${keysAlias}) { ${codeGen(schema[$keys], context, kAlias, mode)} }`;
        }
        if ($values in schema) {
          const vAlias = context.unique('val');
          const kAlias = context.unique('k');
          const entriesAlias = context.unique('en');
          code += `\nconst ${entriesAlias} = Object.entries(${valueAlias});\nfor (const [${kAlias}, ${vAlias}] of ${entriesAlias}) { ${codeGen(schema[$values], context, vAlias, mode)} }`;
        }
        if ($strict in schema && schema[$strict]) {
          const keysAlias = context.unique('k');
          const kAlias = context.unique('k');
          const extraAlias = context.unique('ex');
          code += `\nconst ${keysAlias} = new Set(${JSON.stringify(Object.keys(schema))});\nconst ${extraAlias} = Object.keys(${valueAlias}).filter(${kAlias} => !${keysAlias}.has(${kAlias}));\nif (${extraAlias}.length !== 0) { ${fail} }`;
        }
        code +=
          '\n' +
          Object.entries(schema)
            .map(([key, s]) => codeGen(s, context, `${valueAlias}[${JSON.stringify(key)}]`, mode))
            .join('\n');
        return code;
      } else {
        const code: string[] = [
          `const ${valueAlias} = ${valuePath};`,
          `if (${valueAlias} === null || ${valueAlias} === undefined) { ${emit!(`\`Invalid value \${${valueAlias}}, expected non-nullable\``)} }`,
          `else if (typeof ${valueAlias} !== 'object') { ${emit!(`\`Invalid type \${typeof ${valueAlias}}, expected an instance of Object\``)} }`,
          `else if (${valueAlias} instanceof Error) { ${emit!(`\`\${${valueAlias}.message}\``)} }`,
          'else {',
        ];
        const innerCode: string[] = [];
        if ($keys in schema) {
          const keysAlias = context.unique('k');
          const kAlias = context.unique('k');
          innerCode.push(`const ${keysAlias} = Object.keys(${valueAlias});`);
          // Dynamic key - use runtime concat
          innerCode.push(`for (const ${kAlias} of ${keysAlias}) { ${codeGen(schema[$keys], context, kAlias, childMode(mode, { dynamic: kAlias }))} }`);
        }
        if ($values in schema) {
          const vAlias = context.unique('val');
          const kAlias = context.unique('k');
          const entriesAlias = context.unique('en');
          innerCode.push(`const ${entriesAlias} = Object.entries(${valueAlias});`);
          // Dynamic key - use runtime concat
          innerCode.push(
            `for (const [${kAlias}, ${vAlias}] of ${entriesAlias}) { ${codeGen(schema[$values], context, vAlias, childMode(mode, { dynamic: kAlias }))} }`,
          );
        }
        if ($strict in schema && schema[$strict]) {
          const keysAlias = context.unique('k');
          const kAlias = context.unique('k');
          const extraAlias = context.unique('ex');
          innerCode.push(`const ${keysAlias} = new Set(${JSON.stringify(Object.keys(schema))});`);
          innerCode.push(`const ${extraAlias} = Object.keys(${valueAlias}).filter(${kAlias} => !${keysAlias}.has(${kAlias}));`);
          innerCode.push(`if (${extraAlias}.length !== 0) { ${emit!(`\`Extra properties: \${${extraAlias}}, are not allowed\``)} }`);
        }
        // Static keys - pre-register paths
        innerCode.push(...Object.entries(schema).map(([key, s]) => codeGen(s, context, `${valueAlias}[${JSON.stringify(key)}]`, childMode(mode, key))));
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
      return `const ${valueAlias} = ${valuePath};\nconst ${registryAlias} = ctx.registry[${index}];\nif (typeof ${valueAlias} !== 'symbol' || ${valueAlias} !== ${registryAlias}) { ${fail} }`;
    } else {
      return `const ${valueAlias} = ${valuePath};\nconst ${registryAlias} = ctx.registry[${index}];\nif (typeof ${valueAlias} !== 'symbol') { ${emit!(`\`Invalid type \${typeof ${valueAlias}}, expected symbol\``)} }\nelse if (${valueAlias} !== ${registryAlias}) { ${emit!(`\`Invalid value \${${valueAlias}.toString()}, expected ${schema.toString()}\``)} }`;
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
    return `const ${valueAlias} = ${valuePath};\nconst ${value} = ${toLiteral(schema)};\nif (${valueAlias} instanceof Error) { ${emit!(`\`\${${valueAlias}.message}\``)} }\nelse if (typeof ${valueAlias} !== '${typeof schema}') { ${emit!(`\`Invalid type \${typeof ${valueAlias}}, expected ${typeof schema}\``)} }\nelse if (${valueAlias} !== ${value}) { ${emit!(`\`Invalid value \${String(${valueAlias})}, expected ${toLiteral(schema)}\``)} }`;
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

  if (allErrors) {
    const fastContext = new Context();
    const fastCode = `${codeGen(schema, fastContext, 'data', { fast: true })}\nreturn true;`;
    const fastValidator = new Function('ctx', `return (data) => {\n${fastCode}\n};`)(fastContext) as (data: T) => boolean;

    const issueContext = new Context();
    const issueCode = `let issues;\n${codeGen(schema, issueContext, 'data', { fast: false, firstError: false, issues: 'issues', path: [], pathExpr: '[]' })}\nreturn issues || [];`;
    const issueValidator = new Function('ctx', `return (data) => {\n${issueCode}\n};`)(issueContext) as (data: T) => StandardSchemaV1.Issue[];

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

  const fastContext = new Context();
  const fastCode = `${codeGen(schema, fastContext, 'data', { fast: true })}\nreturn true;`;
  const fastValidator = new Function('ctx', `return (data) => {\n${fastCode}\n};`)(fastContext) as (data: T) => boolean;

  const context = new Context();
  const code = codeGen(schema, context, 'data', { fast: false, firstError: true, issues: 'issues', path: [], pathExpr: '[]' });
  const firstErrorValidator = new Function('ctx', `return (data) => {\nlet issues;\n${code}\nreturn issues;\n};`)(context) as (
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
