# Why Ascertain

Ascertain is a compiled schema-and-constraint validator for JavaScript-native runtime values.

That matters because it keeps the schema model close to ordinary JavaScript while still giving you compiled-validator performance. You write schemas with constructors, literals, regexes, arrays, object shapes, unions, and constraints, then call `compile()` once and reuse the generated validator.

## What You Get

- JavaScript-native schemas instead of a separate authoring format
- Compiled validators instead of interpreting the schema on every call
- Fast first-error mode by default
- Fast all-errors mode when you need full issue lists
- Zero dependencies
- Pathful issues for invalid data

## When It Fits

Ascertain is strongest when validation happens at runtime boundaries and throughput matters:

- API request and response validation
- message queue consumers
- config and environment parsing
- hot loops that validate many similarly shaped values
- systems that need detailed issues without giving up too much speed

## What It Is Not

Ascertain is not trying to be a JSON Schema authoring tool, a form-first validation DSL, or a data transformation framework. The center of the library is compiled validation over JavaScript-native runtime values.

## The Core Workflow

```typescript
import { compile, optional, or } from 'ascertain';

const validateUser = compile({
  id: Number,
  role: or('admin', 'user', 'guest'),
  score: optional(Number),
});

if (!validateUser(userData)) {
  console.error(validateUser.issues);
}
```

Use `ascertain(schema, data)` when you want the convenience wrapper that validates once and throws on failure.
