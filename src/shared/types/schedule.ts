export type ScheduleStatus = 'planned' | 'ready' | 'published' | 'overdue' | 'cancelled'

export interface Schedule {
  id: number
  contentId: number | null
  topicId: number | null
  platform: string
  scheduledAt: string
  status: ScheduleStatus
  reminderMinutes: number
  notes: string
  templateId: number | null
  createdAt: string
  updatedAt: string
  contentTitle?: string | null
  topicTitle?: string | null
}

export interface ScheduleCreateInput {
  platform: string
  scheduledAt: string
  contentId?: number | null
  topicId?: number | null
  status?: ScheduleStatus
  reminderMinutes?: number
  notes?: string
}

export interface ScheduleUpdateInput {
  platform?: string
  scheduledAt?: string
  contentId?: number | null
  topicId?: number | null
  status?: ScheduleStatus
  reminderMinutes?: number
  notes?: string
}
