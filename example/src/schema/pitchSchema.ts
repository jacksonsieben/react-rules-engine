/**
 * Zod schema for the Pitch form.
 *
 * This defines the **static** structural rules (types, required fields,
 * min/max lengths, etc.).  Dynamic business rules (hide/disable/warn/error
 * based on other field values) live in `src/rules/pitchRules.ts`.
 *
 * At submit-time both the Zod schema AND the rule engine are evaluated so
 * nothing slips through.
 *
 * Note: this project uses Zod v4.  The `{ error: '...' }` constructor option
 * is the Zod v4 way to customise type-mismatch messages (replaces v3's
 * `invalid_type_error`).
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

export const founderSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['ceo', 'cto', 'coo', 'other'], {
    error: 'Please select a role',
  }),
  linkedIn: z.string().url('Must be a valid LinkedIn URL').or(z.literal('')),
});
export type Founder = z.infer<typeof founderSchema>;

export const marketSchema = z.object({
  region: z.enum(['north-america', 'europe', 'apac', 'latam', 'mena', 'global']),
  targetSegment: z.string().min(1, 'Target segment is required'),
  estimatedTam: z.number({ error: 'Must be a number' }).nonnegative('Must be ≥ 0'),
});
export type Market = z.infer<typeof marketSchema>;

export const financialsSchema = z.object({
  stage: z.enum(['idea', 'pre-seed', 'seed', 'series-a', 'series-b-plus']),
  monthlyRevenue: z.number({ error: 'Must be a number' }).nonnegative('Must be ≥ 0'),
  burnRate: z.number({ error: 'Must be a number' }).nonnegative('Must be ≥ 0'),
  runway: z.object({
    months: z.number({ error: 'Must be a number' }).int().nonnegative('Must be ≥ 0'),
    hasExtension: z.boolean(),
  }),
});
export type Financials = z.infer<typeof financialsSchema>;

// ---------------------------------------------------------------------------
// Top-level pitch schema
// ---------------------------------------------------------------------------

export const pitchSchema = z.object({
  /** Project name */
  name: z.string().min(1, 'Project name is required').max(80),

  /** One-liner description */
  tagline: z.string().min(1, 'Tagline is required').max(160),

  /** Vertical/industry */
  vertical: z.enum([
    'fintech',
    'healthtech',
    'edtech',
    'saas',
    'marketplace',
    'deep-tech',
    'climate',
    'other',
  ]),

  /** Whether this is a non-profit venture */
  isNonProfit: z.boolean(),

  /** Lead founder */
  founder: founderSchema,

  /** Market information */
  market: marketSchema,

  /** Financial snapshot */
  financials: financialsSchema,
});

export type PitchForm = z.infer<typeof pitchSchema>;

// ---------------------------------------------------------------------------
// Default values
// ---------------------------------------------------------------------------

export const defaultPitchValues: PitchForm = {
  name: '',
  tagline: '',
  vertical: 'saas',
  isNonProfit: false,
  founder: {
    firstName: '',
    lastName: '',
    role: 'ceo',
    linkedIn: '',
  },
  market: {
    region: 'north-america',
    targetSegment: '',
    estimatedTam: 0,
  },
  financials: {
    stage: 'idea',
    monthlyRevenue: 0,
    burnRate: 0,
    runway: {
      months: 0,
      hasExtension: false,
    },
  },
};
