import { topicDAO } from '../db/dao/topic-dao'
import { contentDAO } from '../db/dao/content-dao'
import { scheduleDAO } from '../db/dao/schedule-dao'
import { generationLogDAO } from '../db/dao/generation-log-dao'
import { metricsDAO } from '../db/dao/metrics-dao'
import { materialDAO } from '../db/dao/material-dao'

export function getDashboardStats() {
  const topics = topicDAO.list()
  const contents = contentDAO.list()
  const schedules = scheduleDAO.list()
  const topicByStatus = topicDAO.countByStatus()
  const contentByStatus = contents.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1
    return acc
  }, {})
  const aiStats = generationLogDAO.stats()
  const metrics = metricsDAO.summary()
  return {
    topics: { total: topics.length, byStatus: topicByStatus },
    contents: { total: contents.length, byStatus: contentByStatus },
    schedules: {
      total: schedules.length,
      published: schedules.filter(s => s.status === 'published').length,
      overdue: schedules.filter(s => s.status === 'overdue').length
    },
    materials: materialDAO.list().length,
    ai: aiStats,
    metrics
  }
}
