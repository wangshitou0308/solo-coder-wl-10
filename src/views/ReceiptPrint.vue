<template>
  <div class="receipt-print-page">
    <div class="no-print" style="margin-bottom: 16px; display: flex; gap: 12px">
      <el-button @click="router.back()">返回</el-button>
      <el-button type="primary" @click="handlePrint">打印收据</el-button>
    </div>
    <div ref="printAreaRef" class="print-area receipt-paper">
      <div class="receipt-title">收 据</div>
      <div class="receipt-meta">
        <span>收据编号：{{ receipt?.receiptNumber }}</span>
        <span>收款日期：{{ receipt?.paymentDate }}</span>
      </div>
      <table class="receipt-table">
        <tr>
          <td class="label">付款单位</td>
          <td class="value">{{ receipt?.paymentUnit }}</td>
          <td class="label">收款事由</td>
          <td class="value">{{ receipt?.paymentReason }}</td>
        </tr>
        <tr>
          <td class="label">收款类型</td>
          <td class="value">{{ receipt ? PaymentTypeMap[receipt.paymentType] : '' }}</td>
          <td class="label">收款方式</td>
          <td class="value">{{ receipt ? PaymentMethodMap[receipt.paymentMethod] : '' }}</td>
        </tr>
        <tr>
          <td class="label">金额（小写）</td>
          <td class="value amount">¥ {{ receipt?.amount.toLocaleString() }}</td>
          <td class="label">金额（大写）</td>
          <td class="value">{{ receipt?.amountInWords }}</td>
        </tr>
        <tr>
          <td class="label">开票人</td>
          <td class="value">{{ receipt?.issuer }}</td>
          <td class="label">状态</td>
          <td class="value">{{ receipt?.status === 'active' ? '有效' : '已作废' }}</td>
        </tr>
        <tr v-if="receipt?.status === 'voided'">
          <td class="label">作废原因</td>
          <td class="value" colspan="3" style="color: #c00">{{ receipt?.voidReason }}</td>
        </tr>
        <tr v-if="receipt?.status === 'voided'">
          <td class="label">作废人</td>
          <td class="value">{{ receipt?.voidedBy }}</td>
          <td class="label">作废时间</td>
          <td class="value">{{ receipt?.voidedAt }}</td>
        </tr>
      </table>
      <div class="receipt-footer">
        <div class="stamp-area">收款单位盖章</div>
        <div class="sign-area">收款人签字：____________</div>
      </div>
      <div class="receipt-note">本收据一式两联，此为第一联（客户联）</div>
      <div class="receipt-meta" style="margin-top: 8px; font-size: 11px; color: #bbb">
        <span>打印次数：{{ receipt?.printCount || 0 }}</span>
        <span v-if="receipt?.paymentPlanId">关联付款计划</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useReceiptStore } from '@/stores/receipt'
import type { PaymentType, PaymentMethod } from '@/types'
import { PaymentTypeMap, PaymentMethodMap } from '@/types'

const route = useRoute()
const router = useRouter()
const receiptStore = useReceiptStore()
const printAreaRef = ref<HTMLElement>()
const receiptId = route.params.id as string
const receipt = computed(() => receiptStore.getReceiptById(receiptId))

function handlePrint() {
  if (receipt.value) {
    receiptStore.incrementPrintCount(receipt.value.id)
  }
  window.print()
}

onMounted(() => {
  if (!receipt.value) router.push('/receipts')
})
</script>

<style scoped>
.receipt-paper {
  width: 210mm;
  min-height: 148mm;
  margin: 0 auto;
  padding: 20mm 15mm;
  background: #fff;
  border: 2px solid #333;
  font-size: 14px;
  color: #333;
}
.receipt-title {
  text-align: center;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 12px;
  margin-bottom: 16px;
  color: #2c3e50;
}
.receipt-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  font-size: 13px;
  color: #666;
}
.receipt-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 24px;
}
.receipt-table td {
  border: 1px solid #999;
  padding: 10px 12px;
  font-size: 14px;
}
.receipt-table .label {
  background: #f5f5f5;
  width: 100px;
  font-weight: 600;
  text-align: center;
}
.receipt-table .value {
  min-width: 120px;
}
.receipt-table .amount {
  font-size: 18px;
  font-weight: 700;
  color: #c00;
}
.receipt-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 24px;
}
.stamp-area {
  width: 140px;
  height: 80px;
  border: 1px dashed #999;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 12px;
}
.sign-area {
  display: flex;
  align-items: flex-end;
  font-size: 14px;
}
.receipt-note {
  margin-top: 20px;
  text-align: center;
  font-size: 11px;
  color: #999;
}
@media print {
  .receipt-paper {
    border: none;
    margin: 0;
    padding: 10mm;
    width: 100%;
    min-height: auto;
  }
}
</style>
