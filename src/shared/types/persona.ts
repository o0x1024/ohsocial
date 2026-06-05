export interface Persona {
  id: number
  domains: string[]
  audience: string
  style: string
  personaDesc: string
  differentiator: string
  updatedAt: string
}

export interface PersonaUpdateInput {
  domains?: string[]
  audience?: string
  style?: string
  personaDesc?: string
  differentiator?: string
}
