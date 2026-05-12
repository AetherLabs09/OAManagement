<template>
  <div class="my-worklog-page">
    <div class="page-header">
      <h2>我的日志</h2>
    </div>
    
    <div class="filter-container">
      <el-form :inline="true">
        <el-form-item label="日志类型">
          <el-select v-model="filters.type" placeholder="请选择" clearable @change="loadWorklogs">
            <el-option label="日报" value="daily" />
            <el-option label="周报" value="weekly" />
            <el-option label="月报" value="monthly" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            @change="handleDateChange"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleAdd">写日志</el-button>
        </el-form-item>
      </el-form>
    </div>
    
    <div class="table-container">
      <el-table :data="worklogs" style="width: 100%" border>
        <el-table-column prop="title" label="标题" />
        <el-table-column prop="type" label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="getTypeTag(row.type)">
              {{ getTypeText(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="work_date" label="日期" width="120" />
        <el-table-column prop="created_at" label="提交时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleView(row)">查看</el-button>
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px" @close="resetForm">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="日志类型" prop="type">
          <el-select v-model="form.type" placeholder="请选择" style="width: 100%">
            <el-option label="日报" value="daily" />
            <el-option label="周报" value="weekly" />
            <el-option label="月报" value="monthly" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期" prop="work_date">
          <el-date-picker
            v-model="form.work_date"
            type="date"
            placeholder="请选择日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入标题" />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="8"
            placeholder="请输入日志内容"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">提交</el-button>
      </template>
    </el-dialog>
    
    <el-dialog v-model="detailVisible" title="日志详情" width="600px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="标题" :span="2">{{ currentWorklog.title }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ getTypeText(currentWorklog.type) }}</el-descriptions-item>
        <el-descriptions-item label="日期">{{ currentWorklog.work_date }}</el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ formatDate(currentWorklog.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="currentWorklog.status === 'submitted' ? 'success' : 'info'">
            {{ currentWorklog.status === 'submitted' ? '已提交' : '草稿' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="内容" :span="2">
          <div style="white-space: pre-wrap;">{{ currentWorklog.content }}</div>
        </el-descriptions-item>
      </el-descriptions>
      
      <el-divider>评论</el-divider>
      <div v-if="currentWorklog.comments && currentWorklog.comments.length">
        <div v-for="comment in currentWorklog.comments" :key="comment.id" class="comment-item">
          <div class="comment-header">
            <span class="comment-author">{{ comment.commenter_name }}</span>
            <span class="comment-time">{{ formatDate(comment.created_at) }}</span>
          </div>
          <div class="comment-content">{{ comment.content }}</div>
        </div>
      </div>
      <el-empty v-else description="暂无评论" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/utils/api'

const worklogs = ref([])
const dialogVisible = ref(false)
const detailVisible = ref(false)
const formRef = ref(null)
const isEdit = ref(false)
const currentWorklog = ref({})
const dateRange = ref([])

const filters = reactive({
  type: null,
  start_date: null,
  end_date: null
})

const form = reactive({
  id: null,
  type: 'daily',
  title: '',
  content: '',
  work_date: new Date().toISOString().split('T')[0]
})

const rules = {
  type: [{ required: true, message: '请选择日志类型', trigger: 'change' }],
  work_date: [{ required: true, message: '请选择日期', trigger: 'change' }],
  content: [{ required: true, message: '请输入日志内容', trigger: 'blur' }]
}

const dialogTitle = computed(() => isEdit.value ? '编辑日志' : '写日志')

const getTypeTag = (type) => {
  const tags = {
    daily: '',
    weekly: 'success',
    monthly: 'warning'
  }
  return tags[type] || ''
}

const getTypeText = (type) => {
  const texts = {
    daily: '日报',
    weekly: '周报',
    monthly: '月报'
  }
  return texts[type] || type
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN')
}

const handleDateChange = (val) => {
  if (val) {
    filters.start_date = val[0]
    filters.end_date = val[1]
  } else {
    filters.start_date = null
    filters.end_date = null
  }
  loadWorklogs()
}

const loadWorklogs = async () => {
  try {
    const params = {}
    if (filters.type) params.type = filters.type
    if (filters.start_date) params.start_date = filters.start_date
    if (filters.end_date) params.end_date = filters.end_date
    
    const res = await api.get('/worklogs', { params })
    worklogs.value = res
  } catch (error) {
    console.error('加载日志失败:', error)
  }
}

const handleAdd = () => {
  isEdit.value = false
  Object.assign(form, {
    id: null,
    type: 'daily',
    title: '',
    content: '',
    work_date: new Date().toISOString().split('T')[0]
  })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  Object.assign(form, {
    id: row.id,
    type: row.type,
    title: row.title,
    content: row.content,
    work_date: row.work_date
  })
  dialogVisible.value = true
}

const handleView = async (row) => {
  try {
    const res = await api.get(`/worklogs/${row.id}`)
    currentWorklog.value = res
    detailVisible.value = true
  } catch (error) {
    console.error('加载详情失败:', error)
  }
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确定要删除该日志吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await api.delete(`/worklogs/${row.id}`)
      ElMessage.success('删除成功')
      loadWorklogs()
    } catch (error) {
      console.error('删除失败:', error)
    }
  }).catch(() => {})
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (isEdit.value) {
          await api.put(`/worklogs/${form.id}`, form)
          ElMessage.success('更新成功')
        } else {
          await api.post('/worklogs', form)
          ElMessage.success('提交成功')
        }
        dialogVisible.value = false
        loadWorklogs()
      } catch (error) {
        console.error('提交失败:', error)
      }
    }
  })
}

const resetForm = () => {
  formRef.value?.resetFields()
}

onMounted(() => {
  loadWorklogs()
})
</script>

<style scoped>
.comment-item {
  padding: 12px;
  border-bottom: 1px solid #ebeef5;
}

.comment-item:last-child {
  border-bottom: none;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.comment-author {
  font-weight: bold;
  color: #303133;
}

.comment-time {
  color: #909399;
  font-size: 12px;
}

.comment-content {
  color: #606266;
  line-height: 1.6;
}
</style>
