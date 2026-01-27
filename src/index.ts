/**
 * Abstract base class for schema operators.
 *
 * Provides a common constructor that enforces having at least one schema.
 *
 * @template T - The type of data the operator validates.
 * @abstract
 * @internal
 */
abstract class Operator<T> {
  constructor(public readonly schemas: Schema<T>[]) {
    if (schemas.length === 0) {
      throw new TypeError(`Operation schema ${this.constructor.name} must have at least one element`);
    }
  }
}

// https://standardschema.dev/

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

class Or<T> extends Operator<T> {}
/**
 * Operator for validating data against any of the provided schemas (logical OR).
 *
 * Creates a schema that accepts data matching any one of the provided schemas.
 * This is useful for creating union types or alternative validation paths.
 *
 * @template T - The type of data the operator validates.
 * @param schemas - Multiple schemas where at least one must match the data.
 * @returns A schema that validates data against any of the provided schemas.
 *
 * @example
 * ```typescript
 * import { or, ascertain } from 'ascertain';
 *
 * // Create a schema that accepts either a string or number
 * const stringOrNumber = or(String, Number);
 *
 * ascertain(stringOrNumber, "hello", "value"); // ✓ Valid
 * ascertain(stringOrNumber, 42, "value");      // ✓ Valid
 * ascertain(stringOrNumber, true, "value");    // ✗ Throws error
 *
 * // Union of literal values
 * const statusSchema = or('pending', 'completed', 'failed');
 * ascertain(statusSchema, 'pending', "status"); // ✓ Valid
 *
 * // Complex schema combinations
 * const userIdSchema = or(Number, { id: Number, temp: Boolean });
 * ascertain(userIdSchema, 123, "userId");                    // ✓ Valid
 * ascertain(userIdSchema, { id: 456, temp: true }, "userId"); // ✓ Valid
 * ```
 */
export const or = <T>(...schemas: Schema<T>[]) => new Or(schemas);

class And<T> extends Operator<T> {}
/**
 * Operator for validating data against all provided schemas (logical AND).
 *
 * Creates a schema that requires data to match every one of the provided schemas.
 * This is useful for combining multiple validation requirements or adding constraints.
 *
 * @template T - The type of data the operator validates.
 * @param schemas - Multiple schemas that all must match the data.
 * @returns A schema that validates data against all of the provided schemas.
 *
 * @example
 * ```typescript
 * import { and, ascertain } from 'ascertain';
 *
 * // Combine object schema with additional constraints
 * const userSchema = and(
 *   { name: String, age: Number },
 *   { age: Number } // Additional constraint
 * );
 *
 * ascertain(userSchema, { name: "John", age: 25 }, "user"); // ✓ Valid
 *
 * // Ensure an object is both a Date and has specific methods
 * const validDateSchema = and(Date, { toISOString: Function });
 * ascertain(validDateSchema, new Date(), "date"); // ✓ Valid
 *
 * ```
 */
export const and = <T>(...schemas: Schema<T>[]) => new And(schemas);

class Optional<T> extends Operator<T> {
  constructor(schema: Schema<T>) {
    super([schema]);
  }
}
/**
 * Operator for making a schema optional (nullable).
 *
 * Creates a schema that accepts the provided schema or null/undefined values.
 * This is useful for optional object properties or nullable fields.
 *
 * @template T - The type of data the operator validates.
 * @param schema - The schema to make optional.
 * @returns A schema that validates data against the provided schema or accepts null/undefined.
 *
 * @example
 * ```typescript
 * import { optional, ascertain } from 'ascertain';
 *
 * // Optional string field
 * const userSchema = {
 *   name: String,
 *   nickname: optional(String),
 *   age: Number
 * };
 *
 * // All of these are valid
 * ascertain(userSchema, {
 *   name: "John",
 *   nickname: "Johnny",
 *   age: 30
 * }, "user"); // ✓ Valid
 *
 * ascertain(userSchema, {
 *   name: "Jane",
 *   nickname: null,
 *   age: 25
 * }, "user"); // ✓ Valid
 *
 * ascertain(userSchema, {
 *   name: "Bob",
 *   age: 35
 *   // nickname is undefined
 * }, "user"); // ✓ Valid
 *
 * // Optional complex objects
 * const profileSchema = {
 *   id: Number,
 *   settings: optional({
 *     theme: String,
 *     notifications: Boolean
 *   })
 * };
 * ```
 */
export const optional = <T>(schema: Schema<T>) => new Optional(schema);

class Tuple<T> extends Operator<T> {}
/**
 * Operator for validating data against a fixed-length tuple of schemas.
 *
 * Creates a schema that validates arrays with a specific length and type for each position.
 * This is useful for coordinate pairs, RGB values, or any fixed-structure data.
 *
 * @template T - The type of data the operator validates (a tuple of types).
 * @param schemas - Schemas for each position in the tuple, in order.
 * @returns A schema that validates data as a tuple with the specified structure.
 *
 * @example
 * ```typescript
 * import { tuple, ascertain } from 'ascertain';
 *
 * // 2D coordinate tuple
 * const pointSchema = tuple(Number, Number);
 * ascertain(pointSchema, [10, 20], "point"); // ✓ Valid
 * ascertain(pointSchema, [1.5, 2.7], "point"); // ✓ Valid
 * ascertain(pointSchema, [10], "point"); // ✗ Throws error (too short)
 * ascertain(pointSchema, [10, 20, 30], "point"); // ✗ Throws error (too long)
 *
 * // RGB color tuple
 * const colorSchema = tuple(Number, Number, Number);
 * ascertain(colorSchema, [255, 128, 0], "color"); // ✓ Valid
 *
 * // Mixed type tuple
 * const userInfoSchema = tuple(String, Number, Boolean);
 * ascertain(userInfoSchema, ["Alice", 25, true], "userInfo"); // ✓ Valid
 *
 * // Nested tuple
 * const lineSchema = tuple(
 *   tuple(Number, Number), // start point
 *   tuple(Number, Number)  // end point
 * );
 * ascertain(lineSchema, [[0, 0], [10, 10]], "line"); // ✓ Valid
 * ```
 */
export const tuple = <T>(...schemas: Schema<T>[]) => new Tuple(schemas);

/**
 * Decodes a base64-encoded string to UTF-8.
 *
 * Uses `Buffer` in Node.js environments and `atob` in browsers.
 *
 * @param value - The base64-encoded string to decode.
 * @returns The decoded UTF-8 string.
 */
export const fromBase64 = typeof Buffer === 'undefined' ? (value: string) => atob(value) : (value: string) => Buffer.from(value, 'base64').toString('utf-8');

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

    const result = value.includes('.') || value.includes('e') || value.includes('E') ? parseFloat(value) : parseInt(value, 10);
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

const codeGenCollectErrors = (errorsAlias: string, code: string, extra: string = '') => `try {${code}} catch (e) {${errorsAlias}.push(e.message);${extra}}`;
const codeGenExpectNoErrors = (errorsAlias: string) => `if (${errorsAlias}.length !== 0) { throw new TypeError(${errorsAlias}.join('\\n')); }`;
const codeGenExpectNonError = (valueAlias: string, path: string) =>
  `if (${valueAlias} instanceof Error) { throw new TypeError(\`\${${valueAlias}.message} for path "${path}".\`); }`;
const codeGenExpectNonNullable = (valueAlias: string, path: string) =>
  `if (${valueAlias} === null || ${valueAlias} === undefined) { throw new TypeError(\`Invalid value \${${valueAlias}} for path "${path}", expected non-nullable.\`); }`;
const codeGenExpectObject = (valueAlias: string, path: string, instanceOf: string) =>
  `if (typeof ${valueAlias} !== 'object') { throw new TypeError(\`Invalid type \${typeof ${valueAlias}} for path "${path}", expected an instance of ${instanceOf}\`); }`;
const codeGenExpectArray = (valueAlias: string, path: string) =>
  `if (!Array.isArray(${valueAlias})) { throw new TypeError(\`Invalid instance of \${${valueAlias}.constructor?.name} for path "${path}", expected an instance of Array.\`); }`;

const codeGen = <T>(schema: Schema<T>, context: Context, valuePath: string, path: string): string => {
  if (schema instanceof And) {
    const valueAlias = context.unique('v');
    const errorsAlias = context.unique('err');
    const code = schema.schemas.map((s) => `try { ${codeGen(s, context, valueAlias, path)} } catch (e) { ${errorsAlias}.push(e.message); }`).join('\n');
    return `// And
  const ${errorsAlias} = [];
  const ${valueAlias} = ${valuePath};
  ${code}
  ${codeGenExpectNoErrors(errorsAlias)}
`;
  } else if (schema instanceof Or) {
    const valueAlias = context.unique('v');
    const errorsAlias = context.unique('err');
    const code = schema.schemas
      .map((s) => codeGen(s, context, valueAlias, path))
      .reduceRight((result, code) => codeGenCollectErrors(errorsAlias, code, result), codeGenExpectNoErrors(errorsAlias));
    return `// Or
const ${errorsAlias} = [];
const ${valueAlias} = ${valuePath};
${code}
    `;
  } else if (schema instanceof Optional) {
    const valueAlias = context.unique('v');
    return `// Optional
const ${valueAlias} = ${valuePath};
if (${valueAlias} !== undefined && ${valueAlias} !== null) { ${codeGen(schema.schemas[0], context, valueAlias, path)} }
`;
  } else if (schema instanceof Tuple) {
    const valueAlias = context.unique('v');
    const errorsAlias = context.unique('err');
    const code: string[] = [
      '// Tuple',
      `const ${valueAlias} = ${valuePath};`,
      `const ${errorsAlias} = [];`,
      codeGenExpectNonNullable(valueAlias, path),
      codeGenExpectObject(valueAlias, path, 'Array'),
      codeGenExpectArray(valueAlias, path),
      `if (${valueAlias}.length !== ${schema.schemas.length}) { throw new TypeError(\`Invalid tuple length \${${valueAlias}.length} for path "${path}", expected ${schema.schemas.length}.\`); }`,
      ...schema.schemas.map((s, idx) => codeGenCollectErrors(errorsAlias, codeGen(s, context, `${valueAlias}[${idx}]`, `${path}[${idx}]`))),
      codeGenExpectNoErrors(errorsAlias),
    ];
    return code.join('\n');
  } else if (typeof schema === 'function') {
    const valueAlias = context.unique('v');
    const code: string[] = [`const ${valueAlias} = ${valuePath};`, codeGenExpectNonNullable(valueAlias, path)];
    if ((schema as unknown) !== Error && !(schema?.prototype instanceof Error)) {
      code.push(codeGenExpectNonError(valueAlias, path));
    }

    const name = (schema as { name?: string })?.name;
    const primitiveType =
      name === 'String'
        ? 'string'
        : name === 'Number'
          ? 'number'
          : name === 'Boolean'
            ? 'boolean'
            : name === 'BigInt'
              ? 'bigint'
              : name === 'Symbol'
                ? 'symbol'
                : null;

    if (primitiveType) {
      code.push(
        `if (typeof ${valueAlias} !== '${primitiveType}') { throw new TypeError(\`Invalid type \${typeof ${valueAlias}} for path "${path}", expected type ${schema?.name}\`); }`,
      );
      if (primitiveType === 'number') {
        code.push(
          `if (Number.isNaN(${valueAlias})) { throw new TypeError(\`Invalid value \${${valueAlias}} for path "${path}", expected a valid ${schema?.name}\`); }`,
        );
      }
    } else if (name === 'Function') {
      code.push(
        `if (typeof ${valueAlias} !== 'function') { throw new TypeError(\`Invalid type \${typeof ${valueAlias}} for path "${path}", expected type Function\`); }`,
      );
    } else {
      const index = context.register(schema);
      const registryAlias = context.unique('r');
      code.push(
        `const ${registryAlias} = ctx.registry[${index}];`,
        `if (typeof ${valueAlias} === 'object' && !(${valueAlias} instanceof ${registryAlias})) { throw new TypeError(\`Invalid instance of \${${valueAlias}?.constructor?.name} for path "${path}", expected an instance of ${schema?.name}\`); }`,
        `if (typeof ${valueAlias} !== 'object' && ${valueAlias}?.constructor !== ${registryAlias}) { throw new TypeError(\`Invalid type \${${valueAlias}?.constructor?.name} for path "${path}", expected type ${schema?.name}\`); }`,
        `if (Number.isNaN(${valueAlias}?.valueOf?.())) { throw new TypeError(\`Invalid value \${${valueAlias}} for path "${path}", expected a valid ${schema?.name}\`); }`,
      );
    }
    return code.join('\n');
  } else if (Array.isArray(schema)) {
    const valueAlias = context.unique('v');
    const code: string[] = [
      `const ${valueAlias} = ${valuePath};`,
      codeGenExpectNonNullable(valueAlias, path),
      codeGenExpectNonError(valueAlias, path),
      codeGenExpectObject(valueAlias, path, 'Array'),
      codeGenExpectArray(valueAlias, path),
    ];
    if (schema.length > 0) {
      const value = context.unique('val');
      const key = context.unique('key');
      const errorsAlias = context.unique('err');
      code.push(`const ${errorsAlias} = [];`);

      if (schema.length === 1) {
        code.push(
          ...schema.map(
            (s) =>
              `for (let ${key} = 0; ${key} < ${valueAlias}.length; ${key}++) { const ${value} = ${valueAlias}[${key}]; ${codeGenCollectErrors(errorsAlias, codeGen(s, context, value, `${path}[\${${key}}]`))} }`,
          ),
        );
      } else {
        code.push(
          `if (${valueAlias}.length > ${schema.length}) { throw new TypeError(\`Invalid tuple length \${${valueAlias}.length} for path "${path}", expected ${schema.length}.\`); }`,
        );
        code.push(...schema.map((s, idx) => codeGenCollectErrors(errorsAlias, codeGen(s, context, `${valueAlias}[${idx}]`, `${path}[${idx}]`))));
      }

      code.push(codeGenExpectNoErrors(errorsAlias));
    }
    return code.join('\n');
  } else if (typeof schema === 'object' && schema !== null) {
    if (schema instanceof RegExp) {
      const valueAlias = context.unique('v');
      return `
const ${valueAlias} = ${valuePath};
${codeGenExpectNonNullable(valueAlias, path)}
${codeGenExpectNonError(valueAlias, path)}
if (!${schema.toString()}.test(String(${valueAlias}))) { throw new TypeError(\`Invalid value \${${valueAlias}} for path "${path}", expected to match ${schema.toString()}\`); }
`;
    } else {
      const valueAlias = context.unique('v');
      const code: string[] = [
        `const ${valueAlias} = ${valuePath};`,
        codeGenExpectNonNullable(valueAlias, path),
        codeGenExpectObject(valueAlias, path, 'Object'),
        codeGenExpectNonError(valueAlias, path),
      ];
      if ($keys in schema) {
        const keysAlias = context.unique('k');
        const errorsAlias = context.unique('err');
        const kAlias = context.unique('k');
        code.push(`
const ${keysAlias} = Object.keys(${valueAlias});
const ${errorsAlias} = [];
for (const ${kAlias} of ${keysAlias}) { ${codeGenCollectErrors(errorsAlias, codeGen(schema[$keys], context, kAlias, `${path}[\${${kAlias}}]`))} }
${codeGenExpectNoErrors(errorsAlias)}
`);
      }
      if ($values in schema) {
        const vAlias = context.unique('val');
        const kAlias = context.unique('k');
        const entriesAlias = context.unique('en');
        const errorsAlias = context.unique('err');
        code.push(`
const ${entriesAlias} = Object.entries(${valueAlias});
const ${errorsAlias} = [];
for (const [${kAlias}, ${vAlias}] of ${entriesAlias}) { ${codeGenCollectErrors(errorsAlias, codeGen(schema[$values], context, vAlias, `${path}[\${${kAlias}}]`))} }
${codeGenExpectNoErrors(errorsAlias)}
`);
      }
      if ($strict in schema && schema[$strict]) {
        const keysAlias = context.unique('k');
        const kAlias = context.unique('k');
        const extraAlias = context.unique('ex');
        code.push(`const ${keysAlias} = new Set(${JSON.stringify(Object.keys(schema))});`);
        code.push(`const ${extraAlias} = Object.keys(${valueAlias}).filter(${kAlias} => !${keysAlias}.has(${kAlias}));`);
        code.push(`if (${extraAlias}.length !== 0) { throw new TypeError(\`Extra properties: \${${extraAlias}}, are not allowed for path "${path}"\`); }`);
      }
      code.push(...Object.entries(schema).map(([key, s]) => codeGen(s, context, `${valueAlias}[${JSON.stringify(key)}]`, `${path}.${key}`)));
      return `${code.join('\n')}`;
    }
  } else if (typeof schema === 'symbol') {
    const index = context.register(schema);
    const valueAlias = context.unique('v');
    const registryAlias = context.unique('r');

    return `
const ${valueAlias} = ${valuePath};
const ${registryAlias} = ctx.registry[${index}];
if (typeof ${valueAlias} !== 'symbol') { throw new TypeError(\`Invalid type \${typeof ${valueAlias}} for path "${path}", expected symbol\`); }
if (${valueAlias} !== ${registryAlias}) { throw new TypeError(\`Invalid value \${${valueAlias}.toString()} for path "${path}", expected ${schema.toString()}\`); }
    `;
  } else if (schema === null || schema === undefined) {
    const valueAlias = context.unique('v');
    return `
const ${valueAlias} = ${valuePath};
if (${valueAlias} !== null && ${valueAlias} !== undefined ) { throw new TypeError(\`Invalid value \${JSON.stringify(${valueAlias})} for path "${path}", expected nullable\`); }
    `;
  } else {
    const valueAlias = context.unique('v');
    const value = context.unique('val');
    return `
const ${valueAlias} = ${valuePath};
const ${value} = ${JSON.stringify(schema)};
${codeGenExpectNonError(valueAlias, path)}
if (typeof ${valueAlias} !== '${typeof schema}') { throw new TypeError(\`Invalid type \${typeof ${valueAlias}} for path "${path}", expected ${typeof schema}\`); }
if (${valueAlias} !== ${value}) { throw new TypeError(\`Invalid value \${JSON.stringify(${valueAlias})} for path "${path}", expected ${JSON.stringify(schema)}\`); }
`;
  }
};

/**
 * Compiles a schema into a validation function.
 *
 * This function takes a schema definition and generates a JavaScript function
 * that can be used to validate data against the schema.
 *
 * @template T - The type of data the schema validates.
 * @param schema - The schema to compile.
 * @param rootName - A name for the root of the data structure (used in error messages).
 * @returns A validation function that takes data as input and throws a TypeError if the data does not conform to the schema.
 *
 * @example
 * ```typescript
 * import { compile, optional, and, or } from 'ascertain';
 *
 * const userSchema = {
 *   name: String,
 *   age: Number,
 *   email: optional(String),
 *   role: or('admin', 'user', 'guest')
 * };
 *
 * const validateUser = compile(userSchema, 'User');
 *
 * // Valid data - no error thrown
 * validateUser({
 *   name: 'John Doe',
 *   age: 30,
 *   email: 'john@example.com',
 *   role: 'user'
 * });
 *
 * // Invalid data - throws TypeError
 * try {
 *   validateUser({
 *     name: 123, // Invalid: should be string
 *     age: 'thirty' // Invalid: should be number
 *   });
 * } catch (error) {
 *   console.error(error.message); // Detailed validation errors
 * }
 * ```
 */
export const compile = <T>(schema: Schema<T>, rootName: string) => {
  const context = new Context();
  const code = codeGen(schema, context, 'data', rootName);
  const validator = new Function('ctx', 'data', code);
  return (data: T) => validator(context, data);
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
 * @param rootName - A name for the root of the data structure (used in error messages, defaults to '[root]').
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
 * ascertain(userSchema, userData, 'UserData');
 * console.log('User data is valid!');
 *
 * // Example with invalid data
 * try {
 *   ascertain(userSchema, {
 *     name: 'Bob',
 *     age: 'twenty-five', // Invalid: should be number
 *     active: true
 *   }, 'UserData');
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
 * ascertain(numbersSchema, numbers, 'Numbers');
 *
 * // Tuple validation
 * const coordinateSchema = tuple(Number, Number);
 * const point = [10, 20];
 *
 * ascertain(coordinateSchema, point, 'Point');
 * ```
 */
export const ascertain = <T>(schema: Schema<T>, data: T, rootName = '[root]') => {
  compile(schema, rootName)(data);
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
 * @param rootName - A name for the root of the data structure (used in error messages).
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
 * const validate = createValidator(config, '[CONFIG]');
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
export const createValidator = <C>(config: C, rootName = '[root]') => {
  return <S extends Schema<Partial<C>>>(schema: S): ExtractShape<C, S> => {
    ascertain(schema as Schema<C>, config, rootName);
    return config as ExtractShape<C, S>;
  };
};
