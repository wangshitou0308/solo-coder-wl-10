import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, UserRole } from '@/types'
import { dbGetOneByIndex, dbGet, initDefaultUsers, dbPut } from '@/db'
import { verifyPassword, hashPassword } from '@/utils/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isLoggedIn = ref(false)

  const role = computed<UserRole>(() => user.value?.role || 'sales')
  const isManager = computed(() => user.value?.role === 'manager')
  const isFinance = computed(() => user.value?.role === 'finance')
  const isSales = computed(() => user.value?.role === 'sales')
  const canViewAll = computed(() => isManager.value || isFinance.value)
  const canManageReceipts = computed(() => isFinance.value || isManager.value)

  async function login(username: string, password: string): Promise<{ ok: boolean; msg: string }> {
    await initDefaultUsers()
    const u = await dbGetOneByIndex<User>('users', 'username', username)
    if (!u) return { ok: false, msg: '用户名或密码错误' }
    if (u.disabled) return { ok: false, msg: '该账号已被禁用，请联系管理员' }
    const valid = await verifyPassword(password, u.password)
    if (!valid) return { ok: false, msg: '用户名或密码错误' }
    user.value = u
    isLoggedIn.value = true
    localStorage.setItem('currentUser', JSON.stringify(u))
    return { ok: true, msg: '' }
  }

  function logout() {
    user.value = null
    isLoggedIn.value = false
    localStorage.removeItem('currentUser')
  }

  async function checkAuth() {
    const authStr = localStorage.getItem('currentUser')
    if (authStr) {
      try {
        const u = JSON.parse(authStr) as User
        const dbUser = await dbGet<User>('users', u.id)
        if (dbUser && !dbUser.disabled) {
          user.value = dbUser
          isLoggedIn.value = true
          return
        }
      } catch {}
    }
    logout()
  }

  async function changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
    if (!user.value) return false
    const dbUser = await dbGet<User>('users', user.value.id)
    if (!dbUser) return false
    const valid = await verifyPassword(oldPassword, dbUser.password)
    if (!valid) return false
    const hashed = await hashPassword(newPassword)
    const updated = { ...dbUser, password: hashed }
    await dbPut('users', updated)
    user.value = updated
    localStorage.setItem('currentUser', JSON.stringify(updated))
    return true
  }

  return { user, isLoggedIn, role, isManager, isFinance, isSales, canViewAll, canManageReceipts, login, logout, checkAuth, changePassword }
})
