<template>
  <div class="notice-list-page">
    <div class="page-header">
      <h2>公告列表</h2>
    </div>
    
    <div class="filter-container">
      <el-form :inline="true">
        <el-form-item label="公告类型">
          <el-select v-model="filters.type" placeholder="请选择" clearable @change="loadNotices">
            <el-option label="公司公告" value="company" />
            <el-option label="部门通知" value="department" />
            <el-option label="规章制度" value="regulation" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="标题/内容"
            clearable
            @keyup.enter="loadNotices"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadNotices">查询</el-button>
        </el-form-item>
      </el-form>
    </div>
    
    <div class="table-container">
      <el-table :data="notices" style="width: 100%" border>
        <el-table-column prop="title" label="标题" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTag(row.type)">
              {{ getTypeText(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="publisher_name" label="发布人" width="100" />
        <el-table-column prop="department_name" label="发布部门" width="120" />
        <el-table-column prop="publish_time" label="发布时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.publish_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="read_count" label="阅读数" width="80" align="center" />
        <el-table-column label="操作" width="150" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleView(row)">查看</el-button>
            <el-button v-if="isAdmin" type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    
    <el-dialog v-model="detailVisible" title="公告详情" width="700px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="标题" :span="2">{{ currentNotice.title }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ getTypeText(currentNotice.type) }}</el-descriptions-item>
        <el-descriptions-item label="发布人">{{ currentNotice.publisher_name }}</el-descriptions-item>
        <el-descriptions-item label="发布时间">{{ formatDate(currentNotice.publish_time) }}</el-descriptions-item>
        <el-descriptions-item label="阅读数">{{ currentNotice.read_count }}</el-descriptions-item>
        <el-descriptions-item label="内容" :span="2">
          <div v-html="currentNotice.content" style="white-space: pre-wrap;"></div>
        </el-descriptions-item>
      </el-descriptions>
      
      <el-divider v-if="isAdmin">阅读统计</el-divider>
      <div v-if="isAdmin">
        <el-button type="primary" size="small" @click="loadReadStatus" style="margin-bottom: 10px">
          查看阅读详情
        </el-button>
        <el-table v-if="readRecords.length" :data="readRecords" style="width: 100%" border max-height="300">
          <el-table-column prop="employee_name" label="阅读人" width="100" />
          <el-table-column prop="employee_no" label="工号" width="100" />
          <el-table-column prop="department_name" label="部门" />
          <el-table-column prop="read_at" label="阅读时间" width="160">
            <template #default="{ row }">
              {{ formatDate(row.read_at) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const authStore = useAuthStore()
const notices = ref([])
const detailVisible = ref(false)
const currentNotice = ref({})
const readRecords = ref([])

const isAdmin = computed(() => authStore.user?.role === 'admin')

const filters = reactive({
  type: null,
  keyword: ''
})

const getTypeTag = (type) => {
  const tags = {
    company: 'danger',
    department: 'warning',
    regulation: 'info'
  }
  return tags[type] || ''
}

const getTypeText = (type) => {
  const texts = {
    company: '公司公告',
    department: '部门通知',
    regulation: '规章制度'
  }
  return texts[type] || type
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN')
}

const loadNotices = async () => {
  try {
    const params = {}
    if (filters.type) params.type = filters.type
    if (filters.keyword) params.keyword = filters.keyword
    
    const res = await api.get('/notices', { params })
    notices.value = res
  } catch (error) {
    console.error('加载公告失败:', error)
  }
}

const handleView = async (row) => {
  try {
    const res = await api.get(`/notices/${row.id}`)
    currentNotice.value = res
    readRecords.value = []
    detailVisible.value = true
  } catch (error) {
    console.error('加载详情失败:', error)
  }
}

const loadReadStatus = async () => {
  try {
    const res = await api.get(`/notices/${currentNotice.value.id}/read-status`)
    readRecords.value = res
  } catch (error) {
    console.error('加载阅读状态失败:', error)
  }
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确定要删除该公告吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await api.delete(`/notices/${row.id}`)
      ElMessage.success('删除成功')
      loadNotices()
    } catch (error) {
      console.error('删除失败:', error)
    }
  }).catch(() => {})
}

onMounted(() => {
  loadNotices()
})
</script>
