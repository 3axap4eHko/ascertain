import validate, { optional, and, or, $keys, $values, Schema, as } from '.';

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
  parsedNumber: as.number('1'),
  parsedBoolean: as.boolean('false'),
  parsedArray: as.array('1,2,3,4,5', ','),
  parsedJSON: as.json('{}'),
};

const schema: Schema<typeof data> = {
  [$keys]: Number,
  [$values]: Object,
  number: optional(Number),
  objectSchema: optional<typeof data.objectSchema>({
    number: Number
  }),
  array: and(Object, Array),
  keyValue: or<typeof data.keyValue>(
    { keyOne: Number },
    { keyThree: Number }
  ),
};

validate<typeof data>(schema, data, '[DATA]');
