<template>
  <div class="customer-list">
    <el-card shadow="never">
      <div class="page-header">
        <h3>客户认购管理</h3>
        <el-button type="primary" @click="showAddDialog"><el-icon><Plus /></el-icon>新增客户</el-button>
      </div>
      <div class="filter-area">
        <el-select v-model="filterProject" placeholder="楼盘" clearable style="width: 160px" @change="onFilterChange">
          <el-option v-for="p in projectStore.projects" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
        <el-input v-model="filterKeyword" placeholder="搜索姓名/电话/身份证" clearable style="width: 240px; margin-left: 8px" />
      </div>
      <el-table :data="filteredCustomers" v-loading="customerStore.loading" stripe border style="margin-top: 12px; width: 100%">
        <el-table-column prop="name" label="客户姓名" width="100" />
        <el-table-column prop="idCard" label="身份证号" width="180" />
        <el-table-column prop="phone" label="联系电话" width="130" />
        <el-table-column label="楼盘" width="140">
          <template #default="{ row }">{{ projectStore.getProjectById(row.projectId)?.name }}</template>
        </el-table-column>
        <el-table-column label="房号" width="100">
          <template #default="{ row }">{{ getRoomLabel(row.roomId) }}</template>
        </el-table-column>
        <el-table-column prop="subscriptionDate" label="认购日期" width="110" />
        <el-table-column prop="contractDate" label="签约日期" width="110" />
        <el-table-column prop="salesConsultant" label="销售顾问" width="90" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="goDetail(row.id)">详情</el-button>
            <el-button size="small" link type="primary" @click="showEditDialog(row)">编辑</el-button>
            <el-button size="small" link type="primary" @click="goLedger(row.roomId)">台账</el-button>
            <el-button size="small" link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑客户' : '新增客户'" width="640px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="客户姓名" prop="name"><el-input v-model="form.name" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="身份证号" prop="idCard"><el-input v-model="form.idCard" /></el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="联系电话" prop="phone"><el-input v-model="form.phone" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="通讯地址"><el-input v-model="form.address" /></el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="楼盘" prop="projectId">
              <el-select v-model="form.projectId" style="width: 100%" @change="onProjectChange">
                <el-option v-for="p in projectStore.projects" :key="p.id" :label="p.name" :value="p.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="房号" prop="roomId">
              <el-select v-model="form.roomId" style="width: 100%" filterable>
                <el-option v-for="r in availableRooms" :key="r.id" :label="`${r.buildingName}-${r.unitName}-${r.roomNumber}`" :value="r.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="认购日期" prop="subscriptionDate">
              <el-date-picker v-model="form.subscriptionDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="签约日期">
              <el-date-picker v-model="form.contractDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="销售顾问"><el-input v-model="form.salesConsultant" /></el-form-item>
          </el-col>
        </el-row>
        <el-divider content-position="left">付款节点计划</el-divider>
        <div v-for="(plan, idx) in form.plans" :key="idx" style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center">
          <el-input v-model="plan.name" placeholder="款项名称" style="width: 120px" />
          <el-input-number v-model="plan.amount" :min="0" placeholder="金额" style="width: 140px" />
          <el-date-picker v-model="plan.dueDate" type="date" value-format="YYYY-MM-DD" placeholder="截止日期" style="width: 160px" />
          <el-button type="danger" link @click="form.plans.splice(idx, 1)"><el-icon><Delete /></el-icon></el-button>
        </div>
        <el-button type="primary" link @click="form.plans.push({ name: '', amount: 0, dueDate: '' })"><el-icon><Plus /></el-icon>添加付款节点</el-button>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCustomerStore } from '@/stores/customer'
import { useProjectStore } from '@/stores/project'
import { useAuthStore } from '@/stores/auth'
import { useLogStore } from '@/stores/log'
import type { Customer } from '@/types'
import { ElMessage, ElMessageBox } from 'element-plus'

const customerStore = useCustomerStore()
const projectStore = useProjectStore()
const authStore = useAuthStore()
const logStore = useLogStore()
const router = useRouter()

const filterProject = ref('')
const filterKeyword = ref('')
const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref('')
const saving = ref(false)
const formRef = ref()

const form = reactive({
  name: '', idCard: '', phone: '', address: '', projectId: '', roomId: '',
  subscriptionDate: '', contractDate: '', salesConsultant: '',
  plans: [] as { name: string; amount: number; dueDate: string }[]
})
const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入电话', trigger: 'blur' }],
  projectId: [{ required: true, message: '请选择楼盘', trigger: 'change' }],
  roomId: [{ required: true, message: '请选择房号', trigger: 'change' }],
  subscriptionDate: [{ required: true, message: '请选择认购日期', trigger: 'change' }]
}

const filteredCustomers = computed(() => {
  let list = customerStore.customers
  if (authStore.isSales) list = list.filter(c => c.salesConsultant === authStore.user?.realName)
  if (filterProject.value) list = list.filter(c => c.projectId === filterProject.value)
  if (filterKeyword.value) {
    const kw = filterKeyword.value.toLowerCase()
    list = list.filter(c => c.name.includes(kw) || c.phone.includes(kw) || c.idCard.includes(kw))
  }
  return list
})

const availableRooms = computed(() => {
  if (!form.projectId) return []
  const reservedRoomIds = customerStore.customers
    .filter(c => c.id !== editingId.value)
    .map(c => c.roomId)
  return projectStore.getRoomsByProject(form.projectId)
    .filter(r => (r.status === 'available' && !reservedRoomIds.includes(r.id)) || r.id === form.roomId)
})

function onFilterChange() {}
function onProjectChange() { form.roomId = '' }

function getRoomLabel(rid: string): string {
  const r = projectStore.rooms.find(x => x.id === rid)
  return r ? `${r.buildingName}-${r.unitName}-${r.roomNumber}` : '-'
}

function showAddDialog() {
  isEdit.value = false
  editingId.value = ''
  Object.assign(form, { name: '', idCard: '', phone: '', address: '', projectId: '', roomId: '', subscriptionDate: '', contractDate: '', salesConsultant: authStore.user?.realName || '', plans: [] })
  dialogVisible.value = true
}

function showEditDialog(c: Customer) {
  isEdit.value = true
  editingId.value = c.id
  Object.assign(form, { name: c.name, idCard: c.idCard, phone: c.phone, address: c.address, projectId: c.projectId, roomId: c.roomId, subscriptionDate: c.subscriptionDate, contractDate: c.contractDate, salesConsultant: c.salesConsultant, plans: [] })
  const plans = customerStore.getPaymentPlansByCustomer(c.id)
  form.plans = plans.map(p => ({ name: p.name, amount: p.amount, dueDate: p.dueDate }))
  dialogVisible.value = true
}

async function handleSave() {
  await formRef.value?.validate()
  saving.value = true
  try {
    if (isEdit.value) {
      await customerStore.updateCustomer(editingId.value, {
        name: form.name, idCard: form.idCard, phone: form.phone, address: form.address,
        projectId: form.projectId, roomId: form.roomId, subscriptionDate: form.subscriptionDate,
        contractDate: form.contractDate, salesConsultant: form.salesConsultant
      })
      const oldPlans = customerStore.getPaymentPlansByCustomer(editingId.value)
      for (const p of oldPlans) await customerStore.deletePaymentPlan(p.id)
      for (const p of form.plans) {
        if (p.name && p.amount > 0) await customerStore.addPaymentPlan({ customerId: editingId.value, name: p.name, amount: p.amount, dueDate: p.dueDate, paid: false })
      }
      await logStore.addLog({ userId: authStore.user!.id, userName: authStore.user!.realName, userRole: authStore.user!.role, action: 'modify_customer', targetType: 'customer', targetId: editingId.value, details: `修改客户 ${form.name}` })
    } else {
      const c = await customerStore.addCustomer({
        name: form.name, idCard: form.idCard, phone: form.phone, address: form.address,
        projectId: form.projectId, roomId: form.roomId, subscriptionDate: form.subscriptionDate,
        contractDate: form.contractDate, salesConsultant: form.salesConsultant
      })
      for (const p of form.plans) {
        if (p.name && p.amount > 0) await customerStore.addPaymentPlan({ customerId: c.id, name: p.name, amount: p.amount, dueDate: p.dueDate, paid: false })
      }
      await projectStore.updateRoomStatus(form.roomId, 'reserved')
      await logStore.addLog({ userId: authStore.user!.id, userName: authStore.user!.realName, userRole: authStore.user!.role, action: 'create_customer', targetType: 'customer', targetId: c.id, details: `新增客户 ${form.name}` })
    }
    ElMessage.success('已保存')
    dialogVisible.value = false
  } finally {
    saving.value = false
  }
}

async function handleDelete(c: Customer) {
  await ElMessageBox.confirm(`确定删除客户"${c.name}"？`, '确认', { type: 'warning' })
  await customerStore.deleteCustomer(c.id)
  ElMessage.success('已删除')
}

function goDetail(id: string) { router.push(`/customers/${id}`) }
function goLedger(roomId: string) { router.push(`/ledger/${roomId}`) }
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { font-size: 18px; color: #2c3e50; }
.filter-area { display: flex; align-items: center; margin-bottom: 12px; }
</style>
