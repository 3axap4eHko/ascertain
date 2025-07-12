# Ascertain

### Ascertain what data is not suitable for your library

0-Deps, simple, blazing fast, for browser and Node.js object schema validator

[![Coverage Status][codecov-image]][codecov-url]
[![Build Status][github-image]][github-url]
[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][npm-url]
[![Snyk][snyk-image]][snyk-url]

## Features

- Type-safe validation: Ensures your data conforms to predefined schemas.
- Composite schemas: Supports logical AND, OR, and optional schemas.
- Type casting: Automatically parses and casts strings to other types.
- Error handling: Provides detailed error messages for invalid data.

## Schema description

 - Primitive Values: Any primitive value (e.g., string, number, bigint, boolean, undefined, symbol, null) is used as an expected constant to match against.
 - Function Types: Functions are used as constructors for non-objects and instance types for object types.
 - Array Values: Arrays are used to represent an expected array type, where every item in the array must match the specified type (acting as an "and" operator).
 - Regular Expressions: Regular expressions are used to validate that a value matches a specified string pattern.
 - Object Types: Non-null objects are used as templates for expected properties, where each property of the object must match the corresponding schema definition.

## Usage Example

### Schema compilation
```typescript
import { compile, optional, and, or, $keys, $values, Schema, as } from 'ascertain';

const validate = compile({
  number: Number,
  string: String,
  boolean: Boolean,
  function: Function,
  array: Array,
  object: Object,
  date: and(Date, { toJSON: Function }),
  regexp: /regexp/,
  oneOfValue: or(1, 2, 3),
  arrayOfNumbers: [Number],
  objectSchema: {
    number: Number,
  },
  optional: optional({
    number: Number,
  }),
  keyValue: {
    [$keys]: /^key[A-Z]/,
    [$values]: Number
  },
  parsedNumber: Number,
  parsedString: String,
  parsedBoolean: Boolean,
  parsedArray: [String],
  parsedJSON: {
    number: 1,
  },
  parsedBase64: String,
  parsedTime: 2 * 60 * 1000, // two minutes
  parsedDate: Date,
});

```

### Runtime validation
Create data ascertain
```typescript
import { ascertain, optional, and, or, $keys, $values, Schema, as } from 'ascertain';

// create data sample
const data = {
  number: 1,
  string: 'string',
  boolean: true,
  function: () => {},
  array: [],
  object: {},
  date: new Date,
  regexp: 'regexp',
  oneOfValue: 1,
  arrayOfNumbers: [1,2,3,4,5],
  objectSchema: {
    number: 1,
  },
  optional: null,
  keyValue: {
    keyOne: 1,
    keyTwo: 2,
    keyThree: 3,
  },
  // fault tolernat type casting
  parsedNumber: as.number('1'),
  parsedString: as.string('string'),
  parsedBoolean: as.boolean('false'),
  parsedArray: as.array('1,2,3,4,5', ','),
  parsedJSON: as.json('{ "number": 1 }'),
  parsedBase64: as.base64('dGVzdA=='),
  parsedTime: as.time('2m'),
  parsedDate: as.date('31-12-2024'),
};

// create data schema
const schema: Schema<typeof data> = {
  number: Number,
  string: String,
  boolean: Boolean,
  function: Function,
  array: Array,
  object: Object,
  date: and(Date, { toJSON: Function }),
  regexp: /regexp/,
  oneOfValue: or(1, 2, 3),
  arrayOfNumbers: [Number],
  objectSchema: {
    number: Number,
  },
  optional: optional({
    number: Number,
  }),
  keyValue: {
    [$keys]: /^key[A-Z]/,
    [$values]: Number
  },
  parsedNumber: Number,
  parsedString: String,
  parsedBoolean: Boolean,
  parsedArray: [String],
  parsedJSON: {
    number: 1,
  },
  parsedBase64: String,
  parsedTime: 2 * 60 * 1000, // two minutes
  parsedDate: Date,
};

// validate
const validate = ascertain<typeof data>(schema, data, '[DATA]');
```

### Benchmark VS zod and ajv
```
⭐ Script ajv-vs-zod-vs-ascertain.js
  ⇶ Suite ajv vs zod vs ascertain
    ➤ Perform benchmark
      ✓ Measure 500000 zod static schema validation
        ┌──────────┬──────────┬──────────┬──────────┬────────────┬────────┐
        │ (index)  │ med      │ p95      │ p99      │ total      │ count  │
        ├──────────┼──────────┼──────────┼──────────┼────────────┼────────┤
        │ 0.000699 │ 0.000788 │ 0.000996 │ 0.001624 │ 462.602373 │ 500000 │
        └──────────┴──────────┴──────────┴──────────┴────────────┴────────┘
      ✓ Measure 500000 zod dynamic schema validation
        ┌──────────┬──────────┬──────────┬──────────┬─────────────┬────────┐
        │ (index)  │ med      │ p95      │ p99      │ total       │ count  │
        ├──────────┼──────────┼──────────┼──────────┼─────────────┼────────┤
        │ 0.006248 │ 0.006918 │ 0.007524 │ 0.016948 │ 3780.465563 │ 500000 │
        └──────────┴──────────┴──────────┴──────────┴─────────────┴────────┘
      ✓ Measure 500000 ascertain static schema validation
        ┌──────────┬──────────┬──────────┬──────────┬───────────┬────────┐
        │ (index)  │ med      │ p95      │ p99      │ total     │ count  │
        ├──────────┼──────────┼──────────┼──────────┼───────────┼────────┤
        │ 0.000063 │ 0.000071 │ 0.000098 │ 0.000267 │ 41.673271 │ 500000 │
        └──────────┴──────────┴──────────┴──────────┴───────────┴────────┘
      ✓ Measure 500000 ascertain dynamic schema validation
        ┌──────────┬──────────┬──────────┬──────────┬────────────┬────────┐
        │ (index)  │ med      │ p95      │ p99      │ total      │ count  │
        ├──────────┼──────────┼──────────┼──────────┼────────────┼────────┤
        │ 0.000367 │ 0.000415 │ 0.000525 │ 0.001055 │ 239.078129 │ 500000 │
        └──────────┴──────────┴──────────┴──────────┴────────────┴────────┘
      ✓ Measure 500000 ajv compiled schema validation
        ┌──────────┬──────────┬──────────┬──────────┬───────────┬────────┐
        │ (index)  │ med      │ p95      │ p99      │ total     │ count  │
        ├──────────┼──────────┼──────────┼──────────┼───────────┼────────┤
        │ 0.000063 │ 0.000072 │ 0.000124 │ 0.000307 │ 44.542936 │ 500000 │
        └──────────┴──────────┴──────────┴──────────┴───────────┴────────┘
```

## License
License [The MIT License](http://opensource.org/licenses/MIT)
Copyright (c) 2019-2025 Ivan Zakharchanka

[npm-url]: https://www.npmjs.com/package/ascertain
[downloads-image]: https://img.shields.io/npm/dw/ascertain.svg?maxAge=43200
[npm-image]: https://img.shields.io/npm/v/ascertain.svg?maxAge=43200
[github-url]: https://github.com/3axap4eHko/ascertain/actions/workflows/cicd.yml
[github-image]: https://github.com/3axap4eHko/ascertain/actions/workflows/cicd.yml/badge.svg
[codecov-url]: https://codecov.io/gh/3axap4eHko/ascertain
[codecov-image]: https://img.shields.io/codecov/c/github/3axap4eHko/ascertain/master.svg?maxAge=43200
[snyk-url]: https://snyk.io/test/npm/ascertain/latest
[snyk-image]: https://img.shields.io/snyk/vulnerabilities/github/3axap4eHko/ascertain.svg?maxAge=43200
