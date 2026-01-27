# Ascertain

Zero-dependency, high-performance schema validator for Node.js and browsers.

[![Coverage Status][codecov-image]][codecov-url]
[![Build Status][github-image]][github-url]
[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][npm-url]
[![Snyk][snyk-image]][snyk-url]

[Documentation](https://3axap4ehko.github.io/ascertain/)

## Features

- **Zero dependencies**: Minimal footprint, no external dependencies
- **High performance**: Compiles schemas to optimized JavaScript functions
- **Type-safe**: Full TypeScript support with type inference
- **Flexible schemas**: Supports AND, OR, optional, and tuple operators
- **Type casting**: Built-in parsers for numbers, dates, JSON, base64, and more
- **Object validation**: Validate keys and values with `$keys`, `$values`, and `$strict`
- **Detailed errors**: Clear error messages with paths for debugging

## Installation

```bash
npm install ascertain
# or
pnpm add ascertain
```

## Quick Start

```typescript
import { ascertain, compile, or, optional } from 'ascertain';

// Define a schema
const userSchema = {
  name: String,
  age: Number,
  email: optional(String),
  role: or('admin', 'user', 'guest'),
};

// Validate data (throws on invalid)
ascertain(userSchema, userData, 'User');
```

## Performance

Ascertain compiles schemas into optimized JavaScript functions at runtime. This compilation step generates specialized validation code that runs significantly faster than interpreting schemas on each validation.

**For best performance, compile schemas once and reuse the validator:**

```typescript
import { compile } from 'ascertain';

// Compile once at startup
const validateUser = compile(userSchema, 'User');

// Reuse for each validation (no recompilation)
validateUser(user1);
validateUser(user2);
```

Use `ascertain()` for one-off validations where convenience matters more than performance. Use `compile()` when validating the same schema repeatedly (e.g., API request handlers).

### Benchmark

| Library | Operations/sec | Relative Speed |
|---------|----------------|----------------|
| **Ascertain** | 58,962,264 | **1.0x (fastest)** |
| AJV | 42,204,777 | 0.72x |
| Zod | 32,309,133 | 0.55x |

```bash
pnpm bench
```

## Schema Types

| Schema | Description | Example |
|--------|-------------|---------|
| Primitives | Match exact values | `42`, `'active'`, `true`, `null` |
| Constructors | Validate by type | `String`, `Number`, `Boolean`, `Date` |
| Arrays | Validate array items | `[Number]` (array of numbers) |
| Objects | Validate properties | `{ name: String, age: Number }` |
| RegExp | Match string patterns | `/^[a-z]+$/` |
| `or()` | Match any schema | `or(String, Number)` |
| `and()` | Match all schemas | `and(Date, { toJSON: Function })` |
| `optional()` | Allow null/undefined | `optional(String)` |
| `tuple()` | Fixed-length arrays | `tuple(Number, Number)` |

### Object Validation Symbols

```typescript
import { $keys, $values, $strict } from 'ascertain';

const schema = {
  [$keys]: /^[a-z]+$/,     // All keys must match pattern
  [$values]: Number,        // All values must be numbers
  [$strict]: true,          // No extra properties allowed
};
```

## Type Casting with `as`

Parse and validate values from strings (useful for environment variables, query params, etc.):

```typescript
import { as } from 'ascertain';

as.string('hello')           // 'hello'
as.number('42')              // 42
as.number('3.14')            // 3.14
as.number('1e10')            // 10000000000
as.number('0xFF')            // 255 (hex)
as.number('0o77')            // 63 (octal)
as.number('0b1010')          // 10 (binary)
as.boolean('true')           // true
as.boolean('1')              // true
as.date('2024-12-31')        // Date object
as.time('2m')                // 120000 (milliseconds)
as.time('1h')                // 3600000
as.array('a,b,c', ',')       // ['a', 'b', 'c']
as.json('{"x":1}')           // { x: 1 }
as.base64('dGVzdA==')        // 'test'
```

Invalid values return a `TypeError` instead of throwing, enabling deferred validation:

```typescript
const config = {
  port: as.number(process.env.PORT),      // TypeError if invalid
  host: as.string(process.env.HOST),
};

// Errors surface during schema validation with clear paths
ascertain({ port: Number, host: String }, config, 'Config');
```

## Config Validation with `createValidator`

For configuration objects, `createValidator` provides type-safe partial validation:

```typescript
import { createValidator, as } from 'ascertain';

const config = {
  app: { name: as.string(process.env.APP_NAME), port: as.number(process.env.PORT) },
  db: { host: as.string(process.env.DB_HOST), pool: as.number(process.env.DB_POOL) },
  redis: { url: as.string(process.env.REDIS_URL) },
};

const validate = createValidator(config, 'Config');

// Each module validates only what it needs
const { app, db } = validate({
  app: { name: String, port: Number },
  db: { host: String, pool: Number },
});
// app.name is typed as string
// app.port is typed as number
// redis is not accessible (TypeScript error)
```

## Complete Example

```typescript
import { compile, or, optional, and, tuple, $keys, $values, $strict, as } from 'ascertain';

const schema = {
  // Type validation
  id: Number,
  name: String,
  active: Boolean,

  // Pattern matching
  email: /^[^@]+@[^@]+$/,

  // Union types
  status: or('pending', 'active', 'disabled'),

  // Optional fields
  nickname: optional(String),

  // Nested objects
  profile: {
    bio: String,
    links: [String],
  },

  // Combined constraints
  createdAt: and(Date, { toISOString: Function }),

  // Tuples
  coordinates: tuple(Number, Number),

  // Dynamic objects
  metadata: {
    [$keys]: /^[a-z_]+$/,
    [$values]: or(String, Number),
    [$strict]: true,
  },

  // Parsed values
  retryCount: as.number(process.env.RETRY_COUNT),
  timeout: as.time(process.env.TIMEOUT),
};

const validate = compile(schema, 'AppConfig');

// Throws TypeError with detailed path on validation failure
validate(data);
```

## License

[The MIT License](http://opensource.org/licenses/MIT)

Copyright (c) 2019-2026 Ivan Zakharchanka

[npm-url]: https://www.npmjs.com/package/ascertain
[downloads-image]: https://img.shields.io/npm/dw/ascertain.svg?maxAge=43200
[npm-image]: https://img.shields.io/npm/v/ascertain.svg?maxAge=43200
[github-url]: https://github.com/3axap4eHko/ascertain/actions/workflows/cicd.yml
[github-image]: https://github.com/3axap4eHko/ascertain/actions/workflows/cicd.yml/badge.svg
[codecov-url]: https://codecov.io/gh/3axap4eHko/ascertain
[codecov-image]: https://img.shields.io/codecov/c/github/3axap4eHko/ascertain/master.svg?maxAge=43200
[snyk-url]: https://snyk.io/test/npm/ascertain/latest
[snyk-image]: https://img.shields.io/snyk/vulnerabilities/github/3axap4eHko/ascertain.svg?maxAge=43200
