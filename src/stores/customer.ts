import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Customer, PaymentPlan } from '@/types'
import { dbGetAll, dbAdd, dbPut, dbDelete, dbGetByIndex, generateId } from '@/db'
import dayjs from 'dayjs'

export const useCustomerStore = defineStore('customer', () => {
  const customers = ref<Customer[]>([])
  const paymentPlans = ref<PaymentPlan[]>([])
  const loading = ref(false)

  const getCustomerById = computed(() => (id: string) => customers.value.find(c => c.id === id))
  const getCustomerByRoom = computed(() => (rid: string) => customers.value.find(c => c.roomId === rid))
  const getCustomersByProject = computed(() => (pid: string) => customers.value.filter(c => c.projectId === pid))
  const getPaymentPlansByCustomer = computed(() => (cid: string) => paymentPlans.value.filter(p => p.customerId === cid))

  async function loadCustomers() {
    loading.value = true
    try {
      customers.value = await dbGetAll<Customer>('customers')
      paymentPlans.value = await dbGetAll<PaymentPlan>('paymentPlans')
    } finally {
      loading.value = false
    }
  }

  async function loadCustomersByProject(pid: string) {
    customers.value = await dbGetByIndex<Customer>('customers', 'projectId', pid)
  }

  async function addCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const c: Customer = { ...data, id: generateId(), createdAt: now, updatedAt: now }
    await dbAdd('customers', c)
    customers.value.push(c)
    return c
  }

  async function updateCustomer(id: string, data: Partial<Customer>) {
    const c = customers.value.find(x => x.id === id)
    if (!c) return
    const updated = { ...c, ...data, updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss') }
    await dbPut('customers', updated)
    Object.assign(c, updated)
  }

  async function deleteCustomer(id: string) {
    await dbDelete('customers', id)
    customers.value = customers.value.filter(c => c.id !== id)
    const plans = paymentPlans.value.filter(p => p.customerId === id)
    for (const p of plans) { await dbDelete('paymentPlans', p.id) }
    paymentPlans.value = paymentPlans.value.filter(p => p.customerId !== id)
  }

  async function addPaymentPlan(data: Omit<PaymentPlan, 'id'>): Promise<PaymentPlan> {
    const p: PaymentPlan = { ...data, id: generateId() }
    await dbAdd('paymentPlans', p)
    paymentPlans.value.push(p)
    return p
  }

  async function updatePaymentPlan(id: string, data: Partial<PaymentPlan>) {
    const p = paymentPlans.value.find(x => x.id === id)
    if (!p) return
    const updated = { ...p, ...data }
    await dbPut('paymentPlans', updated)
    Object.assign(p, updated)
  }

  async function deletePaymentPlan(id: string) {
    await dbDelete('paymentPlans', id)
    paymentPlans.value = paymentPlans.value.filter(p => p.id !== id)
  }

  async function markPlanPaid(id: string) {
    await updatePaymentPlan(id, { paid: true })
  }

  async function loadPaymentPlans(customerId: string) {
    paymentPlans.value = await dbGetByIndex<PaymentPlan>('paymentPlans', 'customerId', customerId)
  }

  return {
    customers, paymentPlans, loading,
    getCustomerById, getCustomerByRoom, getCustomersByProject, getPaymentPlansByCustomer,
    loadCustomers, loadCustomersByProject, addCustomer, updateCustomer, deleteCustomer,
    addPaymentPlan, updatePaymentPlan, deletePaymentPlan, markPlanPaid, loadPaymentPlans
  }
})
