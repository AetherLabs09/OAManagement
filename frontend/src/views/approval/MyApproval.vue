<template>
  <div class="my-approval-page">
    <div class="page-header">
      <h2>我的申请</h2>
    </div>
    
    <div class="filter-container">
      <el-form :inline="true">
        <el-form-item label="申请类型">
          <el-select v-model="filters.type_id" placeholder="请选择" clearable @change="loadRequests">
            <el-option
              v-for="type in approvalTypes"
              :key="type.id"
              :label="type.name"
              :value="type.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="请选择" clearable @change="loadRequests">
            <el-option label="待审批" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadRequests">查询</el-button>
        </el-form-item>
      </el-form>
    </div>
    
    <div class="table-container">
      <el-table :data="requests" style="width: 100%" border>
        <el-table-column prop="title" label="申请标题" />
        <el-table-column prop="type_name" label="申请类型" width="120" />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="申请时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleView(row)">查看</el-button>
            <el-button
              v-if="row.status === 'pending'"
              type="danger"
              link
              @click="handleDelete(row)"
            >
              撤销
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    
    <el-dialog v-model="detailVisible" title="申请详情" width="600px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="申请标题" :span="2">{{ currentRequest.title }}</el-descriptions-item>
        <el-descriptions-item label="申请类型">{{ currentRequest.type_name }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(currentRequest.status)">
            {{ getStatusText(currentRequest.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="申请时间" :span="2">
          {{ formatDate(currentRequest.created_at) }}
        </el-descriptions-item>
        <el-descriptions-item label="申请内容" :span="2">
          {{ currentRequest.content }}
        </el-descriptions-item>
      </el-descriptions>
      
      <el-divider>审批记录</el-divider>
      <el-timeline v-if="currentRequest.records && currentRequest.records.length">
        <el-timeline-item
          v-for="record in currentRequest.records"
          :key="record.id"
          :type="getRecordType(record.action)"
          :timestamp="formatDate(record.created_at)"
        >
          <p><strong>{{ record.approver_name }}</strong> {{ getActionText(record.action) }}</p>
          <p v-if="record.comment">意见：{{ record.comment }}</p>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无审批记录" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/utils/api'

const requests = ref([])
const approvalTypes = ref([])
const detailVisible = ref(false)
const currentRequest = ref({})

const filters = reactive({
  type_id: null,
  status: null
})

const getStatusType = (status) => {
  const types = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    pending: '待审批',
    approved: '已通过',
    rejected: '已拒绝'
  }
  return texts[status] || status
}

const getRecordType = (action) => {
  const types = {
    approved: 'success',
    rejected: 'danger',
    transferred: 'warning'
  }
  return types[action] || 'primary'
}

const getActionText = (action) => {
  const texts = {
    approved: '审批通过',
    rejected: '审批拒绝',
    transferred: '转办'
  }
  return texts[action] || action
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN')
}

const loadRequests = async () => {
  try {
    const params = {}
    if (filters.type_id) params.type_id = filters.type_id
    if (filters.status) params.status = filters.status
    
    const res = await api.get('/approvals/requests', { params })
    requests.value = res
  } catch (error) {
    console.error('加载申请失败:', error)
  }
}

const loadApprovalTypes = async () => {
  try {
    const res = await api.get('/approvals/types')
    approvalTypes.value = res
  } catch (error) {
    console.error('加载审批类型失败:', error)
  }
}

const handleView = async (row) => {
  try {
    const res = await api.get(`/approvals/requests/${row.id}`)
    currentRequest.value = res
    detailVisible.value = true
  } catch (error) {
    console.error('加载详情失败:', error)
  }
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确定要撤销该申请吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await api.delete(`/approvals/requests/${row.id}`)
      ElMessage.success('撤销成功')
      loadRequests()
    } catch (error) {
      console.error('撤销失败:', error)
    }
  }).catch(() => {})
}

onMounted(() => {
  loadRequests()
  loadApprovalTypes()
})
</script>
