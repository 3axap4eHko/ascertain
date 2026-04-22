# Benchmarks

Ascertain's benchmark story is about compiled validation throughput, especially on invalid data and in all-errors mode.

## What The Repo Measures

The benchmark suite lives in:

- `src/__bench__/benchmark.ts`
- `src/__bench__/benchmark-complex.ts`
- `src/__bench__/self.ts`

The published comparisons cover:

- simple object validation
- more complex nested object validation
- valid and invalid inputs
- first-error mode and all-errors mode
- comparison against the current published `ascertain`, AJV, and Zod

## Why Invalid Data Matters

Many validators look acceptable on valid inputs but become much more expensive when data is wrong, especially when they collect all issues instead of stopping at the first failure.

Ascertain is designed to stay strong in both cases:

- first-error mode is the default
- all-errors mode is still optimized as a first-class path

## How To Read The Numbers

Treat the benchmark tables as directional, not absolute:

- they are maintainer-run
- results vary by CPU and Node.js version
- small percentage differences are not meaningful
- invalid-path and all-errors numbers are usually the most decision-relevant

## Current Positioning

The current benchmark story supports these claims:

- Ascertain is consistently ahead of AJV in the published suite
- Ascertain is dramatically ahead of Zod on invalid all-errors workloads
- the value proposition is strongest when validation cost is visible in production paths

## Run Them Locally

```bash
pnpm build
pnpm bench
```

If you are evaluating a real migration, adapt the benchmark inputs to your own payload shapes before drawing conclusions.
