# Ascertain

Simple, fast, for browser and node js object schema validator

[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][npm-url]
[![Build Status][travis-image]][travis-url]

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
Copyright (c) 2019 Ivan Zakharchenko

[npm-url]: https://www.npmjs.com/package/ascertain
[downloads-image]: https://img.shields.io/npm/dm/ascertain.svg?maxAge=43200
[npm-image]: https://img.shields.io/npm/v/ascertain.svg?maxAge=43200
[travis-url]: https://travis-ci.org/3axap4eHko/ascertain
[travis-image]: https://travis-ci.org/3axap4eHko/ascertain.svg?branch=master
[codecov-url]: 
[codecov-image]: https://img.shields.io/codecov/c/github/babel/babel/master.svg?maxAge=43200 
