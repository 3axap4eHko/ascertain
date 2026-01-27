import 'overtake';
import { randomUUID, randomInt } from 'node:crypto';

const length = 10 ** 4;

// Create benchmark suite with data feed
const suite = benchmark('Array of objects', () =>
  Array.from({ length }, (_, idx) => ({
    string: randomUUID(),
    number: randomInt(length),
    boolean: idx % 3 === 0,
  })),
);

// Zod target
const zodTarget = suite.target('zod', async () => {
  const { z } = await import('zod');
  const schema = z.object({
    string: z.string(),
    number: z.number(),
    boolean: z.boolean(),
  });
  return { schema };
});

zodTarget.measure('parse', ({ schema }, input) => {
  schema.parse(input[0]);
});

// AJV target
const ajvTarget = suite.target('ajv', async () => {
  const { default: Ajv } = await import('ajv');
  const ajv = new Ajv.default();
  const schema = {
    type: 'object',
    properties: {
      string: { type: 'string' },
      number: { type: 'number' },
      boolean: { type: 'boolean' },
    },
    required: ['string', 'number', 'boolean'],
    additionalProperties: false,
  };
  const validate = ajv.compile(schema);
  return { validate };
});

ajvTarget.measure('validate', ({ validate }, input) => {
  if (!validate(input[0])) {
    throw new Error('Validation failed');
  }
});

// Ascertain target
const ascertainTarget = suite.target('ascertain', async () => {
  const { compile } = await import('../build/index.js');
  const schema = {
    string: String,
    number: Number,
    boolean: Boolean,
  };
  const validate = compile(schema, 'data');
  return { validate };
});

ascertainTarget.measure('validate', ({ validate }, input) => {
  validate(input[0]);
});

