export type ProviderProtocol = 'openai' | 'gemini' | 'anthropic'

export interface BuiltinProvider {
  id: string
  name: string
  protocol: ProviderProtocol
  defaultBase: string
  defaultModel: string
}

export const BUILTIN_PROVIDERS: BuiltinProvider[] = [
  { id: 'deepseek', name: 'DeepSeek', protocol: 'openai', defaultBase: 'https://api.deepseek.com/v1', defaultModel: 'deepseek-chat' },
  { id: 'kimi', name: 'Kimi', protocol: 'openai', defaultBase: 'https://api.moonshot.cn/v1', defaultModel: 'moonshot-v1-8k' },
  { id: 'bailian', name: '通义千问', protocol: 'openai', defaultBase: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-plus' },
  { id: 'openai', name: 'OpenAI', protocol: 'openai', defaultBase: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini' }
]

export interface ModelConfig {
  id: number
  provider: string
  name: string
  apiKey: string | null
  baseUrl: string | null
  modelName: string | null
  isDefault: boolean
  params: Record<string, unknown>
  isEnabled: boolean
  createdAt: string
}

export interface ModelConfigInput {
  provider: string
  name: string
  apiKey?: string
  baseUrl?: string
  modelName?: string
  isDefault?: boolean
  isEnabled?: boolean
  params?: Record<string, unknown>
}

export interface ModelChatRequest {
  step: string
  prompt: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
}

export interface ModelChatResponse {
  success: boolean
  content: string
  error?: string
}
