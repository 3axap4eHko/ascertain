import validate, { optional, and, or, $keys, $values, Schema, as } from '.';

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
  parsedString: as.number('string'),
  parsedBoolean: as.boolean('false'),
  parsedArray: as.array('1,2,3,4,5', ','),
  parsedJSON: as.json('{ "number": 1 }'),
  parsedBase64: as.base64('dGVzdA=='),
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
  parsedString: String,
  parsedBoolean: Boolean,
  parsedArray: [String],
  parsedJSON: {
    number: 1,
  },
  parsedBase64: String,
};

validate<typeof data>(schema, data, '[DATA]');
