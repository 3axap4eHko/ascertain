# Ascertain

### Ascertain what data is not suitable for your library

0-Deps, simple, blazing fast, for browser and node js object schema validator

[![Coverage Status][codecov-image]][codecov-url]
[![Build Status][github-image]][github-url]
[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][npm-url]
[![Snyk][snyk-image]][snyk-url]

## Features

 - value validation
 - class validation
 - structure validation
 - regexp validation
 - and/or validation
 - object keys validation
 - object values validation

## Usage Example

Create data ascertain
```typescript
import ascertain, { optional, and, or, $keys, $values, Schema, as } from 'ascertain';

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
  parsedBoolean: as.boolean('false'),
  parsedArray: as.array('1,2,3,4,5', ','),
  parsedJSON: as.json('{ "number": 1 }'),
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
  parsedBoolean: Boolean,
  parsedArray: [String],
  parsedJSON: {
    number: 1,
  },
};

// validate
const validate = ascertain<typeof data>(schema, data, '[DATA]');
```

## License
License [The MIT License](http://opensource.org/licenses/MIT)
Copyright (c) 2022 Ivan Zakharchanka

[npm-url]: https://www.npmjs.com/package/ascertain
[downloads-image]: https://img.shields.io/npm/dw/ascertain.svg?maxAge=43200
[npm-image]: https://img.shields.io/npm/v/ascertain.svg?maxAge=43200
[github-url]: https://github.com/3axap4eHko/ascertain/actions/workflows/cicd.yml
[github-image]: https://github.com/3axap4eHko/ascertain/actions/workflows/cicd.yml/badge.svg
[codecov-url]: https://codecov.io/gh/3axap4eHko/ascertain
[codecov-image]: https://img.shields.io/codecov/c/github/3axap4eHko/ascertain/master.svg?maxAge=43200
[snyk-url]: https://snyk.io/test/npm/ascertain/latest
[snyk-image]: https://img.shields.io/snyk/vulnerabilities/github/3axap4eHko/ascertain.svg?maxAge=43200
