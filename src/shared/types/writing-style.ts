import type { StyleStepRules } from '../style-step-rules'

export type WritingStyleSource = 'manual' | 'ai_analysis' | 'builtin'

export interface WritingStyleDimensions {
  sentenceRhythm?: string
  dialogueStyle?: string
  narrativeDistance?: string
  rhetoricPrefs?: string[]
  pacing?: string
  vocabularyNotes?: string
  taboos?: string[]
}

export interface WritingStyle {
  id: number
  name: string
  description: string
  promptTemplate: string
  referenceText: string
  dimensions: WritingStyleDimensions
  stepRules: StyleStepRules | null
  source: WritingStyleSource
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface WritingStyleCreateInput {
  name: string
  description?: string
  promptTemplate: string
  referenceText?: string
  dimensions?: WritingStyleDimensions
  stepRules?: StyleStepRules | null
  source?: WritingStyleSource
  isDefault?: boolean
}

export interface WritingStyleUpdateInput {
  name?: string
  description?: string
  promptTemplate?: string
  referenceText?: string
  dimensions?: WritingStyleDimensions
  stepRules?: StyleStepRules | null
  isDefault?: boolean
}
