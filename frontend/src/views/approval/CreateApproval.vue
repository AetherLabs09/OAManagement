<template>
  <div class="create-approval-page">
    <div class="page-header">
      <h2>发起申请</h2>
    </div>
    
    <el-card>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px" style="max-width: 600px">
        <el-form-item label="申请类型" prop="type_id">
          <el-select v-model="form.type_id" placeholder="请选择申请类型" style="width: 100%">
            <el-option
              v-for="type in approvalTypes"
              :key="type.id"
              :label="type.name"
              :value="type.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="申请标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入申请标题" />
        </el-form-item>
        <el-form-item label="申请内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="6"
            placeholder="请输入申请内容"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="loading">提交申请</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '@/utils/api'

const router = useRouter()
const formRef = ref(null)
const loading = ref(false)
const approvalTypes = ref([])

const form = reactive({
  type_id: null,
  title: '',
  content: ''
})

const rules = {
  type_id: [{ required: true, message: '请选择申请类型', trigger: 'change' }],
  title: [{ required: true, message: '请输入申请标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入申请内容', trigger: 'blur' }]
}

const loadApprovalTypes = async () => {
  try {
    const res = await api.get('/approvals/types')
    approvalTypes.value = res
  } catch (error) {
    console.error('加载审批类型失败:', error)
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        await api.post('/approvals/requests', form)
        ElMessage.success('申请提交成功')
        router.push('/approval/my')
      } catch (error) {
        console.error('提交失败:', error)
      } finally {
        loading.value = false
      }
    }
  })
}

const resetForm = () => {
  form.type_id = null
  form.title = ''
  form.content = ''
  formRef.value?.resetFields()
}

onMounted(() => {
  loadApprovalTypes()
})
</script>
