import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Receipt, ReceiptStatus } from '@/types'
import { dbGetAll, dbAdd, dbPut, dbDelete, dbGetByIndex, dbCountByIndex, generateId } from '@/db'
import { generateReceiptNumber } from '@/utils/receipt'
import dayjs from 'dayjs'

export const useReceiptStore = defineStore('receipt', () => {
  const receipts = ref<Receipt[]>([])
  const loading = ref(false)

  const getReceiptById = computed(() => (id: string) => receipts.value.find(r => r.id === id))
  const getReceiptsByRoom = computed(() => (rid: string) => receipts.value.filter(r => r.roomId === rid))
  const getReceiptsByProject = computed(() => (pid: string) => receipts.value.filter(r => r.projectId === pid))
  const getActiveReceiptsByRoom = computed(() => (rid: string) => receipts.value.filter(r => r.roomId === rid && r.status === 'active'))
  const getActiveReceipts = computed(() => receipts.value.filter(r => r.status === 'active'))

  async function loadReceipts() {
    loading.value = true
    try {
      receipts.value = await dbGetAll<Receipt>('receipts')
    } finally {
      loading.value = false
    }
  }

  async function loadReceiptsByProject(pid: string) {
    receipts.value = await dbGetByIndex<Receipt>('receipts', 'projectId', pid)
  }

  async function loadReceiptsByRoom(rid: string) {
    receipts.value = await dbGetByIndex<Receipt>('receipts', 'roomId', rid)
  }

  async function addReceipt(data: Omit<Receipt, 'id' | 'createdAt' | 'updatedAt'>): Promise<Receipt> {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const r: Receipt = { ...data, id: generateId(), createdAt: now, updatedAt: now }
    await dbAdd('receipts', r)
    receipts.value.push(r)
    return r
  }

  async function updateReceipt(id: string, data: Partial<Receipt>) {
    const r = receipts.value.find(x => x.id === id)
    if (!r) return
    const updated = { ...r, ...data, updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss') }
    await dbPut('receipts', updated)
    Object.assign(r, updated)
  }

  async function voidReceipt(id: string) {
    await updateReceipt(id, { status: 'voided' as ReceiptStatus })
  }

  async function genReceiptNumber(abbreviation: string, date: string): Promise<string> {
    return generateReceiptNumber(abbreviation, date)
  }

  return {
    receipts, loading,
    getReceiptById, getReceiptsByRoom, getReceiptsByProject, getActiveReceiptsByRoom, getActiveReceipts,
    loadReceipts, loadReceiptsByProject, loadReceiptsByRoom,
    addReceipt, updateReceipt, voidReceipt, genReceiptNumber
  }
})
