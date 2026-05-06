/**
 * @module engine
 *
 * Core evaluation logic for the react-rules-engine.
 *
 * ### Usage
 * ```ts
 * import { evaluate } from '@react-rules-engine/lib';
 *
 * const result = evaluate(formValues, rules);
 * // result.fields['billing.vatNumber'] => { hidden: true, ... }
 * ```
 */

import {
  Rule,
  Effect,
  EvalContext,
  EvaluationResult,
  FieldMeta,
  PathsOf,
  DialogEvent,
  defaultFieldMeta,
} from './types.js';
import { getPath } from './utils.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Builds the EvalContext passed to every rule's `when` predicate. */
function buildContext<T>(values: T): EvalContext<T> {
  return {
    values,
    get<P extends PathsOf<T>>(path: P) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return getPath(values, path as string) as any;
    },
  };
}

function hasDependencyChange<T>(rule: Rule<T>, prevValues: T, nextValues: T): boolean {
  return rule.dependsOn.some((dep) => {
    const prev = getPath(prevValues, dep as string);
    const next = getPath(nextValues, dep as string);
    return !Object.is(prev, next);
  });
}

/** Retrieves or lazily creates a `FieldMeta` entry in the map. */
function getOrCreate<T>(
  map: Partial<Record<PathsOf<T>, FieldMeta>>,
  field: PathsOf<T>
): FieldMeta {
  if (!map[field]) {
    map[field] = defaultFieldMeta();
  }
  return map[field] as FieldMeta;
}

/** Applies a single `Effect` to the accumulator maps. */
function applyEffect<T>(
  effect: Effect<T>,
  fields: Partial<Record<PathsOf<T>, FieldMeta>>,
  formErrors: string[]
): void {
  switch (effect.type) {
    case 'setHidden': {
      const meta = getOrCreate(fields, effect.field);
      meta.hidden = effect.value;
      break;
    }
    case 'setDisabled': {
      const meta = getOrCreate(fields, effect.field);
      meta.disabled = effect.value;
      break;
    }
    case 'setRequired': {
      const meta = getOrCreate(fields, effect.field);
      meta.required = effect.value;
      break;
    }
    case 'addWarning': {
      const meta = getOrCreate(fields, effect.field);
      meta.warnings.push(effect.message);
      break;
    }
    case 'addError': {
      const meta = getOrCreate(fields, effect.field);
      meta.errors.push(effect.message);
      break;
    }
    case 'addFormError': {
      formErrors.push(effect.message);
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Evaluates all `rules` against the current `values` and returns a
 * normalised `EvaluationResult`.
 *
 * **Evaluation order**
 * Rules are sorted by `priority` (descending) before evaluation, so
 * higher-priority rules run first.  For rules with equal priority the
 * original declaration order is preserved (stable sort).
 *
 * **Collision / override semantics**
 * - `setHidden` / `setDisabled` / `setRequired`: last writer wins (later rule overrides earlier).
 * - `addWarning` / `addError` / `addFormError`: additive — all messages accumulate.
 *
 * **Incremental hints**
 * If you only want to re-evaluate rules that depend on a specific field
 * (e.g. after a single field change), pass a `changedFields` set.  Only
 * rules whose `dependsOn` list intersects that set will run; all other
 * rules from a previous evaluation can be merged in externally.
 *
 * @example
 * ```ts
 * const result = evaluate(values, rules);
 * if (result.fields['billing.vatNumber']?.hidden) { ... }
 * ```
 */
export function evaluate<T>(
  values: T,
  rules: Rule<T>[],
  options?: {
    /**
     * When provided, only rules whose `dependsOn` intersects this set
     * are evaluated.  Useful for incremental/on-change evaluation.
     * Pass `undefined` or omit for a full evaluation (recommended on submit).
     */
    changedFields?: Set<PathsOf<T>>;
  }
): EvaluationResult<T> {
  const fields: Partial<Record<PathsOf<T>, FieldMeta>> = {};
  const formErrors: string[] = [];

  // Sort rules by priority descending, preserving original order for ties
  const sorted = [...rules].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
  );

  const ctx = buildContext(values);
  const changedFields = options?.changedFields;

  for (const rule of sorted) {
    // Incremental filtering: skip rules not affected by the changed fields
    if (
      changedFields !== undefined &&
      !rule.dependsOn.some((dep) => changedFields.has(dep))
    ) {
      continue;
    }

    let conditionMet: boolean;
    try {
      conditionMet = rule.when(ctx);
    } catch (err) {
      // Defensive: if a rule predicate throws, treat it as not-met and warn
      console.error(`[rules-engine] Rule "${rule.id}" threw during evaluation:`, err);
      conditionMet = false;
    }

    if (conditionMet) {
      for (const effect of rule.then) {
        applyEffect(effect, fields, formErrors);
      }
    }
  }

  // Determine overall form validity
  const hasFieldErrors = Object.values(fields).some(
    (meta) => (meta as FieldMeta).errors.length > 0
  );
  const isValid = !hasFieldErrors && formErrors.length === 0;

  return { fields, formErrors, isValid };
}

/**
 * Merges two `EvaluationResult` objects (e.g. incremental + baseline).
 *
 * Merge semantics mirror those of `evaluate`:
 * - `setHidden`/`setDisabled`/`setRequired`: `next` overrides `base`
 * - warnings/errors/formErrors: concatenated (deduplication not applied)
 */
export function mergeResults<T>(
  base: EvaluationResult<T>,
  next: EvaluationResult<T>
): EvaluationResult<T> {
  const fields = { ...base.fields } as Partial<Record<PathsOf<T>, FieldMeta>>;

  for (const [rawKey, nextMetaRaw] of Object.entries(next.fields)) {
    const key = rawKey as PathsOf<T>;
    const nextMeta = nextMetaRaw as FieldMeta;
    const baseMeta = fields[key] ?? defaultFieldMeta();
    fields[key] = {
      hidden: nextMeta.hidden,
      disabled: nextMeta.disabled,
      required: nextMeta.required,
      warnings: [...baseMeta.warnings, ...nextMeta.warnings],
      errors: [...baseMeta.errors, ...nextMeta.errors],
    };
  }

  const formErrors = [...base.formErrors, ...next.formErrors];
  const hasFieldErrors = Object.values(fields).some(
    (m) => (m as FieldMeta).errors.length > 0
  );
  const isValid = !hasFieldErrors && formErrors.length === 0;

  return { fields, formErrors, isValid };
}

/**
 * Returns the `FieldMeta` for a specific field from the result, or the
 * pristine default when that field had no rules targeting it.
 */
export function getFieldMeta<T>(
  result: EvaluationResult<T>,
  field: PathsOf<T>
): FieldMeta {
  return result.fields[field] ?? defaultFieldMeta();
}

/**
 * Filters rules to only those that depend on **any** of the given fields.
 * Useful for building dependency graphs or documentation.
 */
export function rulesForFields<T>(
  rules: Rule<T>[],
  fields: PathsOf<T>[]
): Rule<T>[] {
  const fieldSet = new Set<PathsOf<T>>(fields);
  return rules.filter((r) => r.dependsOn.some((dep) => fieldSet.has(dep)));
}

/**
 * Collects dialog requests for a value transition (`prevValues` -> `nextValues`).
 * Only rules with `dialog` are considered.
 */
export function collectDialogs<T>(
  prevValues: T,
  nextValues: T,
  rules: Rule<T>[],
  options?: { changedFields?: Set<PathsOf<T>> }
): DialogEvent[] {
  const changedFields = options?.changedFields;
  const sorted = [...rules].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
  );
  const dialogs: DialogEvent[] = [];

  for (const rule of sorted) {
    if (!rule.dialog) continue;

    if (
      changedFields !== undefined &&
      !rule.dependsOn.some((dep) => changedFields.has(dep))
    ) {
      continue;
    }

    if (changedFields === undefined && !hasDependencyChange(rule, prevValues, nextValues)) {
      continue;
    }

    let shouldEmit = false;
    try {
      shouldEmit = rule.dialog.condition(prevValues, nextValues);
    } catch (err) {
      console.error(`[rules-engine] Dialog condition for rule "${rule.id}" threw:`, err);
      shouldEmit = false;
    }

    if (shouldEmit) {
      dialogs.push({
        ruleId: rule.id,
        type: rule.dialog.type,
        titleKey: rule.dialog.titleKey,
        messageKey: rule.dialog.messageKey,
      });
    }
  }

  return dialogs;
}
