import ascertain, { optional, and, or, $keys, $values } from '../index';

const fixture = {
  a: 1, b: 'test', c: true, d: [1, 2, 3, 4, 5], e: { f: 1 }, f() {
  }, g: null, h: new Date(),
};


describe('Ascertain test suite', () => {
  it('Should throw an error for null or undefined schema', () => {
    const isValid = ascertain(null);
    expect(() => isValid(fixture)).toThrow('Invalid schema value null');
  });

  it('Should throw an error for null or undefined target', () => {
    const isValid = ascertain({});
    expect(() => isValid(null)).toThrow('Invalid value null specified by path [root]');
  });

  it.each([
    ['Number', { a: Number }, fixture],
    ['String', { b: String }, fixture],
    ['Boolean', { c: Boolean }, fixture],
    ['Function', { f: Function }, fixture],
    ['Array', { d: Array }, fixture],
    ['Array items', { d: [Number] }, fixture],
    ['Object', { e: Object }, fixture],
    ['Object properties', { e: { f: Number } }, fixture],
    ['RegExp', { b: /^test$/ }, fixture],
    ['Value', { c: true }, fixture],
    ['Optional exists', { c: optional(true) }, fixture],
    ['Optional does not exist', { z: optional(true) }, fixture],
    ['And', { h: and(Date, { toJSON: Function }) }, fixture],
    ['Or', { c: or(true, false) }, fixture],
    ['Keys', { e: { [$keys]: /^\w+$/ } }, fixture],
    ['Values', { e: { [$values]: Number } }, fixture],
  ])('Should validate schema type %s positive', (title, schema, target) => {
    const isValid = ascertain(schema);
    expect(() => isValid(target)).not.toThrow();
  });

  it.each([
    ['Number', { c: Number }, fixture, 'expected Number'],
    ['String', { a: String }, fixture, 'expected String'],
    ['Boolean', { b: Boolean }, fixture, 'expected Boolean'],
    ['Function', { a: Function }, fixture, 'expected Function'],
    ['Array', { e: Array }, fixture, 'expected Array'],
    ['Array items', { d: [String] }, fixture, 'expected String'],
    ['Object', { c: Object }, fixture, 'expected Object'],
    ['Object properties', { e: { d: Number } }, fixture, 'any value'],
    ['RegExp', { b: /^testing$/ }, fixture, 'matching /^testing$/'],
    ['Value', { c: false }, fixture, 'expected false'],
    ['Null', { a: null }, fixture, 'Invalid schema value null'],
    ['Null', { g: null }, fixture, 'Invalid schema value null'],
    ['Optional exists', { c: optional(false) }, fixture, 'expected false'],
    ['Optional does not exist', { z: optional(null) }, fixture, 'Invalid schema value null'],
    ['And', { c: and() }, fixture, 'expected values'],
    ['And', { c: and(true, false) }, fixture, 'expected false'],
    ['Or', { c: or() }, fixture, 'expected values'],
    ['Or', { c: or(String, Number) }, fixture, 'expected String or Number'],
    ['Keys', { e: { [$keys]: Number } }, fixture, 'expected Number'],
    ['Values', { e: { [$values]: String } }, fixture, 'expected String'],
    ['Array schema', [], {}, 'expected Array'],
    ['Non object target', {}, 2, 'expected Object'],
  ])('Should validate schema type %s negative', (title, schema, target, message) => {
    const isValid = ascertain(schema);
    expect(() => isValid(target)).toThrow(message);
  });

  it('Should validate README example', () => {
    const isValid = ascertain({
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
        [$values]: Number,
      },
    });

    expect(() => {
      isValid({
        number: 1,
        string: 'string',
        boolean: true,
        function: Function,
        array: [],
        object: {},
        date: new Date,
        regexp: 'regexp',
        oneOfValue: 1,
        arrayOfNumbers: [1, 2, 3, 4, 5],
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
    }).not.toThrow();
  });

});
