/**
 * Unit tests for the react-rules-engine core engine.
 *
 * Covers:
 * - Basic rule evaluation (when true / false)
 * - Deeply nested field dependencies (3-4 levels)
 * - Effect collision / override logic
 * - Additive effects (warnings, errors accumulate)
 * - Priority ordering
 * - Form-level errors
 * - Incremental evaluation (changedFields)
 * - mergeResults helper
 * - getFieldMeta helper
 * - rulesForFields helper
 * - Defensive: rule predicate throws
 */

import { describe, it, expect, vi } from 'vitest';
import { evaluate, mergeResults, getFieldMeta, rulesForFields } from '../src/engine.js';
import { defaultFieldMeta } from '../src/types.js';
import type { Rule } from '../src/types.js';

// ---------------------------------------------------------------------------
// Test fixtures — deeply nested form shape (4 levels)
// ---------------------------------------------------------------------------

type DeepForm = {
  meta: {
    type: 'individual' | 'company' | 'nonprofit';
    status: 'draft' | 'active' | 'suspended';
  };
  contact: {
    personal: {
      firstName: string;
      lastName: string;
    };
    address: {
      billing: {
        country: string;
        vatNumber: string;
      };
      shipping: {
        country: string;
        sameAsBilling: boolean;
      };
    };
  };
  financials: {
    revenue: number;
    currency: 'USD' | 'EUR' | 'GBP';
    taxExempt: boolean;
  };
};

function makeForm(overrides: Partial<DeepForm> = {}): DeepForm {
  return {
    meta: { type: 'individual', status: 'draft', ...overrides.meta },
    contact: {
      personal: { firstName: 'Alice', lastName: 'Smith', ...overrides.contact?.personal },
      address: {
        billing: { country: 'US', vatNumber: '', ...overrides.contact?.address?.billing },
        shipping: { country: 'US', sameAsBilling: true, ...overrides.contact?.address?.shipping },
      },
    },
    financials: { revenue: 0, currency: 'USD', taxExempt: false, ...overrides.financials },
  };
}

// ---------------------------------------------------------------------------
// 1. Basic rule evaluation
// ---------------------------------------------------------------------------

describe('evaluate – basic', () => {
  it('applies effects when `when` returns true', () => {
    const rules: Rule<DeepForm>[] = [
      {
        id: 'r1',
        dependsOn: ['meta.type'],
        when: (ctx) => ctx.get('meta.type') === 'individual',
        then: [{ type: 'setHidden', field: 'contact.address.billing.vatNumber', value: true }],
      },
    ];
    const result = evaluate(makeForm(), rules);
    expect(result.fields['contact.address.billing.vatNumber']?.hidden).toBe(true);
    expect(result.isValid).toBe(true);
  });

  it('does NOT apply effects when `when` returns false', () => {
    const rules: Rule<DeepForm>[] = [
      {
        id: 'r1',
        dependsOn: ['meta.type'],
        when: (ctx) => ctx.get('meta.type') === 'company',
        then: [{ type: 'setHidden', field: 'contact.address.billing.vatNumber', value: true }],
      },
    ];
    const result = evaluate(makeForm(), rules); // type === 'individual'
    expect(result.fields['contact.address.billing.vatNumber']).toBeUndefined();
  });

  it('returns isValid=true when no errors', () => {
    const result = evaluate(makeForm(), []);
    expect(result.isValid).toBe(true);
    expect(result.formErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Nested dependency access via ctx.get
// ---------------------------------------------------------------------------

describe('evaluate – deeply nested ctx.get', () => {
  it('reads 4-level nested path correctly', () => {
    const captured: unknown[] = [];
    const rules: Rule<DeepForm>[] = [
      {
        id: 'deep',
        dependsOn: ['contact.address.billing.country'],
        when: (ctx) => {
          captured.push(ctx.get('contact.address.billing.country'));
          return false;
        },
        then: [],
      },
    ];
    evaluate(makeForm({ contact: { ...makeForm().contact, address: { billing: { country: 'DE', vatNumber: '' }, shipping: { country: 'US', sameAsBilling: true } } } }), rules);
    expect(captured[0]).toBe('DE');
  });

  it('reads 3-level nested boolean correctly', () => {
    const captured: unknown[] = [];
    const rules: Rule<DeepForm>[] = [
      {
        id: 'r-bool',
        dependsOn: ['contact.address.shipping.sameAsBilling'],
        when: (ctx) => {
          captured.push(ctx.get('contact.address.shipping.sameAsBilling'));
          return false;
        },
        then: [],
      },
    ];
    evaluate(makeForm(), rules);
    expect(captured[0]).toBe(true);
  });

  it('returns undefined for invalid path segments (defensive)', () => {
    const captured: unknown[] = [];
    const rules: Rule<DeepForm>[] = [
      {
        id: 'r-undef',
        dependsOn: ['meta.type'],
        when: (ctx) => {
          // Force an unknown path via cast
          captured.push((ctx as unknown as { get: (p: string) => unknown }).get('does.not.exist'));
          return false;
        },
        then: [],
      },
    ];
    evaluate(makeForm(), rules);
    expect(captured[0]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 3. Effect types
// ---------------------------------------------------------------------------

describe('evaluate – effect types', () => {
  it('setHidden sets hidden to true', () => {
    const rules: Rule<DeepForm>[] = [
      {
        id: 'h',
        dependsOn: ['meta.type'],
        when: () => true,
        then: [{ type: 'setHidden', field: 'financials.taxExempt', value: true }],
      },
    ];
    const result = evaluate(makeForm(), rules);
    expect(result.fields['financials.taxExempt']?.hidden).toBe(true);
  });

  it('setDisabled sets disabled', () => {
    const rules: Rule<DeepForm>[] = [
      {
        id: 'd',
        dependsOn: ['meta.status'],
        when: (ctx) => ctx.get('meta.status') === 'suspended',
        then: [{ type: 'setDisabled', field: 'financials.revenue', value: true }],
      },
    ];
    const form = makeForm({ meta: { type: 'company', status: 'suspended' } });
    const result = evaluate(form, rules);
    expect(result.fields['financials.revenue']?.disabled).toBe(true);
  });

  it('addWarning accumulates warnings', () => {
    const rules: Rule<DeepForm>[] = [
      {
        id: 'w1',
        dependsOn: ['financials.revenue'],
        when: (ctx) => ctx.get('financials.revenue') === 0,
        then: [{ type: 'addWarning', field: 'financials.revenue', message: 'Revenue is zero' }],
      },
      {
        id: 'w2',
        dependsOn: ['financials.revenue'],
        when: (ctx) => ctx.get('financials.revenue') < 100,
        then: [{ type: 'addWarning', field: 'financials.revenue', message: 'Revenue seems low' }],
      },
    ];
    const result = evaluate(makeForm(), rules);
    expect(result.fields['financials.revenue']?.warnings).toContain('Revenue is zero');
    expect(result.fields['financials.revenue']?.warnings).toContain('Revenue seems low');
    expect(result.fields['financials.revenue']?.warnings).toHaveLength(2);
  });

  it('addError marks isValid=false', () => {
    const rules: Rule<DeepForm>[] = [
      {
        id: 'e1',
        dependsOn: ['contact.personal.firstName'],
        when: (ctx) => ctx.get('contact.personal.firstName') === '',
        then: [{ type: 'addError', field: 'contact.personal.firstName', message: 'Required' }],
      },
    ];
    const form = makeForm({ contact: { ...makeForm().contact, personal: { firstName: '', lastName: 'X' } } });
    const result = evaluate(form, rules);
    expect(result.fields['contact.personal.firstName']?.errors).toContain('Required');
    expect(result.isValid).toBe(false);
  });

  it('addFormError adds to formErrors and marks isValid=false', () => {
    const rules: Rule<DeepForm>[] = [
      {
        id: 'fe',
        dependsOn: ['meta.type', 'financials.taxExempt'],
        when: (ctx) =>
          ctx.get('meta.type') === 'individual' && ctx.get('financials.taxExempt') === true,
        then: [{ type: 'addFormError', message: 'Individuals cannot be tax-exempt' }],
      },
    ];
    const form = makeForm({ financials: { revenue: 0, currency: 'USD', taxExempt: true } });
    const result = evaluate(form, rules);
    expect(result.formErrors).toContain('Individuals cannot be tax-exempt');
    expect(result.isValid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Collision / override semantics
// ---------------------------------------------------------------------------

describe('evaluate – collision logic', () => {
  it('last writer wins for setHidden (equal priority)', () => {
    const rules: Rule<DeepForm>[] = [
      {
        id: 'r-hide',
        dependsOn: ['meta.type'],
        when: () => true,
        then: [{ type: 'setHidden', field: 'financials.taxExempt', value: true }],
      },
      {
        id: 'r-show',
        dependsOn: ['meta.type'],
        when: () => true,
        then: [{ type: 'setHidden', field: 'financials.taxExempt', value: false }],
      },
    ];
    const result = evaluate(makeForm(), rules);
    // r-hide runs first (same priority, same declaration order after sort),
    // then r-show overrides — final value is false.
    expect(result.fields['financials.taxExempt']?.hidden).toBe(false);
  });

  it('higher-priority rule runs first so lower-priority can override it', () => {
    // Rule with priority:10 sets hidden=true, rule with priority:0 sets hidden=false.
    // priority:10 runs FIRST so hidden=true is set, then priority:0 overrides with false.
    const rules: Rule<DeepForm>[] = [
      {
        id: 'r-low',
        priority: 0,
        dependsOn: ['meta.type'],
        when: () => true,
        then: [{ type: 'setHidden', field: 'financials.taxExempt', value: false }],
      },
      {
        id: 'r-high',
        priority: 10,
        dependsOn: ['meta.type'],
        when: () => true,
        then: [{ type: 'setHidden', field: 'financials.taxExempt', value: true }],
      },
    ];
    const result = evaluate(makeForm(), rules);
    // High priority (10) runs first → hidden=true
    // Low priority (0) runs after → hidden=false (overrides)
    expect(result.fields['financials.taxExempt']?.hidden).toBe(false);
  });

  it('higher-priority rule wins when lower-priority does not apply', () => {
    const rules: Rule<DeepForm>[] = [
      {
        id: 'r-low',
        priority: 0,
        dependsOn: ['meta.type'],
        when: () => false, // does NOT apply
        then: [{ type: 'setHidden', field: 'financials.taxExempt', value: false }],
      },
      {
        id: 'r-high',
        priority: 10,
        dependsOn: ['meta.type'],
        when: () => true,
        then: [{ type: 'setHidden', field: 'financials.taxExempt', value: true }],
      },
    ];
    const result = evaluate(makeForm(), rules);
    expect(result.fields['financials.taxExempt']?.hidden).toBe(true);
  });

  it('errors from multiple rules accumulate on the same field', () => {
    const rules: Rule<DeepForm>[] = [
      {
        id: 'e1',
        dependsOn: ['financials.revenue'],
        when: () => true,
        then: [{ type: 'addError', field: 'financials.revenue', message: 'Error A' }],
      },
      {
        id: 'e2',
        dependsOn: ['financials.revenue'],
        when: () => true,
        then: [{ type: 'addError', field: 'financials.revenue', message: 'Error B' }],
      },
    ];
    const result = evaluate(makeForm(), rules);
    expect(result.fields['financials.revenue']?.errors).toEqual(['Error A', 'Error B']);
  });
});

// ---------------------------------------------------------------------------
// 5. Incremental evaluation (changedFields option)
// ---------------------------------------------------------------------------

describe('evaluate – changedFields incremental option', () => {
  const rules: Rule<DeepForm>[] = [
    {
      id: 'r-meta',
      dependsOn: ['meta.type'],
      when: (ctx) => ctx.get('meta.type') === 'company',
      then: [{ type: 'setHidden', field: 'contact.address.billing.vatNumber', value: false }],
    },
    {
      id: 'r-financials',
      dependsOn: ['financials.revenue'],
      when: (ctx) => ctx.get('financials.revenue') > 1_000_000,
      then: [{ type: 'addWarning', field: 'financials.revenue', message: 'Very high revenue' }],
    },
  ];

  it('runs only rules that depend on changed fields', () => {
    const form = makeForm({ meta: { type: 'company', status: 'active' } });
    const result = evaluate(form, rules, {
      changedFields: new Set(['meta.type'] as const),
    });
    // r-meta should run (depends on meta.type), r-financials should NOT
    expect(result.fields['contact.address.billing.vatNumber']?.hidden).toBe(false);
    expect(result.fields['financials.revenue']).toBeUndefined();
  });

  it('skips all rules when changedFields does not intersect any dependsOn', () => {
    const form = makeForm({ financials: { revenue: 2_000_000, currency: 'USD', taxExempt: false } });
    const result = evaluate(form, rules, {
      changedFields: new Set(['contact.personal.firstName'] as const),
    });
    expect(Object.keys(result.fields)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 6. mergeResults helper
// ---------------------------------------------------------------------------

describe('mergeResults', () => {
  it('merges two results, next overrides hidden/disabled', () => {
    const base = evaluate(
      makeForm(),
      [
        {
          id: 'b',
          dependsOn: ['meta.type'],
          when: () => true,
          then: [{ type: 'setHidden', field: 'financials.taxExempt', value: true }],
        },
      ]
    );
    const next = evaluate(
      makeForm(),
      [
        {
          id: 'n',
          dependsOn: ['meta.type'],
          when: () => true,
          then: [{ type: 'setHidden', field: 'financials.taxExempt', value: false }],
        },
      ]
    );
    const merged = mergeResults(base, next);
    expect(merged.fields['financials.taxExempt']?.hidden).toBe(false);
  });

  it('concatenates errors from both results', () => {
    const base = evaluate(
      makeForm(),
      [
        {
          id: 'b',
          dependsOn: ['meta.type'],
          when: () => true,
          then: [{ type: 'addError', field: 'financials.revenue', message: 'Err B' }],
        },
      ]
    );
    const next = evaluate(
      makeForm(),
      [
        {
          id: 'n',
          dependsOn: ['meta.type'],
          when: () => true,
          then: [{ type: 'addError', field: 'financials.revenue', message: 'Err N' }],
        },
      ]
    );
    const merged = mergeResults(base, next);
    expect(merged.fields['financials.revenue']?.errors).toEqual(['Err B', 'Err N']);
    expect(merged.isValid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 7. getFieldMeta helper
// ---------------------------------------------------------------------------

describe('getFieldMeta', () => {
  it('returns the FieldMeta for a targeted field', () => {
    const rules: Rule<DeepForm>[] = [
      {
        id: 'g',
        dependsOn: ['meta.type'],
        when: () => true,
        then: [{ type: 'setDisabled', field: 'financials.currency', value: true }],
      },
    ];
    const result = evaluate(makeForm(), rules);
    const meta = getFieldMeta(result, 'financials.currency');
    expect(meta.disabled).toBe(true);
  });

  it('returns default (clean) meta for an untouched field', () => {
    const result = evaluate(makeForm(), []);
    const meta = getFieldMeta(result, 'financials.revenue');
    expect(meta).toEqual(defaultFieldMeta());
  });
});

// ---------------------------------------------------------------------------
// 8. rulesForFields helper
// ---------------------------------------------------------------------------

describe('rulesForFields', () => {
  it('returns only rules that depend on the given fields', () => {
    const rules: Rule<DeepForm>[] = [
      { id: 'a', dependsOn: ['meta.type'], when: () => true, then: [] },
      { id: 'b', dependsOn: ['financials.revenue'], when: () => true, then: [] },
      { id: 'c', dependsOn: ['meta.type', 'financials.currency'], when: () => true, then: [] },
    ];
    const result = rulesForFields(rules, ['meta.type']);
    expect(result.map((r) => r.id)).toEqual(['a', 'c']);
  });
});

// ---------------------------------------------------------------------------
// 9. Defensive: rule predicate throws
// ---------------------------------------------------------------------------

describe('evaluate – defensive rule handling', () => {
  it('skips a rule whose predicate throws and continues evaluation', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const rules: Rule<DeepForm>[] = [
      {
        id: 'bad',
        dependsOn: ['meta.type'],
        when: () => {
          throw new Error('predicate failed');
        },
        then: [{ type: 'addError', field: 'meta.type', message: 'Bad' }],
      },
      {
        id: 'good',
        dependsOn: ['meta.status'],
        when: () => true,
        then: [{ type: 'addWarning', field: 'meta.status', message: 'OK' }],
      },
    ];

    const result = evaluate(makeForm(), rules);
    // The bad rule is skipped — no errors from it
    expect(result.fields['meta.type']).toBeUndefined();
    // The good rule still ran
    expect(result.fields['meta.status']?.warnings).toContain('OK');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('bad'),
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// 10. Multiple effects in a single rule
// ---------------------------------------------------------------------------

describe('evaluate – multiple effects per rule', () => {
  it('applies all effects listed in a single rule', () => {
    const rules: Rule<DeepForm>[] = [
      {
        id: 'multi',
        dependsOn: ['meta.status'],
        when: (ctx) => ctx.get('meta.status') === 'suspended',
        then: [
          { type: 'setDisabled', field: 'financials.revenue', value: true },
          { type: 'setDisabled', field: 'financials.currency', value: true },
          { type: 'addWarning', field: 'financials.revenue', message: 'Account suspended' },
        ],
      },
    ];
    const form = makeForm({ meta: { type: 'company', status: 'suspended' } });
    const result = evaluate(form, rules);
    expect(result.fields['financials.revenue']?.disabled).toBe(true);
    expect(result.fields['financials.currency']?.disabled).toBe(true);
    expect(result.fields['financials.revenue']?.warnings).toContain('Account suspended');
  });
});
