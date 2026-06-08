<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <el-icon :size="40" color="#409eff"><OfficeBuilding /></el-icon>
        <h2>房地产销售收款与客户台账管理系统</h2>
        <p>Real Estate Sales Management System</p>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="0" size="large">
        <el-form-item prop="username">
          <el-input v-model="form.username" prefix-icon="User" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" prefix-icon="Lock" type="password" placeholder="请输入密码" show-password @keyup.enter="handleLogin" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" style="width: 100%" @click="handleLogin">登 录</el-button>
        </el-form-item>
      </el-form>
      <div class="login-hint">
        <p>默认账号：manager / finance / sales1</p>
        <p>默认密码：123456</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

const authStore = useAuthStore()
const router = useRouter()
const formRef = ref()
const loading = ref(false)

const form = reactive({ username: '', password: '' })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function handleLogin() {
  await formRef.value?.validate()
  loading.value = true
  try {
    const ok = await authStore.login(form.username, form.password)
    if (ok) {
      ElMessage.success('登录成功')
      router.push('/dashboard')
    } else {
      ElMessage.error('用户名或密码错误')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a2332 0%, #2c3e50 50%, #34495e 100%);
}
.login-card {
  width: 420px;
  padding: 40px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}
.login-header {
  text-align: center;
  margin-bottom: 32px;
}
.login-header h2 {
  margin: 16px 0 8px;
  font-size: 20px;
  color: #2c3e50;
}
.login-header p {
  color: #999;
  font-size: 13px;
}
.login-hint {
  text-align: center;
  color: #999;
  font-size: 12px;
  line-height: 1.8;
}
</style>
