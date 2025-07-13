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

## API

- [`$keys`](#keys)
- [`$values`](#values)
- [`$strict`](#strict)
- [`or(...schemas: Schema[])`](#orschemas-schema)
- [`and(...schemas: Schema[])`](#andschemas-schema)
- [`optional(schema: Schema)`](#optionalschema-schema)
- [`tuple(...schemas: Schema[])`](#tupleschemas-schema)
- [`compile(schema: Schema, rootName: string)`](#compileschema-schema-rootname-string)
- [`ascertain(schema: Schema, data: T, rootName = "[root]")`](#ascertainschema-schema-data-t-rootname--root)

### `$keys`

 Symbol for validating object keys against a schema.
 

### `$values`

 Symbol for validating object values against a schema.
 

### `$strict`

 Symbol for enforcing strict object validation (no extra properties allowed).
 

### `or(...schemas: Schema[])`

 Operator for validating data against any of the provided schemas (logical OR).

 Creates a schema that accepts data matching any one of the provided schemas.
 This is useful for creating union types or alternative validation paths.

- @template T - The type of data the operator validates.
- @param schemas - Multiple schemas where at least one must match the data.
- @returns A schema that validates data against any of the provided schemas.
 

### `and(...schemas: Schema[])`

 Operator for validating data against all provided schemas (logical AND).

 Creates a schema that requires data to match every one of the provided schemas.
 This is useful for combining multiple validation requirements or adding constraints.

- @template T - The type of data the operator validates.
- @param schemas - Multiple schemas that all must match the data.
- @returns A schema that validates data against all of the provided schemas.
 

### `optional(schema: Schema)`

 Operator for making a schema optional (nullable).

 Creates a schema that accepts the provided schema or null/undefined values.
 This is useful for optional object properties or nullable fields.

- @template T - The type of data the operator validates.
- @param schema - The schema to make optional.
- @returns A schema that validates data against the provided schema or accepts null/undefined.
 

### `tuple(...schemas: Schema[])`

 Operator for validating data against a fixed-length tuple of schemas.

 Creates a schema that validates arrays with a specific length and type for each position.
 This is useful for coordinate pairs, RGB values, or any fixed-structure data.

- @template T - The type of data the operator validates (a tuple of types).
- @param schemas - Schemas for each position in the tuple, in order.
- @returns A schema that validates data as a tuple with the specified structure.
 

### `compile(schema: Schema, rootName: string)`

 Compiles a schema into a validation function.

 This function takes a schema definition and generates a JavaScript function
 that can be used to validate data against the schema.

- @template T - The type of data the schema validates.
- @param schema - The schema to compile.
- @param rootName - A name for the root of the data structure (used in error messages).
- @returns A validation function that takes data as input and throws a TypeError if the data does not conform to the schema.
 

### `ascertain(schema: Schema, data: T, rootName = "[root]")`

 Asserts that data conforms to a given schema.

 This function is a convenient wrapper around `compile`. It compiles the schema
 and immediately validates the provided data against it.

- @template T - The type of data the schema validates.
- @param schema - The schema to validate against.
- @param data - The data to validate.
- @param rootName - A name for the root of the data structure (used in error messages, defaults to '[root]').
- @throws `{TypeError}` If the data does not conform to the schema.
 


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
