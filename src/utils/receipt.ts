import dayjs from 'dayjs'
import { dbGetByIndex, dbCountByIndex } from '@/db'

export async function generateReceiptNumber(abbreviation: string, date: string): Promise<string> {
  const dateStr = dayjs(date).format('YYYYMMDD')
  const prefix = abbreviation + dateStr
  const count = await dbCountByIndex('receipts', 'paymentDate', dayjs(date).format('YYYY-MM-DD'))
  const seq = String(count + 1).padStart(3, '0')
  return prefix + seq
}
