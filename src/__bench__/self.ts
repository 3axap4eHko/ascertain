import 'overtake';
import { randomUUID, randomInt } from 'node:crypto';

const length = 10 ** 4;

const simpleValid = () =>
  Array.from({ length }, (_, idx) => ({
    string: randomUUID(),
    number: randomInt(length),
    boolean: idx % 3 === 0,
  }));

const simpleInvalid = () =>
  Array.from({ length }, (_, idx) => ({
    string: idx,
    number: 'invalid',
    boolean: 'invalid',
  }));

const FIXED_COMPLEX_VALID = Object.freeze({
  id: 42,
  name: '550e8400-e29b-41d4-a716-446655440000',
  status: 'active' as const,
  role: 'user' as const,
  score: 75,
  tags: Object.freeze(['alpha123', 'beta4567', 'gamma890']) as unknown as string[],
  address: Object.freeze({ street: '550e8400-e29b-41d4-a716-446655440000', city: 'cityname', zip: '12345' }),
  notifications: Object.freeze([
    Object.freeze({ type: 'email' as const, address: 'a@b.com' }),
    Object.freeze({ type: 'sms' as const, phone: '+15551234567' }),
    Object.freeze({ type: 'push' as const, token: '550e8400-e29b-41d4-a716-446655440000' }),
  ]) as unknown as ReadonlyArray<unknown>,
});

const complexValid = () => Array.from({ length }, () => FIXED_COMPLEX_VALID);

const complexInvalid = () =>
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

const suite = benchmark('simple valid', simpleValid)
  .feed('simple invalid', simpleInvalid)
  .feed('complex valid', complexValid)
  .feed('complex invalid', complexInvalid);

const target = suite.target('release ascertain', async () => {
  const { compile, or, optional, discriminated } = await import('ascertain-release');

  const simpleSchema = {
    string: String,
    number: Number,
    boolean: Boolean,
  };

  const complexSchema = {
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

  const simpleFirst = compile(simpleSchema);
  const simpleAll = compile(simpleSchema, { allErrors: true });
  const complexFirst = compile(complexSchema);
  const complexAll = compile(complexSchema, { allErrors: true });

  return { simpleFirst, simpleAll, complexFirst, complexAll, ref: [] as unknown[] };
});

target.measure('validate first error', ({ simpleFirst, complexFirst, ref }, input) => {
  const item = input[0];
  const v = 'id' in item ? complexFirst : simpleFirst;
  ref[0] = !v(item);
});

target.measure('validate all errors', ({ simpleAll, complexAll, ref }, input) => {
  const item = input[0];
  const v = 'id' in item ? complexAll : simpleAll;
  ref[0] = !v(item);
});
