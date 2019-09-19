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

export const optional = schema => {
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

function ascertain(target, schema, path, optional) {
  if (schema === null || typeof schema === 'undefined') {
    return new AssertError(schema, 'any value', path, 'schema value');
  }
  if (schema instanceof Optional) {
    return ascertain(target, schema.schema, path, true);
  }
  const isValue = target !== null && typeof target !== 'undefined';
  if (!isValue && optional) {
    return;
  }
  if (schema instanceof Or) {
    if (!schema.schema.length) {
      return new AssertError(target, 'values', path, 'OR schema');
    }
    return findNotError(schema.schema, schema => ascertain(target, schema, path));
  }
  if (schema instanceof And) {
    if (!schema.schema.length) {
      return new AssertError(target, 'values', path, 'AND schema');
    }
    return findFirstError(schema.schema, schema => ascertain(target, schema, path));
  }

  if (typeof schema === 'function') {
    if (!isValue) {
      return new AssertError(target, schema.name, path);
    }
    if (typeof target === 'object' && !(target instanceof schema)) {
      return new AssertError(target, schema.name, path);
    }
    if (typeof target !== 'object' && (target.constructor !== schema)) {
      return new AssertError(target, schema.name, path);
    }
  } else if (Array.isArray(schema)) {
    if (!Array.isArray(target)) {
      return new AssertError(target, schema.constructor.name, path);
    }
    return findFirstError(target, (value, idx) => {
      return findNotError(schema, itemSchemaType => ascertain(value, itemSchemaType, `${path}.${idx}`));
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
        const assertError = findFirstError(targetKeys, targetKey => ascertain(targetKey, schema[$keys], `${path}.${targetKey}`));
        if (assertError) {
          return assertError;
        }
      }
      if ($values in schema) {
        const targetKeys = Object.keys(target);
        const assertError = findFirstError(targetKeys, targetKey => ascertain(target[targetKey], schema[$values], `${path}.${targetKey}`));
        if (assertError) {
          return assertError;
        }
      }
      return findFirstError(Object.keys(schema), key => ascertain(target[key], schema[key], `${path}.${key}`));
    }
  } else if (target !== schema) {
    return new AssertError(target, schema, path);
  }
}

export default (schema, rootName = '[root]') => {
  return data => {
    const result = ascertain(data, schema, rootName);
    if (result instanceof AssertError) {
      throw new TypeError(result.toString());
    }
  };
};
