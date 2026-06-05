import { registerAppHandlers } from './app'
import { registerTopicHandlers } from './topic'
import { registerContentHandlers } from './content'
import { registerScheduleHandlers } from './schedule'
import { registerModelHandlers } from './model'
import { registerBackupHandlers } from './backup'
import { registerMaterialHandlers } from './material'
import { registerScriptHandlers } from './script'
import { registerAssistantHandlers } from './assistant'
import { registerExtendedHandlers } from './extended'
import { registerPromptHandlers } from './prompt'
import { registerLogHandlers } from './log'
import { registerWritingStyleHandlers } from './writing-style'
import { registerMediaHandlers } from './media'
import { registerAiProgressHandlers } from './ai-progress-runner'

export function registerIpcHandlers(): void {
  registerAiProgressHandlers()
  registerAppHandlers()
  registerTopicHandlers()
  registerContentHandlers()
  registerScheduleHandlers()
  registerModelHandlers()
  registerBackupHandlers()
  registerMaterialHandlers()
  registerScriptHandlers()
  registerAssistantHandlers()
  registerExtendedHandlers()
  registerPromptHandlers()
  registerLogHandlers()
  registerWritingStyleHandlers()
  registerMediaHandlers()
}
