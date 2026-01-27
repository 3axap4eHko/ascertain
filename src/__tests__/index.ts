import { ascertain, compile, optional, and, or, tuple, $keys, $values, $strict, as, Schema, createValidator } from '../index';

const fixture = {
  a: 1,
  b: 'string',
  c: true,
  d: [1, 2, 3, 4, 5],
  dt: [1, true],
  e: { f: 1 },
  f() {},
  g: null,
  h: new Date(),
  i: undefined,
  j: Symbol('test'),
  k: BigInt(123),
  l: Symbol.for('test-symbol'),
};

const validate = (schema: unknown, data: any) => {
  const compiled = compile(schema, '[DATA]');
  compiled(data);
};

describe('Ascertain test suite', () => {
  it('Should throw error if no arguments for Operation', () => {
    expect(() => and()).toThrow();
  });
  describe('for compiled schema', () => {
    it.each([
      ['Number', { a: Number }, fixture],
      ['String', { b: String }, fixture],
      ['Boolean', { c: Boolean }, fixture],
      ['BigInt', { k: BigInt }, fixture],
      ['Symbol', { l: Symbol }, fixture],
      ['Function', { f: Function }, fixture],
      ['Function async', { f: Function }, { f: async () => {} }],
      ['Function async declaration', { f: Function }, { f: async function() {} }],
      ['Function generator', { f: Function }, { f: function* () {} }],
      ['Function async generator', { f: Function }, { f: async function* () {} }],
      ['Function bound', { f: Function }, { f: (() => {}).bind(null) }],
      ['Function class', { f: Function }, { f: class {} }],
      ['Array', { d: Array }, fixture],
      ['[]', { d: [] }, fixture],
      ['Array [Number]', { d: [Number] }, fixture],
      ['Tuple of Number', { d: [Number,Number,Number,Number,Number] }, fixture],
      ['Tuple [Number, Boolean]', { dt: [Number,Boolean] }, fixture],
      ['Object', { e: Object }, fixture],
      ['{}', { e: {} }, fixture],
      ['Error', { error: Error }, { error: new Error() }],
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
      ['And', { h: and(Date, { toString: Function }) }, fixture],
      ['And', { d: and([], { length: 5 }) }, fixture],
      ['Or', { c: or(true, false) }, fixture],
      ['Tuple', { d: tuple(1, 2, 3, 4, 5) }, fixture],
      ['Keys', { e: { [$keys]: /^\w+$/ } }, fixture],
      ['Values', { e: { [$values]: Number } }, fixture],
    ])('Should validate schema type %s positive', <T>(_: string, schema: Schema<T>, target: any) => {
      expect(() => validate(schema, target)).not.toThrow();
    });

    it.each([
      ['Number', { c: Number }, fixture, 'expected type Number'],
      ['Number', { c: Number }, { c: NaN }, 'expected a valid Number'],
      ['Number', { c: Number }, { c: as.number('test') }, 'expected a valid number'],
      ['String', { a: String }, fixture, 'expected type String'],
      ['Boolean', { b: Boolean }, fixture, 'expected type Boolean'],
      ['BigInt', { a: BigInt }, fixture, 'expected type BigInt'],
      ['Symbol', { a: Symbol }, fixture, 'expected type Symbol'],
      ['Date', { d: Date }, { d: new Date('nothing') }, 'expected a valid Date'],
      ['Error', { value: 'test' }, { value: new Error('Invalid test') }, 'Invalid test for path'],
      ['Function', { a: Function }, fixture, 'expected type Function'],
      ['Array', { e: Array }, fixture, 'expected an instance of Array'],
      ['[]', { e: [] }, fixture, 'expected an instance of Array'],
      ['[String]', { d: [String] }, fixture, 'expected type String'],
      ['Array [Boolean or String]', { d: [or(Boolean, String)] }, fixture, /expected type (Boolean|String)/],
      ['Tuple [Boolean, String]', { dt: [Boolean, String] }, fixture, /expected type (Boolean|String)/],
      ['Object', { c: Object }, fixture, 'expected type Object'],
      ['Object properties', { e: { d: Number } }, fixture, 'non-nullable'],
      ['{}', { i: {} }, fixture, 'expected non-nullable'],
      ['RegExp', { b: /^testing$/ }, fixture, 'expected to match'],
      ['RegExp undefined', { z: /^testing$/ }, fixture, 'expected non-nullable'],
      ['Value', { c: false }, fixture, 'false'],
      ['Null', { a: null }, fixture, 'expected nullable'],
      ['Undefined', { a: undefined }, fixture, 'expected nullable'],
      ['Optional exists', { c: optional(false) }, fixture, 'expected false'],
      ['And', { c: and(true, false, null) }, fixture, /expected (false|nullable)/],
      ['Or', { c: or(String, Number) }, fixture, /expected type (String|Number)/],
      ['Or', or({ e: { f: 2 } }, { g: Array }), fixture, /expected/],
      ['Tuple', { a: tuple(1) }, fixture, 'expected an instance of Array'],
      ['Keys', { e: { [$keys]: Number } }, fixture, 'expected type Number'],
      ['Values', { e: { [$values]: String } }, fixture, 'expected type String'],
      ['Values', { e: { [$strict]: true } }, fixture, 'not allowed'],
      ['Array schema', [Number], {}, 'expected an instance of Array'],
      ['Array enum schema', [or(Number, String)], [1, '3', false], /expected type (Number|String)/],
      ['Non object target', {}, 2, 'expected an instance of Object'],
      ['Symbol validation wrong type', { sym: Symbol('test') }, { sym: 'not-a-symbol' }, /for path "\[DATA\]\.sym"/],
      ['Symbol validation wrong value', { sym: Symbol('test') }, { sym: Symbol('different') }, 'expected Symbol(test)'],
      ['Null validation with wrong value', { val: null }, { val: 'not-null' }, /Invalid value "not-null" for path "\[DATA\]\.val"/],
    ])('Should validate schema type %s negative', (_, schema, target: any, message) => {
      expect(() => validate(schema, target)).toThrow(message);
    });

    it('Should validate README example', () => {
      expect(() => {
        ascertain(
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
            objectSchema: {},
            optional: optional({
              number: Number,
            }),
            keyValue: {
              [$keys]: /^key[A-Z]/,
              [$values]: Number,
            },
            strict: {
              [$strict]: true,
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
            parsedRawTime: 2,
            parsedDate: Date,
          },
          {
            number: 1,
            string: 'string',
            boolean: true,
            function: Function,
            array: [],
            object: {},
            date: new Date(),
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
            strict: {},
            parsedNumber: as.number('1'),
            parsedString: as.string('string'),
            parsedBoolean: as.boolean('false'),
            parsedArray: as.array('1,2,3,4,5', ','),
            parsedJSON: as.json('{ "number": 1 }'),
            parsedBase64: as.base64('dGVzdA=='),
            parsedTime: as.time('2m'),
            parsedRawTime: as.time('2'),
            parsedDate: as.date('2024-12-31'),
          },
        );
      }).not.toThrow();
    });
  });

  describe('for conversion utils', () => {
    it.each([
      ['string', as.string, 'string', 'string'],
      ['number int', as.number, '42', 42],
      ['number negative', as.number, '-5', -5],
      ['number float', as.number, '3.14', 3.14],
      ['number float negative', as.number, '-3.14', -3.14],
      ['number scientific', as.number, '1e10', 1e10],
      ['number scientific float', as.number, '1.5e2', 150],
      ['number hex', as.number, '0xFF', 255],
      ['number hex lowercase', as.number, '0xff', 255],
      ['number hex negative', as.number, '-0xff', -255],
      ['number octal', as.number, '0o77', 63],
      ['number octal negative', as.number, '-0o77', -63],
      ['number binary', as.number, '0b1010', 10],
      ['number binary negative', as.number, '-0b1010', -10],
      ['date', as.date, '2024-12-31', new Date('2024-12-31')],
      ['time', as.time, '1m', 60 * 1000],
      ['boolean true', as.boolean, '1', true],
      ['boolean false', as.boolean, '0', false],
      ['array', (v: string) => as.array(v, ','), '1,2,3', ['1', '2', '3']],
      ['json', as.json, 'null', null],
      ['base64', as.base64, Buffer.from('test').toString('base64'), 'test'],
    ])('Should convert to %s', (_, convert, value, expected) => {
      expect(convert(value)).toEqual(expected);
    });

    it.each([
      ['string', as.string, undefined],
      ['number', as.number, undefined],
      ['number invalid hex', as.number, '0xGG'],
      ['number invalid octal', as.number, '0o99'],
      ['number invalid binary', as.number, '0b222'],
      ['date', as.date, undefined],
      ['time', as.time, undefined],
      ['time', as.time, 'ss'],
      ['time', as.time, '.ms'],
      ['boolean true', as.boolean, undefined],
      ['boolean false', as.boolean, undefined],
      ['array', (v: string) => as.array(v, ','), undefined],
      ['json', as.json, undefined],
      ['base64', as.base64, undefined],
    ])('Should not throw an error during conversion to %s', (_, convert, value) => {
      expect(() => convert(value!)).not.toThrow();
    });
  });

  describe('for complex schema', () => {
    it('should return proper error', () => {
      const schema = and(
        {
          server: {
            type: String,
          },
        },
        or(
          {
            server: {
              type: 'a',
            },
          },
          {
            server: {
              type: 'b',
            },
            hosts: [Number],
          },
        ),
      );

      expect(() => {
        validate(schema, {
          server: {
            type: 'b',
          },
          hosts: ['a'],
        });
      }).toThrow('[DATA].hosts[0]');
    });
  });

  describe('createValidator', () => {
    it('should return same reference with narrowed type', () => {
      const config = {
        app: { name: 'test', port: 3000 },
        kafka: { brokers: ['localhost'] },
        redis: { host: 'localhost' },
      };

      const validateConfig = createValidator(config, '[CONFIG]');
      const validated = validateConfig({
        app: { name: String, port: Number },
        kafka: { brokers: [String] },
      });

      expect(validated).toBe(config);
      expect(validated.app.name).toBe('test');
      expect(validated.kafka.brokers).toEqual(['localhost']);
    });

    it('should throw on invalid config', () => {
      const config = {
        app: { name: 123 },
      };

      const validateConfig = createValidator(config, '[CONFIG]');

      expect(() => validateConfig({ app: { name: String } })).toThrow('[CONFIG].app.name');
    });

    it('should use default rootName', () => {
      const config = { value: 'not-a-number' };
      const validateConfig = createValidator(config);

      expect(() => validateConfig({ value: Number })).toThrow('[root]');
    });
  });
});
