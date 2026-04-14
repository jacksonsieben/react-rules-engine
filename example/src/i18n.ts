import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

void i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  resources: {
    en: {
      translation: {
        'wizard.dialog.exerciseTypeChange.title': 'Change exercise type?',
        'wizard.dialog.exerciseTypeChange.message':
          'Changing to a simple exercise can clear roleplay configuration values. Continue?',
        'wizard.dialog.practiceToggle.title': 'Practice mode enabled',
        'wizard.dialog.practiceToggle.message':
          'Practice mode was enabled and can affect evaluative settings.',
        'wizard.dialog.aiFeedbackOff.title': 'Turn AI feedback off?',
        'wizard.dialog.aiFeedbackOff.message':
          'Turning AI feedback off can hide or invalidate current dimensions.',
        'wizard.warning.roleplayRequiresGrading':
          'Roleplay exercises should use a graded mode.',
        'wizard.validation.gradingRequiredInEvaluative':
          'Evaluative mode requires a graded option.',
        'wizard.validation.languageRequired': 'Language is required.',
        'wizard.validation.titleRequired': 'Title is required.',
        'wizard.validation.descriptionRequired': 'Description is required.',
        'wizard.validation.instructionsRequired': 'Instructions are required.',
        'wizard.validation.guidelineRequired': 'Guidelines are required.',
        'wizard.validation.resourceUrlRequired': 'Resource URL is required.',
        'wizard.validation.evidenceRequired': 'Evidence is required.',
        'wizard.validation.ponderationMin': 'Ponderation must be at least 1.',
        'wizard.validation.ponderationMax': 'Ponderation must be at most 100.',
        'wizard.validation.dimensionNameRequired': 'Dimension name is required.',
        'wizard.validation.dimensionDescriptionRequired':
          'Dimension description is required.',
        'wizard.validation.atLeastOneEvidence': 'At least one evidence is required.',
        'wizard.validation.competenceIdRequired': 'Competence is required.',
        'wizard.validation.weightMin': 'Weight must be at least 1.',
        'wizard.validation.weightMax': 'Weight must be at most 100.',
        'wizard.validation.fileNameRequired': 'File name is required.',
        'wizard.validation.fileRequired': 'File is required.',
        'wizard.validation.imageUrlRequired': 'Image URL is required.',
        'wizard.validation.durationPositive': 'Duration must be greater than zero.',
        'wizard.validation.dueDateFuture': 'Due date must be in the future.',
        'wizard.validation.evaluationDueDateFuture':
          'Evaluation due date must be in the future.',
        'wizard.validation.atLeastOneLanguage': 'At least one language is required.',
        'wizard.validation.atLeastOneSkill': 'At least one skill is required.',
        'pitch.exerciseType.presentation': 'Presentation (simple)',
        'pitch.exerciseType.roleplay.text': 'Roleplay text',
        'pitch.exerciseType.roleplay.audio': 'Roleplay audio',
        'pitch.exerciseType.roleplay.avatar': 'Roleplay avatar',
        'dialog.actions.cancel': 'Cancel',
        'dialog.actions.confirm': 'Confirm',
        'dialog.actions.ok': 'OK',
      },
    },
  },
});

export default i18n;
