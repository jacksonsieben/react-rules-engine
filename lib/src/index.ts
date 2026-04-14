/**
 * @react-rules-engine/lib
 *
 * A generic, fully type-safe rules engine for complex, nested React forms.
 *
 * ## Quick start
 * ```ts
 * import { evaluate, getFieldMeta } from '@react-rules-engine/lib';
 * import type { Rule } from '@react-rules-engine/lib';
 *
 * type MyForm = {
 *   type: 'individual' | 'company';
 *   billing: { vatNumber: string; country: string };
 * };
 *
 * const rules: Rule<MyForm>[] = [
 *   {
 *     id: 'hide-vat-for-individuals',
 *     dependsOn: ['type'],
 *     when: ctx => ctx.get('type') !== 'company',
 *     then: [{ type: 'setHidden', field: 'billing.vatNumber', value: true }],
 *   },
 * ];
 *
 * const result = evaluate(values, rules);
 * const vatMeta = getFieldMeta(result, 'billing.vatNumber');
 * // vatMeta.hidden === true when type !== 'company'
 * ```
 */

export type {
  PathsOf,
  PathValue,
  FieldMeta,
  Effect,
  EvalContext,
  Rule,
  EvaluationResult,
} from './types.js';

export { defaultFieldMeta } from './types.js';

export {
  evaluate,
  mergeResults,
  getFieldMeta,
  rulesForFields,
} from './engine.js';

export { getPath, setPath } from './utils.js';
