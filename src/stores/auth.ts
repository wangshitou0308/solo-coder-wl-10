import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, UserRole } from '@/types'
import { dbGetOneByIndex, dbGet, initDefaultUsers } from '@/db'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isLoggedIn = ref(false)

  const role = computed<UserRole>(() => user.value?.role || 'sales')
  const isManager = computed(() => user.value?.role === 'manager')
  const isFinance = computed(() => user.value?.role === 'finance')
  const isSales = computed(() => user.value?.role === 'sales')
  const canViewAll = computed(() => isManager.value || isFinance.value)
  const canManageReceipts = computed(() => isFinance.value || isManager.value)

  async function login(username: string, password: string): Promise<boolean> {
    await initDefaultUsers()
    const u = await dbGetOneByIndex<User>('users', 'username', username)
    if (u && u.password === password) {
      user.value = u
      isLoggedIn.value = true
      localStorage.setItem('currentUser', JSON.stringify(u))
      return true
    }
    return false
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
        if (dbUser) {
          user.value = dbUser
          isLoggedIn.value = true
          return
        }
      } catch {}
    }
    logout()
  }

  return { user, isLoggedIn, role, isManager, isFinance, isSales, canViewAll, canManageReceipts, login, logout, checkAuth }
})
