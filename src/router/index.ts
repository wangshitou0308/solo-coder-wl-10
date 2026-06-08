import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue')
    },
    {
      path: '/',
      component: () => import('@/components/AppLayout.vue'),
      redirect: '/dashboard',
      children: [
        { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/Dashboard.vue'), meta: { title: '数据看板' } },
        { path: 'projects', name: 'ProjectList', component: () => import('@/views/ProjectList.vue'), meta: { title: '楼盘管理' } },
        { path: 'projects/:id', name: 'ProjectDetail', component: () => import('@/views/ProjectDetail.vue'), meta: { title: '楼盘详情' } },
        { path: 'customers', name: 'CustomerList', component: () => import('@/views/CustomerList.vue'), meta: { title: '客户管理' } },
        { path: 'customers/:id', name: 'CustomerDetail', component: () => import('@/views/CustomerDetail.vue'), meta: { title: '客户详情' } },
        { path: 'receipts', name: 'ReceiptList', component: () => import('@/views/ReceiptList.vue'), meta: { title: '收据管理' } },
        { path: 'receipts/new', name: 'ReceiptNew', component: () => import('@/views/ReceiptForm.vue'), meta: { title: '开具收据', requireFinance: true } },
        { path: 'receipts/:id', name: 'ReceiptEdit', component: () => import('@/views/ReceiptForm.vue'), meta: { title: '编辑收据', requireFinance: true } },
        { path: 'receipts/print/:id', name: 'ReceiptPrint', component: () => import('@/views/ReceiptPrint.vue'), meta: { title: '打印收据' } },
        { path: 'ledger/:roomId', name: 'LedgerDetail', component: () => import('@/views/LedgerDetail.vue'), meta: { title: '收款台账' } },
        { path: 'reports', name: 'ReportDaily', component: () => import('@/views/ReportDaily.vue'), meta: { title: '销售报表' } },
        { path: 'reminders', name: 'ReminderList', component: () => import('@/views/ReminderList.vue'), meta: { title: '催款提醒' } },
        { path: 'logs', name: 'LogList', component: () => import('@/views/LogList.vue'), meta: { title: '操作日志', requireManagerOrFinance: true } }
      ]
    }
  ]
})

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()
  if (!authStore.isLoggedIn) {
    await authStore.checkAuth()
  }
  if (to.path !== '/login' && !authStore.isLoggedIn) {
    next('/login')
    return
  }
  if (to.path === '/login' && authStore.isLoggedIn) {
    next('/dashboard')
    return
  }
  if (to.meta.requireFinance && !authStore.canManageReceipts) {
    next('/receipts')
    return
  }
  if (to.meta.requireManagerOrFinance && !authStore.canViewAll) {
    next('/dashboard')
    return
  }
  next()
})

export default router
