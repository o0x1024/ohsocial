export interface ScriptScene {
  sceneNo: number
  visual: string
  dialogue: string
  subtitle: string
  duration: number
  notes: string
}

export interface VideoScript {
  id: number
  contentId: number
  videoType: string
  durationSeconds: number
  scenes: ScriptScene[]
  bgmSuggestion: string
  coverText: string
  publishText: string
  publishTags: string[]
  createdAt: string
  updatedAt: string
}

export interface VideoScriptInput {
  contentId: number
  videoType?: string
  durationSeconds?: number
  scenes?: ScriptScene[]
  bgmSuggestion?: string
  coverText?: string
  publishText?: string
  publishTags?: string[]
}
