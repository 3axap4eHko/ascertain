# Ascertain

Zero-dependency, high-performance schema validator for Node.js and browsers.

[![Coverage Status][codecov-image]][codecov-url]
[![Build Status][github-image]][github-url]
[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][npm-url]
[![Snyk][snyk-image]][snyk-url]

[Documentation](https://3axap4ehko.github.io/ascertain/)

## Features

- **Zero dependencies** - Minimal footprint, no external dependencies
- **High performance** - Compiles schemas to optimized JS functions (~6x faster than dynamic validation)
- **Type-safe** - Full TypeScript support with type inference
- **Flexible schemas** - AND, OR, optional, tuple operators
- **Type casting** - Built-in parsers for numbers (hex, octal, binary), dates, JSON, base64
- **Object validation** - Validate keys/values with `$keys`, `$values`, `$strict`
- **Partial validation** - `createValidator` validates subsets with type narrowing
- **Detailed errors** - Clear error messages with paths for debugging

## Install

```bash
npm install ascertain
```

## Quick Start

```typescript
import { ascertain, or, optional } from 'ascertain';

ascertain({
  name: String,
  age: Number,
  role: or('admin', 'user'),
  email: optional(String),
}, userData, 'User');
```

## Performance

Ascertain compiles schemas into optimized JavaScript functions. Compiled validators run **~6x faster** than dynamic validation.

```typescript
import { compile } from 'ascertain';

// Compile once
const validateUser = compile(userSchema, 'User');

// Validate many (no recompilation)
validateUser(user1);
validateUser(user2);
```

| When to use | Function | Speed |
|-------------|----------|-------|
| Repeated validation (API handlers, loops) | `compile()` | Fastest |
| One-off validation | `ascertain()` | Convenient |

### Benchmark

| Library | Ops/sec | Relative |
|---------|---------|----------|
| **Ascertain** | 58.9M | 1.0x |
| AJV | 42.2M | 0.72x |
| Zod | 32.3M | 0.55x |

## Schema Reference

| Schema | Validates | Example |
|--------|-----------|---------|
| `String`, `Number`, `Boolean` | Type check | `{ age: Number }` |
| `Date`, `Array`, `Object` | Instance check | `{ created: Date }` |
| `Function` | Any callable | `{ handler: Function }` |
| Primitives | Exact value | `{ status: 'active' }` |
| RegExp | Pattern match | `{ email: /^.+@.+$/ }` |
| `[Schema]` | Array of type | `{ tags: [String] }` |
| `{ key: Schema }` | Object shape | `{ user: { name: String } }` |
| `or(a, b, ...)` | Any match | `or(String, Number)` |
| `and(a, b, ...)` | All match | `and(Date, { toJSON: Function })` |
| `optional(s)` | Nullable | `optional(String)` |
| `tuple(a, b)` | Fixed array | `tuple(Number, Number)` |

### Special Symbols

```typescript
import { $keys, $values, $strict } from 'ascertain';

const schema = {
  [$keys]: /^[a-z]+$/,   // Validate all keys
  [$values]: Number,      // Validate all values
  [$strict]: true,        // No extra properties
};
```

## Type Casting

Parse strings into typed values (environment variables, query params):

```typescript
import { as } from 'ascertain';

as.number('42')        // 42
as.number('3.14')      // 3.14
as.number('0xFF')      // 255 (hex)
as.number('0o77')      // 63 (octal)
as.number('0b1010')    // 10 (binary)
as.number('1e10')      // 10000000000

as.boolean('true')     // true
as.boolean('1')        // true

as.time('500ms')       // 500
as.time('30s')         // 30000
as.time('5m')          // 300000
as.time('2h')          // 7200000
as.time('1d')          // 86400000

as.date('2024-12-31')  // Date object
as.array('a,b,c', ',') // ['a', 'b', 'c']
as.json('{"x":1}')     // { x: 1 }
as.base64('dGVzdA==')  // 'test'
```

Invalid values return `TypeError` for deferred validation:

```typescript
const config = {
  port: as.number(process.env.PORT),  // TypeError if invalid
  host: as.string(process.env.HOST),
};

// Errors surface with clear paths
ascertain({ port: Number, host: String }, config, 'Config');
// → "Invalid value undefined for path Config.port..."
```

## Patterns

### Batch Validation

Compile once, validate many:

```typescript
const validateUser = compile(userSchema, 'User');

const results = users.map((user, i) => {
  try {
    validateUser(user);
    return { index: i, valid: true };
  } catch (e) {
    return { index: i, valid: false, error: e.message };
  }
});
```

### Conditional Rules

Use `or()` and `and()` for complex conditions:

```typescript
const schema = {
  type: or('email', 'sms'),
  // Conditional: email requires address, sms requires phone
  contact: or(
    and({ type: 'email' }, { address: String }),
    and({ type: 'sms' }, { phone: String }),
  ),
};
```

### Schema Composition

Build schemas from reusable parts:

```typescript
const addressSchema = {
  street: String,
  city: String,
  zip: /^\d{5}$/,
};

const personSchema = {
  name: String,
  address: addressSchema,
};

const companySchema = {
  name: String,
  headquarters: addressSchema,
  employees: [personSchema],
};
```

### Versioned Schemas

Version schemas as modules:

```typescript
// schemas/user.v1.ts
export const userSchemaV1 = { name: String, email: String };

// schemas/user.v2.ts
export const userSchemaV2 = {
  ...userSchemaV1,
  phone: optional(String),
  createdAt: Date,
};

// api/handler.ts
import { userSchemaV2 } from './schemas/user.v2';
const validate = compile(userSchemaV2, 'User');
```

### Config Validation

Validate only what each module needs:

```typescript
import { createValidator, as } from 'ascertain';

const config = {
  app: { name: as.string(process.env.APP_NAME), port: as.number(process.env.PORT) },
  db: { host: as.string(process.env.DB_HOST), pool: as.number(process.env.DB_POOL) },
  cache: { ttl: as.time(process.env.CACHE_TTL) },
};

const validate = createValidator(config, 'Config');

// Each module validates only what it needs
const { db } = validate({
  db: { host: String, pool: Number },
});

db.host;   // string - validated and typed
db.pool;   // number - validated and typed
// db.xxx  // TypeScript error - property doesn't exist

// cache not validated = not accessible
// cache.ttl  // TypeScript error - cache not in returned type
```

## Complete Example

```typescript
import { compile, or, optional, and, tuple, $keys, $values, $strict, as } from 'ascertain';

const schema = {
  id: Number,
  name: String,
  email: /^[^@]+@[^@]+$/,
  status: or('active', 'inactive', 'pending'),
  role: optional(or('admin', 'user')),

  profile: {
    bio: optional(String),
    avatar: optional(String),
  },

  settings: {
    [$keys]: /^[a-z_]+$/,
    [$values]: or(String, Number, Boolean),
    [$strict]: true,
  },

  coordinates: optional(tuple(Number, Number)),
  createdAt: and(Date, { toISOString: Function }),

  retries: as.number(process.env.MAX_RETRIES),
  timeout: as.time(process.env.TIMEOUT),
};

const validate = compile(schema, 'AppConfig');
validate(data);
```

## License

[MIT](http://opensource.org/licenses/MIT) - Ivan Zakharchanka

[npm-url]: https://www.npmjs.com/package/ascertain
[downloads-image]: https://img.shields.io/npm/dw/ascertain.svg?maxAge=43200
[npm-image]: https://img.shields.io/npm/v/ascertain.svg?maxAge=43200
[github-url]: https://github.com/3axap4eHko/ascertain/actions/workflows/cicd.yml
[github-image]: https://github.com/3axap4eHko/ascertain/actions/workflows/cicd.yml/badge.svg
[codecov-url]: https://codecov.io/gh/3axap4eHko/ascertain
[codecov-image]: https://img.shields.io/codecov/c/github/3axap4eHko/ascertain/master.svg?maxAge=43200
[snyk-url]: https://snyk.io/test/npm/ascertain/latest
[snyk-image]: https://img.shields.io/snyk/vulnerabilities/github/3axap4eHko/ascertain.svg?maxAge=43200
