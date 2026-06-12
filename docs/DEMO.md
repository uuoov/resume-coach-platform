# Demo Preview

This page shows the expected result of the bundled demo matching test. It is designed for GitHub readers who want to understand the product output before running the application locally.

![Resume Coach Platform demo preview](./assets/demo-preview.svg)

## What This Demo Shows

The demo creates a sample full-stack resume and a target Senior Full-stack Engineer JD, then runs the local rule-based matching engine.

It does not require:

- A real PostgreSQL database
- DeepSeek, DashScope, or OpenAI API keys
- The frontend development server

## Sample Input

| Type | Example |
| --- | --- |
| Resume | Alex Chen, Full-stack Engineer |
| Resume skills | React, TypeScript, Node.js, PostgreSQL |
| Resume background | SaaS analytics dashboard and cross-functional collaboration |
| Target JD | Senior Full-stack Engineer |
| JD requirements | React, TypeScript, Node.js, PostgreSQL, SaaS experience |

## Expected Output

| Field | Expected value |
| --- | --- |
| `aiPowered` | `false` |
| `overallScore` | `>= 90` |
| `dimensions.skill.score` | `100` |
| `dimensions.industry.score` | `100` |
| Strengths | Includes `React` |
| Gaps | Does not include `React` |

Example assertion:

```ts
const result = await calculateMatch(demoResume, targetJD);

expect(result.aiPowered).toBe(false);
expect(result.overallScore).toBeGreaterThanOrEqual(90);
expect(result.dimensions.skill.score).toBe(100);
expect(result.dimensions.industry.score).toBe(100);
expect(result.strengths).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ item: 'React', matched: true }),
  ])
);
expect(result.gaps).not.toEqual(
  expect.arrayContaining([
    expect.objectContaining({ item: 'React' }),
  ])
);
```

## Run It Locally

```bash
npm install
npx jest --runInBand --runTestsByPath tests/demo.matching.test.ts
```

Run the full suite:

```bash
npm test
```

The full runnable test lives in [`tests/demo.matching.test.ts`](../tests/demo.matching.test.ts).
