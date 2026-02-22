import 'overtake';
import { randomUUID, randomInt } from 'node:crypto';

const length = 10 ** 4;

const validData = () =>
  Array.from({ length }, (_, idx) => ({
    string: randomUUID(),
    number: randomInt(length),
    boolean: idx % 3 === 0,
  }));

const invalidData = () =>
  Array.from({ length }, (_, idx) => ({
    string: idx,
    number: 'invalid',
    boolean: 'invalid',
  }));

const suite = benchmark('valid', validData).feed('invalid', invalidData);

const zodTarget = suite.target('zod', async () => {
  const { z } = await import('zod');
  const schema = z.object({
    string: z.string(),
    number: z.number(),
    boolean: z.boolean(),
  });
  return { schema };
});

zodTarget.measure('validate all errors', ({ schema }, input) => {
  try {
    schema.parse(input[0]);
  } catch { }
});

const ajvTarget = suite.target('ajv', async () => {
  const { default: Ajv } = await import('ajv');
  const ajv = new Ajv.default();
  const ajvAll = new Ajv.default({ allErrors: true });
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
  const validateAll = ajvAll.compile(schema);
  return { validate, validateAll };
});

ajvTarget.measure('validate first error', ({ validate }, input) => {
  validate(input[0]);
});

ajvTarget.measure('validate all errors', ({ validateAll }, input) => {
  if (!validateAll(input[0])) {
    validateAll.errors;
  }
});

const releaseTarget = suite.target('release ascertain', async () => {
  const { compile } = await import('ascertain');
  const schema = {
    string: String,
    number: Number,
    boolean: Boolean,
  };
  const validate = compile(schema);
  const validateAll = compile(schema, { allErrors: true });
  return { validate, validateAll };
});

releaseTarget.measure('validate first error', ({ validate }, input) => {
  if (!validate(input[0])) {
    validate.issues;
  }
});

releaseTarget.measure('validate all errors', ({ validateAll }, input) => {
  if (!validateAll(input[0])) {
    validateAll.issues;
  }
});

const ascertainTarget = suite.target('current ascertain', async () => {
  const { compile } = await import('../build/index.js');
  const schema = {
    string: String,
    number: Number,
    boolean: Boolean,
  };
  const validate = compile(schema);
  const validateAll = compile(schema, { allErrors: true });
  return { validate, validateAll };
});

ascertainTarget.measure('validate first error', ({ validate }, input) => {
  if (!validate(input[0])) {
    validate.issues;
  }
});

ascertainTarget.measure('validate all errors', ({ validateAll }, input) => {
  if (!validateAll(input[0])) {
    validateAll.issues;
  }
});
