# Migrate from Zod

The migration path is mostly mechanical. The biggest conceptual shift is that Ascertain uses JavaScript-native schema values instead of a builder API.

## Common Translations

Primitive types:

```typescript
// Zod
z.string()
z.number()
z.boolean()

// Ascertain
String
Number
Boolean
```

Object shapes:

```typescript
// Zod
z.object({
  name: z.string(),
  age: z.number(),
})

// Ascertain
{
  name: String,
  age: Number,
}
```

Arrays:

```typescript
// Zod
z.array(z.string())

// Ascertain
[String]
```

Literal unions:

```typescript
// Zod
z.enum(['admin', 'user', 'guest'])

// Ascertain
or('admin', 'user', 'guest')
```

Optional or nullable values:

```typescript
// Zod
z.number().nullable()

// Ascertain
optional(Number)
```

Discriminated unions:

```typescript
// Zod
z.discriminatedUnion('type', [
  z.object({ type: z.literal('email'), address: z.string() }),
  z.object({ type: z.literal('sms'), phone: z.string() }),
])

// Ascertain
discriminated(
  [
    { type: 'email', address: String },
    { type: 'sms', phone: String },
  ],
  'type',
)
```

## Validation Style

Zod commonly returns parsed values or throws. Ascertain separates the common cases:

- `compile(schema)` returns a reusable validator function
- `ascertain(schema, data)` validates once and throws on failure

```typescript
import { compile } from 'ascertain';

const validate = compile({ name: String });

if (!validate(input)) {
  console.error(validate.issues);
}
```

## Constraints

Common constraints have first-party helpers:

```typescript
import { and, min, max, integer, minLength, format } from 'ascertain';

const schema = {
  age: and(Number, min(0), max(150), integer()),
  email: and(String, format.email()),
  name: and(String, minLength(1)),
};
```

For custom rules, use `check()`.

## What Changes Most

- authoring style changes from builder API to native values
- compiled validators become the default workflow
- performance behavior is much stronger on hot paths, especially on invalid data
