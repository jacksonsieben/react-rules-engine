# react-rules-engine

A **fully type-safe, reusable rules engine** for complex, deeply-nested React forms.

Solve the classic duplication problem: business rules declared once, driving both **live UI behaviour** (hide/disable/warn/error on every keystroke) *and* **submit-time validation** — with no `superRefine` gymnastics.

---

## Quick start

```bash
# Install lib dependencies
cd lib && pnpm install && pnpm build

# Run unit tests (24 tests)
pnpm test

# Start the example Vite app
cd ../example && pnpm install && pnpm dev
```

---

## Architecture

```
react-rules-engine/
├── lib/                    ← Generic, framework-agnostic rules engine
│   ├── src/
│   │   ├── types.ts        ← Core types (Rule, FieldMeta, Effect, EvaluationResult …)
│   │   ├── engine.ts       ← evaluate(), mergeResults(), getFieldMeta(), rulesForFields()
│   │   ├── utils.ts        ← getPath / setPath helpers for nested objects
│   │   └── index.ts        ← Public API
│   └── tests/
│       └── engine.test.ts  ← 24 edge-case unit tests (Vitest)
│
└── example/                ← React + Vite demo with Zustand & Zod
    └── src/
        ├── schema/
        │   └── pitchSchema.ts   ← Zod schema + types + default values
        ├── rules/
        │   └── pitchRules.ts    ← 8 business rules (hidden, disabled, warn, error)
        ├── store/
        │   └── pitchStore.ts    ← Zustand store (values + live engine result)
        └── components/
            ├── FormField.tsx    ← Reusable field wrapper (reads FieldMeta, renders badges)
            └── PitchForm.tsx    ← Demo form (8+ fields, 3-4 nesting levels)
```

### Three-layer validation

| Layer | What it does | Where |
|-------|-------------|-------|
| **A — Structural schema** | Types, required, min/max, formats | `pitchSchema.ts` (Zod) |
| **B — Business rules engine** | hide/disable/warn/error from field relationships | `pitchRules.ts` + `lib/` |
| **C — Submit guard** | Re-runs both A + B on submit to prevent bypass | `pitchStore.ts` submit() |

Every business rule is declared **once** in `pitchRules.ts`. That single declaration drives both the live UI state and the submit-time guard — no duplication.

---

## Core API (`/lib`)

### Types

```typescript
// Dot-notation paths into your form type (supports up to 5 levels deep)
type PathsOf<T> = ...   // e.g. "financials.runway.months"

// Value type at a given path
type PathValue<T, Path> = ...

// Runtime state for a single field
interface FieldMeta {
  hidden: boolean;
  disabled: boolean;
  warnings: string[];
  errors: string[];
}

// What a rule does when its condition is met
type Effect<T> =
  | { type: 'setHidden';   field: PathsOf<T>; value: boolean }
  | { type: 'setDisabled'; field: PathsOf<T>; value: boolean }
  | { type: 'addWarning';  field: PathsOf<T>; message: string }
  | { type: 'addError';    field: PathsOf<T>; message: string }
  | { type: 'addFormError'; message: string }

// A single rule definition
interface Rule<T> {
  id: string;               // unique identifier
  description?: string;     // human-readable explanation
  dependsOn: PathsOf<T>[]; // triggers re-evaluation when these fields change
  when: (ctx: EvalContext<T>) => boolean;  // condition predicate
  then: Effect<T>[];        // effects applied when condition is met
  priority?: number;        // higher = runs first (default: 0)
}

// Result of evaluate()
interface EvaluationResult<T> {
  fields: Partial<Record<PathsOf<T>, FieldMeta>>;
  formErrors: string[];
  isValid: boolean;         // true when no field errors AND no form errors
}
```

### `evaluate(values, rules, options?)`

Full evaluation of all rules against the current form values.

```typescript
import { evaluate } from '@react-rules-engine/lib';

const result = evaluate(formValues, rules);

// Read meta for a specific field
result.fields['financials.runway.months']
// → { hidden: false, disabled: false, warnings: [], errors: ['Runway < 3 months…'] }

result.isValid   // false when any errors exist
result.formErrors  // ['Please correct the funding stage for non-profit ventures.']
```

**Evaluation order:** rules are sorted by `priority` descending (higher runs first), then by declaration order for ties (stable sort).

**Collision semantics:**
- `setHidden` / `setDisabled` → **last writer wins** (later rule overrides)
- `addWarning` / `addError` / `addFormError` → **additive** (all messages accumulate)

**Incremental evaluation** (for on-change performance):

```typescript
const result = evaluate(formValues, rules, {
  changedFields: new Set(['financials.stage']),
});
// Only rules that `dependsOn` 'financials.stage' run
```

### `getFieldMeta(result, path)`

Safe accessor — returns the pristine default when no rule targeted the field.

```typescript
import { getFieldMeta } from '@react-rules-engine/lib';

const meta = getFieldMeta(result, 'financials.runway.months');
if (meta.hidden) { /* don't render */ }
```

### `mergeResults(base, next)`

Merge two evaluation results (e.g. baseline + incremental). `next` overrides `hidden`/`disabled`; warnings/errors are concatenated.

### `rulesForFields(rules, fields)`

Filter rules to only those that depend on specific fields — useful for building dependency graphs or documentation.

---

## Defining rules

```typescript
import type { Rule } from '@react-rules-engine/lib';

// Your form type
type MyForm = {
  type: 'individual' | 'company';
  billing: {
    vatNumber: string;
    address: {
      country: string;
      postalCode: string;
    };
  };
};

const rules: Rule<MyForm>[] = [
  {
    id: 'hide-vat-for-individuals',
    description: 'VAT number is only required for companies',
    dependsOn: ['type'],                       // re-evaluate when `type` changes
    when: (ctx) => ctx.get('type') !== 'company',
    then: [
      { type: 'setHidden', field: 'billing.vatNumber', value: true },
    ],
  },

  {
    id: 'require-postal-code-for-eu',
    dependsOn: ['billing.address.country'],    // deeply nested dependency
    when: (ctx) => ['DE', 'FR', 'ES'].includes(ctx.get('billing.address.country')),
    then: [
      {
        type: 'addError',
        field: 'billing.address.postalCode',
        message: 'Postal code is required for EU countries.',
      },
    ],
  },
];
```

`ctx.get(path)` is fully typed — TypeScript infers the return type from the path string.

---

## Zustand integration

```typescript
// store.ts
import { create } from 'zustand';
import { evaluate, getFieldMeta } from '@react-rules-engine/lib';
import { myRules } from './rules';

export const useFormStore = create((set, get) => ({
  values: defaultValues,
  result: evaluate(defaultValues, myRules),

  setValue(path, value) {
    const nextValues = deepSet(get().values, path, value);
    set({ values: nextValues, result: evaluate(nextValues, myRules) });
  },

  getMeta(path) {
    return getFieldMeta(get().result, path);
  },
}));
```

Then in your component:

```tsx
function MyField() {
  const meta = useFormStore(s => s.getMeta('billing.vatNumber'));
  if (meta.hidden) return null;
  return (
    <input disabled={meta.disabled} ... />
    {meta.warnings.map(w => <p className="warning">{w}</p>)}
    {meta.errors.map(e => <p className="error">{e}</p>)}
  );
}
```

---

## Example rules in the demo

| ID | Condition | Effect |
|----|-----------|--------|
| `hide-revenue-at-idea-stage` | `stage === 'idea'` | Hides `monthlyRevenue` + `burnRate` |
| `show-runway-extension-when-runway-positive` | `runway.months === 0` | Hides `runway.hasExtension` |
| `disable-tam-for-global-region` | `region === 'global'` | Disables `estimatedTam` + warning |
| `nonprofit-stage-restriction` | `isNonProfit && stage === 'series-b-plus'` | Error on `stage` + form error |
| `nonprofit-linkedin-optional` | `isNonProfit === true` | Disables `founder.linkedIn` + warning |
| `warn-burn-exceeds-revenue` | `burnRate > monthlyRevenue > 0` | Warning on `burnRate` |
| `deep-tech-tam-requirement` | `vertical === 'deep-tech' && TAM < $10M` | Error on `estimatedTam` |
| `climate-mena-grant-note` | `vertical === 'climate' && region === 'mena'` | Warning on `region` |
| `critical-runway-without-extension` | `0 < runway < 3 && !hasExtension` | Error on `runway.months` |

---

## Type guarantees

- **Field paths are typed** — `PathsOf<T>` produces a union of all valid dot-notation paths. Invalid paths are caught at compile time.
- **`ctx.get(path)` is typed** — returns `PathValue<T, P>`, inferred from the path literal.
- **Effects are typed** — `field` in every effect must be a valid `PathsOf<T>`.
- **Rules array is typed** — `Rule<T>[]` ensures all rules are consistent with your form type.

---

## Running tests

```bash
cd lib
pnpm test
```

Coverage:
- Basic rule evaluation (when true/false)
- Deeply nested `ctx.get` (4 levels)
- All 5 effect types
- Collision/override semantics (`setHidden`, `setDisabled`)
- Additive accumulation (warnings, errors, formErrors)
- Priority ordering
- Incremental evaluation (`changedFields`)
- `mergeResults` helper
- `getFieldMeta` helper
- `rulesForFields` helper
- Defensive: rule predicate throws

---

## Adapting to your project

1. Copy `/lib/src/` into your project (or publish as a package).
2. Define your form type and Zod schema.
3. Write your rules in `myFeature.rules.ts`.
4. Create a Zustand store (or any state manager) that calls `evaluate()` on every value change.
5. Wrap your form inputs with a `FormField` component that reads `FieldMeta`.
6. On submit: run Zod `schema.safeParse()` + `evaluate()` — both must pass.

The key anti-duplication rule: **every business rule is declared once**. From that declaration you get both live UI state and submit-time enforcement.
