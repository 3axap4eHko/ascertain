export class AssertError extends TypeError {
  static join(errors: AssertError[], separator = ' or ') {
    return new AssertError(errors[0].value, errors.map((e) => `${e.expected}`).join(separator), errors[0].path, errors[0].subject);
  }
  constructor(
    public readonly value: unknown,
    public readonly expected: unknown,
    public readonly path: string,
    public readonly subject = 'value',
  ) {
    super(`Invalid ${subject} ${JSON.stringify(value)} for path ${path}, expected ${expected}.`);
  }
}

type AssertErrorConstructor = new (value: unknown, expected: unknown, path: string, subject?: string) => Error;

type Keys = string | number | symbol;
type DataValue = any;
type Data = Record<Keys, unknown>;
type DataArray = DataValue[];

export type Schema<T> = T extends Data ? { [S in keyof T]?: Schema<T[S]> } : T extends DataArray ? [Schema<T[number]>] : DataValue;

export type SchemaData<S> =
  S extends Record<Keys, unknown>
    ? { [K in keyof S as Exclude<K, typeof $keys | typeof $values>]?: SchemaData<S[K]> } & Record<string, unknown>
    : S extends unknown[]
      ? unknown[]
      : unknown;

abstract class Operation<T extends Data = DataValue> {
  constructor(public readonly schemas: Schema<T>[]) {
    if (schemas.length === 0) {
      throw new TypeError(`Operation schema ${this.constructor.name} must have at least one element`);
    }
  }
}

class Or<T extends Data = DataValue> extends Operation<T> {}
export const or = <T extends Data = DataValue>(...schemas: Schema<T>[]) => new Or(schemas);

class And<T extends Data = DataValue> extends Operation<T> {}
export const and = <T extends Data = DataValue>(...schemas: Schema<T>[]) => new And(schemas);

class Optional<T extends Data = DataValue> extends Operation<T> {
  constructor(schema: Schema<T>) {
    super([schema]);
  }
}
export const optional = <T extends Data = DataValue>(schema: Schema<T>) => new Optional(schema);

class Tuple<T extends Data = DataValue> extends Operation<T> {}
export const tuple = <T extends Data = DataValue>(...schemas: Schema<T>[]) => new Tuple(schemas);

export const $keys = Symbol.for('@@keys');
export const $values = Symbol.for('@@values');
export const fromBase64 = typeof Buffer === 'undefined' ? (value: string) => atob(value) : (value: string) => Buffer.from(value, 'base64').toString('utf-8');

const MULTIPLIERS = {
  ms: 1,
  s: 1000,
  m: 60000,
  h: 3600000,
  d: 86400000,
  w: 604800000,
};

export const as = {
  string: (value: string | undefined) => {
    return typeof value === 'string' ? value : undefined;
  },
  number: (value: string | undefined) => {
    const result = parseFloat(value as string);
    return Number.isFinite(result) ? result : undefined;
  },
  date: (value: string | undefined) => {
    const result = Date.parse(value as string);
    return Number.isFinite(result) ? new Date(result) : undefined;
  },
  time: (value: string | undefined) => {
    const matches = value?.match(/^(\d+)(ms|s|m|h|d|w)?$/);
    if (matches) {
      const [, amount, unit = 'ms'] = matches;
      return parseInt(amount, 10) * MULTIPLIERS[unit as keyof typeof MULTIPLIERS];
    }
    return undefined;
  },
  boolean: (value: string | undefined) =>
    /^(0|1|true|false|enabled|disabled)$/i.test(value as string) ? /^(1|true|enabled)$/i.test(value as string) : undefined,
  array: (value: string | undefined, delimiter: string) => value?.split(delimiter) ?? undefined,
  json: (value: string | undefined) => {
    try {
      return JSON.parse(value as string);
    } catch (e) {
      return undefined;
    }
  },
  base64: (value: string | undefined) => {
    try {
      return fromBase64(value as string);
    } catch (e) {
      return undefined;
    }
  },
};

export class Context {
  public readonly Error: AssertErrorConstructor;
  public readonly errors: AssertError[] = [];
  public readonly registry: unknown[] = [];
  private varIndex = 0;
  constructor(public readonly options: CompilerOptions = {}) {
    this.Error = options.error ?? AssertError;
  }

  error(errors: AssertError[]) {
    this.errors.push(...errors);
    return true;
  }

  register(value: unknown): number {
    if (!this.registry.includes(value)) {
      this.registry.push(value);
    }
    return this.registry.indexOf(value);
  }

  unique(prefix: string) {
    return `${prefix}$$${this.varIndex++}`;
  }
}

export interface CompilerOptions {
  error?: AssertErrorConstructor;
}

const codeGen = <T extends Data = DataValue>(schema: Schema<T>, context: Context, valuePath: string, path: string): string => {
  if (schema instanceof And) {
    const valueAlias = context.unique('v');
    const errorsAlias = context.unique('err');
    const code = schema.schemas.map((s) => `try { ${codeGen(s, context, valueAlias, path)} } catch (e) { ${errorsAlias}.push(e); }`).join('\n');
    return `// And
  const ${errorsAlias} = [];
  const ${valueAlias} = ${valuePath};
  ${code}
  if (${errorsAlias}.length !== 0) { throw ctx.Error.join(${errorsAlias}, ' and '); }
`;
  } else if (schema instanceof Or) {
    const valueAlias = context.unique('v');
    const errorsAlias = context.unique('err');
    const code = schema.schemas
      .map((s) => codeGen(s, context, valueAlias, path))
      .reduceRight((result, code) => `try {${code}} catch (e) {${errorsAlias}.push(e);${result}}`, `throw ctx.Error.join(${errorsAlias}, ' or ')`);
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
    const code = schema.schemas
      .map((s, idx) => `try { ${codeGen(s, context, `${valueAlias}[${idx}]`, `${path}[${idx}]`)} } catch (e) { ${errorsAlias}.push(e); }`)
      .join('\n');
    return `// Tuple
  const ${valueAlias} = ${valuePath};
  const ${errorsAlias} = [];
  if (!Array.isArray(${valueAlias})) { throw new ctx.Error(${valueAlias}, 'Array', \`${path}\`); }
  ${code}
  if (${errorsAlias}.length !== 0) { throw ctx.Error.join(${errorsAlias}, ', '); }
`;
  }
  if (typeof schema === 'function') {
    const index = context.register(schema);
    const valueAlias = context.unique('v');
    const registryAlias = context.unique('r');
    return `
const ${valueAlias} = ${valuePath};
const ${registryAlias} = ctx.registry[${index}];
if (${valueAlias} === null || ${valueAlias} === undefined) { throw new ctx.Error(${valueAlias}, 'a non-nullable', \`${path}\`); }
if (typeof ${valueAlias} === 'object' && !(${valueAlias} instanceof ${registryAlias})) { throw new ctx.Error(${valueAlias}?.constructor?.name, \`instance of \${${registryAlias}.name}\`, \`${path}\`, 'instance of'); }
else if (typeof ${valueAlias} !== 'object' && ${valueAlias}?.constructor !== ${registryAlias}) { throw new ctx.Error(${valueAlias}?.constructor?.name, ${registryAlias}.name, \`${path}\`, 'type'); }
`;
  } else if (Array.isArray(schema)) {
    const valueAlias = context.unique('v');
    const code: string[] = [
      `const ${valueAlias} = ${valuePath};`,
      `if (!Array.isArray(${valueAlias})) { throw new ctx.Error(${valueAlias}, '${schema.constructor.name}', \`${path}\`); }`,
    ];
    if (schema.length > 0) {
      const value = context.unique('val');
      const key = context.unique('key');
      const errorsAlias = context.unique('err');

      const orCode = schema
        .map((s) => codeGen(s, context, value, `${path}[\${${key}}]`))
        .reduceRight((result, code) => `try {${code}} catch (e) {${errorsAlias}.push(e);${result}}`, `throw ctx.Error.join(${errorsAlias}, ' or ')`);
      code.push(`for(const ${key} in ${valueAlias}) {`, `const ${errorsAlias} = [];`, `const ${value} = ${valueAlias}[${key}];`, orCode, `}`);
    }
    return code.join('\n');
  } else if (typeof schema === 'object' && schema !== null) {
    if (schema instanceof RegExp) {
      const valueAlias = context.unique('v');
      return `
const ${valueAlias} = ${valuePath};
if (!${schema.toString()}.test('' + ${valueAlias})) { throw new ctx.Error(${valueAlias}, 'matching ${schema.toString()}', \`${path}\`); }
`;
    } else {
      const valueAlias = context.unique('v');
      const code: string[] = [
        `const ${valueAlias} = ${valuePath};`,
        `if (typeof ${valueAlias} !== 'object') { throw new ctx.Error(${valueAlias}, '${schema.constructor.name}', \`${path}\`); }`,
        `if (${valueAlias} === null) { throw new ctx.Error(${valueAlias}, 'object', \`${path}\`); }`,
      ];
      if ($keys in schema) {
        const keysAlias = context.unique('key');
        const errorsAlias = context.unique('err');
        const value = context.unique('v');
        code.push(`
const ${keysAlias} = Object.keys(${valueAlias});
const ${errorsAlias} = ${keysAlias}.map((${value}) => { ${codeGen(schema[$keys], context, value, path)} }).flat().filter(Boolean);
if (${errorsAlias}.length !== 0) { throw ctx.Error.join(${errorsAlias}, ', '); }
`);
      }
      if ($values in schema) {
        const vAlias = context.unique('val');
        const valuesAlias = context.unique('vals');
        const errorsAlias = context.unique('err');
        code.push(`{
const ${valuesAlias} = Object.values(${valuePath});
const ${errorsAlias} = ${valuesAlias}.map((${vAlias}) => { ${codeGen(schema[$values], context, vAlias, path)} }).flat().filter(Boolean);
if (${errorsAlias}.length !== 0) { throw ctx.Error.join(${errorsAlias}, ', '); }
}`);
      }
      const keys = Object.keys(schema);
      code.push(...keys.map((key) => codeGen(schema[key], context, `${valueAlias}['${key}']`, `${path}.${key}`)));
      return `{${code.join('\n')}}`;
    }
  } else {
    const valueAlias = context.unique('v');
    return `
const ${valueAlias} = ${valuePath};
if (${valueAlias} !== ${schema}) { throw new ctx.Error(${valueAlias}, ${schema}, \`${path}\`); }
`;
  }
};

export const compile = <S>(schema: S, rootName: string, options: CompilerOptions = {}) => {
  const context = new Context(options);
  const code = codeGen(schema, context, 'data', rootName);
  const validator = new Function('ctx', 'data', code);
  return (data: SchemaData<S>) => validator(context, data);
};

const findFirstError = <T>(array: T[], map: (value: T, index: number) => AssertError | false | null | void | undefined): false | AssertError => {
  for (let i = 0; i < array.length; i++) {
    const error = map(array[i], i);
    if (error) {
      return error;
    }
  }
  return false;
};

const findNotError = <T>(array: T[], map: (value: T, index: number) => AssertError | false | null | void | undefined): false | AssertError => {
  const errors: AssertError[] = [];
  for (let i = 0; i < array.length; i++) {
    const error = map(array[i], i);
    if (!error) {
      return false;
    } else {
      errors.push(error);
    }
  }
  return errors.reduce((result, error) => {
    return new AssertError(result.value, [result.expected, error.expected].join(' or '), result.path, result.subject);
  });
};

const assert = (target: unknown, schema: unknown, path: string, optional = false): AssertError | false | void => {
  if (schema === null || typeof schema === 'undefined') {
    return new AssertError(schema, 'any value', path, 'schema value');
  }
  if (schema instanceof Optional) {
    return assert(target, schema.schemas[0], path, true);
  }
  const isValue = target !== null && typeof target !== 'undefined';
  if (!isValue && optional) {
    return;
  }
  if (schema instanceof Or) {
    if (!schema.schemas.length) {
      return new AssertError(target, 'values', path, 'OR schema');
    }
    return findNotError(schema.schemas, (schema) => assert(target, schema, path));
  }
  if (schema instanceof And) {
    if (!schema.schemas.length) {
      return new AssertError(target, 'values', path, 'AND schema');
    }
    return findFirstError(schema.schemas, (schema) => assert(target, schema, path));
  }

  if (typeof schema === 'function') {
    if (!isValue) {
      return new AssertError(target, schema.name, path);
    }
    if (typeof target === 'object' && !(target instanceof schema)) {
      return new AssertError(target, schema.name, path);
    }
    if (typeof target !== 'object' && target.constructor !== schema) {
      return new AssertError(target, schema.name, path);
    }
  } else if (Array.isArray(schema)) {
    if (!Array.isArray(target)) {
      return new AssertError(target, schema.constructor.name, path);
    }
    return findFirstError(target, (value, idx) => {
      return findNotError(schema, (itemSchemaType) => assert(value, itemSchemaType, `${path}.${idx}`));
    });
  } else if (typeof schema === 'object') {
    if (schema instanceof RegExp) {
      if (!schema.test('' + target)) {
        return new AssertError(target, `matching /${schema.source}/`, path);
      }
    } else {
      if (typeof target !== 'object') {
        return new AssertError(target, schema.constructor.name, path);
      }
      if (target === null) {
        return new AssertError(target, 'an object', path);
      }
      if ($keys in schema) {
        const targetKeys = Object.keys(target);
        const assertError = findFirstError(targetKeys, (targetKey) => assert(targetKey, schema[$keys], `${path}.${targetKey}`));
        if (assertError) {
          return assertError;
        }
      }
      if ($values in schema) {
        const targetKeys = Object.keys(target);
        const assertError = findFirstError(targetKeys, (targetKey) =>
          assert(target[targetKey as keyof typeof target], schema[$values], `${path}.${targetKey}`),
        );
        if (assertError) {
          return assertError;
        }
      }
      return findFirstError(Object.keys(schema), (key) => assert(target[key as keyof typeof target], schema[key as keyof typeof target], `${path}.${key}`));
    }
  } else if (target !== schema) {
    return new AssertError(target, schema, path);
  }
};

export const ascertain = <T extends Data = DataValue>(schema: Schema<T>, data: T, rootName = '[root]') => {
  const result = assert(data, schema, rootName);
  if (result instanceof AssertError) {
    throw new TypeError(result.toString());
  }
};
