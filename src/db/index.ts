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
    const defaultUsers: User[] = [
      { id: 'u1', username: 'manager', password: '123456', realName: '张经理', role: 'manager' },
      { id: 'u2', username: 'finance', password: '123456', realName: '李财务', role: 'finance' },
      { id: 'u3', username: 'sales1', password: '123456', realName: '王销售', role: 'sales' }
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

export { generateId }
