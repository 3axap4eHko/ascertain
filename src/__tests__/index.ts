import { ascertain, compile, optional, and, or, tuple, $keys, $values, as, Schema, SchemaData, AssertError } from '../index';

const fixture = {
  a: 1,
  b: 'string',
  c: true,
  d: [1, 2, 3, 4, 5],
  e: { f: 1 },
  f() { },
  g: null,
  h: new Date(),
  i: undefined,
  j: Symbol('test'),
};

describe('Ascertain test suite', () => {
  it('Should export AssertError class', () => {
    expect(AssertError).toBeDefined();
  });
  it('Should throw error if no arguments for Operation', () => {
    expect(() => and()).toThrow();
  });
  describe.each([
    {
      title: 'compiled',
      validate: (schema: unknown, data: any) => {
        const compiled = compile(schema, '[DATA]');
        compiled(data as SchemaData<typeof schema>);
      },
    },
    {
      title: 'runtime',
      validate: (schema: unknown, data: any) => {
        ascertain(schema, data, '[DATA]');
      },
    },
  ])('for $title schema', ({ validate }) => {

    it.each([
      ['Number', { a: Number }, fixture],
      ['String', { b: String }, fixture],
      ['Boolean', { c: Boolean }, fixture],
      ['Function', { f: Function }, fixture],
      ['Array', { d: Array }, fixture],
      ['[]', { d: [] }, fixture],
      ['[Number]', { d: [Number] }, fixture],
      ['Object', { e: Object }, fixture],
      ['{}', { e: {} }, fixture],
      ['Object properties', { e: { f: Number } }, fixture],
      ['RegExp', { b: /^string$/ }, fixture],
      ['1', { a: 1 }, fixture],
      ['string', { b: 'string' }, fixture],
      ['true', { c: true }, fixture],
      ['null', { g: null }, fixture],
      ['undefined', { i: undefined }, fixture],
      ['symbol', { j: fixture.j }, fixture],
      ['Optional exists', { c: optional(true) }, fixture],
      ['Optional does not exist', { z: optional(true) }, fixture],
      ['Optional complex does not exist', { z: optional(or(true, false)) }, fixture],
      ['And', { h: and(Date, { toJSON: Function }) }, fixture],
      ['Or', { c: or(true, false) }, fixture],
      ['Tuple', { d: tuple(1, 2, 3, 4, 5) }, fixture],
      ['Keys', { e: { [$keys]: /^\w+$/ } }, fixture],
      ['Values', { e: { [$values]: Number } }, fixture],
    ])('Should validate schema type %s positive', <T>(_: string, schema: Schema<T>, target: any) => {
      expect(() => validate(schema, target)).not.toThrow();
    });

    it.each([
      ['Number', { c: Number }, fixture, 'expected Number'],
      ['String', { a: String }, fixture, 'expected String'],
      ['Boolean', { b: Boolean }, fixture, 'expected Boolean'],
      ['Function', { a: Function }, fixture, 'expected Function'],
      ['Array', { e: Array }, fixture, 'expected instance of Array'],
      ['[]', { e: [] }, fixture, 'expected array'],
      ['[String]', { d: [String] }, fixture, 'expected String', fixture.d.length],
      ['[Boolean, String]', { d: [Boolean, String] }, fixture, /expected (Boolean|String)/, fixture.d.length * 2],
      ['Object', { c: Object }, fixture, 'expected Object'],
      ['Object properties', { e: { d: Number } }, fixture, 'non-nullable'],
      ['{}', { i: {} }, fixture, 'expected object'],
      ['RegExp', { b: /^testing$/ }, fixture, 'matching'],
      ['RegExp undefined', { z: /^testing$/ }, fixture, 'matching'],
      ['Value', { c: false }, fixture, 'false'],
      ['Null', { a: null }, fixture, 'expected nullable'],
      ['Undefined', { a: undefined }, fixture, 'expected nullable'],
      ['Optional exists', { c: optional(false) }, fixture, 'expected false'],
      ['And', { c: and(true, false, null) }, fixture, /expected (false|nullable)/, 2],
      ['Or', { c: or(String, Number) }, fixture, /expected (String|Number)/, 2],
      ['Tuple', { a: tuple(1) }, fixture, 'expected array'],
      ['Keys', { e: { [$keys]: Number } }, fixture, 'expected Number'],
      ['Values', { e: { [$values]: String } }, fixture, 'expected String'],
      ['Array schema', [Number], {}, 'expected array'],
      ['Array enum schema', [Number, String], [1, '3', false], /expected (Number|String)/, 6 - 2],
      ['Non object target', {}, 2, 'expected Object'],
    ])('Should validate schema type %s negative', (_, schema, target: any, message, size = 1) => {
      try {
        validate(schema, target);
        expect(false).toBe(true);
      } catch (error) {
        expect(error.errors).toHaveLength(size);
        for (const e of error.errors) {
          expect(e.message).toMatch(message);
        }
      }
    });

    it('Should validate README example', () => {
      expect(() => {
        validate(
          {
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
          },
          {
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

  describe('for conversion utils', () => {
    it.each([
      ['string', as.string, 'string', 'string'],
      ['number', as.number, '1', 1],
      ['date', as.date, '2024-12-31', new Date('2024-12-31')],
      ['time', as.time, '1m', 60 * 1000],
      ['boolean true', as.boolean, '1', true],
      ['boolean false', as.boolean, '0', false],
      ['array', (v: string) => as.array(v, ','), '1,2,3', ['1','2','3']],
      ['json', as.json, 'null', null],
      ['base64', as.base64, Buffer.from('test').toString('base64'), 'test'],
    ])('Should convert to %s', (_, convert, value, expected) => {
      expect(convert(value)).toEqual(expected);
    })
    it.each([
      ['string', as.string, undefined],
      ['number', as.number, undefined],
      ['date', as.date, undefined],
      ['time', as.time, undefined],
      ['boolean true', as.boolean, undefined],
      ['boolean false', as.boolean, undefined],
      ['array', (v: string) => as.array(v, ','), undefined],
      ['json', as.json, undefined],
      ['base64', as.base64, undefined],
    ])('Should not throw an error during conversion to %s', (_, convert, value) => {
      expect(() => convert(value!)).not.toThrow();
    })
  });
});
