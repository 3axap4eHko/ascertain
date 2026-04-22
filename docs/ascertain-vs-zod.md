# Ascertain vs Zod

Zod and Ascertain both validate runtime data, but they optimize for different things.

## The Main Difference

Zod is a fluent validation DSL with a rich object API. Ascertain uses JavaScript-native schema values and compiles them into specialized validators.

That leads to a different tradeoff:

- Zod favors a builder-style authoring model
- Ascertain favors a native-value schema model plus compiled execution

## Why Teams Switch

Teams usually look for an alternative to Zod after a concrete runtime cost shows up:

- validation appears in a flamegraph
- invalid-path throughput is too low
- all-errors mode is too expensive
- hot-path services need less validation overhead

Ascertain is designed for that moment. It keeps the validation model in ordinary JavaScript values while pushing performance much harder than interpreter-style validation.

## Example

Zod:

```typescript
import { z } from 'zod';

const userSchema = z.object({
  id: z.number(),
  role: z.enum(['admin', 'user', 'guest']),
  score: z.number().nullable(),
});
```

Ascertain:

```typescript
import { compile, optional, or } from 'ascertain';

const validateUser = compile({
  id: Number,
  role: or('admin', 'user', 'guest'),
  score: optional(Number),
});
```

## How To Think About The Tradeoff

Choose Zod when:

- you want a fluent schema builder
- your bottleneck is not validation cost
- the ergonomics of the chainable API matter more than throughput

Choose Ascertain when:

- you want compiled validators
- invalid-path and all-errors performance matter
- you prefer schemas expressed as JavaScript-native runtime values
- you want a lighter runtime surface
