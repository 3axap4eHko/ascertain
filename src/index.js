function findFirst(array, map) {
  for (let i = 0; i < array.length; i++) {
    const result = map(array[i], i);
    if (result) {
      return result;
    }
  }
  return false;
}

function findNot(array, map) {
  const result = [];
  for (let i = 0; i < array.length; i++) {
    const value = map(array[i], i);
    if (!value) {
      return false;
    } else {
      result.push(value);
    }
  }
  return result;
}

export const $keys = Symbol.for('@@keys');
export const $values = Symbol.for('@@values');

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

function Optional(schema) {
  this.schema = schema;
}

function ascertain(target, schema, path, optional) {
  if (schema === null || typeof schema === 'undefined') {
    return new AssertError(schema, 'any value', path, 'schema value');
  }
  if (schema instanceof Optional) {
    return ascertain(target, schema.schema, path, true);
  }
  if (target === null || typeof target === 'undefined') {
    if (!optional) {
      return new AssertError(target, 'any value', path);
    }
    return void 0;
  }
  if (typeof schema === 'function') {
    if (target.constructor !== schema) {
      return new AssertError(target, schema.name, path);
    }
  } else if (Array.isArray(schema)) {
    if (!Array.isArray(target)) {
      return new AssertError(target, schema.constructor.name, path);
    }
    return findFirst(target, (value, idx) => {
      const result = findNot(schema, itemSchemaType => ascertain(value, itemSchemaType, `${path}.${idx}`));
      if (result) {
        const expected = result.map(({ expected }) => expected).join(', ');
        return new AssertError(target, `one of ${expected}`, path);
      }
    });
  } else if (typeof schema === 'object') {
    if (schema instanceof RegExp) {
      if (!schema.test(target.toString())) {
        return new AssertError(target, `matching /${schema.source}/`, path);
      }
    } else if (schema instanceof Set) {
      if (!schema.has(target)) {
        return new AssertError(target, `one of ${JSON.stringify([...schema])}`, path);
      }
    } else {
      if (typeof target !== 'object') {
        return new AssertError(target, schema.constructor.name, path);
      }
      if ($keys in schema) {
        const targetKeys = Object.keys(target);
        const assertError = findFirst(targetKeys, targetKey => ascertain(targetKey, schema[$keys], `${path}.${targetKey}`));
        if (assertError) {
          return assertError;
        }
      }
      if ($values in schema) {
        const targetKeys = Object.keys(target);
        const assertError = findFirst(targetKeys, targetKey => ascertain(target[targetKey], schema[$values], `${path}.${targetKey}`));
        if (assertError) {
          return assertError;
        }
      }
      return findFirst(Object.keys(schema), key => ascertain(target[key], schema[key], `${path}.${key}`));
    }
  } else if (target !== schema) {
    return new AssertError(target, schema, path);
  }
}

export const optional = schema => {
  return new Optional(schema);
};

export default (schema) => {
  return data => {
    const result = ascertain(data, schema, '[root]');
    if (result instanceof AssertError) {
      throw new TypeError(result.toString());
    }
  };
};
