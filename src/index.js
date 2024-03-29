class AssertError {
  constructor(value, expected, path, subject = 'value') {
    this.value = value;
    this.expected = expected;
    this.path = path;
    this.subject = subject;
  }

  toString() {
    return `Invalid ${this.subject} ${JSON.stringify(this.value)} specified by path ${this.path} expected ${this.expected}`;
  }
}

function findFirstError(array, map) {
  for (let i = 0; i < array.length; i++) {
    const error = map(array[i], i);
    if (error) {
      return error;
    }
  }
  return false;
}

function findNotError(array, map) {
  const errors = [];
  for (let i = 0; i < array.length; i++) {
    const error = map(array[i], i);
    if (!error) {
      return false;
    } else {
      errors.push(error);
    }
  }
  return errors.reduce((result, error) => {
    return new AssertError(result.value, [result.expected, error.expected].join(' or '), result.path, result.string);
  });
}

function Optional(schema) {
  this.schema = schema;
}

function And(schema) {
  this.schema = schema;
}

function Or(schema) {
  this.schema = schema;
}

export const optional = (schema) => {
  return new Optional(schema);
};

export const and = (...schema) => {
  return new And(schema);
};

export const or = (...schema) => {
  return new Or(schema);
};

export const $keys = Symbol.for('@@keys');
export const $values = Symbol.for('@@values');

export const fromBase64 =
  typeof Buffer === 'undefined' ? (value) => atob(value) : (value) => Buffer.from(value, 'base64').toString('utf-8');

const MULTIPLIERS = {
  ms: 1,
  s: 1000,
  m: 60000,
  h: 3600000,
  d: 86400000,
  w: 604800000,
};

export const as = {
  string: (value) => {
    return typeof value === 'string' ? value : undefined;
  },
  number: (value) => {
    const result = parseFloat(value);
    return Number.isFinite(result) ? result : undefined;
  },
  date: (value) => {
    const result = Date.parse(value);
    return Number.isFinite(result) ? new Date(result) : undefined;
  },
  time: (value) => {
    const matches = value?.match(/^(\d+)(ms|s|m|h|d|w)?$/);
    if (matches) {
      const [_, amount, unit = 'ms'] = matches;
      return parseInt(amount, 10) * MULTIPLIERS[unit];
    }
    return undefined;
  },
  boolean: (value) => (/^(0|1|true|false|enabled|disabled)$/i.test(value) ? /^(1|true|enabled)$/i.test(value) : undefined),
  array: (value, delimiter) => value?.split(delimiter) ?? undefined,
  json: (value) => {
    try {
      return JSON.parse(value);
    } catch (e) {
      return undefined;
    }
  },
  base64: (value) => {
    try {
      return fromBase64(value);
    } catch (e) {
      return undefined;
    }
  },
};

function certain(target, schema, path, optional) {
  if (schema === null || typeof schema === 'undefined') {
    return new AssertError(schema, 'any value', path, 'schema value');
  }
  if (schema instanceof Optional) {
    return certain(target, schema.schema, path, true);
  }
  const isValue = target !== null && typeof target !== 'undefined';
  if (!isValue && optional) {
    return;
  }
  if (schema instanceof Or) {
    if (!schema.schema.length) {
      return new AssertError(target, 'values', path, 'OR schema');
    }
    return findNotError(schema.schema, (schema) => certain(target, schema, path));
  }
  if (schema instanceof And) {
    if (!schema.schema.length) {
      return new AssertError(target, 'values', path, 'AND schema');
    }
    return findFirstError(schema.schema, (schema) => certain(target, schema, path));
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
      return findNotError(schema, (itemSchemaType) => certain(value, itemSchemaType, `${path}.${idx}`));
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
        const assertError = findFirstError(targetKeys, (targetKey) =>
          certain(targetKey, schema[$keys], `${path}.${targetKey}`)
        );
        if (assertError) {
          return assertError;
        }
      }
      if ($values in schema) {
        const targetKeys = Object.keys(target);
        const assertError = findFirstError(targetKeys, (targetKey) =>
          certain(target[targetKey], schema[$values], `${path}.${targetKey}`)
        );
        if (assertError) {
          return assertError;
        }
      }
      return findFirstError(Object.keys(schema), (key) => certain(target[key], schema[key], `${path}.${key}`));
    }
  } else if (target !== schema) {
    return new AssertError(target, schema, path);
  }
}

export const ascertain = (schema, data, rootName = '[root]') => {
  const result = certain(data, schema, rootName);
  if (result instanceof AssertError) {
    throw new TypeError(result.toString());
  }
};

export default ascertain;
