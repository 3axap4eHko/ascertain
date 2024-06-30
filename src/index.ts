export class AssertError extends TypeError {
  constructor(
    public readonly value: unknown,
    public readonly expected: unknown,
    public readonly path: string,
    public readonly subject = 'value',
  ) {
    super(`Invalid ${subject} ${JSON.stringify(value)} for path ${path}, expected ${expected}.`);
  }
}

type Keys = string | number | symbol;
type DataValue = any;
export type Data = Record<Keys, unknown>;
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
  array: (value: string | undefined, delimiter: string) => value?.split?.(delimiter) ?? undefined,
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

class Context {
  public readonly Error: typeof AssertError;
  public readonly registry: unknown[] = [];
  private varIndex = 0;

  constructor(public readonly options: CompilerOptions = {}) {
    this.Error = options.error ?? AssertError;
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
  error?: typeof AssertError;
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
  if (${errorsAlias}.length !== 0) { throw new AggregateError(${errorsAlias}, 'Invalid value for path "${path}"'); }
`;
  } else if (schema instanceof Or) {
    const valueAlias = context.unique('v');
    const errorsAlias = context.unique('err');
    const code = schema.schemas
      .map((s) => codeGen(s, context, valueAlias, path))
      .reduceRight(
        (result, code) => `try {${code}} catch (e) {${errorsAlias}.push(e);${result}}`,
        `throw new AggregateError(${errorsAlias}, 'Invalid value for path "${path}"');`,
      );
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
      `if (!Array.isArray(${valueAlias})) { throw new ctx.Error(${valueAlias}, 'array', \`${path}\`); }`,
      ...schema.schemas.map((s, idx) => `try { ${codeGen(s, context, `${valueAlias}[${idx}]`, `${path}[${idx}]`)} } catch (e) { ${errorsAlias}.push(e); }`),
      `if (${errorsAlias}.length !== 0) { throw new AggregateError(${errorsAlias}, 'Invalid value for path "${path}"'); }`,
    ];

    return code.join('\n');
  } else if (typeof schema === 'function') {
    const index = context.register(schema);
    const valueAlias = context.unique('v');
    const registryAlias = context.unique('r');
    return `
const ${valueAlias} = ${valuePath};
const ${registryAlias} = ctx.registry[${index}];
if (${valueAlias} === null || ${valueAlias} === undefined) { throw new ctx.Error(${valueAlias}, 'a non-nullable', \`${path}\`); }
if (typeof ${valueAlias} === 'object' && !(${valueAlias} instanceof ${registryAlias})) { throw new ctx.Error(${valueAlias}?.constructor?.name, \`instance of \${${registryAlias}.name}\`, \`${path}\`, 'instance of'); }
if (typeof ${valueAlias} !== 'object' && ${valueAlias}?.constructor !== ${registryAlias}) { throw new ctx.Error(${valueAlias}?.constructor?.name, ${registryAlias}.name, \`${path}\`, 'type'); }
`;
  } else if (Array.isArray(schema)) {
    const valueAlias = context.unique('v');
    const code: string[] = [
      `const ${valueAlias} = ${valuePath};`,
      `if (!Array.isArray(${valueAlias})) { throw new ctx.Error(${valueAlias}, 'array', \`${path}\`); }`,
    ];
    if (schema.length > 0) {
      const value = context.unique('val');
      const key = context.unique('key');
      const errorsAlias = context.unique('err');
      code.push(`const ${errorsAlias} = [];`);
      code.push(
        ...schema.map(
          (s) =>
            `${valueAlias}.forEach((${value},${key}) => { try { ${codeGen(s, context, value, `${path}[\${${key}}]`)} } catch(e){ ${errorsAlias}.push(e); } });`,
        ),
      );

      code.push(`if (${errorsAlias}.length !== 0) { throw new AggregateError(${errorsAlias}, 'Invalid value for path "${path}"'); }`);
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
        `if (${valueAlias} === null || ${valueAlias} === undefined) { throw new ctx.Error(${valueAlias}, 'object', \`${path}\`); }`,
        `if (typeof ${valueAlias} !== 'object') { throw new ctx.Error(${valueAlias}, '${schema.constructor.name}', \`${path}\`); }`,
      ];
      if ($keys in schema) {
        const keysAlias = context.unique('key');
        const errorsAlias = context.unique('err');
        const value = context.unique('v');
        code.push(`
const ${keysAlias} = Object.keys(${valueAlias});
const ${errorsAlias} = ${keysAlias}.flatMap((${value}) => { ${codeGen(schema[$keys], context, value, path)} }).filter(Boolean);
if (${errorsAlias}.length !== 0) { throw new AggregateError(${errorsAlias}, 'Invalid value for path "${path}"'); }
`);
      }
      if ($values in schema) {
        const vAlias = context.unique('val');
        const valuesAlias = context.unique('vals');
        const errorsAlias = context.unique('err');
        code.push(`{
const ${valuesAlias} = Object.values(${valuePath});
const ${errorsAlias} = ${valuesAlias}.flatMap((${vAlias}) => { ${codeGen(schema[$values], context, vAlias, path)} }).filter(Boolean);
if (${errorsAlias}.length !== 0) { throw new AggregateError(${errorsAlias}, 'Invalid value for path "${path}"'); }
}`);
      }
      const keys = Object.keys(schema);
      code.push(...keys.map((key) => codeGen(schema[key], context, `${valueAlias}['${key}']`, `${path}.${key}`)));
      return `{${code.join('\n')}}`;
    }
  } else if (typeof schema === 'symbol') {
    const index = context.register(schema);
    const valueAlias = context.unique('v');
    const registryAlias = context.unique('r');

    return `
const ${valueAlias} = ${valuePath};
const ${registryAlias} = ctx.registry[${index}];
if (typeof ${valueAlias} !== 'symbol') { throw new ctx.Error(typeof ${valueAlias}, 'symbol', '${path}', 'type of'); }
if (${valueAlias} !== ${registryAlias}) { throw new ctx.Error(${valueAlias}.toString(), ${registryAlias}.toString(), '${path}', 'symbol'); }
    `;
  } else if (schema === null || schema === undefined) {
    const valueAlias = context.unique('v');
    return `
const ${valueAlias} = ${valuePath};
if (${valueAlias} !== null && ${valueAlias} !== undefined ) { throw new ctx.Error(${valueAlias}, 'nullable', '${path}'); }
    `;
  } else {
    const valueAlias = context.unique('v');
    const typeAlias = context.unique('t');
    const value = context.unique('val');
    return `
const ${valueAlias} = ${valuePath};
const ${typeAlias} = '${typeof schema}';
const ${value} = ${JSON.stringify(schema)};
if (typeof ${valueAlias} !== ${typeAlias}) { throw new ctx.Error(typeof ${valueAlias}, ${typeAlias}, '${path}', 'type of'); }
if (${valueAlias} !== ${value}) { throw new ctx.Error(${valueAlias}, ${value}, '${path}'); }
`;
  }
};

const flatAggregateError = (error: AggregateError): AssertError[] => {
  return error.errors.flatMap((e) => (e instanceof AggregateError ? flatAggregateError(e) : e));
};

export const compile = <S>(schema: S, rootName: string, options: CompilerOptions = {}) => {
  const context = new Context(options);
  const code = codeGen(schema, context, 'data', rootName);
  const validator = new Function('ctx', 'data', code);
  return (data: SchemaData<S>) => {
    try {
      validator(context, data);
    } catch (e) {
      const errors = e instanceof AggregateError ? flatAggregateError(e) : [e];
      throw new AggregateError(errors, 'Validation failure');
    }
  };
};

const assert = (target: unknown, schema: unknown, path: string): AssertError[] => {
  if (schema instanceof And) {
    return schema.schemas.flatMap((schema) => assert(target, schema, path)).filter((error) => !!error);
  } else if (schema instanceof Or) {
    const errors = schema.schemas.flatMap((schema) => assert(target, schema, path));
    const filteredErrors = errors.filter((error) => !!error);
    if (filteredErrors.length === schema.schemas.length) {
      return filteredErrors;
    }
  } else if (schema instanceof Optional) {
    if (target !== undefined && target !== null) {
      return assert(target, schema.schemas[0], path);
    }
  } else if (schema instanceof Tuple) {
    if (!Array.isArray(target)) {
      return [new AssertError(target, 'array', path)];
    }
    return schema.schemas.flatMap((s, idx) => assert(target[idx], s, `${path}[${idx}]`)).filter((error) => !!error);
  } else if (typeof schema === 'function') {
    if (target === null || target === undefined) {
      return [new AssertError(target, 'a non-nullable', path)];
    }
    if (typeof target === 'object' && !(target instanceof schema)) {
      return [new AssertError(target?.constructor?.name, `instance of ${schema.name}`, path, 'instance of')];
    }
    if (typeof target !== 'object' && target?.constructor !== schema) {
      return [new AssertError(target?.constructor?.name, schema.name, path, 'type')];
    }
  } else if (Array.isArray(schema)) {
    if (!Array.isArray(target)) {
      return [new AssertError(target, 'array', path)];
    }
    return schema.flatMap((s) => target.flatMap((value, idx) => assert(value, s, `${path}[${idx}]`))).filter((error) => !!error);
  } else if (typeof schema === 'object' && schema !== null) {
    if (schema instanceof RegExp) {
      if (!schema.test('' + target)) {
        return [new AssertError(target, `matching ${schema.toString()}`, path)];
      }
      return [];
    } else {
      if (target === null || target === undefined) {
        return [new AssertError(target, 'object', path)];
      }
      if (typeof target !== 'object') {
        return [new AssertError(target, schema.constructor.name, path)];
      }
      if ($keys in schema) {
        const targetKeys = Object.keys(target);
        return targetKeys.flatMap((key) => assert(key, schema[$keys], path)).filter((error) => !!error);
      }
      if ($values in schema) {
        const targetKeys = Object.keys(target);
        return targetKeys.flatMap((key) => assert(target[key as keyof typeof target], schema[$values], path)).filter((error) => !!error);
      }
      return Object.keys(schema)
        .flatMap((key) => assert(target[key as keyof typeof target], schema[key as keyof typeof target], path))
        .filter((error) => !!error);
    }
  } else if (schema === null || schema === undefined) {
    if (target !== null && target !== undefined) {
      return [new AssertError(target, 'nullable', path)];
    }
  } else if (target !== schema) {
    return [new AssertError(target, schema, path)];
  }
  return [];
};

export const ascertain = <T extends Data = DataValue>(schema: Schema<T>, data: T, rootName = '[root]') => {
  const result = assert(data, schema, rootName).filter((error) => !!error);
  if (result.length > 0) {
    throw new AggregateError(result, 'Validation failure');
  }
};
