import 'overtake';
import { randomUUID, randomInt } from 'node:crypto';

const STATUSES = ['active', 'inactive', 'pending', 'archived'] as const;
const ROLES = ['admin', 'user', 'guest'] as const;
const NOTIF_TYPES = ['email', 'sms', 'push'] as const;

const length = 10 ** 4;

const randomNotification = () => {
  const type = NOTIF_TYPES[randomInt(3)];
  if (type === 'email') return { type, address: `${randomUUID()}@test.com` };
  if (type === 'sms') return { type, phone: `+1${randomInt(1e9)}` };
  return { type, token: randomUUID() };
};

const validData = () =>
  Array.from({ length }, () => ({
    id: randomInt(length),
    name: randomUUID(),
    status: STATUSES[randomInt(4)],
    role: ROLES[randomInt(3)],
    score: randomInt(2) ? randomInt(100) : null,
    tags: Array.from({ length: randomInt(4) }, () => randomUUID().slice(0, 8)),
    address: { street: randomUUID(), city: randomUUID().slice(0, 8), zip: String(randomInt(99999)) },
    notifications: Array.from({ length: randomInt(3) + 1 }, randomNotification),
  }));

const invalidData = () =>
  Array.from({ length }, () => ({
    id: 'not-a-number',
    name: 123,
    status: 'unknown',
    role: 42,
    score: 'bad',
    tags: 'not-array',
    address: { street: 123, city: null, zip: 0 },
    notifications: [{ type: 'fax', number: '555' }],
  }));

const suite = benchmark('complex valid', validData).feed('complex invalid', invalidData);

// --- Zod ---
const zodTarget = suite.target('zod', async () => {
  const { z } = await import('zod');

  const notificationSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('email'), address: z.string() }),
    z.object({ type: z.literal('sms'), phone: z.string() }),
    z.object({ type: z.literal('push'), token: z.string() }),
  ]);

  const schema = z.object({
    id: z.number(),
    name: z.string(),
    status: z.enum(['active', 'inactive', 'pending', 'archived']),
    role: z.enum(['admin', 'user', 'guest']),
    score: z.number().nullable(),
    tags: z.array(z.string()),
    address: z.object({ street: z.string(), city: z.string(), zip: z.string() }),
    notifications: z.array(notificationSchema),
  });

  return { schema };
});

zodTarget.measure('validate all errors', ({ schema }, input) => {
  try {
    schema.parse(input[0]);
  } catch {}
});

// --- AJV ---
const ajvTarget = suite.target('ajv', async () => {
  const { default: Ajv } = await import('ajv');
  const ajv = new Ajv.default({ discriminator: true });
  const ajvAll = new Ajv.default({ allErrors: true, discriminator: true });

  const schema = {
    type: 'object',
    properties: {
      id: { type: 'number' },
      name: { type: 'string' },
      status: { type: 'string', enum: ['active', 'inactive', 'pending', 'archived'] },
      role: { type: 'string', enum: ['admin', 'user', 'guest'] },
      score: { type: 'number', nullable: true },
      tags: { type: 'array', items: { type: 'string' } },
      address: {
        type: 'object',
        properties: {
          street: { type: 'string' },
          city: { type: 'string' },
          zip: { type: 'string' },
        },
        required: ['street', 'city', 'zip'],
      },
      notifications: {
        type: 'array',
        items: {
          type: 'object',
          discriminator: { propertyName: 'type' },
          oneOf: [
            {
              type: 'object',
              properties: { type: { const: 'email' }, address: { type: 'string' } },
              required: ['type', 'address'],
            },
            {
              type: 'object',
              properties: { type: { const: 'sms' }, phone: { type: 'string' } },
              required: ['type', 'phone'],
            },
            {
              type: 'object',
              properties: { type: { const: 'push' }, token: { type: 'string' } },
              required: ['type', 'token'],
            },
          ],
          required: ['type'],
        },
      },
    },
    required: ['id', 'name', 'status', 'role', 'tags', 'address', 'notifications'],
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

// --- Current Ascertain ---
const ascertainTarget = suite.target('current ascertain', async () => {
  const { compile, or, optional, discriminated } = await import('../index.js');

  const schema = {
    id: Number,
    name: String,
    status: or('active', 'inactive', 'pending', 'archived'),
    role: or('admin', 'user', 'guest'),
    score: optional(Number),
    tags: [String],
    address: { street: String, city: String, zip: String },
    notifications: [
      discriminated(
        [
          { type: 'email', address: String },
          { type: 'sms', phone: String },
          { type: 'push', token: String },
        ],
        'type',
      ),
    ],
  };

  const validate = compile(schema, { pure: true });
  const validateAll = compile(schema, { allErrors: true, pure: true });
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

// --- Release Ascertain ---
const releaseTarget = suite.target('release ascertain', async () => {
  const { compile, or, optional, discriminated } = await import('ascertain-release');

  const schema = {
    id: Number,
    name: String,
    status: or('active', 'inactive', 'pending', 'archived'),
    role: or('admin', 'user', 'guest'),
    score: optional(Number),
    tags: [String],
    address: { street: String, city: String, zip: String },
    notifications: [
      discriminated(
        [
          { type: 'email', address: String },
          { type: 'sms', phone: String },
          { type: 'push', token: String },
        ],
        'type',
      ),
    ],
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
