# Ascertain vs AJV

AJV and Ascertain are much closer in purpose than Ascertain and Zod. Both are built around compiled validation and both care about runtime throughput.

## The Main Difference

AJV centers on JSON Schema. Ascertain centers on JavaScript-native schema values.

That creates the practical split:

- AJV is the better fit when JSON Schema is already your interchange format
- Ascertain is the better fit when you want compiled validation without switching authoring models

## Why Use Ascertain Instead Of AJV

- schemas are written as ordinary JavaScript values
- unions and discriminated unions are expressed directly in code
- you get compiled validators without carrying JSON Schema as the source format
- the current benchmark suite shows Ascertain ahead of AJV across the published workloads

## Example

AJV:

```typescript
const schema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    role: { type: 'string', enum: ['admin', 'user', 'guest'] },
  },
  required: ['id', 'role'],
  additionalProperties: false,
};
```

Ascertain:

```typescript
import { compile, or, $strict } from 'ascertain';

const validate = compile({
  id: Number,
  role: or('admin', 'user', 'guest'),
  [$strict]: true,
});
```

## How To Think About The Tradeoff

Choose AJV when:

- you need JSON Schema compatibility
- schemas come from external systems or contracts
- the schema itself must be serialized, exchanged, or standardized

Choose Ascertain when:

- the source of truth is JavaScript or TypeScript code
- you want compiled validation over JS-native runtime values
- you care about invalid-path and all-errors throughput
