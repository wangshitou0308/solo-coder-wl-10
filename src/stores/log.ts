import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { OperationLog, UserRole } from '@/types'
import { dbGetAll, dbAdd, dbGetByIndex, generateId } from '@/db'
import dayjs from 'dayjs'

export const useLogStore = defineStore('log', () => {
  const logs = ref<OperationLog[]>([])
  const loading = ref(false)

  const getLogsByUser = computed(() => (uid: string) => logs.value.filter(l => l.userId === uid))
  const getRecentLogs = computed(() => logs.value.slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 50))

  async function loadLogs() {
    loading.value = true
    try {
      logs.value = await dbGetAll<OperationLog>('operationLogs')
    } finally {
      loading.value = false
    }
  }

  async function addLog(data: Omit<OperationLog, 'id' | 'timestamp'>) {
    const l: OperationLog = {
      ...data,
      id: generateId(),
      timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss')
    }
    await dbAdd('operationLogs', l)
    logs.value.push(l)
  }

  async function loadLogsByDateRange(start: string, end: string) {
    const all = await dbGetAll<OperationLog>('operationLogs')
    logs.value = all.filter(l => l.timestamp >= start && l.timestamp <= end + ' 23:59:59')
  }

  return { logs, loading, getLogsByUser, getRecentLogs, loadLogs, addLog, loadLogsByDateRange }
})
