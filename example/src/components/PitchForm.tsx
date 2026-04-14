import React from 'react';
import { useTranslation } from 'react-i18next';
import { FormField, inputStyle, selectStyle } from './FormField';
import { RuleDialog } from './RuleDialog';
import {
  ExerciseType,
  GradeTypeV2,
  type PitchForm as PitchFormValues,
} from '../schema/pitchSchema';
import { usePitchStore } from '../store/pitchStore';

const EXERCISE_OPTIONS = Object.values(ExerciseType);

export function PitchForm() {
  const { t } = useTranslation();
  const values = usePitchStore((s) => s.values);
  const setValue = usePitchStore((s) => s.setValue);
  const submit = usePitchStore((s) => s.submit);
  const reset = usePitchStore((s) => s.reset);
  const formErrors = usePitchStore((s) => s.result.formErrors);
  const isSubmitted = usePitchStore((s) => s.isSubmitted);
  const activeDialog = usePitchStore((s) => s.activeDialog);
  const confirmDialog = usePitchStore((s) => s.confirmDialog);
  const dismissDialog = usePitchStore((s) => s.dismissDialog);

  const str =
    (path: Parameters<typeof setValue>[0]) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValue(path, e.target.value);

  const num =
    (path: Parameters<typeof setValue>[0]) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setValue(path, Number.parseInt(e.target.value || '0', 10) || 0);

  const bool =
    (path: Parameters<typeof setValue>[0]) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setValue(path, e.target.checked);

  const setExerciseType = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = EXERCISE_OPTIONS.find((option) => option.labelKey === e.target.value);
    if (selected) {
      setValue('exerciseType', selected);
      if (selected.value) {
        setValue('configuration.roleplayMode', selected.value);
      }
    }
  };

  const parseInstructorIds = (raw: string) =>
    raw
      .split(',')
      .map((item) => Number.parseInt(item.trim(), 10))
      .filter((item) => Number.isInteger(item) && item > 0);

  const gradingOptions = Object.values(GradeTypeV2).filter((grade) => {
    const shouldRemoveNotGraded = !values.isPractice || values.exerciseType.value != null;
    return shouldRemoveNotGraded ? grade !== GradeTypeV2.NOT_GRADED : true;
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit((vals) => {
      console.log('✅ Submitted:', vals);
    });
  };

  return (
    <div style={{ maxWidth: 760, margin: '2rem auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>🚀 Pitch Wizard Demo</h1>
      <p style={{ marginBottom: '1.25rem', color: '#6b7280' }}>
        Dialog-capable rules engine with confirm/warning flows and i18next messages.
      </p>

      {isSubmitted && (
        <div style={successBanner}>✅ Submitted successfully (see console for payload).</div>
      )}

      <form onSubmit={onSubmit}>
        <section style={sectionStyle}>
          <h2 style={sectionHeading}>General</h2>
          <FormField path="exerciseType" label="Exercise Type">
            {({ disabled }) => (
              <select
                style={selectStyle}
                value={values.exerciseType.labelKey}
                onChange={setExerciseType}
                disabled={disabled}
              >
                {EXERCISE_OPTIONS.map((option) => (
                  <option key={option.labelKey} value={option.labelKey}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
            )}
          </FormField>

          <FormField path="imageUrl" label="Image URL">
            {({ disabled }) => (
              <input
                style={inputStyle}
                value={values.imageUrl}
                onChange={str('imageUrl')}
                disabled={disabled}
              />
            )}
          </FormField>

          <FormField path="maxDuration" label="Max duration (minutes)">
            {({ disabled }) => (
              <input
                type="number"
                min={1}
                style={inputStyle}
                value={values.maxDuration}
                onChange={num('maxDuration')}
                disabled={disabled}
              />
            )}
          </FormField>

          <FormField path="dueDate" label="Due date">
            {({ disabled }) => (
              <input
                type="date"
                style={inputStyle}
                value={values.dueDate}
                onChange={str('dueDate')}
                disabled={disabled}
              />
            )}
          </FormField>

          <FormField path="canUploadFile" label="Can upload file">
            {({ disabled }) => (
              <Checkbox checked={values.canUploadFile} onChange={bool('canUploadFile')} disabled={disabled} />
            )}
          </FormField>
          <FormField path="canDownload" label="Can download">
            {({ disabled }) => (
              <Checkbox checked={values.canDownload} onChange={bool('canDownload')} disabled={disabled} />
            )}
          </FormField>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeading}>Evaluation</h2>
          <FormField path="isPractice" label="Practice mode">
            {({ disabled }) => (
              <Checkbox checked={values.isPractice} onChange={bool('isPractice')} disabled={disabled} />
            )}
          </FormField>
          <FormField path="hasAiFeedback" label="AI feedback">
            {({ disabled }) => (
              <Checkbox
                checked={values.hasAiFeedback}
                onChange={bool('hasAiFeedback')}
                disabled={disabled}
              />
            )}
          </FormField>
          <FormField path="grading" label="Grading">
            {({ disabled }) => (
              <select
                style={selectStyle}
                value={values.grading}
                onChange={str('grading')}
                disabled={disabled}
              >
                {gradingOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
          </FormField>
          <FormField path="instructorIds" label="Instructor IDs (comma-separated)">
            {({ disabled }) => (
              <input
                style={inputStyle}
                value={values.instructorIds.join(',')}
                onChange={(e) => setValue('instructorIds', parseInstructorIds(e.target.value))}
                disabled={disabled}
              />
            )}
          </FormField>
          <FormField path="evaluationDueDate" label="Evaluation due date">
            {({ disabled }) => (
              <input
                type="date"
                style={inputStyle}
                value={values.evaluationDueDate ?? ''}
                onChange={(e) => setValue('evaluationDueDate', e.target.value || undefined)}
                disabled={disabled}
              />
            )}
          </FormField>
          <FormField path="configuration.prompts.evaluation" label="Evaluation prompt">
            {({ disabled }) => (
              <textarea
                style={{ ...inputStyle, minHeight: 82, resize: 'vertical' }}
                value={values.configuration?.prompts.evaluation ?? ''}
                onChange={str('configuration.prompts.evaluation')}
                disabled={disabled}
              />
            )}
          </FormField>
          <FormField path="includeManagersAsInstructors" label="Include managers as instructors">
            {({ disabled }) => (
              <Checkbox
                checked={values.includeManagersAsInstructors}
                onChange={bool('includeManagersAsInstructors')}
                disabled={disabled}
              />
            )}
          </FormField>
          <FormField path="includeManagersAsViewers" label="Include managers as viewers">
            {({ disabled }) => (
              <Checkbox
                checked={values.includeManagersAsViewers}
                onChange={bool('includeManagersAsViewers')}
                disabled={disabled}
              />
            )}
          </FormField>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeading}>Roleplay config</h2>
          <FormField path="localizedInformation.0.voiceUUID" label="Voice UUID (first language)">
            {({ disabled }) => (
              <input
                style={inputStyle}
                value={values.localizedInformation[0]?.voiceUUID ?? ''}
                onChange={str('localizedInformation.0.voiceUUID')}
                disabled={disabled}
              />
            )}
          </FormField>
          <FormField path="configuration.avatarUUID" label="Avatar UUID">
            {({ disabled }) => (
              <input
                style={inputStyle}
                value={values.configuration?.avatarUUID ?? ''}
                onChange={str('configuration.avatarUUID')}
                disabled={disabled}
              />
            )}
          </FormField>
          <FormField path="configuration.prompts.persona" label="Persona prompt">
            {({ disabled }) => (
              <textarea
                style={{ ...inputStyle, minHeight: 82, resize: 'vertical' }}
                value={values.configuration?.prompts.persona ?? ''}
                onChange={str('configuration.prompts.persona')}
                disabled={disabled}
              />
            )}
          </FormField>
          <FormField path="configuration.prompts.base" label="Base prompt">
            {({ disabled }) => (
              <textarea
                style={{ ...inputStyle, minHeight: 82, resize: 'vertical' }}
                value={values.configuration?.prompts.base ?? ''}
                onChange={str('configuration.prompts.base')}
                disabled={disabled}
              />
            )}
          </FormField>
        </section>

        {formErrors.length > 0 && (
          <div style={errorBanner}>
            <strong>Form-level errors</strong>
            <ul style={{ marginTop: '0.5rem' }}>
              {formErrors.map((error: string, i: number) => (
                <li key={i}>{t(error, { defaultValue: error })}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="submit" style={primaryButton}>
            Submit
          </button>
          <button type="button" onClick={reset} style={secondaryButton}>
            Reset
          </button>
        </div>
      </form>

      <RuleDialog dialog={activeDialog} onConfirm={confirmDialog} onDismiss={dismissDialog} />

      <DebugPanel />
    </div>
  );
}

function Checkbox({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div style={{ padding: '0.55rem 0.75rem' }}>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function DebugPanel() {
  const values = usePitchStore((s) => s.values);
  const result = usePitchStore((s) => s.result);
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
          <pre style={{ fontSize: '0.7rem', overflow: 'auto', maxHeight: 360 }}>
            {JSON.stringify(result, null, 2)}
          </pre>
          <pre style={{ fontSize: '0.7rem', overflow: 'auto', maxHeight: 360 }}>
            {JSON.stringify(values, null, 2)}
          </pre>
        </div>
      )}
    </details>
  );
}

const successBanner: React.CSSProperties = {
  background: '#d1fae5',
  border: '1px solid #6ee7b7',
  borderRadius: 8,
  padding: '0.75rem 1rem',
  color: '#065f46',
  marginBottom: '1.5rem',
};

const errorBanner: React.CSSProperties = {
  background: '#fee2e2',
  border: '1px solid #fca5a5',
  borderRadius: 8,
  padding: '0.75rem 1rem',
  marginBottom: '1.5rem',
};

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

const primaryButton: React.CSSProperties = {
  padding: '0.6rem 1.5rem',
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontWeight: 600,
  fontSize: '0.9rem',
  cursor: 'pointer',
};

const secondaryButton: React.CSSProperties = {
  ...primaryButton,
  background: '#f3f4f6',
  color: '#374151',
  border: '1px solid #d1d5db',
};

export type PitchForm = PitchFormValues;
