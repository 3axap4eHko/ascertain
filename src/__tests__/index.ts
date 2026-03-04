import { ascertain, compile, optional, and, or, tuple, discriminated, $keys, $values, $strict, as, Schema, createValidator, standardSchema, StandardSchemaV1, CompileOptions, check, min, max, integer, minLength, maxLength, gt, lt, multipleOf, uniqueItems, format, CheckContext } from '../index';

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
      ['bigint literal', { k: BigInt(123) }, fixture],
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
      ['number whitespace', as.number, '   '],
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

  describe('check and constraint helpers', () => {
    describe('check(fn) predicate', () => {
      it('should pass when predicate returns true', () => {
        const v = compile(and(Number, check((v: number) => v >= 0)));
        expect(v(5)).toBe(true);
        expect(v(0)).toBe(true);
      });

      it('should fail when predicate returns false', () => {
        const v = compile(and(Number, check((v: number) => v >= 0)));
        expect(v(-1)).toBe(false);
      });

      it('should use custom message', () => {
        const v = compile(and(Number, check((v: number) => v >= 0, 'must be non-negative')));
        v(-1);
        expect(v.issues[0].message).toBe('must be non-negative');
      });

      it('should use default message when none provided', () => {
        const v = compile(and(Number, check((v: number) => v >= 0)));
        v(-1);
        expect(v.issues[0].message).toContain('check failed');
      });
    });

    describe('check({ compile }) custom codegen', () => {
      it('should generate inline code', () => {
        const divisibleBy = (n: number) => check<number>({
          compile: (v) => ({
            check: `${v} % ${n} !== 0`,
            message: `\`must be divisible by ${n}\``,
          }),
        });
        const v = compile(and(Number, divisibleBy(3)));
        expect(v(9)).toBe(true);
        expect(v(10)).toBe(false);
        v(10);
        expect(v.issues[0].message).toBe('must be divisible by 3');
      });

      it('should support ctx.ref for runtime values', () => {
        const oneOf = (...vals: unknown[]) => check<unknown>({
          compile: (v, ctx) => {
            const setRef = ctx.ref(new Set(vals));
            return {
              check: `!${setRef}.has(${v})`,
              message: `\`must be one of ${JSON.stringify(vals)}\``,
            };
          },
        });
        const v = compile(and(String, oneOf('active', 'inactive', 'pending')));
        expect(v('active')).toBe(true);
        expect(v('inactive')).toBe(true);
        expect(v('deleted')).toBe(false);
        v('deleted');
        expect(v.issues[0].message).toBe('must be one of ["active","inactive","pending"]');
      });
    });

    describe('min', () => {
      it('should pass when value >= n', () => {
        const v = compile(and(Number, min(0)));
        expect(v(0)).toBe(true);
        expect(v(100)).toBe(true);
      });

      it('should fail when value < n', () => {
        const v = compile(and(Number, min(0)));
        expect(v(-1)).toBe(false);
        v(-1);
        expect(v.issues[0].message).toContain('must be >= 0');
      });

      it('should use custom message', () => {
        const v = compile(and(Number, min(0, 'no negatives')));
        v(-1);
        expect(v.issues[0].message).toBe('no negatives');
      });
    });

    describe('max', () => {
      it('should pass when value <= n', () => {
        const v = compile(and(Number, max(100)));
        expect(v(100)).toBe(true);
        expect(v(0)).toBe(true);
      });

      it('should fail when value > n', () => {
        const v = compile(and(Number, max(100)));
        expect(v(101)).toBe(false);
        v(101);
        expect(v.issues[0].message).toContain('must be <= 100');
      });

      it('should use custom message', () => {
        const v = compile(and(Number, max(100, 'too big')));
        v(101);
        expect(v.issues[0].message).toBe('too big');
      });
    });

    describe('integer', () => {
      it('should pass for integers', () => {
        const v = compile(and(Number, integer()));
        expect(v(0)).toBe(true);
        expect(v(42)).toBe(true);
        expect(v(-5)).toBe(true);
      });

      it('should fail for non-integers', () => {
        const v = compile(and(Number, integer()));
        expect(v(3.14)).toBe(false);
        v(3.14);
        expect(v.issues[0].message).toContain('must be an integer');
      });

      it('should use custom message', () => {
        const v = compile(and(Number, integer('whole numbers only')));
        v(1.5);
        expect(v.issues[0].message).toBe('whole numbers only');
      });
    });

    describe('minLength', () => {
      it('should pass for strings with sufficient length', () => {
        const v = compile(and(String, minLength(1)));
        expect(v('a')).toBe(true);
        expect(v('hello')).toBe(true);
      });

      it('should fail for strings too short', () => {
        const v = compile(and(String, minLength(1)));
        expect(v('')).toBe(false);
        v('');
        expect(v.issues[0].message).toContain('length must be >= 1');
      });

      it('should work with arrays', () => {
        const v = compile(and([String], minLength(1)));
        expect(v(['a'])).toBe(true);
        expect(v([])).toBe(false);
      });

      it('should use custom message', () => {
        const v = compile(and(String, minLength(1, 'required')));
        v('');
        expect(v.issues[0].message).toBe('required');
      });
    });

    describe('maxLength', () => {
      it('should pass for strings within max length', () => {
        const v = compile(and(String, maxLength(5)));
        expect(v('hello')).toBe(true);
        expect(v('')).toBe(true);
      });

      it('should fail for strings too long', () => {
        const v = compile(and(String, maxLength(5)));
        expect(v('toolong')).toBe(false);
        v('toolong');
        expect(v.issues[0].message).toContain('length must be <= 5');
      });

      it('should work with arrays', () => {
        const v = compile(and([Number], maxLength(2)));
        expect(v([1, 2])).toBe(true);
        expect(v([1, 2, 3])).toBe(false);
      });

      it('should use custom message', () => {
        const v = compile(and(String, maxLength(5, 'too long')));
        v('toolong');
        expect(v.issues[0].message).toBe('too long');
      });
    });

    describe('composition', () => {
      it('should compose multiple constraints with and()', () => {
        const v = compile(and(Number, min(0), max(150), integer()));
        expect(v(0)).toBe(true);
        expect(v(25)).toBe(true);
        expect(v(150)).toBe(true);
        expect(v(-1)).toBe(false);
        expect(v(151)).toBe(false);
        expect(v(3.5)).toBe(false);
      });

      it('should work inside or()', () => {
        const v = compile(or(and(Number, min(0)), String));
        expect(v(5)).toBe(true);
        expect(v('hello')).toBe(true);
        expect(v(-1)).toBe(false);
      });

      it('should work inside optional()', () => {
        const v = compile(optional(and(Number, min(0))));
        expect(v(5)).toBe(true);
        expect(v(null)).toBe(true);
        expect(v(undefined)).toBe(true);
        expect(v(-1)).toBe(false);
      });

      it('should work in object schemas', () => {
        const v = compile({
          age: and(Number, min(0), max(150), integer()),
          name: and(String, minLength(1), maxLength(50)),
        });
        expect(v({ age: 25, name: 'Alice' })).toBe(true);
        expect(v({ age: -1, name: 'Alice' })).toBe(false);
        expect(v({ age: 25, name: '' })).toBe(false);
      });

      it('should report correct path in object schemas', () => {
        const v = compile({ user: { age: and(Number, min(0)) } });
        v({ user: { age: -1 } });
        expect(v.issues[0].path).toEqual(['user', 'age']);
      });

      it('should work with allErrors mode', () => {
        const v = compile(and(Number, min(0), max(10)), { allErrors: true });
        v(-5);
        expect(v.issues.length).toBe(1);
        v(15);
        expect(v.issues.length).toBe(1);
      });

      it('should compose string constraints', () => {
        const v = compile(and(String, minLength(2), maxLength(10)));
        expect(v('ab')).toBe(true);
        expect(v('a')).toBe(false);
        expect(v('12345678901')).toBe(false);
      });

      it('should work with nested and()', () => {
        const positiveInt = and(Number, min(0), integer());
        const v = compile(and(positiveInt, max(100)));
        expect(v(50)).toBe(true);
        expect(v(-1)).toBe(false);
        expect(v(101)).toBe(false);
        expect(v(1.5)).toBe(false);
      });
    });

    describe('gt (exclusiveMinimum)', () => {
      it('should pass when value > n', () => {
        const v = compile(and(Number, gt(0)));
        expect(v(1)).toBe(true);
        expect(v(100)).toBe(true);
      });

      it('should fail when value <= n', () => {
        const v = compile(and(Number, gt(0)));
        expect(v(0)).toBe(false);
        expect(v(-1)).toBe(false);
      });

      it('should use custom message', () => {
        const v = compile(and(Number, gt(0, 'must be positive')));
        v(0);
        expect(v.issues[0].message).toBe('must be positive');
      });

      it('should use default message', () => {
        const v = compile(and(Number, gt(5)));
        v(5);
        expect(v.issues[0].message).toContain('must be > 5');
      });
    });

    describe('lt (exclusiveMaximum)', () => {
      it('should pass when value < n', () => {
        const v = compile(and(Number, lt(100)));
        expect(v(99)).toBe(true);
        expect(v(0)).toBe(true);
      });

      it('should fail when value >= n', () => {
        const v = compile(and(Number, lt(100)));
        expect(v(100)).toBe(false);
        expect(v(101)).toBe(false);
      });

      it('should use custom message', () => {
        const v = compile(and(Number, lt(100, 'too large')));
        v(100);
        expect(v.issues[0].message).toBe('too large');
      });

      it('should use default message', () => {
        const v = compile(and(Number, lt(10)));
        v(10);
        expect(v.issues[0].message).toContain('must be < 10');
      });
    });

    describe('multipleOf', () => {
      it('should pass for multiples', () => {
        const v = compile(and(Number, multipleOf(3)));
        expect(v(0)).toBe(true);
        expect(v(3)).toBe(true);
        expect(v(9)).toBe(true);
        expect(v(-6)).toBe(true);
      });

      it('should fail for non-multiples', () => {
        const v = compile(and(Number, multipleOf(3)));
        expect(v(1)).toBe(false);
        expect(v(10)).toBe(false);
      });

      it('should use custom message', () => {
        const v = compile(and(Number, multipleOf(5, 'must be multiple of 5')));
        v(3);
        expect(v.issues[0].message).toBe('must be multiple of 5');
      });

      it('should use default message', () => {
        const v = compile(and(Number, multipleOf(7)));
        v(5);
        expect(v.issues[0].message).toContain('must be a multiple of 7');
      });
    });

    describe('uniqueItems', () => {
      it('should pass for arrays with unique items', () => {
        const v = compile(and([Number], uniqueItems()));
        expect(v([1, 2, 3])).toBe(true);
        expect(v([])).toBe(true);
        expect(v([1])).toBe(true);
      });

      it('should fail for arrays with duplicates', () => {
        const v = compile(and([Number], uniqueItems()));
        expect(v([1, 2, 1])).toBe(false);
        expect(v([3, 3])).toBe(false);
      });

      it('should use custom message', () => {
        const v = compile(and([Number], uniqueItems('no dupes')));
        v([1, 1]);
        expect(v.issues[0].message).toBe('no dupes');
      });

      it('should use default message', () => {
        const v = compile(and([Number], uniqueItems()));
        v([1, 1]);
        expect(v.issues[0].message).toContain('must have unique items');
      });
    });
  });

  describe('format validators', () => {
    describe('format.dateTime', () => {
      it('should accept valid date-times', () => {
        const v = compile(and(String, format.dateTime()));
        expect(v('2024-01-15T10:30:00Z')).toBe(true);
        expect(v('2024-01-15T10:30:00+05:30')).toBe(true);
        expect(v('2024-01-15t10:30:00z')).toBe(true);
      });

      it('should reject invalid date-times', () => {
        const v = compile(and(String, format.dateTime()));
        expect(v('not-a-date')).toBe(false);
        expect(v('2024-01-15')).toBe(false);
        expect(v('10:30:00Z')).toBe(false);
      });

      it('should use custom message', () => {
        const v = compile(and(String, format.dateTime('bad datetime')));
        v('nope');
        expect(v.issues[0].message).toBe('bad datetime');
      });
    });

    describe('format.date', () => {
      it('should accept valid dates', () => {
        const v = compile(and(String, format.date()));
        expect(v('2024-01-15')).toBe(true);
        expect(v('2024-02-29')).toBe(true); // leap year
        expect(v('2024-12-31')).toBe(true);
      });

      it('should reject invalid dates', () => {
        const v = compile(and(String, format.date()));
        expect(v('2023-02-29')).toBe(false); // not a leap year
        expect(v('2024-13-01')).toBe(false); // month 13
        expect(v('2024-01-32')).toBe(false); // day 32
        expect(v('2024-00-15')).toBe(false); // month 0
        expect(v('2024-01-00')).toBe(false); // day 0
        expect(v('not-a-date')).toBe(false);
      });

      it('should handle leap year edge cases', () => {
        const v = compile(and(String, format.date()));
        expect(v('2000-02-29')).toBe(true);  // divisible by 400
        expect(v('1900-02-29')).toBe(false); // divisible by 100 but not 400
        expect(v('2004-02-29')).toBe(true);  // divisible by 4
      });

      it('should use custom message for fn-based format', () => {
        const v = compile(and(String, format.date('bad date')));
        expect(v('not-a-date')).toBe(false);
        expect(v.issues[0].message).toBe('bad date');
      });
    });

    describe('format.time', () => {
      it('should accept valid times', () => {
        const v = compile(and(String, format.time()));
        expect(v('10:30:00Z')).toBe(true);
        expect(v('23:59:59+05:30')).toBe(true);
        expect(v('00:00:00.000Z')).toBe(true);
        expect(v('23:59:60Z')).toBe(true); // leap second
      });

      it('should reject invalid times', () => {
        const v = compile(and(String, format.time()));
        expect(v('25:00:00Z')).toBe(false);
        expect(v('10:30:00')).toBe(false); // no timezone
        expect(v('not-a-time')).toBe(false);
      });
    });

    describe('format.duration', () => {
      it('should accept valid durations', () => {
        const v = compile(and(String, format.duration()));
        expect(v('P1Y')).toBe(true);
        expect(v('P1Y2M3D')).toBe(true);
        expect(v('PT1H30M')).toBe(true);
        expect(v('P1W')).toBe(true);
        expect(v('P1DT12H')).toBe(true);
      });

      it('should reject invalid durations', () => {
        const v = compile(and(String, format.duration()));
        expect(v('P')).toBe(false);
        expect(v('1Y')).toBe(false);
        expect(v('not-a-duration')).toBe(false);
      });
    });

    describe('format.email', () => {
      it('should accept valid emails', () => {
        const v = compile(and(String, format.email()));
        expect(v('user@example.com')).toBe(true);
        expect(v('test.name@domain.org')).toBe(true);
        expect(v('user+tag@example.co.uk')).toBe(true);
      });

      it('should reject invalid emails', () => {
        const v = compile(and(String, format.email()));
        expect(v('not-an-email')).toBe(false);
        expect(v('@example.com')).toBe(false);
        expect(v('user@')).toBe(false);
        expect(v('')).toBe(false);
      });

      it('should use custom message', () => {
        const v = compile(and(String, format.email('invalid email')));
        v('bad');
        expect(v.issues[0].message).toBe('invalid email');
      });
    });

    describe('format.idnEmail', () => {
      it('should accept unicode emails', () => {
        const v = compile(and(String, format.idnEmail()));
        expect(v('user@example.com')).toBe(true);
        expect(v('\u00FC\u00F1\u00EE\u00E7\u00F6\u00F0\u00E9@example.com')).toBe(true);
      });

      it('should reject invalid emails', () => {
        const v = compile(and(String, format.idnEmail()));
        expect(v('not-an-email')).toBe(false);
      });
    });

    describe('format.hostname', () => {
      it('should accept valid hostnames', () => {
        const v = compile(and(String, format.hostname()));
        expect(v('example.com')).toBe(true);
        expect(v('sub.domain.org')).toBe(true);
        expect(v('localhost')).toBe(true);
      });

      it('should reject invalid hostnames', () => {
        const v = compile(and(String, format.hostname()));
        expect(v('-invalid.com')).toBe(false);
        expect(v('')).toBe(false);
      });
    });

    describe('format.idnHostname', () => {
      it('should accept unicode hostnames', () => {
        const v = compile(and(String, format.idnHostname()));
        expect(v('example.com')).toBe(true);
        expect(v('\u00E9xample.com')).toBe(true);
      });

      it('should reject invalid hostnames', () => {
        const v = compile(and(String, format.idnHostname()));
        expect(v('-invalid.com')).toBe(false);
      });
    });

    describe('format.ipv4', () => {
      it('should accept valid IPv4', () => {
        const v = compile(and(String, format.ipv4()));
        expect(v('192.168.1.1')).toBe(true);
        expect(v('0.0.0.0')).toBe(true);
        expect(v('255.255.255.255')).toBe(true);
      });

      it('should reject invalid IPv4', () => {
        const v = compile(and(String, format.ipv4()));
        expect(v('256.0.0.1')).toBe(false);
        expect(v('1.2.3')).toBe(false);
        expect(v('not-an-ip')).toBe(false);
      });
    });

    describe('format.ipv6', () => {
      it('should accept valid IPv6', () => {
        const v = compile(and(String, format.ipv6()));
        expect(v('::1')).toBe(true);
        expect(v('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
        expect(v('fe80::1')).toBe(true);
        expect(v('::ffff:192.168.1.1')).toBe(true);
      });

      it('should reject invalid IPv6', () => {
        const v = compile(and(String, format.ipv6()));
        expect(v('not-ipv6')).toBe(false);
        expect(v('192.168.1.1')).toBe(false);
      });
    });

    describe('format.uri', () => {
      it('should accept valid URIs', () => {
        const v = compile(and(String, format.uri()));
        expect(v('https://example.com')).toBe(true);
        expect(v('http://example.com/path?q=1#frag')).toBe(true);
        expect(v('ftp://files.example.com')).toBe(true);
        expect(v('mailto:user@example.com')).toBe(true);
      });

      it('should reject invalid URIs', () => {
        const v = compile(and(String, format.uri()));
        expect(v('not a uri')).toBe(false);
        expect(v('://missing-scheme')).toBe(false);
      });
    });

    describe('format.uriReference', () => {
      it('should accept URIs and relative references', () => {
        const v = compile(and(String, format.uriReference()));
        expect(v('https://example.com')).toBe(true);
        expect(v('/path/to/resource')).toBe(true);
        expect(v('relative/path')).toBe(true);
        expect(v('#fragment')).toBe(true);
        expect(v('')).toBe(true);
      });

      it('should reject invalid references', () => {
        const v = compile(and(String, format.uriReference()));
        expect(v('/path with spaces')).toBe(false);
        expect(v('<invalid>')).toBe(false);
      });
    });

    describe('format.iri', () => {
      it('should accept valid IRIs with unicode', () => {
        const v = compile(and(String, format.iri()));
        expect(v('https://example.com')).toBe(true);
        expect(v('https://example.com/\u00FC\u00F1\u00EE\u00E7\u00F6\u00F0\u00E9')).toBe(true);
      });

      it('should reject invalid IRIs', () => {
        const v = compile(and(String, format.iri()));
        expect(v('not a uri')).toBe(false);
      });
    });

    describe('format.iriReference', () => {
      it('should accept IRI references', () => {
        const v = compile(and(String, format.iriReference()));
        expect(v('https://example.com')).toBe(true);
        expect(v('/\u00FC\u00F1\u00EE\u00E7\u00F6\u00F0\u00E9')).toBe(true);
        expect(v('')).toBe(true);
      });
    });

    describe('format.uuid', () => {
      it('should accept valid UUIDs', () => {
        const v = compile(and(String, format.uuid()));
        expect(v('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
        expect(v('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
        expect(v('F47AC10B-58CC-4372-A567-0E02B2C3D479')).toBe(true);
      });

      it('should reject invalid UUIDs', () => {
        const v = compile(and(String, format.uuid()));
        expect(v('not-a-uuid')).toBe(false);
        expect(v('550e8400-e29b-41d4-a716')).toBe(false);
        expect(v('550e8400e29b41d4a716446655440000')).toBe(false);
      });

      it('should use custom message', () => {
        const v = compile(and(String, format.uuid('bad uuid')));
        v('nope');
        expect(v.issues[0].message).toBe('bad uuid');
      });
    });

    describe('format.uriTemplate', () => {
      it('should accept valid URI templates', () => {
        const v = compile(and(String, format.uriTemplate()));
        expect(v('https://example.com/{id}')).toBe(true);
        expect(v('/users/{user_id}/posts')).toBe(true);
        expect(v('{+path}')).toBe(true);
      });

      it('should reject invalid URI templates', () => {
        const v = compile(and(String, format.uriTemplate()));
        expect(v('{')).toBe(false);
      });
    });

    describe('format.jsonPointer', () => {
      it('should accept valid JSON pointers', () => {
        const v = compile(and(String, format.jsonPointer()));
        expect(v('')).toBe(true);
        expect(v('/foo')).toBe(true);
        expect(v('/foo/0/bar')).toBe(true);
        expect(v('/a~0b')).toBe(true); // escaped ~
        expect(v('/a~1b')).toBe(true); // escaped /
      });

      it('should reject invalid JSON pointers', () => {
        const v = compile(and(String, format.jsonPointer()));
        expect(v('not/valid')).toBe(false); // must start with /
        expect(v('/foo~2bar')).toBe(false); // ~2 is invalid
      });
    });

    describe('format.relativeJsonPointer', () => {
      it('should accept valid relative JSON pointers', () => {
        const v = compile(and(String, format.relativeJsonPointer()));
        expect(v('0')).toBe(true);
        expect(v('1/foo')).toBe(true);
        expect(v('2/foo/0')).toBe(true);
        expect(v('0#')).toBe(true);
      });

      it('should reject invalid relative JSON pointers', () => {
        const v = compile(and(String, format.relativeJsonPointer()));
        expect(v('/foo')).toBe(false);
        expect(v('not-valid')).toBe(false);
      });
    });

    describe('format.regex', () => {
      it('should accept valid regexes', () => {
        const v = compile(and(String, format.regex()));
        expect(v('^abc$')).toBe(true);
        expect(v('[a-z]+')).toBe(true);
        expect(v('\\d{3}')).toBe(true);
      });

      it('should reject invalid regexes', () => {
        const v = compile(and(String, format.regex()));
        expect(v('[')).toBe(false);
        expect(v('*')).toBe(false);
      });
    });

    describe('format composition', () => {
      it('should work with and(String, ...)', () => {
        const v = compile({ email: and(String, format.email()) });
        expect(v({ email: 'user@example.com' })).toBe(true);
        expect(v({ email: 'bad' })).toBe(false);
      });

      it('should work with or()', () => {
        const v = compile(or(and(String, format.email()), and(String, format.uuid())));
        expect(v('user@example.com')).toBe(true);
        expect(v('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
        expect(v('neither')).toBe(false);
      });

      it('should work with optional()', () => {
        const v = compile(optional(and(String, format.email())));
        expect(v('user@example.com')).toBe(true);
        expect(v(null)).toBe(true);
        expect(v(undefined)).toBe(true);
        expect(v('bad')).toBe(false);
      });

      it('should compose uniqueItems with array types', () => {
        const v = compile(and([Number], uniqueItems()));
        expect(v([1, 2, 3])).toBe(true);
        expect(v([1, 1])).toBe(false);
      });

      it('should compose constraint helpers together', () => {
        const v = compile(and(Number, gt(0), lt(100), multipleOf(5)));
        expect(v(5)).toBe(true);
        expect(v(50)).toBe(true);
        expect(v(95)).toBe(true);
        expect(v(0)).toBe(false);   // not > 0
        expect(v(100)).toBe(false); // not < 100
        expect(v(7)).toBe(false);   // not multipleOf 5
      });

      it('should report correct path for format in object', () => {
        const v = compile({ user: { email: and(String, format.email()) } });
        v({ user: { email: 'bad' } });
        expect(v.issues[0].path).toEqual(['user', 'email']);
      });
    });
  });
});
