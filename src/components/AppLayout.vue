<template>
  <el-container class="app-layout">
    <el-aside :width="isCollapse ? '64px' : '220px'" class="app-sidebar">
      <div class="logo-area">
        <el-icon :size="24" color="#409eff"><OfficeBuilding /></el-icon>
        <span v-show="!isCollapse" class="logo-text">房地产销售管理</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        background-color="#1a2332"
        text-color="#b8c7d8"
        active-text-color="#409eff"
        router
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <template #title>数据看板</template>
        </el-menu-item>
        <el-menu-item index="/projects">
          <el-icon><OfficeBuilding /></el-icon>
          <template #title>楼盘管理</template>
        </el-menu-item>
        <el-menu-item index="/customers">
          <el-icon><User /></el-icon>
          <template #title>客户管理</template>
        </el-menu-item>
        <el-menu-item index="/receipts">
          <el-icon><Tickets /></el-icon>
          <template #title>收据管理</template>
        </el-menu-item>
        <el-menu-item index="/reports">
          <el-icon><TrendCharts /></el-icon>
          <template #title>销售报表</template>
        </el-menu-item>
        <el-menu-item index="/reminders">
          <el-icon><Bell /></el-icon>
          <template #title>催款提醒</template>
        </el-menu-item>
        <el-menu-item v-if="authStore.canViewAll" index="/logs">
          <el-icon><Document /></el-icon>
          <template #title>操作日志</template>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="app-header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="isCollapse = !isCollapse">
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item>{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown>
            <span class="user-info">
              <el-icon><UserFilled /></el-icon>
              {{ authStore.user?.realName }}
              <el-tag size="small" :type="roleTagType" style="margin-left: 6px">{{ roleLabel }}</el-tag>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleExportAll">
                  <el-icon><Download /></el-icon>导出全部数据
                </el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
    <el-dialog v-model="reminderDialogVisible" title="催款提醒" width="500px" :close-on-click-modal="false">
      <div v-if="overduePlans.length > 0">
        <p style="margin-bottom: 12px; color: #e6a23c">以下客户有即将到期或已逾期的待收款项：</p>
        <el-table :data="overduePlans" size="small" max-height="300">
          <el-table-column prop="customerName" label="客户" width="80" />
          <el-table-column prop="planName" label="款项" width="80" />
          <el-table-column prop="amount" label="金额" width="100">
            <template #default="{ row }">{{ row.amount.toLocaleString() }}</template>
          </el-table-column>
          <el-table-column prop="dueDate" label="截止日期" width="110" />
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.isOverdue ? 'danger' : 'warning'" size="small">
                {{ row.isOverdue ? '已逾期' : '即将到期' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div v-else>
        <el-empty description="暂无催款提醒" :image-size="60" />
      </div>
      <template #footer>
        <el-button @click="reminderDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="goToReminders">查看催款清单</el-button>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProjectStore } from '@/stores/project'
import { useCustomerStore } from '@/stores/customer'
import { useReceiptStore } from '@/stores/receipt'
import { useLogStore } from '@/stores/log'
import { UserRoleMap } from '@/types'
import { exportAllData } from '@/utils/export'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'

const authStore = useAuthStore()
const projectStore = useProjectStore()
const customerStore = useCustomerStore()
const receiptStore = useReceiptStore()
const logStore = useLogStore()
const route = useRoute()
const router = useRouter()

const isCollapse = ref(false)
const reminderDialogVisible = ref(false)

const activeMenu = computed(() => {
  const path = route.path
  if (path.startsWith('/projects')) return '/projects'
  if (path.startsWith('/customers')) return '/customers'
  if (path.startsWith('/receipts')) return '/receipts'
  if (path.startsWith('/ledger')) return '/receipts'
  return path
})

const currentTitle = computed(() => (route.meta.title as string) || '数据看板')

const roleLabel = computed(() => authStore.user ? UserRoleMap[authStore.user.role] : '')
const roleTagType = computed(() => {
  if (authStore.isManager) return 'danger'
  if (authStore.isFinance) return 'warning'
  return 'info'
})

const overduePlans = ref<any[]>([])

function checkReminders() {
  const now = dayjs()
  const warnBefore = 7
  const plans = customerStore.paymentPlans.filter(p => !p.paid)
  const result: any[] = []
  for (const plan of plans) {
    const dueDate = dayjs(plan.dueDate)
    const diff = dueDate.diff(now, 'day')
    if (diff <= warnBefore) {
      const customer = customerStore.getCustomerById(plan.customerId)
      result.push({
        customerName: customer?.name || '未知',
        planName: plan.name,
        amount: plan.amount,
        dueDate: plan.dueDate,
        isOverdue: diff < 0
      })
    }
  }
  overduePlans.value = result
  if (result.length > 0) {
    reminderDialogVisible.value = true
  }
}

function goToReminders() {
  reminderDialogVisible.value = false
  router.push('/reminders')
}

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

function handleExportAll() {
  exportAllData(projectStore.projects, projectStore.rooms, customerStore.customers, receiptStore.receipts)
  ElMessage.success('数据已导出')
}

onMounted(async () => {
  await Promise.all([
    projectStore.loadProjects(),
    customerStore.loadCustomers(),
    receiptStore.loadReceipts(),
    logStore.loadLogs()
  ])
  checkReminders()
})
</script>

<style scoped>
.app-layout {
  height: 100vh;
}
.app-sidebar {
  background: #1a2332;
  transition: width 0.3s;
  overflow: hidden;
}
.logo-area {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.logo-text {
  color: #e0e8f0;
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
}
.app-header {
  background: #fff;
  border-bottom: 1px solid #e8eaec;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 60px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: #666;
}
.collapse-btn:hover {
  color: #409eff;
}
.header-right {
  display: flex;
  align-items: center;
}
.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #333;
  font-size: 14px;
}
.app-main {
  background: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}
.el-menu {
  border-right: none;
}
</style>
