/**
 * Business rules for the Pitch form.
 *
 * Each `Rule<PitchForm>` entry specifies:
 * - `dependsOn`: which fields trigger re-evaluation when changed
 * - `when`:      predicate — true means "condition is met"
 * - `then`:      list of effects to apply (hide, disable, warn, error)
 *
 * Rules are purposely separated from the Zod schema so the same logic
 * drives both the **live UI** (hiding/disabling fields, inline warnings)
 * and the **submit-time guard** (no duplicate superRefine needed).
 */

import type { Rule } from '@react-rules-engine/lib';
import type { PitchForm } from '../schema/pitchSchema';

export const pitchRules: Rule<PitchForm>[] = [
  // -------------------------------------------------------------------------
  // R-01: Revenue & burn are irrelevant at "idea" stage
  // -------------------------------------------------------------------------
  {
    id: 'hide-revenue-at-idea-stage',
    description: 'Revenue and burn rate are hidden when the startup is at the idea stage',
    dependsOn: ['financials.stage'],
    when: (ctx) => ctx.get('financials.stage') === 'idea',
    then: [
      { type: 'setHidden', field: 'financials.monthlyRevenue', value: true },
      { type: 'setHidden', field: 'financials.burnRate', value: true },
    ],
  },

  // -------------------------------------------------------------------------
  // R-02: Runway extension toggle only visible when runway > 0
  // -------------------------------------------------------------------------
  {
    id: 'show-runway-extension-when-runway-positive',
    description: 'Runway extension field is only shown when the startup has >0 months runway',
    dependsOn: ['financials.runway.months'],
    when: (ctx) => ctx.get('financials.runway.months') === 0,
    then: [
      { type: 'setHidden', field: 'financials.runway.hasExtension', value: true },
    ],
  },

  // -------------------------------------------------------------------------
  // R-03: TAM is not editable for "global" region — locked to 0
  // -------------------------------------------------------------------------
  {
    id: 'disable-tam-for-global-region',
    description: 'Global region TAM cannot be manually entered (auto-derived)',
    dependsOn: ['market.region'],
    when: (ctx) => ctx.get('market.region') === 'global',
    then: [
      { type: 'setDisabled', field: 'market.estimatedTam', value: true },
      {
        type: 'addWarning',
        field: 'market.estimatedTam',
        message: 'TAM is auto-calculated for global region and cannot be edited manually.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // R-04: Non-profit restrictions
  //        - Series B+ funding is not valid for non-profits
  //        - LinkedIn field is disabled for non-profits
  // -------------------------------------------------------------------------
  {
    id: 'nonprofit-stage-restriction',
    description: 'Non-profits cannot be at Series B+ stage',
    dependsOn: ['isNonProfit', 'financials.stage'],
    when: (ctx) =>
      ctx.get('isNonProfit') === true && ctx.get('financials.stage') === 'series-b-plus',
    then: [
      {
        type: 'addError',
        field: 'financials.stage',
        message: 'Non-profit ventures cannot be at Series B+ stage.',
      },
      {
        type: 'addFormError',
        message: 'Please correct the funding stage for non-profit ventures.',
      },
    ],
  },

  {
    id: 'nonprofit-linkedin-optional',
    description: 'LinkedIn URL is not required for non-profits',
    dependsOn: ['isNonProfit'],
    when: (ctx) => ctx.get('isNonProfit') === true,
    then: [
      { type: 'setDisabled', field: 'founder.linkedIn', value: true },
      {
        type: 'addWarning',
        field: 'founder.linkedIn',
        message: 'LinkedIn is optional for non-profit founders.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // R-05: Burn rate warning when burn > revenue (not at idea stage)
  // -------------------------------------------------------------------------
  {
    id: 'warn-burn-exceeds-revenue',
    description: 'Warn when burn rate exceeds monthly revenue',
    dependsOn: ['financials.burnRate', 'financials.monthlyRevenue', 'financials.stage'],
    when: (ctx) =>
      ctx.get('financials.stage') !== 'idea' &&
      ctx.get('financials.burnRate') > ctx.get('financials.monthlyRevenue') &&
      ctx.get('financials.monthlyRevenue') > 0,
    then: [
      {
        type: 'addWarning',
        field: 'financials.burnRate',
        message: 'Burn rate exceeds monthly revenue — check your runway.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // R-06: Deep-tech vertical requires additional TAM justification
  // -------------------------------------------------------------------------
  {
    id: 'deep-tech-tam-requirement',
    description: 'Deep-tech pitches must declare a minimum TAM of $10 M',
    dependsOn: ['vertical', 'market.estimatedTam'],
    when: (ctx) =>
      ctx.get('vertical') === 'deep-tech' && ctx.get('market.estimatedTam') < 10_000_000,
    then: [
      {
        type: 'addError',
        field: 'market.estimatedTam',
        message: 'Deep-tech pitches require a minimum TAM of $10 M.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // R-07: Climate vertical + MENA region unlocks a special grant flag note
  // -------------------------------------------------------------------------
  {
    id: 'climate-mena-grant-note',
    description: 'Climate startups in MENA region are eligible for grants',
    dependsOn: ['vertical', 'market.region'],
    when: (ctx) =>
      ctx.get('vertical') === 'climate' && ctx.get('market.region') === 'mena',
    then: [
      {
        type: 'addWarning',
        field: 'market.region',
        message: '🌱 Climate startups in MENA may be eligible for regional green-tech grants.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // R-08: Runway < 3 months is critical — error unless runway extension enabled
  // -------------------------------------------------------------------------
  {
    id: 'critical-runway-without-extension',
    description: 'Runway below 3 months is critical unless a runway extension is in place',
    dependsOn: [
      'financials.runway.months',
      'financials.runway.hasExtension',
      'financials.stage',
    ],
    when: (ctx) =>
      ctx.get('financials.stage') !== 'idea' &&
      ctx.get('financials.runway.months') > 0 &&
      ctx.get('financials.runway.months') < 3 &&
      !ctx.get('financials.runway.hasExtension'),
    then: [
      {
        type: 'addError',
        field: 'financials.runway.months',
        message: 'Runway < 3 months is critical. Enable runway extension or extend runway.',
      },
    ],
  },
];
