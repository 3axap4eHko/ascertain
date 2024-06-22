import { compile, optional, and, or, $keys, $values, as, Schema } from '../index';

const fixture = {
  a: 1,
  b: 'test',
  c: true,
  d: [1, 2, 3, 4, 5],
  e: { f: 1 },
  f() {},
  g: null,
  h: new Date(),
};

describe('Ascertain compiled test suite', () => {
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
    ['Optional complex does not exist', { z: optional(or(true, false)) }, fixture],
    ['And', { h: and(Date, { toJSON: Function }) }, fixture],
    ['Or', { c: or(true, false) }, fixture],
    ['Keys', { e: { [$keys]: /^\w+$/ } }, fixture],
    ['Values', { e: { [$values]: Number } }, fixture],
    ['Null', { g: null }, fixture],
  ])('Should validate schema type %s positive', <T>(_: string, schema: Schema<T>, target: any) => {
    expect(() => {
      const compiled = compile(schema, 'DATA');
      compiled(target);
    }).not.toThrow();
  });

  it.each([
    ['Number', { c: Number }, fixture, 'expected Number'],
    ['String', { a: String }, fixture, 'expected String'],
    ['Boolean', { b: Boolean }, fixture, 'expected Boolean'],
    ['Function', { a: Function }, fixture, 'expected Function'],
    ['Array', { e: Array }, fixture, 'expected instance of Array'],
    ['Array items', { d: [String] }, fixture, 'expected String'],
    ['Object', { c: Object }, fixture, 'expected Object'],
    ['Object properties', { e: { d: Number } }, fixture, 'non-nullable'],
    ['RegExp', { b: /^testing$/ }, fixture, 'matching'],
    ['RegExp undefined', { z: /^testing$/ }, fixture, 'matching'],
    ['Value', { c: false }, fixture, 'false'],
    ['Null', { a: null }, fixture, 'expected null'],
    ['Optional exists', { c: optional(false) }, fixture, 'expected false'],
    ['And', { c: and(true, false, null) }, fixture, 'expected false and null'],
    ['Or', { c: or(String, Number) }, fixture, 'expected String or Number'],
    ['Keys', { e: { [$keys]: Number } }, fixture, 'expected Number'],
    ['Values', { e: { [$values]: String } }, fixture, 'expected String'],
    ['Array schema', [], {}, 'expected Array'],
    ['Array enum schema', [Number, String], [1, '3', false], 'expected Number or String'],
    ['Non object target', {}, 2, 'expected Object'],
  ])('Should validate schema type %s negative', (_, schema, target: any, message) => {
    expect(() => {
      const compiled = compile(schema, 'DATA');
      compiled(target);
    }).toThrow(message);
  });

  it('Should validate README example', () => {
    const compiled = compile({
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
    }, 'README');

    expect(() => {
      compiled({
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
        parsedNumber: as.number('1'),
        parsedString: as.string('string'),
        parsedBoolean: as.boolean('false'),
        parsedArray: as.array('1,2,3,4,5', ','),
        parsedJSON: as.json('{ "number": 1 }'),
        parsedBase64: as.base64('dGVzdA=='),
        parsedTime: as.time('2m'),
        parsedDate: as.date('2024-12-31'),
      });
    }).not.toThrow();
  });

});
