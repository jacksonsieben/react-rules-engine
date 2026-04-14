/**
 * Zustand store for the Pitch form.
 *
 * Architecture
 * ─────────────
 * 1. `values`  – raw form field values (PitchForm shape)
 * 2. `result`  – EvaluationResult produced by the rules engine (live)
 * 3. `submitErrors` – Zod validation errors surfaced on submit
 *
 * On every `setValue` call the engine is re-evaluated against the new
 * values (full evaluation — swap for incremental if performance matters).
 * The `submit()` action runs both Zod + the engine one final time before
 * allowing the form to proceed.
 */

import { create } from 'zustand';
import { evaluate } from '@react-rules-engine/lib';
import type { EvaluationResult, PathsOf } from '@react-rules-engine/lib';
import { pitchSchema, defaultPitchValues } from '../schema/pitchSchema';
import type { PitchForm } from '../schema/pitchSchema';
import { pitchRules } from '../rules/pitchRules';

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

export interface PitchStore {
  /** Current form field values */
  values: PitchForm;

  /** Latest evaluation result from the rules engine */
  result: EvaluationResult<PitchForm>;

  /**
   * Zod validation errors per field path.
   * Only populated after a submit attempt.
   */
  zodErrors: Partial<Record<string, string[]>>;

  /** True while async submit logic is in-flight */
  isSubmitting: boolean;

  /** Set when the form was successfully submitted */
  isSubmitted: boolean;

  // --- Actions ---

  /**
   * Set a single (possibly nested) field value.
   * Triggers full rule re-evaluation automatically.
   *
   * @param path  Dot-notation path e.g. `"financials.runway.months"`
   * @param value The new value for that field
   */
  setValue<P extends PathsOf<PitchForm>>(path: P, value: unknown): void;

  /**
   * Reset the form to default values.
   */
  reset(): void;

  /**
   * Submit the form.
   * 1. Runs Zod schema parse — collects structural errors.
   * 2. Runs rules engine — collects business-rule errors.
   * 3. If both pass, calls the optional `onSuccess` callback.
   *
   * @returns true when the form is valid and submission proceeds.
   */
  submit(onSuccess?: (values: PitchForm) => void): boolean;

}

// ---------------------------------------------------------------------------
// Helper: deep set a value at a dot-notation path (immutable)
// ---------------------------------------------------------------------------

function deepSet(obj: unknown, path: string, value: unknown): unknown {
  const keys = path.split('.');
  if (keys.length === 1) {
    return { ...(obj as Record<string, unknown>), [path]: value };
  }
  const [head, ...rest] = keys as [string, ...string[]];
  return {
    ...(obj as Record<string, unknown>),
    [head]: deepSet(
      ((obj as Record<string, unknown>)[head]) ?? {},
      rest.join('.'),
      value
    ),
  };
}

// ---------------------------------------------------------------------------
// Helper: flatten Zod error map into Record<dotPath, string[]>
// ---------------------------------------------------------------------------

function flattenZodErrors(
  error: import('zod').ZodError
): Partial<Record<string, string[]>> {
  const out: Partial<Record<string, string[]>> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    if (!out[key]) out[key] = [];
    out[key]!.push(issue.message);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

function runEngine(values: PitchForm): EvaluationResult<PitchForm> {
  return evaluate(values, pitchRules);
}

export const usePitchStore = create<PitchStore>((set, get) => ({
  values: defaultPitchValues,
  result: runEngine(defaultPitchValues),
  zodErrors: {},
  isSubmitting: false,
  isSubmitted: false,

  setValue(path, value) {
    const nextValues = deepSet(get().values, path as string, value) as PitchForm;
    const nextResult = runEngine(nextValues);
    set({ values: nextValues, result: nextResult, isSubmitted: false });
  },

  reset() {
    set({
      values: defaultPitchValues,
      result: runEngine(defaultPitchValues),
      zodErrors: {},
      isSubmitting: false,
      isSubmitted: false,
    });
  },

  submit(onSuccess) {
    const { values } = get();

    // 1. Zod validation
    const zodResult = pitchSchema.safeParse(values);
    const zodErrors = zodResult.success ? {} : flattenZodErrors(zodResult.error);

    // 2. Rules engine (full evaluation for submit)
    const result = runEngine(values);

    set({ result, zodErrors });

    const isValid = zodResult.success && result.isValid;
    if (isValid) {
      set({ isSubmitted: true });
      onSuccess?.(values);
    }

    return isValid;
  },
}));
