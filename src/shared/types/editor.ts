export interface EditorComment {
  id: string
  text: string
  quote: string
  createdAt: string
}

export interface EditorAiRewritePayload {
  text: string
  instruction: string
}
