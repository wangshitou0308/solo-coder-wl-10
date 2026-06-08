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
                  <el-icon><Download /></el-icon>导出Excel报表
                </el-dropdown-item>
                <el-dropdown-item @click="handleExportJSON">
                  <el-icon><Download /></el-icon>导出JSON备份
                </el-dropdown-item>
                <el-dropdown-item @click="handleImportData">
                  <el-icon><Upload /></el-icon>导入数据恢复
                </el-dropdown-item>
                <el-dropdown-item divided @click="handleChangePassword">
                  <el-icon><Key /></el-icon>修改密码
                </el-dropdown-item>
                <el-dropdown-item v-if="authStore.isManager" @click="handleUserManage">
                  <el-icon><UserFilled /></el-icon>用户管理
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

    <el-dialog v-model="changePasswordVisible" title="修改密码" width="420px" :close-on-click-modal="false" destroy-on-close>
      <el-form ref="changePwdFormRef" :model="changePwdForm" :rules="changePwdRules" label-width="90px">
        <el-form-item label="原密码" prop="oldPassword">
          <el-input v-model="changePwdForm.oldPassword" type="password" show-password placeholder="请输入原密码" />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="changePwdForm.newPassword" type="password" show-password placeholder="请输入新密码" />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="changePwdForm.confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="changePasswordVisible = false">取消</el-button>
        <el-button type="primary" :loading="changePwdLoading" @click="handleChangePasswordSubmit">确认修改</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="userManageVisible" title="用户管理" width="800px" :close-on-click-modal="false" destroy-on-close>
      <div style="margin-bottom: 12px">
        <el-button type="primary" @click="showAddUserDialog"><el-icon><Plus /></el-icon>新增用户</el-button>
      </div>
      <el-table :data="allUsers" size="small" border stripe>
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="realName" label="姓名" width="100" />
        <el-table-column label="角色" width="100">
          <template #default="{ row }">{{ UserRoleMap[row.role as UserRole] }}</template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.disabled ? 'danger' : 'success'" size="small">{{ row.disabled ? '已禁用' : '正常' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="toggleUserStatus(row)">{{ row.disabled ? '启用' : '禁用' }}</el-button>
            <el-button size="small" link type="warning" @click="resetUserPassword(row)">重置密码</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="addUserVisible" title="新增用户" width="420px" :close-on-click-modal="false" destroy-on-close>
      <el-form ref="addUserFormRef" :model="addUserForm" :rules="addUserRules" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="addUserForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="姓名" prop="realName">
          <el-input v-model="addUserForm.realName" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="addUserForm.role" style="width: 100%">
            <el-option v-for="(v, k) in UserRoleMap" :key="k" :label="v" :value="k" />
          </el-select>
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="addUserForm.password" type="password" show-password placeholder="请输入密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addUserVisible = false">取消</el-button>
        <el-button type="primary" :loading="addUserLoading" @click="handleAddUserSubmit">确认添加</el-button>
      </template>
    </el-dialog>

    <input ref="fileInputRef" type="file" accept=".json" style="display: none" @change="onFileSelected" />
  </el-container>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProjectStore } from '@/stores/project'
import { useCustomerStore } from '@/stores/customer'
import { useReceiptStore } from '@/stores/receipt'
import { useLogStore } from '@/stores/log'
import type { User, UserRole } from '@/types'
import { UserRoleMap } from '@/types'
import { exportAllData } from '@/utils/export'
import { exportAllDataAsJSON, validateBackupData, importAllDataFromJSON, dbGetAll, dbPut, dbGetOneByIndex, dbAdd } from '@/db'
import { hashPassword } from '@/utils/auth'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'

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
  ElMessage.success('数据已导出为Excel')
}

const fileInputRef = ref<HTMLInputElement | null>(null)

async function handleExportJSON() {
  try {
    const data = await exportAllDataAsJSON()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `房地产数据备份_${dayjs().format('YYYY-MM-DD_HHmmss')}.json`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('JSON备份文件已导出')
  } catch {
    ElMessage.error('导出失败')
  }
}

function handleImportData() {
  ElMessageBox.confirm(
    '导入数据将覆盖当前所有数据，此操作不可撤销！建议先导出当前数据作为备份。确定要继续吗？',
    '⚠️ 数据恢复警告',
    { confirmButtonText: '确定导入', cancelButtonText: '取消', type: 'warning' }
  ).then(() => {
    fileInputRef.value?.click()
  }).catch(() => {})
}

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = ''
  try {
    const text = await file.text()
    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      ElMessage.error('文件内容不是有效的JSON格式')
      return
    }
    const validation = validateBackupData(data)
    if (!validation.valid) {
      ElMessage.error(`数据校验失败：${validation.errors.join('；')}`)
      return
    }
    await ElMessageBox.confirm(
      `文件校验通过，导出时间：${data.exportedAt || '未知'}。确认导入将覆盖当前所有数据，是否继续？`,
      '确认导入',
      { confirmButtonText: '确认导入', cancelButtonText: '取消', type: 'warning' }
    )
    await importAllDataFromJSON(data)
    await Promise.all([
      projectStore.loadProjects(),
      customerStore.loadCustomers(),
      receiptStore.loadReceipts(),
      logStore.loadLogs()
    ])
    await authStore.checkAuth()
    ElMessage.success('数据恢复成功')
  } catch (e: any) {
    if (e !== 'cancel' && e?.message !== 'cancel') {
      ElMessage.error(`导入失败：${e.message || '未知错误'}`)
    }
  }
}

const changePasswordVisible = ref(false)
const changePwdLoading = ref(false)
const changePwdFormRef = ref()
const changePwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

const changePwdRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [{ required: true, message: '请输入新密码', trigger: 'blur' }, { min: 6, message: '密码至少6位', trigger: 'blur' }],
  confirmPassword: [{
    validator: (_rule: any, value: string, callback: any) => {
      if (value !== changePwdForm.newPassword) callback(new Error('两次密码不一致'))
      else callback()
    }, trigger: 'blur'
  }]
}

function handleChangePassword() {
  Object.assign(changePwdForm, { oldPassword: '', newPassword: '', confirmPassword: '' })
  changePasswordVisible.value = true
}

async function handleChangePasswordSubmit() {
  await changePwdFormRef.value?.validate()
  changePwdLoading.value = true
  try {
    const ok = await authStore.changePassword(changePwdForm.oldPassword, changePwdForm.newPassword)
    if (ok) {
      ElMessage.success('密码修改成功，请重新登录')
      changePasswordVisible.value = false
      handleLogout()
    } else {
      ElMessage.error('原密码错误')
    }
  } finally {
    changePwdLoading.value = false
  }
}

const userManageVisible = ref(false)
const allUsers = ref<User[]>([])

async function handleUserManage() {
  allUsers.value = await dbGetAll<User>('users')
  userManageVisible.value = true
}

async function toggleUserStatus(user: User) {
  const action = user.disabled ? '启用' : '禁用'
  await ElMessageBox.confirm(`确定${action}用户"${user.realName}"？`, '确认', { type: 'warning' })
  const updated = { ...user, disabled: !user.disabled }
  await dbPut('users', updated)
  allUsers.value = await dbGetAll<User>('users')
  if (authStore.user?.id === user.id && updated.disabled) {
    ElMessage.warning('您的账号已被禁用')
    handleLogout()
    return
  }
  ElMessage.success(`已${action}`)
}

async function resetUserPassword(user: User) {
  await ElMessageBox.confirm(`确定重置用户"${user.realName}"的密码为123456？`, '确认', { type: 'warning' })
  const hashed = await hashPassword('123456')
  await dbPut('users', { ...user, password: hashed })
  allUsers.value = await dbGetAll<User>('users')
  ElMessage.success('密码已重置为123456')
}

const addUserVisible = ref(false)
const addUserLoading = ref(false)
const addUserFormRef = ref()
const addUserForm = reactive({ username: '', realName: '', role: 'sales' as UserRole, password: '' })
const addUserRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }, { min: 6, message: '密码至少6位', trigger: 'blur' }]
}

function showAddUserDialog() {
  Object.assign(addUserForm, { username: '', realName: '', role: 'sales' as UserRole, password: '' })
  addUserVisible.value = true
}

async function handleAddUserSubmit() {
  await addUserFormRef.value?.validate()
  addUserLoading.value = true
  try {
    const existing = await dbGetOneByIndex<User>('users', 'username', addUserForm.username)
    if (existing) {
      ElMessage.error('用户名已存在')
      return
    }
    const hashed = await hashPassword(addUserForm.password)
    await dbAdd('users', {
      username: addUserForm.username,
      password: hashed,
      realName: addUserForm.realName,
      role: addUserForm.role,
      disabled: false
    })
    allUsers.value = await dbGetAll<User>('users')
    addUserVisible.value = false
    ElMessage.success('用户已添加')
  } finally {
    addUserLoading.value = false
  }
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
