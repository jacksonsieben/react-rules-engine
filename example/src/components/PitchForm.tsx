/**
 * PitchForm.tsx
 *
 * Demo form with 8+ deeply-nested fields showing the rules engine in action.
 *
 * Features demonstrated:
 * ─────────────────────
 * • On-change rule evaluation via Zustand store
 * • Fields hidden (R-01, R-02), disabled (R-03, R-04)
 * • Warnings (R-03, R-04, R-05, R-07)
 * • Errors (R-04, R-06, R-08)
 * • Form-level errors (R-04)
 * • Zod validation on submit
 * • Submit-time guard (engine + Zod both run)
 *
 * Try these combinations to see rules fire:
 * ──────────────────────────────────────────
 * 1. Stage = "idea" → Revenue & Burn hidden
 * 2. Runway > 0 → "Has Extension?" appears; Runway < 3 + no extension → error
 * 3. Region = "global" → TAM disabled + warning
 * 4. Is Non-Profit + Stage = "Series B+" → stage error
 * 5. Vertical = "deep-tech" + TAM < $10M → TAM error
 * 6. Vertical = "climate" + Region = "MENA" → grant warning
 * 7. Burn > Revenue → burn-rate warning
 */

import React from 'react';
import { usePitchStore } from '../store/pitchStore';
import { FormField, inputStyle, selectStyle } from './FormField';

export function PitchForm() {
  const values = usePitchStore((s) => s.values);
  const setValue = usePitchStore((s) => s.setValue);
  const submit = usePitchStore((s) => s.submit);
  const reset = usePitchStore((s) => s.reset);
  const formErrors = usePitchStore((s) => s.result.formErrors);
  const isSubmitted = usePitchStore((s) => s.isSubmitted);

  // ── Handler helpers ─────────────────────────────────────────────────────

  const str =
    (path: Parameters<typeof setValue>[0]) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValue(path, e.target.value);

  const num =
    (path: Parameters<typeof setValue>[0]) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setValue(path, parseFloat(e.target.value) || 0);

  const bool =
    (path: Parameters<typeof setValue>[0]) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setValue(path, e.target.checked);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit((vals) => {
      console.log('✅ Form submitted successfully:', vals);
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 680, margin: '2rem auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>🚀 Pitch Form Demo</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '0.9rem' }}>
        Demonstrates the <strong>react-rules-engine</strong> with Zustand + Zod.
        Rules fire on every keystroke — try different combinations!
      </p>

      {/* ── Success Banner ── */}
      {isSubmitted && (
        <div
          style={{
            background: '#d1fae5',
            border: '1px solid #6ee7b7',
            borderRadius: 8,
            padding: '0.75rem 1rem',
            color: '#065f46',
            marginBottom: '1.5rem',
          }}
        >
          ✅ Form submitted successfully! Check the browser console for values.
        </div>
      )}

      <form onSubmit={onSubmit}>
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  SECTION 1: Project basics                                     */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section style={sectionStyle}>
          <h2 style={sectionHeading}>Project</h2>

          <FormField path="name" label="Project Name">
            {({ disabled }) => (
              <input
                style={inputStyle}
                value={values.name}
                onChange={str('name')}
                disabled={disabled}
                placeholder="e.g. AcmeCorp"
              />
            )}
          </FormField>

          <FormField path="tagline" label="Tagline" hint="One sentence, max 160 characters.">
            {({ disabled }) => (
              <input
                style={inputStyle}
                value={values.tagline}
                onChange={str('tagline')}
                disabled={disabled}
                placeholder="e.g. The easiest way to launch a business."
              />
            )}
          </FormField>

          <FormField path="vertical" label="Vertical">
            {({ disabled }) => (
              <select
                style={selectStyle}
                value={values.vertical}
                onChange={str('vertical')}
                disabled={disabled}
              >
                <option value="fintech">Fintech</option>
                <option value="healthtech">Healthtech</option>
                <option value="edtech">Edtech</option>
                <option value="saas">SaaS</option>
                <option value="marketplace">Marketplace</option>
                <option value="deep-tech">Deep Tech</option>
                <option value="climate">Climate</option>
                <option value="other">Other</option>
              </select>
            )}
          </FormField>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <input
              type="checkbox"
              id="isNonProfit"
              checked={values.isNonProfit}
              onChange={bool('isNonProfit')}
              style={{ width: 18, height: 18, cursor: 'pointer' }}
            />
            <label htmlFor="isNonProfit" style={{ fontWeight: 500, cursor: 'pointer' }}>
              This is a non-profit venture
            </label>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  SECTION 2: Founder                                            */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section style={sectionStyle}>
          <h2 style={sectionHeading}>Lead Founder</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <FormField path="founder.firstName" label="First Name">
              {({ disabled }) => (
                <input
                  style={inputStyle}
                  value={values.founder.firstName}
                  onChange={str('founder.firstName')}
                  disabled={disabled}
                  placeholder="Alice"
                />
              )}
            </FormField>

            <FormField path="founder.lastName" label="Last Name">
              {({ disabled }) => (
                <input
                  style={inputStyle}
                  value={values.founder.lastName}
                  onChange={str('founder.lastName')}
                  disabled={disabled}
                  placeholder="Smith"
                />
              )}
            </FormField>
          </div>

          <FormField path="founder.role" label="Role">
            {({ disabled }) => (
              <select
                style={selectStyle}
                value={values.founder.role}
                onChange={str('founder.role')}
                disabled={disabled}
              >
                <option value="ceo">CEO</option>
                <option value="cto">CTO</option>
                <option value="coo">COO</option>
                <option value="other">Other</option>
              </select>
            )}
          </FormField>

          {/* R-04: LinkedIn disabled for non-profits */}
          <FormField
            path="founder.linkedIn"
            label="LinkedIn URL"
            hint="Optional for non-profits (rule R-04)"
          >
            {({ disabled }) => (
              <input
                style={inputStyle}
                value={values.founder.linkedIn}
                onChange={str('founder.linkedIn')}
                disabled={disabled}
                placeholder="https://linkedin.com/in/alice"
              />
            )}
          </FormField>
        </section>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  SECTION 3: Market                                             */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section style={sectionStyle}>
          <h2 style={sectionHeading}>Market</h2>

          {/* R-07: climate + MENA → grant warning */}
          <FormField path="market.region" label="Region" hint="Try 'Global' or 'MENA + Climate'">
            {({ disabled }) => (
              <select
                style={selectStyle}
                value={values.market.region}
                onChange={str('market.region')}
                disabled={disabled}
              >
                <option value="north-america">North America</option>
                <option value="europe">Europe</option>
                <option value="apac">APAC</option>
                <option value="latam">LatAm</option>
                <option value="mena">MENA</option>
                <option value="global">Global</option>
              </select>
            )}
          </FormField>

          <FormField path="market.targetSegment" label="Target Segment">
            {({ disabled }) => (
              <input
                style={inputStyle}
                value={values.market.targetSegment}
                onChange={str('market.targetSegment')}
                disabled={disabled}
                placeholder="e.g. SMB finance teams"
              />
            )}
          </FormField>

          {/* R-03: TAM disabled for global; R-06: deep-tech needs $10M+ */}
          <FormField
            path="market.estimatedTam"
            label="Estimated TAM (USD)"
            hint="Disabled for 'Global' (R-03) · Deep-tech requires ≥ $10 M (R-06)"
          >
            {({ disabled }) => (
              <input
                style={inputStyle}
                type="number"
                value={values.market.estimatedTam}
                onChange={num('market.estimatedTam')}
                disabled={disabled}
                min={0}
              />
            )}
          </FormField>
        </section>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  SECTION 4: Financials (3-4 nesting levels)                   */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section style={sectionStyle}>
          <h2 style={sectionHeading}>Financials</h2>

          {/* R-01: revenue + burn hidden at idea stage */}
          <FormField
            path="financials.stage"
            label="Funding Stage"
            hint="'Idea' hides Revenue & Burn (R-01). Non-profit + Series B+ → error (R-04)."
          >
            {({ disabled }) => (
              <select
                style={selectStyle}
                value={values.financials.stage}
                onChange={str('financials.stage')}
                disabled={disabled}
              >
                <option value="idea">Idea</option>
                <option value="pre-seed">Pre-Seed</option>
                <option value="seed">Seed</option>
                <option value="series-a">Series A</option>
                <option value="series-b-plus">Series B+</option>
              </select>
            )}
          </FormField>

          {/* R-01: hidden when stage === 'idea' */}
          <FormField
            path="financials.monthlyRevenue"
            label="Monthly Revenue (USD)"
            hint="Hidden at idea stage (R-01)"
          >
            {({ disabled }) => (
              <input
                style={inputStyle}
                type="number"
                value={values.financials.monthlyRevenue}
                onChange={num('financials.monthlyRevenue')}
                disabled={disabled}
                min={0}
              />
            )}
          </FormField>

          {/* R-01: hidden when stage === 'idea'; R-05: warns when burn > revenue */}
          <FormField
            path="financials.burnRate"
            label="Monthly Burn Rate (USD)"
            hint="Hidden at idea stage (R-01) · Warns if > Revenue (R-05)"
          >
            {({ disabled }) => (
              <input
                style={inputStyle}
                type="number"
                value={values.financials.burnRate}
                onChange={num('financials.burnRate')}
                disabled={disabled}
                min={0}
              />
            )}
          </FormField>

          {/* Level 3 nesting: financials.runway.months */}
          {/* R-08: < 3 months without extension → error */}
          <FormField
            path="financials.runway.months"
            label="Runway (months)"
            hint="< 3 months without extension → error (R-08) · > 0 reveals extension toggle (R-02)"
          >
            {({ disabled }) => (
              <input
                style={inputStyle}
                type="number"
                value={values.financials.runway.months}
                onChange={num('financials.runway.months')}
                disabled={disabled}
                min={0}
              />
            )}
          </FormField>

          {/* Level 4 nesting: financials.runway.hasExtension — R-02: hidden when months === 0 */}
          <FormField
            path="financials.runway.hasExtension"
            label="Has Runway Extension?"
            hint="Hidden when runway is 0 months (R-02)"
          >
            {({ disabled }) => (
              <div style={{ padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="hasExtension"
                  checked={values.financials.runway.hasExtension}
                  onChange={bool('financials.runway.hasExtension')}
                  disabled={disabled}
                  style={{ width: 16, height: 16 }}
                />
                <label htmlFor="hasExtension" style={{ fontSize: '0.9rem', cursor: disabled ? 'not-allowed' : 'pointer' }}>
                  Yes, we have a runway extension in place
                </label>
              </div>
            )}
          </FormField>
        </section>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  Form-level errors                                             */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {formErrors.length > 0 && (
          <div
            style={{
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: 8,
              padding: '0.75rem 1rem',
              marginBottom: '1.5rem',
            }}
          >
            <strong style={{ color: '#991b1b', fontSize: '0.875rem' }}>
              Form-level errors:
            </strong>
            <ul style={{ margin: '0.5rem 0 0', padding: '0 0 0 1.25rem' }}>
              {formErrors.map((e, i) => (
                <li key={i} style={{ color: '#991b1b', fontSize: '0.875rem' }}>
                  {e}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  Actions                                                        */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="submit"
            style={{
              padding: '0.6rem 1.5rem',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            Submit Pitch
          </button>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: '0.6rem 1.25rem',
              background: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontWeight: 500,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>
      </form>

      {/* ── Debug Panel ── */}
      <DebugPanel />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Debug panel — shows live engine state
// ---------------------------------------------------------------------------

function DebugPanel() {
  const result = usePitchStore((s) => s.result);
  const values = usePitchStore((s) => s.values);
  const [open, setOpen] = React.useState(false);

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      style={{
        marginTop: '2rem',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: '0.75rem 1rem',
        background: '#f9fafb',
      }}
    >
      <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
        🔍 Live Engine State {open ? '▲' : '▼'}
      </summary>
      {open && (
        <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#6b7280' }}>
              RULE EVALUATION RESULT
            </h4>
            <pre style={{ fontSize: '0.7rem', overflow: 'auto', maxHeight: 300 }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#6b7280' }}>
              FORM VALUES
            </h4>
            <pre style={{ fontSize: '0.7rem', overflow: 'auto', maxHeight: 300 }}>
              {JSON.stringify(values, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </details>
  );
}

// ---------------------------------------------------------------------------
// Shared section styles
// ---------------------------------------------------------------------------

const sectionStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  padding: '1.25rem 1.5rem',
  marginBottom: '1.5rem',
};

const sectionHeading: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 700,
  color: '#111827',
  margin: '0 0 1rem',
  paddingBottom: '0.5rem',
  borderBottom: '1px solid #f3f4f6',
};
