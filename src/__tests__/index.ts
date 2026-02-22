import { ascertain, compile, optional, and, or, tuple, discriminated, $keys, $values, $strict, as, Schema, createValidator, standardSchema, StandardSchemaV1, CompileOptions } from '../index';

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
  const compiled = compile(schema as Schema<unknown>);
  if (!compiled(data)) {
    throw new TypeError(compiled.issues[0].message, { cause: { issues: compiled.issues } });
  }
};

const expectValidationError = (schema: unknown, data: any, expected: string | RegExp) => {
  const compiled = compile(schema as Schema<unknown>);
  const valid = compiled(data);
  if (valid) {
    throw new Error('Expected validation to fail');
  }
  const messages = compiled.issues.map((i: any) => i.message);
  const combined = messages.join('\n');
  if (typeof expected === 'string') {
    expect(combined).toContain(expected);
  } else {
    expect(combined).toMatch(expected);
  }
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
      ['Error subclass', { error: TypeError }, { error: new TypeError() }],
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
      ['Error', { value: 'test' }, { value: new Error('Invalid test') }, 'Invalid test'],
      ['Error schema with string', { error: Error }, { error: 'not an error' }, 'expected type Error'],
      ['Error schema with null', { error: Error }, { error: null }, 'expected non-nullable'],
      ['Error schema with number', { error: Error }, { error: 123 }, 'expected type Error'],
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
      ['Symbol validation wrong type', { sym: Symbol('test') }, { sym: 'not-a-symbol' }, 'expected symbol'],
      ['Symbol validation wrong value', { sym: Symbol('test') }, { sym: Symbol('different') }, 'expected Symbol(test)'],
      ['Null validation with wrong value', { val: null }, { val: 'not-null' }, 'expected nullable'],
    ])('Should validate schema type %s negative', (_, schema, target: any, message) => {
      expectValidationError(schema, target, message);
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
    it('should return first branch error in first-error mode', () => {
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

      expectValidationError(schema, {
        server: {
          type: 'b',
        },
        hosts: ['a'],
      }, 'expected "a"');
    });

    it('should return all branch errors with allErrors mode', () => {
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

      const validate = compile(schema as Schema<unknown>, { allErrors: true });
      const result = validate({
        server: {
          type: 'b',
        },
        hosts: ['a'],
      });
      expect(result).toBe(false);
      const messages = validate.issues.map(i => i.message).join('\n');
      expect(messages).toContain('expected type Number');
    });
  });

  describe('createValidator', () => {
    it('should return same reference with narrowed type', () => {
      const config = {
        app: { name: 'test', port: 3000 },
        kafka: { brokers: ['localhost'] },
        redis: { host: 'localhost' },
      };

      const validateConfig = createValidator(config);
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

      const validateConfig = createValidator(config);

      expect(() => validateConfig({ app: { name: String } })).toThrow('expected type String');
    });
  });

  describe('standardSchema', () => {
    it('should expose ~standard property with correct structure', () => {
      const validator = standardSchema({ name: String });

      expect(validator['~standard']).toBeDefined();
      expect(validator['~standard'].version).toBe(1);
      expect(validator['~standard'].vendor).toBe('ascertain');
      expect(typeof validator['~standard'].validate).toBe('function');
    });

    it('should work as regular validator (throws on error)', () => {
      const validator = standardSchema({ name: String, age: Number });

      expect(() => validator({ name: 'Alice', age: 30 })).not.toThrow();
      expect(() => validator({ name: 123, age: 30 } as any)).toThrow();
    });

    it('should return success result for valid data', () => {
      const validator = standardSchema({ name: String, age: Number });
      const data = { name: 'Alice', age: 30 };

      const result = validator['~standard'].validate(data);

      expect(result.issues).toBeUndefined();
      expect((result as StandardSchemaV1.SuccessResult<typeof data>).value).toEqual(data);
    });

    it('should return failure result with issues for invalid data', () => {
      const validator = standardSchema({ name: String, age: Number });

      const result = validator['~standard'].validate({ name: 123, age: 'thirty' });

      expect(result.issues).toBeDefined();
      expect(result.issues!.length).toBeGreaterThan(0);
      expect(result.issues![0].message).toContain('expected type String');
      expect(result.issues![0].path).toEqual(['name']);
    });

    it('should parse nested paths correctly', () => {
      const validator = standardSchema({
        user: {
          profile: {
            age: Number,
          },
        },
      });

      const result = validator['~standard'].validate({
        user: { profile: { age: 'not-a-number' } },
      });

      expect(result.issues).toBeDefined();
      expect(result.issues![0].path).toEqual(['user', 'profile', 'age']);
    });

    it('should parse array index paths correctly', () => {
      const validator = standardSchema({ items: [Number] });

      const result = validator['~standard'].validate({ items: [1, 2, 'three', 4] });

      expect(result.issues).toBeDefined();
      expect(result.issues![0].path).toEqual(['items', 2]);
    });

    it('should return first error from And operator (first-error mode)', () => {
      const validator = standardSchema(and({ a: Number }, { b: String }));

      const result = validator['~standard'].validate({ a: 'not-number', b: 123 });

      expect(result.issues).toBeDefined();
      expect(result.issues!.length).toBe(1);
      expect(result.issues![0].path).toEqual(['a']);
    });

    it('should handle Or operator errors', () => {
      const validator = standardSchema({ role: or('admin', 'user') });

      const result = validator['~standard'].validate({ role: 'guest' });

      expect(result.issues).toBeDefined();
      expect(result.issues!.length).toBeGreaterThan(0);
    });

    it('should return path in issues', () => {
      const validator = standardSchema({ value: Number });

      const result = validator['~standard'].validate({ value: 'not-number' });

      expect(result.issues).toBeDefined();
      expect(result.issues![0].path).toEqual(['value']);
    });

    it('should handle complex schema with optional fields', () => {
      const validator = standardSchema({
        name: String,
        email: optional(String),
        settings: optional({
          theme: or('light', 'dark'),
        }),
      });

      const result1 = validator['~standard'].validate({ name: 'Alice' });
      expect(result1.issues).toBeUndefined();

      const result2 = validator['~standard'].validate({
        name: 'Bob',
        email: 'bob@example.com',
        settings: { theme: 'light' },
      });
      expect(result2.issues).toBeUndefined();

      const result3 = validator['~standard'].validate({
        name: 'Charlie',
        settings: { theme: 'invalid' },
      });
      expect(result3.issues).toBeDefined();
    });
  });

  describe('compile options', () => {
    it('should return only first error in default mode', () => {
      const validate = compile({ a: Number, b: String, c: Boolean });
      const result = validate({ a: 'not-number', b: 123, c: 'not-boolean' });

      expect(result).toBe(false);
      expect(validate.issues.length).toBe(1);
      expect(validate.issues[0].path).toEqual(['a']);
    });

    it('should return all errors with allErrors: true', () => {
      const validate = compile({ a: Number, b: String, c: Boolean }, { allErrors: true });
      const result = validate({ a: 'not-number', b: 123, c: 'not-boolean' });

      expect(result).toBe(false);
      expect(validate.issues.length).toBe(3);
    });

    it('should return empty issues for valid data in default mode', () => {
      const validate = compile({ a: Number, b: String });
      const result = validate({ a: 42, b: 'hello' });

      expect(result).toBe(true);
      expect(validate.issues.length).toBe(0);
    });

    it('should return empty issues for valid data with allErrors: true', () => {
      const validate = compile({ a: Number, b: String }, { allErrors: true });
      const result = validate({ a: 42, b: 'hello' });

      expect(result).toBe(true);
      expect(validate.issues.length).toBe(0);
    });

    it('should handle nested errors in first-error mode', () => {
      const validate = compile({ user: { name: String, age: Number } });
      const result = validate({ user: { name: 123, age: 'invalid' } });

      expect(result).toBe(false);
      expect(validate.issues.length).toBe(1);
      expect(validate.issues[0].path).toEqual(['user', 'name']);
    });

    it('should handle nested errors with allErrors: true', () => {
      const validate = compile({ user: { name: String, age: Number } }, { allErrors: true });
      const result = validate({ user: { name: 123, age: 'invalid' } });

      expect(result).toBe(false);
      expect(validate.issues.length).toBe(2);
    });

    it('should handle array errors in first-error mode', () => {
      const validate = compile({ items: [Number] });
      const result = validate({ items: ['a', 'b', 'c'] });

      expect(result).toBe(false);
      expect(validate.issues.length).toBe(1);
      expect(validate.issues[0].path).toEqual(['items', 0]);
    });

    it('should handle array errors with allErrors: true', () => {
      const validate = compile({ items: [Number] }, { allErrors: true });
      const result = validate({ items: ['a', 'b', 'c'] });

      expect(result).toBe(false);
      expect(validate.issues.length).toBe(3);
    });

    it('should handle OR operator in first-error mode', () => {
      const validate = compile({ value: or(Number, String) });
      const result = validate({ value: true });

      expect(result).toBe(false);
      expect(validate.issues.length).toBe(1);
    });

    it('should handle OR operator with allErrors: true', () => {
      const validate = compile({ value: or(Number, String) }, { allErrors: true });
      const result = validate({ value: true });

      expect(result).toBe(false);
      expect(validate.issues.length).toBeGreaterThan(1);
    });

    it('should handle AND operator in first-error mode', () => {
      const validate = compile(and({ a: Number }, { b: String }));
      const result = validate({ a: 'not-number', b: 123 });

      expect(result).toBe(false);
      expect(validate.issues.length).toBe(1);
    });

    it('should handle AND operator with allErrors: true', () => {
      const validate = compile(and({ a: Number }, { b: String }), { allErrors: true });
      const result = validate({ a: 'not-number', b: 123 });

      expect(result).toBe(false);
      expect(validate.issues.length).toBe(2);
    });
  });

  describe('operators', () => {
    it('should throw if or() has no schemas', () => {
      expect(() => or()).toThrow('Operator requires at least one schema');
    });

    it('or() should not corrupt literals containing "return false;"', () => {
      const v = compile(or('return false;', 'hello'));
      expect(v('return false;')).toBe(true);
      expect(v('hello')).toBe(true);
      expect(v('other')).toBe(false);
    });

    it('should throw if and() has no schemas', () => {
      expect(() => and()).toThrow('Operator requires at least one schema');
    });

    it('should throw if tuple() has no schemas', () => {
      expect(() => tuple()).toThrow('Operator requires at least one schema');
    });
  });

  describe('discriminated', () => {
    it('should throw if no schemas provided', () => {
      expect(() => discriminated([], 'type')).toThrow('discriminated requires at least one schema');
    });

    it('should throw if schema missing discriminant key', () => {
      expect(() => compile(discriminated([{ name: String }], 'type'))).toThrow('each schema must have the discriminant key');
    });

    it('should throw if discriminant value is not a literal', () => {
      expect(() => compile(discriminated([{ type: String }], 'type'))).toThrow('discriminant value must be a string, number, or boolean literal');
    });

    it('should validate matching variant with string discriminant', () => {
      const schema = discriminated([
        { type: 'email', address: String },
        { type: 'sms', phone: String },
      ], 'type');
      const validate = compile(schema);

      expect(validate({ type: 'email', address: 'test@example.com' })).toBe(true);
      expect(validate({ type: 'sms', phone: '123456' })).toBe(true);
    });

    it('should validate matching variant with number discriminant', () => {
      const schema = discriminated([
        { code: 1, message: String },
        { code: 2, count: Number },
      ], 'code');
      const validate = compile(schema);

      expect(validate({ code: 1, message: 'hello' })).toBe(true);
      expect(validate({ code: 2, count: 42 })).toBe(true);
    });

    it('should validate matching variant with boolean discriminant', () => {
      const schema = discriminated([
        { success: true, data: String },
        { success: false, error: String },
      ], 'success');
      const validate = compile(schema);

      expect(validate({ success: true, data: 'result' })).toBe(true);
      expect(validate({ success: false, error: 'failed' })).toBe(true);
    });

    it('should reject invalid discriminant value', () => {
      const schema = discriminated([
        { type: 'email', address: String },
        { type: 'sms', phone: String },
      ], 'type');
      const validate = compile(schema);

      expect(validate({ type: 'push', token: 'abc' })).toBe(false);
      expect(validate.issues[0].message).toContain('Invalid discriminant value');
      expect(validate.issues[0].message).toContain('expected one of');
    });

    it('should reject when variant field validation fails', () => {
      const schema = discriminated([
        { type: 'email', address: String },
        { type: 'sms', phone: String },
      ], 'type');
      const validate = compile(schema);

      expect(validate({ type: 'email', address: 123 })).toBe(false);
      expect(validate.issues[0].message).toContain('expected type String');
    });

    it('should reject null/undefined values', () => {
      const schema = discriminated([{ type: 'a' }], 'type');
      const validate = compile(schema);

      expect(validate(null)).toBe(false);
      expect(validate(undefined)).toBe(false);
    });

    it('should reject non-object values', () => {
      const schema = discriminated([{ type: 'a' }], 'type');
      const validate = compile(schema);

      expect(validate('string')).toBe(false);
      expect(validate(123)).toBe(false);
    });

    it('should work with nested objects in variants', () => {
      const schema = discriminated([
        { kind: 'user', profile: { name: String } },
        { kind: 'bot', config: { model: String } },
      ], 'kind');
      const validate = compile(schema);

      expect(validate({ kind: 'user', profile: { name: 'Alice' } })).toBe(true);
      expect(validate({ kind: 'bot', config: { model: 'gpt-4' } })).toBe(true);
      expect(validate({ kind: 'user', profile: { name: 123 } })).toBe(false);
    });

    it('should work with allErrors mode', () => {
      const schema = discriminated([
        { type: 'a', x: Number, y: String },
      ], 'type');
      const validate = compile(schema, { allErrors: true });

      const result = validate({ type: 'a', x: 'bad', y: 123 });
      expect(result).toBe(false);
      expect(validate.issues.length).toBe(2);
    });
  });
});
