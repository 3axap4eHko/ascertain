# Ascertain

Simple, fast, for browser and node js object schema validator

[![Coverage Status][codecov-image]][codecov-url]
[![Build Status][travis-image]][travis-url]
[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][npm-url]

## Usage Example

Immediate data ascertain
```js
import ascertain from 'ascertain';

ascertain({
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
  }
}, data);
```

Prepared data ascertain
```js
import ascertain from 'ascertain';

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
  }
});
```

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
