<template>
  <div class="pending-approval-page">
    <div class="page-header">
      <h2>待我审批</h2>
    </div>
    
    <div class="table-container">
      <el-table :data="requests" style="width: 100%" border>
        <el-table-column prop="title" label="申请标题" />
        <el-table-column prop="type_name" label="申请类型" width="120" />
        <el-table-column prop="applicant_name" label="申请人" width="100" />
        <el-table-column prop="department_name" label="部门" width="120" />
        <el-table-column prop="created_at" label="申请时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleView(row)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    
    <el-dialog v-model="detailVisible" title="审批详情" width="600px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="申请标题" :span="2">{{ currentRequest.title }}</el-descriptions-item>
        <el-descriptions-item label="申请类型">{{ currentRequest.type_name }}</el-descriptions-item>
        <el-descriptions-item label="申请人">{{ currentRequest.applicant_name }}</el-descriptions-item>
        <el-descriptions-item label="部门">{{ currentRequest.department_name }}</el-descriptions-item>
        <el-descriptions-item label="申请时间">{{ formatDate(currentRequest.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="申请内容" :span="2">{{ currentRequest.content }}</el-descriptions-item>
      </el-descriptions>
      
      <el-divider>审批操作</el-divider>
      <el-form :model="approvalForm" ref="approvalFormRef" label-width="80px">
        <el-form-item label="审批意见">
          <el-input
            v-model="approvalForm.comment"
            type="textarea"
            :rows="3"
            placeholder="请输入审批意见"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleApprove('approve')">通过</el-button>
          <el-button type="danger" @click="handleApprove('reject')">拒绝</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/utils/api'

const requests = ref([])
const detailVisible = ref(false)
const currentRequest = ref({})
const approvalFormRef = ref(null)

const approvalForm = reactive({
  comment: ''
})

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN')
}

const loadRequests = async () => {
  try {
    const res = await api.get('/approvals/requests/pending')
    requests.value = res
  } catch (error) {
    console.error('加载待审批失败:', error)
  }
}

const handleView = async (row) => {
  try {
    const res = await api.get(`/approvals/requests/${row.id}`)
    currentRequest.value = res
    approvalForm.comment = ''
    detailVisible.value = true
  } catch (error) {
    console.error('加载详情失败:', error)
  }
}

const handleApprove = async (action) => {
  try {
    await api.post(`/approvals/requests/${currentRequest.value.id}/approve`, {
      action,
      comment: approvalForm.comment
    })
    ElMessage.success(action === 'approve' ? '审批通过' : '审批拒绝')
    detailVisible.value = false
    loadRequests()
  } catch (error) {
    console.error('审批失败:', error)
  }
}

onMounted(() => {
  loadRequests()
})
</script>
