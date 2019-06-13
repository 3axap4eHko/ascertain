# Ascertain

### Ascertain what data is not suitable for your library

0-Deps, simple, fast, for browser and node js object schema validator

[![Coverage Status][codecov-image]][codecov-url]
[![Build Status][travis-image]][travis-url]
[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][npm-url]
[![Snyk][snyk-image]][snyk-url]

## Usage Example

Create data ascertain
```js
import ascertain, { optional, $keys, $values } from 'ascertain';

export default ascertain({
  number: Number,
  string: String,
  boolean: Boolean,
  function: Function,
  array: Array,
  object: Object,
  date: Date,
  regexp: /regexp/,
  oneOfValue: new Set([1, 2, 3]),
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
});
```

Validate your data
```js
import validate from './validate.js'

validate({
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
});
````

## License
License [The MIT License](http://opensource.org/licenses/MIT)
Copyright (c) 2019 Ivan Zakharchanka

[npm-url]: https://www.npmjs.com/package/ascertain
[downloads-image]: https://img.shields.io/npm/dw/ascertain.svg?maxAge=43200
[npm-image]: https://img.shields.io/npm/v/ascertain.svg?maxAge=43200
[travis-url]: https://travis-ci.org/3axap4eHko/ascertain
[travis-image]: https://travis-ci.org/3axap4eHko/ascertain.svg?branch=master
[codecov-url]: https://codecov.io/gh/3axap4eHko/ascertain
[codecov-image]: https://img.shields.io/codecov/c/github/3axap4eHko/ascertain/master.svg?maxAge=43200 
[snyk-url]: https://snyk.io/test/npm/ascertain/latest
[snyk-image]: https://img.shields.io/snyk/vulnerabilities/github/3axap4eHko/ascertain.svg?maxAge=43200
