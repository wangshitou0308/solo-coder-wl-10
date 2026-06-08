<template>
  <div class="receipt-form">
    <el-page-header @back="router.push('/receipts')">
      <template #content><span style="font-size: 16px; font-weight: 600">{{ isEdit ? '编辑收据' : '开具收据' }}</span></template>
    </el-page-header>
    <el-card shadow="never" style="margin-top: 16px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" size="large">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="楼盘" prop="projectId">
              <el-select v-model="form.projectId" style="width: 100%" @change="onProjectChange" :disabled="isEdit">
                <el-option v-for="p in projectStore.projects" :key="p.id" :label="p.name" :value="p.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="房源" prop="roomId">
              <el-select v-model="form.roomId" style="width: 100%" filterable :disabled="isEdit" @change="onRoomChange">
                <el-option v-for="r in projectRooms" :key="r.id" :label="`${r.buildingName}-${r.unitName}-${r.roomNumber}`" :value="r.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="客户" prop="customerId">
              <el-select v-model="form.customerId" style="width: 100%" :disabled="isEdit" @change="onCustomerChange">
                <el-option v-for="c in roomCustomers" :key="c.id" :label="c.name" :value="c.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="关联付款项">
              <el-select v-model="form.paymentPlanId" style="width: 100%" clearable placeholder="选择对应的付款计划项" :disabled="isEdit">
                <el-option v-for="p in customerPlans" :key="p.id" :label="`${p.name}（¥${p.amount.toLocaleString()}）`" :value="p.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="付款单位">
              <el-input v-model="form.paymentUnit" placeholder="自动带入客户姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="收款事由" prop="paymentReason">
              <el-input v-model="form.paymentReason" placeholder="如：XX栋XX房定金" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="收款类型" prop="paymentType">
              <el-select v-model="form.paymentType" style="width: 100%">
                <el-option v-for="(v, k) in PaymentTypeMap" :key="k" :label="v" :value="k" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="收款方式" prop="paymentMethod">
              <el-select v-model="form.paymentMethod" style="width: 100%">
                <el-option v-for="(v, k) in PaymentMethodMap" :key="k" :label="v" :value="k" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="收款金额" prop="amount">
              <el-input-number v-model="form.amount" :min="0" :precision="2" style="width: 100%" @change="onAmountChange" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="金额大写">
              <el-input v-model="form.amountInWords" readonly />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="收款日期" prop="paymentDate">
              <el-date-picker v-model="form.paymentDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="开票人"><el-input v-model="form.issuer" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="收据编号">
              <el-input v-model="form.receiptNumber" :disabled="isEdit" placeholder="自动生成" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <div style="text-align: center; margin-top: 20px">
        <el-button @click="router.push('/receipts')">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
        <el-button v-if="isEdit" type="success" @click="handleSaveAndPrint">保存并打印</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useReceiptStore } from '@/stores/receipt'
import { useProjectStore } from '@/stores/project'
import { useCustomerStore } from '@/stores/customer'
import { useAuthStore } from '@/stores/auth'
import { useLogStore } from '@/stores/log'
import type { PaymentType, PaymentMethod } from '@/types'
import { PaymentTypeMap, PaymentMethodMap } from '@/types'
import { amountToChinese } from '@/utils/number'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const receiptStore = useReceiptStore()
const projectStore = useProjectStore()
const customerStore = useCustomerStore()
const authStore = useAuthStore()
const logStore = useLogStore()

const receiptId = route.params.id as string
const isEdit = computed(() => !!receiptId)
const saving = ref(false)
const formRef = ref()

const form = reactive({
  projectId: '', roomId: '', customerId: '', paymentPlanId: '', paymentUnit: '', paymentReason: '',
  paymentType: 'deposit' as PaymentType, paymentMethod: 'transfer' as PaymentMethod,
  amount: 0, amountInWords: '', paymentDate: '', issuer: '', receiptNumber: ''
})
const rules = {
  projectId: [{ required: true, message: '请选择楼盘', trigger: 'change' }],
  roomId: [{ required: true, message: '请选择房源', trigger: 'change' }],
  customerId: [{ required: true, message: '请选择客户', trigger: 'change' }],
  paymentReason: [{ required: true, message: '请输入收款事由', trigger: 'blur' }],
  paymentType: [{ required: true, message: '请选择收款类型', trigger: 'change' }],
  paymentMethod: [{ required: true, message: '请选择收款方式', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
  paymentDate: [{ required: true, message: '请选择收款日期', trigger: 'change' }]
}

const projectRooms = computed(() => projectStore.getRoomsByProject(form.projectId))
const roomCustomers = computed(() => customerStore.customers.filter(c => c.roomId === form.roomId))
const customerPlans = computed(() => customerStore.getPaymentPlansByCustomer(form.customerId))

function onProjectChange() { form.roomId = ''; form.customerId = ''; form.paymentPlanId = '' }
function onRoomChange() { form.customerId = ''; form.paymentPlanId = '' }

function onCustomerChange() {
  form.paymentPlanId = ''
  const c = customerStore.getCustomerById(form.customerId)
  if (c) form.paymentUnit = c.name
}

function onAmountChange() {
  form.amountInWords = amountToChinese(form.amount)
}

async function handleSave() {
  await formRef.value?.validate()
  saving.value = true
  try {
    if (isEdit.value) {
      await receiptStore.updateReceipt(receiptId, {
        paymentUnit: form.paymentUnit, paymentReason: form.paymentReason,
        paymentType: form.paymentType, paymentMethod: form.paymentMethod,
        amount: form.amount, amountInWords: form.amountInWords,
        paymentDate: form.paymentDate, issuer: form.issuer
      })
      await logStore.addLog({
        userId: authStore.user!.id, userName: authStore.user!.realName, userRole: authStore.user!.role,
        action: 'modify_receipt', targetType: 'receipt', targetId: receiptId,
        details: `修改收据 ${form.receiptNumber}`, amountChange: form.amount
      })
      ElMessage.success('收据已更新')
    } else {
      const project = projectStore.getProjectById(form.projectId)
      const receiptNum = await receiptStore.genReceiptNumber(project?.abbreviation || 'XX', form.paymentDate)
      const receipt = await receiptStore.addReceipt({
        receiptNumber: receiptNum, projectId: form.projectId, roomId: form.roomId,
        customerId: form.customerId, paymentPlanId: form.paymentPlanId || undefined,
        paymentUnit: form.paymentUnit, paymentReason: form.paymentReason,
        paymentType: form.paymentType, paymentMethod: form.paymentMethod,
        amount: form.amount, amountInWords: form.amountInWords,
        paymentDate: form.paymentDate, issuer: form.issuer || authStore.user?.realName || '',
        status: 'active'
      })
      if (form.paymentPlanId && form.amount > 0) {
        await customerStore.addPaidAmount(form.paymentPlanId, form.amount)
      }
      await logStore.addLog({
        userId: authStore.user!.id, userName: authStore.user!.realName, userRole: authStore.user!.role,
        action: 'create_receipt', targetType: 'receipt', targetId: receipt.id,
        details: `开具收据 ${receiptNum}`, amountChange: form.amount
      })
      ElMessage.success('收据已开具')
    }
    router.push('/receipts')
  } finally {
    saving.value = false
  }
}

async function handleSaveAndPrint() {
  await handleSave()
  router.push(`/receipts/print/${receiptId}`)
}

onMounted(async () => {
  if (!authStore.canManageReceipts) {
    ElMessage.error('您没有开具/编辑收据的权限')
    router.push('/receipts')
    return
  }
  form.issuer = authStore.user?.realName || ''
  form.paymentDate = new Date().toISOString().slice(0, 10)
  if (isEdit.value) {
    const r = receiptStore.getReceiptById(receiptId)
    if (r) {
      Object.assign(form, {
        projectId: r.projectId, roomId: r.roomId, customerId: r.customerId,
        paymentPlanId: r.paymentPlanId || '',
        paymentUnit: r.paymentUnit, paymentReason: r.paymentReason,
        paymentType: r.paymentType, paymentMethod: r.paymentMethod,
        amount: r.amount, amountInWords: r.amountInWords,
        paymentDate: r.paymentDate, issuer: r.issuer, receiptNumber: r.receiptNumber
      })
    }
  }
})
</script>
