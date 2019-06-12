function findFirst(array, map) {
  for (let i = 0; i < array.length; i++) {
    const result = map(array[i], i);
    if (result) {
      return result;
    }
  }
  return false;
}

function ascertain(target, schema, path) {
  if (schema === null || typeof schema === 'undefined') {
    return new Error(`Invalid schema ${JSON.stringify(schema)}`);
  }
  if (target === null || typeof target === 'undefined') {
    return new Error(`Invalid value by path ${path} expected not null and not undefined`);
  }
  if (typeof schema === 'function') {
    if (target.constructor !== schema) {
      return new Error(`Invalid type by path ${path} expected ${schema.name}`);
    }
  } else if (Array.isArray(schema)) {
    if (!Array.isArray(target)) {
      return new Error(`Invalid type by path ${path} expected Array`);
    }
    return findFirst(target, (value, idx) => {
      return schema.every(itemSchemaType => ascertain(value, itemSchemaType, `${path}.${idx}`))
        && new Error(`Invalid type by path ${path}.${idx} expected one of ${schema.map(({ name }) => name)}`);
    });
  } else if (typeof schema === 'object') {
    if (schema instanceof RegExp) {
      if (!schema.test(target.toString())) {
        return new Error(`Invalid value by path ${path} expected matching /${schema.source}/`);
      }
    } else if (schema instanceof Set) {
      if (!schema.has(target)) {
        return new Error(`Invalid value by path ${path} expected one of ${JSON.stringify([...schema])}`);
      }
    } else {
      if (typeof target !== 'object') {
        return new Error(`Invalid type by path ${path} expected Object`);
      }
      return findFirst(Object.keys(schema), key => ascertain(target[key], schema[key], `${path}.${key}`));
    }
  } else if (target !== schema) {
    return new Error(`Invalid value ${JSON.stringify(target)} by path ${path} expected value ${JSON.stringify(schema)}`);
  }
}

function handleResult(result) {
  if (result) {
    throw result;
  }
}

export default (schema, data) => {
  if (typeof data !== 'undefined') {
    handleResult(ascertain(data, schema, '[root]'));
  }
  return data => {
    handleResult(ascertain(data, schema, '[root]'));
  };
};
