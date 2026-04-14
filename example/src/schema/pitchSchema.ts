import { z } from 'zod';

export const GradeTypeV2 = {
  NOT_GRADED: 'NOT_GRADED',
  PERCENTAGE: 'PERCENTAGE',
  NUMERIC_1_TO_5: 'NUMERIC_1_TO_5',
  QUALITATIVE: 'QUALITATIVE',
} as const;
export type GradeTypeV2 = (typeof GradeTypeV2)[keyof typeof GradeTypeV2];

export const RoleplayMode = {
  TEXT: 'text',
  AUDIO: 'audio',
  AVATAR: 'avatar',
} as const;
export type RoleplayMode = (typeof RoleplayMode)[keyof typeof RoleplayMode];

export const ResourceTypeV2 = {
  DOCUMENT: 'DOCUMENT',
  VIDEO: 'VIDEO',
  IMAGE: 'IMAGE',
} as const;

export const EvidenceType = {
  POSITIVE: 'POSITIVE',
  NEGATIVE: 'NEGATIVE',
} as const;

const gradeTypeSchema = z.enum([
  GradeTypeV2.NOT_GRADED,
  GradeTypeV2.PERCENTAGE,
  GradeTypeV2.NUMERIC_1_TO_5,
  GradeTypeV2.QUALITATIVE,
]);
const roleplayModeSchema = z.enum([RoleplayMode.TEXT, RoleplayMode.AUDIO, RoleplayMode.AVATAR]);
const resourceTypeSchema = z.enum([
  ResourceTypeV2.DOCUMENT,
  ResourceTypeV2.VIDEO,
  ResourceTypeV2.IMAGE,
]);
const evidenceTypeSchema = z.enum([EvidenceType.POSITIVE, EvidenceType.NEGATIVE]);

const futureDate = ({ message }: { message: string }) =>
  z
    .string()
    .min(1, message)
    .refine((value) => {
      const date = new Date(value);
      return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
    }, message);

const exerciseTypeSchema = z.object({
  value: roleplayModeSchema.nullable(),
  labelKey: z.string(),
  icon: z.any(),
});

const localizedInfoSchema = z.object({
  id: z.number().int().positive().optional(),
  lang: z.string().min(1, 'wizard.validation.languageRequired'),
  title: z.string().min(1, 'wizard.validation.titleRequired'),
  description: z.string().min(1, 'wizard.validation.descriptionRequired'),
  instructions: z.string().min(1, 'wizard.validation.instructionsRequired'),
  guidelines: z.string().min(1, 'wizard.validation.guidelineRequired'),
  submitMessage: z.string().optional(),
  voiceUUID: z.string().optional(),
});

const pitchResourceSchema = z.object({
  id: z.number().int().positive().optional(),
  lang: z.string().min(1, 'wizard.validation.languageRequired'),
  url: z.string().min(1, 'wizard.validation.resourceUrlRequired'),
  displayValue: z.string().optional(),
  type: resourceTypeSchema,
});

const evidenceSchema = z.object({
  id: z.number().int().positive().optional(),
  type: evidenceTypeSchema,
  content: z.string().min(1, 'wizard.validation.evidenceRequired'),
});

const dimensionSchema = z.object({
  _tempId: z.string().optional(),
  id: z.number().int().positive().optional(),
  ponderation: z
    .number()
    .int()
    .min(1, 'wizard.validation.ponderationMin')
    .max(100, 'wizard.validation.ponderationMax'),
  name: z.string().min(1, 'wizard.validation.dimensionNameRequired'),
  description: z.string().min(1, 'wizard.validation.dimensionDescriptionRequired'),
  evidences: z.array(evidenceSchema).min(1, 'wizard.validation.atLeastOneEvidence'),
});

const skillSchema = z.object({
  id: z.number().int().positive().optional(),
  competenceId: z.number().int().positive('wizard.validation.competenceIdRequired'),
  weight: z
    .number()
    .int()
    .min(1, 'wizard.validation.weightMin')
    .max(100, 'wizard.validation.weightMax'),
  definition: z.string().optional(),
  dimensions: z.array(dimensionSchema).optional(),
});

const knowledgeFileSchema = z.object({
  fileName: z.string().min(1, 'wizard.validation.fileNameRequired'),
  file: z.any(),
});

const configurationPromptsSchema = z.object({
  persona: z.string(),
  base: z.string(),
  evaluation: z.string().optional(),
});

const configurationSchema = z.object({
  roleplayMode: roleplayModeSchema,
  avatarUUID: z.string().optional(),
  prompts: configurationPromptsSchema,
});

export const pitchSchema = z.object({
  imageUrl: z.string().min(1, 'wizard.validation.imageUrlRequired'),
  maxDuration: z.number().int().positive('wizard.validation.durationPositive'),
  grading: gradeTypeSchema,
  dueDate: futureDate({ message: 'wizard.validation.dueDateFuture' }),
  evaluationDueDate: futureDate({
    message: 'wizard.validation.evaluationDueDateFuture',
  }).optional(),
  canUploadFile: z.boolean(),
  canDownload: z.boolean(),
  includeManagersAsInstructors: z.boolean(),
  includeManagersAsViewers: z.boolean(),
  configuration: configurationSchema.optional(),
  localizedInformation: z
    .array(localizedInfoSchema)
    .min(1, 'wizard.validation.atLeastOneLanguage'),
  skills: z.array(skillSchema).min(1, 'wizard.validation.atLeastOneSkill'),
  instructorIds: z.array(z.number().int()).default([]),
  templateIds: z.array(z.number().int()).default([]),
  knowledgeFiles: z.array(knowledgeFileSchema).default([]),
  resources: z.array(pitchResourceSchema).default([]),
  hasAiFeedback: z.boolean(),
  isPractice: z.boolean(),
  exerciseType: exerciseTypeSchema,
  selectedLanguages: z.array(z.string()).min(1, 'wizard.validation.languageRequired'),
});

export type PitchForm = z.infer<typeof pitchSchema>;

type ExerciseOption = {
  value: RoleplayMode | null;
  labelKey: string;
  icon: null;
};

export const ExerciseType = {
  SIMPLE: { value: null, labelKey: 'pitch.exerciseType.presentation', icon: null },
  ROLEPLAY_TEXT: {
    value: RoleplayMode.TEXT,
    labelKey: 'pitch.exerciseType.roleplay.text',
    icon: null,
  },
  ROLEPLAY_AUDIO: {
    value: RoleplayMode.AUDIO,
    labelKey: 'pitch.exerciseType.roleplay.audio',
    icon: null,
  },
  ROLEPLAY_AVATAR: {
    value: RoleplayMode.AVATAR,
    labelKey: 'pitch.exerciseType.roleplay.avatar',
    icon: null,
  },
} as const satisfies Record<string, ExerciseOption>;

export type ExerciseType = (typeof ExerciseType)[keyof typeof ExerciseType];

function tomorrowIsoDate(): string {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

export const defaultPitchValues: PitchForm = {
  imageUrl: 'https://example.com/image.png',
  maxDuration: 15,
  grading: GradeTypeV2.PERCENTAGE,
  dueDate: tomorrowIsoDate(),
  evaluationDueDate: tomorrowIsoDate(),
  canUploadFile: true,
  canDownload: true,
  includeManagersAsInstructors: false,
  includeManagersAsViewers: false,
  configuration: {
    roleplayMode: RoleplayMode.TEXT,
    avatarUUID: '',
    prompts: {
      persona: '',
      base: '',
      evaluation: '',
    },
  },
  localizedInformation: [
    {
      lang: 'en',
      title: '',
      description: '',
      instructions: '',
      guidelines: '',
      submitMessage: '',
      voiceUUID: '',
    },
  ],
  skills: [
    {
      competenceId: 1,
      weight: 100,
      definition: '',
      dimensions: [
        {
          ponderation: 100,
          name: 'Default dimension',
          description: 'Default description',
          evidences: [
            { type: EvidenceType.POSITIVE, content: 'Positive evidence' },
            { type: EvidenceType.NEGATIVE, content: 'Negative evidence' },
          ],
        },
      ],
    },
  ],
  instructorIds: [],
  templateIds: [],
  knowledgeFiles: [],
  resources: [],
  hasAiFeedback: true,
  isPractice: false,
  exerciseType: ExerciseType.SIMPLE,
  selectedLanguages: ['en'],
};
