import type { Rule } from '@react-rules-engine/lib';
import {
  GradeTypeV2,
  RoleplayMode,
  type PitchForm,
} from '../schema/pitchSchema';

const P = {
  isSimple: (data: PitchForm) => data.exerciseType.value == null,
  isRoleplay: (data: PitchForm) => data.exerciseType.value != null,
  isRoleplayAudio: (data: PitchForm) => data.exerciseType.value === RoleplayMode.AUDIO,
  isRoleplayAvatar: (data: PitchForm) => data.exerciseType.value === RoleplayMode.AVATAR,
  hasAiFeedback: (data: PitchForm) => data.hasAiFeedback,
  noAiFeedback: (data: PitchForm) => !data.hasAiFeedback,
  isPractice: (data: PitchForm) => data.isPractice,
  isEvaluative: (data: PitchForm) => !data.isPractice,
  isNotGraded: (data: PitchForm) => data.grading === GradeTypeV2.NOT_GRADED,
  isGraded: (data: PitchForm) => data.grading !== GradeTypeV2.NOT_GRADED,
  hasInstructors: (data: PitchForm) => data.instructorIds.length > 0,
  skillsHaveDimensions: (data: PitchForm) =>
    data.skills.some((skill) => (skill.dimensions?.length ?? 0) > 0),
};

export const pitchRules: Rule<PitchForm>[] = [
  {
    id: 'exercise-type-dialog-confirm',
    dependsOn: ['exerciseType'],
    when: () => true,
    then: [],
    dialog: {
      type: 'confirm',
      titleKey: 'wizard.dialog.exerciseTypeChange.title',
      messageKey: 'wizard.dialog.exerciseTypeChange.message',
      condition: (prevData, nextData) => {
        const wasRoleplay = P.isRoleplay(prevData);
        const nowSimple = P.isSimple(nextData);
        const hasVoice = prevData.localizedInformation.some((l) => (l.voiceUUID ?? '').trim() !== '');
        const hasAvatar = (prevData.configuration?.avatarUUID ?? '').trim() !== '';
        const hasRoleplayConfig =
          (prevData.configuration?.prompts.base ?? '').trim() !== '' &&
          (prevData.configuration?.prompts.persona ?? '').trim() !== '';
        return wasRoleplay && nowSimple && (hasVoice || hasAvatar || hasRoleplayConfig);
      },
    },
  },
  {
    id: 'can-upload-disabled-for-roleplay',
    dependsOn: ['exerciseType', 'canUploadFile'],
    when: (ctx) => P.isRoleplay(ctx.values),
    then: [{ type: 'setDisabled', field: 'canUploadFile', value: true }],
  },
  {
    id: 'voice-disabled-in-simple',
    dependsOn: ['exerciseType', 'localizedInformation.0.voiceUUID'],
    when: (ctx) => P.isSimple(ctx.values),
    then: [{ type: 'setDisabled', field: 'localizedInformation.0.voiceUUID', value: true }],
  },
  {
    id: 'definition-hidden-without-ai',
    dependsOn: ['hasAiFeedback', 'skills.0.definition'],
    when: (ctx) => P.noAiFeedback(ctx.values),
    then: [{ type: 'setHidden', field: 'skills.0.definition', value: true }],
  },
  {
    id: 'dimension-fields-hidden-without-ai',
    dependsOn: [
      'hasAiFeedback',
      'skills.0.dimensions.0.name',
      'skills.0.dimensions.0.ponderation',
      'skills.0.dimensions.0.description',
      'skills.0.dimensions.0.evidences.0.content',
      'skills.0.dimensions.0.evidences.1.content',
    ],
    when: (ctx) => P.noAiFeedback(ctx.values),
    then: [
      { type: 'setHidden', field: 'skills.0.dimensions.0.name', value: true },
      { type: 'setHidden', field: 'skills.0.dimensions.0.ponderation', value: true },
      { type: 'setHidden', field: 'skills.0.dimensions.0.description', value: true },
      { type: 'setHidden', field: 'skills.0.dimensions.0.evidences.0.content', value: true },
      { type: 'setHidden', field: 'skills.0.dimensions.0.evidences.1.content', value: true },
    ],
  },
  {
    id: 'practice-toggle-warning',
    dependsOn: ['isPractice', 'instructorIds'],
    when: () => true,
    then: [],
    dialog: {
      type: 'warning',
      titleKey: 'wizard.dialog.practiceToggle.title',
      messageKey: 'wizard.dialog.practiceToggle.message',
      condition: (prevData, nextData) =>
        !prevData.isPractice && nextData.isPractice && P.hasInstructors(prevData),
    },
  },
  {
    id: 'has-ai-feedback-dialog-confirm',
    dependsOn: ['hasAiFeedback', 'skills'],
    when: () => true,
    then: [],
    dialog: {
      type: 'confirm',
      titleKey: 'wizard.dialog.aiFeedbackOff.title',
      messageKey: 'wizard.dialog.aiFeedbackOff.message',
      condition: (prevData, nextData) =>
        prevData.hasAiFeedback && !nextData.hasAiFeedback && P.skillsHaveDimensions(prevData),
    },
  },
  {
    id: 'has-ai-feedback-disabled-in-simple',
    dependsOn: ['exerciseType', 'hasAiFeedback'],
    when: (ctx) => P.isSimple(ctx.values),
    then: [{ type: 'setDisabled', field: 'hasAiFeedback', value: true }],
  },
  {
    id: 'instructors-disabled-when-practice-or-not-graded',
    dependsOn: ['isPractice', 'grading', 'instructorIds'],
    when: (ctx) => P.isPractice(ctx.values) || P.isNotGraded(ctx.values),
    then: [{ type: 'setDisabled', field: 'instructorIds', value: true }],
  },
  {
    id: 'managers-instructors-disabled-when-practice-or-not-graded',
    dependsOn: ['isPractice', 'grading', 'includeManagersAsInstructors'],
    when: (ctx) => P.isPractice(ctx.values) || P.isNotGraded(ctx.values),
    then: [{ type: 'setDisabled', field: 'includeManagersAsInstructors', value: true }],
  },
  {
    id: 'managers-viewers-disabled-when-practice',
    dependsOn: ['isPractice', 'includeManagersAsViewers'],
    when: (ctx) => P.isPractice(ctx.values),
    then: [{ type: 'setDisabled', field: 'includeManagersAsViewers', value: true }],
  },
  {
    id: 'evaluation-due-date-disabled-when-practice-or-not-graded',
    dependsOn: ['isPractice', 'grading', 'evaluationDueDate'],
    when: (ctx) => P.isPractice(ctx.values) || P.isNotGraded(ctx.values),
    then: [{ type: 'setDisabled', field: 'evaluationDueDate', value: true }],
  },
  {
    id: 'evaluation-prompt-disabled-without-ai',
    dependsOn: ['hasAiFeedback', 'configuration.prompts.evaluation'],
    when: (ctx) => P.noAiFeedback(ctx.values),
    then: [{ type: 'setDisabled', field: 'configuration.prompts.evaluation', value: true }],
  },
  {
    id: 'avatar-only-with-avatar-roleplay',
    dependsOn: ['exerciseType', 'configuration.avatarUUID'],
    when: (ctx) => !P.isRoleplayAvatar(ctx.values),
    then: [
      { type: 'setDisabled', field: 'configuration.avatarUUID', value: true },
      { type: 'setHidden', field: 'configuration.avatarUUID', value: true },
    ],
  },
  {
    id: 'prompts-require-roleplay',
    dependsOn: ['exerciseType', 'configuration.prompts.persona', 'configuration.prompts.base'],
    when: (ctx) => P.isSimple(ctx.values),
    then: [
      { type: 'setDisabled', field: 'configuration.prompts.persona', value: true },
      { type: 'setDisabled', field: 'configuration.prompts.base', value: true },
      { type: 'setHidden', field: 'configuration.prompts.persona', value: true },
      { type: 'setHidden', field: 'configuration.prompts.base', value: true },
    ],
  },
  {
    id: 'warning-roleplay-needs-grading',
    dependsOn: ['exerciseType', 'grading'],
    when: (ctx) => P.isRoleplay(ctx.values) && P.isNotGraded(ctx.values),
    then: [
      {
        type: 'addWarning',
        field: 'grading',
        message: 'wizard.warning.roleplayRequiresGrading',
      },
    ],
  },
  {
    id: 'error-evaluative-needs-grade',
    dependsOn: ['isPractice', 'grading'],
    when: (ctx) => P.isEvaluative(ctx.values) && P.isNotGraded(ctx.values),
    then: [
      {
        type: 'addError',
        field: 'grading',
        message: 'wizard.validation.gradingRequiredInEvaluative',
      },
    ],
  },
];
