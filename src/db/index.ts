import { openDB, type IDBPDatabase } from 'idb'
import type { Project, Building, Unit, Room, Customer, PaymentPlan, Receipt, User, OperationLog } from '@/types'

const DB_NAME = 'RealEstateDB'
const DB_VERSION = 1

let dbInstance: IDBPDatabase | null = null

export async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('buildings')) {
        const bs = db.createObjectStore('buildings', { keyPath: 'id' })
        bs.createIndex('projectId', 'projectId')
      }
      if (!db.objectStoreNames.contains('units')) {
        const us = db.createObjectStore('units', { keyPath: 'id' })
        us.createIndex('projectId', 'projectId')
        us.createIndex('buildingId', 'buildingId')
      }
      if (!db.objectStoreNames.contains('rooms')) {
        const rs = db.createObjectStore('rooms', { keyPath: 'id' })
        rs.createIndex('projectId', 'projectId')
        rs.createIndex('buildingId', 'buildingId')
        rs.createIndex('unitId', 'unitId')
        rs.createIndex('status', 'status')
      }
      if (!db.objectStoreNames.contains('customers')) {
        const cs = db.createObjectStore('customers', { keyPath: 'id' })
        cs.createIndex('projectId', 'projectId')
        cs.createIndex('roomId', 'roomId')
      }
      if (!db.objectStoreNames.contains('paymentPlans')) {
        const ps = db.createObjectStore('paymentPlans', { keyPath: 'id' })
        ps.createIndex('customerId', 'customerId')
      }
      if (!db.objectStoreNames.contains('receipts')) {
        const rs2 = db.createObjectStore('receipts', { keyPath: 'id' })
        rs2.createIndex('projectId', 'projectId')
        rs2.createIndex('roomId', 'roomId')
        rs2.createIndex('customerId', 'customerId')
        rs2.createIndex('receiptNumber', 'receiptNumber')
        rs2.createIndex('paymentDate', 'paymentDate')
        rs2.createIndex('status', 'status')
      }
      if (!db.objectStoreNames.contains('users')) {
        const us2 = db.createObjectStore('users', { keyPath: 'id' })
        us2.createIndex('username', 'username', { unique: true })
      }
      if (!db.objectStoreNames.contains('operationLogs')) {
        const ls = db.createObjectStore('operationLogs', { keyPath: 'id' })
        ls.createIndex('timestamp', 'timestamp')
        ls.createIndex('userId', 'userId')
      }
    }
  })
  return dbInstance
}

export async function initDefaultUsers() {
  const db = await getDB()
  const count = await db.count('users')
  if (count === 0) {
    const { hashPassword } = await import('@/utils/auth')
    const hashedPw = await hashPassword('123456')
    const defaultUsers: User[] = [
      { id: 'u1', username: 'manager', password: hashedPw, realName: '张经理', role: 'manager', disabled: false },
      { id: 'u2', username: 'finance', password: hashedPw, realName: '李财务', role: 'finance', disabled: false },
      { id: 'u3', username: 'sales1', password: hashedPw, realName: '王销售', role: 'sales', disabled: false }
    ]
    const tx = db.transaction('users', 'readwrite')
    for (const u of defaultUsers) {
      await tx.store.add(u)
    }
    await tx.done
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

export async function dbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await getDB()
  return db.getAll(storeName)
}

export async function dbGet<T>(storeName: string, id: string): Promise<T | undefined> {
  const db = await getDB()
  return db.get(storeName, id)
}

export async function dbAdd<T>(storeName: string, data: T): Promise<T> {
  const db = await getDB()
  const record = { ...data, id: (data as any).id || generateId() }
  await db.add(storeName, record)
  return record
}

export async function dbPut<T>(storeName: string, data: T): Promise<void> {
  const db = await getDB()
  await db.put(storeName, data)
}

export async function dbDelete(storeName: string, id: string): Promise<void> {
  const db = await getDB()
  await db.delete(storeName, id)
}

export async function dbGetByIndex<T>(storeName: string, indexName: string, value: string): Promise<T[]> {
  const db = await getDB()
  return db.getAllFromIndex(storeName, indexName, value)
}

export async function dbGetOneByIndex<T>(storeName: string, indexName: string, value: string): Promise<T | undefined> {
  const db = await getDB()
  return db.getFromIndex(storeName, indexName, value)
}

export async function dbCountByIndex(storeName: string, indexName: string, value: string): Promise<number> {
  const db = await getDB()
  return db.countFromIndex(storeName, indexName, value)
}

export const STORE_NAMES = [
  'projects', 'buildings', 'units', 'rooms', 'customers',
  'paymentPlans', 'receipts', 'users', 'operationLogs'
] as const

export type StoreName = typeof STORE_NAMES[number]

export interface BackupData {
  version: number
  exportedAt: string
  stores: Record<StoreName, any[]>
}

export async function exportAllDataAsJSON(): Promise<BackupData> {
  const db = await getDB()
  const stores: Record<string, any[]> = {}
  for (const name of STORE_NAMES) {
    stores[name] = await db.getAll(name)
  }
  return {
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    stores: stores as Record<StoreName, any[]>
  }
}

export function validateBackupData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (!data || typeof data !== 'object') {
    errors.push('数据格式无效，不是有效的JSON对象')
    return { valid: false, errors }
  }
  if (!data.stores || typeof data.stores !== 'object') {
    errors.push('缺少 stores 字段')
    return { valid: false, errors }
  }
  for (const name of STORE_NAMES) {
    if (!Array.isArray(data.stores[name])) {
      errors.push(`stores.${name} 缺失或不是数组`)
    }
  }
  return { valid: errors.length === 0, errors }
}

export async function importAllDataFromJSON(data: BackupData): Promise<void> {
  const db = await getDB()
  const allStoreNames = [...STORE_NAMES]
  const tx = db.transaction(allStoreNames, 'readwrite')
  try {
    for (const name of STORE_NAMES) {
      await tx.objectStore(name).clear()
    }
    for (const name of STORE_NAMES) {
      const records = data.stores[name] || []
      for (const record of records) {
        await tx.objectStore(name).put(record)
      }
    }
    await tx.done
  } catch (e) {
    try { await tx.abort() } catch {}
    throw e
  }
}

export { generateId }
