/**
 * FormField.tsx
 *
 * A generic wrapper component that reads FieldMeta from the Zustand store
 * and renders appropriate UI decorations:
 *
 * - hidden  → field is not rendered at all
 * - disabled → input is non-interactive + styled
 * - warnings → amber badge list below the input
 * - errors   → red badge list below the input (from engine OR Zod)
 *
 * Usage:
 * ```tsx
 * <FormField path="financials.runway.months" label="Runway (months)">
 *   <input type="number" ... />
 * </FormField>
 * ```
 */

import React from 'react';
import { usePitchStore } from '../store/pitchStore';
import type { PathsOf } from '@react-rules-engine/lib';
import type { PitchForm } from '../schema/pitchSchema';

interface FormFieldProps {
  path: PathsOf<PitchForm>;
  label: string;
  children: (props: { disabled: boolean }) => React.ReactNode;
  hint?: string;
}

export function FormField({ path, label, children, hint }: FormFieldProps) {
  const meta = usePitchStore((s) => s.getMeta(path));
  const zodErrors = usePitchStore((s) => s.zodErrors[path as string] ?? []);

  // Hidden fields are not rendered
  if (meta.hidden) return null;

  const allErrors = [...meta.errors, ...zodErrors];
  const hasError = allErrors.length > 0;
  const hasWarning = meta.warnings.length > 0;

  return (
    <div
      style={{
        marginBottom: '1.25rem',
        opacity: meta.disabled ? 0.6 : 1,
      }}
    >
      {/* Label */}
      <label
        style={{
          display: 'block',
          fontWeight: 600,
          fontSize: '0.875rem',
          marginBottom: '0.25rem',
          color: hasError ? '#dc2626' : '#1a1a1a',
        }}
      >
        {label}
        {meta.disabled && (
          <span
            style={{
              marginLeft: '0.5rem',
              fontSize: '0.7rem',
              fontWeight: 400,
              background: '#e5e7eb',
              color: '#6b7280',
              borderRadius: '4px',
              padding: '1px 6px',
            }}
          >
            disabled
          </span>
        )}
      </label>

      {/* Field hint */}
      {hint && (
        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem' }}>
          {hint}
        </p>
      )}

      {/* The actual input (rendered via render-prop) */}
      <div
        style={{
          border: hasError
            ? '1.5px solid #dc2626'
            : hasWarning
            ? '1.5px solid #d97706'
            : '1.5px solid #d1d5db',
          borderRadius: '6px',
          overflow: 'hidden',
        }}
      >
        {children({ disabled: meta.disabled })}
      </div>

      {/* Warnings */}
      {hasWarning && (
        <ul style={{ margin: '0.25rem 0 0', padding: 0, listStyle: 'none' }}>
          {meta.warnings.map((w, i) => (
            <li
              key={i}
              style={{
                fontSize: '0.75rem',
                color: '#92400e',
                background: '#fef3c7',
                border: '1px solid #fde68a',
                borderRadius: '4px',
                padding: '2px 8px',
                marginTop: '3px',
              }}
            >
              ⚠ {w}
            </li>
          ))}
        </ul>
      )}

      {/* Errors (engine + Zod combined) */}
      {hasError && (
        <ul style={{ margin: '0.25rem 0 0', padding: 0, listStyle: 'none' }}>
          {allErrors.map((e, i) => (
            <li
              key={i}
              style={{
                fontSize: '0.75rem',
                color: '#991b1b',
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: '4px',
                padding: '2px 8px',
                marginTop: '3px',
              }}
            >
              ✖ {e}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared input styles for consistency across the form
// ---------------------------------------------------------------------------

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  fontSize: '0.9rem',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  boxSizing: 'border-box',
};

export const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'auto',
};
