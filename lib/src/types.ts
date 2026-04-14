/**
 * @module types
 *
 * Core type definitions for the react-rules-engine.
 *
 * The engine is generic over `T` — your form values type — so every
 * rule, effect, and result is fully typed against the shape of your
 * data, including deeply-nested fields expressed as dot-notation paths.
 */

// ---------------------------------------------------------------------------
// Deep path utilities
// ---------------------------------------------------------------------------

/**
 * Produces a union of all dot-notation paths into `T`.
 *
 * @example
 * ```ts
 * type F = { a: { b: { c: number } }; x: string };
 * type P = PathsOf<F>; // "a" | "a.b" | "a.b.c" | "x"
 * ```
 *
 * Depth is capped at 5 levels via the `Depth` counter to avoid
 * TypeScript's infinite-recursion limit on very large schemas.
 */
export type PathsOf<T, Depth extends number[] = []> = Depth['length'] extends 5
  ? never
  : T extends object
  ? {
      [K in keyof T]-?: K extends string | number
        ?
            | `${K}`
            | (NonNullable<T[K]> extends object
                ? `${K}.${PathsOf<NonNullable<T[K]>, [...Depth, 0]>}`
                : never)
        : never;
    }[keyof T]
  : never;

/**
 * Resolves the value type at a given dot-notation `Path` inside `T`.
 *
 * @example
 * ```ts
 * type V = PathValue<{ a: { b: number } }, 'a.b'>; // number
 * ```
 */
export type PathValue<
  T,
  Path extends string
> = Path extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? PathValue<NonNullable<T[K]>, Rest>
    : never
  : Path extends keyof T
  ? T[Path]
  : never;

// ---------------------------------------------------------------------------
// Field meta
// ---------------------------------------------------------------------------

/**
 * Runtime metadata computed for a single field after evaluating all rules.
 *
 * Consumers use this to:
 * - Hide/show the field (`hidden`)
 * - Enable/disable the input (`disabled`)
 * - Display inline warnings or validation errors
 */
export interface FieldMeta {
  /** When `true` the field should not be rendered. */
  hidden: boolean;
  /** When `true` the input should be disabled/non-interactive. */
  disabled: boolean;
  /** Non-blocking messages the user should be aware of. */
  warnings: string[];
  /** Blocking validation messages (field is invalid). */
  errors: string[];
}

// ---------------------------------------------------------------------------
// Dialogs
// ---------------------------------------------------------------------------

/** Supported built-in dialog types. */
export type DialogType = 'confirm' | 'warning';

/** Rule-level dialog definition for transition checks (prev -> next). */
export interface DialogDefinition<T> {
  type: DialogType;
  titleKey: string;
  messageKey: string;
  condition: (prevValues: T, nextValues: T) => boolean;
}

/** Dialog event returned by `collectDialogs`. */
export interface DialogEvent {
  ruleId: string;
  type: DialogType;
  titleKey: string;
  messageKey: string;
}

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------

/**
 * An `Effect` describes what a rule does when its `when` condition is met.
 * Each effect targets a specific field (identified by a dot-notation path).
 */
export type Effect<T> =
  | { type: 'setHidden'; field: PathsOf<T>; value: boolean }
  | { type: 'setDisabled'; field: PathsOf<T>; value: boolean }
  | { type: 'addWarning'; field: PathsOf<T>; message: string }
  | { type: 'addError'; field: PathsOf<T>; message: string }
  /** Appends a form-level (not field-level) error message. */
  | { type: 'addFormError'; message: string };

// ---------------------------------------------------------------------------
// Evaluation context
// ---------------------------------------------------------------------------

/**
 * Passed to a rule's `when` predicate.  Gives type-safe read access to
 * the current form values and a helper to read deeply-nested fields.
 */
export interface EvalContext<T> {
  /** Complete snapshot of the current form values. */
  values: T;
  /**
   * Type-safe getter for any dot-notation path inside `T`.
   *
   * @example
   * ```ts
   * const country = ctx.get('address.country'); // typed as string
   * ```
   */
  get<P extends PathsOf<T>>(path: P): PathValue<T, P>;
}

// ---------------------------------------------------------------------------
// Rule definition
// ---------------------------------------------------------------------------

/**
 * A `Rule` declares a conditional behaviour for a set of fields.
 *
 * @example
 * ```ts
 * const rule: Rule<MyForm> = {
 *   id: 'hide-vat-when-no-company',
 *   description: 'VAT number is only relevant for companies',
 *   dependsOn: ['type', 'billing.vatNumber'],
 *   when: ctx => ctx.get('type') !== 'company',
 *   then: [{ type: 'setHidden', field: 'billing.vatNumber', value: true }],
 * };
 * ```
 */
export interface Rule<T> {
  /**
   * Unique identifier for the rule.
   * Used in diagnostics and to detect duplicate rule registrations.
   */
  id: string;

  /** Human-readable explanation of the rule's purpose. */
  description?: string;

  /**
   * Paths to fields whose changes should trigger re-evaluation of this rule.
   * The engine uses this list to build an incremental dependency graph.
   */
  dependsOn: PathsOf<T>[];

  /**
   * Predicate evaluated against the current form values.
   * Return `true` to apply the `then` effects; `false` to skip them.
   */
  when: (ctx: EvalContext<T>) => boolean;

  /**
   * Effects applied when `when` returns `true`.
   * Multiple effects may target different fields.
   */
  then: Effect<T>[];

  /**
   * Optional dialog request emitted on transitions (prev -> next) when
   * `collectDialogs` evaluates this rule.
   */
  dialog?: DialogDefinition<T>;

  /**
   * Higher-priority rules run first.  When two rules set `hidden` or
   * `disabled` on the same field, the *last* one to run wins unless you
   * implement custom merge logic.
   * @default 0
   */
  priority?: number;
}

// ---------------------------------------------------------------------------
// Evaluation result
// ---------------------------------------------------------------------------

/**
 * Normalised output returned by `evaluate()`.
 *
 * `fields` is keyed by dot-notation path; every path that had at least
 * one rule target it will have a corresponding entry.  All other fields
 * implicitly have the default clean meta (not hidden, not disabled, no
 * warnings/errors).
 */
export interface EvaluationResult<T> {
  /**
   * Per-field metadata map.
   * Key: dot-notation path (e.g. `"address.billing.vatNumber"`).
   */
  fields: Partial<Record<PathsOf<T>, FieldMeta>>;

  /** Form-level errors that are not attributed to any specific field. */
  formErrors: string[];

  /**
   * Convenience flag — `true` when there are no field errors **and**
   * no form-level errors.  Does **not** account for hidden/disabled
   * state; consumers can add that logic on top.
   */
  isValid: boolean;
}

// ---------------------------------------------------------------------------
// Default meta factory
// ---------------------------------------------------------------------------

/** Returns a pristine `FieldMeta` (nothing hidden/disabled/errored). */
export function defaultFieldMeta(): FieldMeta {
  return { hidden: false, disabled: false, warnings: [], errors: [] };
}
