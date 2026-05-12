<template>
  <div class="team-worklog-page">
    <div class="page-header">
      <h2>团队日志</h2>
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
          <el-button type="primary" @click="loadWorklogs">查询</el-button>
        </el-form-item>
      </el-form>
    </div>
    
    <div class="table-container">
      <el-table :data="worklogs" style="width: 100%" border>
        <el-table-column prop="employee_name" label="员工" width="100" />
        <el-table-column prop="department_name" label="部门" width="120" />
        <el-table-column prop="title" label="标题" />
        <el-table-column prop="type" label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="getTypeTag(row.type)">
              {{ getTypeText(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="work_date" label="日期" width="120" />
        <el-table-column label="操作" width="150" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleView(row)">查看</el-button>
            <el-button type="primary" link @click="handleComment(row)">点评</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    
    <el-dialog v-model="detailVisible" title="日志详情" width="600px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="员工">{{ currentWorklog.employee_name }}</el-descriptions-item>
        <el-descriptions-item label="部门">{{ currentWorklog.department_name }}</el-descriptions-item>
        <el-descriptions-item label="标题" :span="2">{{ currentWorklog.title }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ getTypeText(currentWorklog.type) }}</el-descriptions-item>
        <el-descriptions-item label="日期">{{ currentWorklog.work_date }}</el-descriptions-item>
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
    
    <el-dialog v-model="commentVisible" title="点评日志" width="500px">
      <el-form :model="commentForm" ref="commentFormRef" label-width="80px">
        <el-form-item label="点评内容" prop="content">
          <el-input
            v-model="commentForm.content"
            type="textarea"
            :rows="4"
            placeholder="请输入点评内容"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="commentVisible = false">取消</el-button>
        <el-button type="primary" @click="submitComment">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/utils/api'

const worklogs = ref([])
const detailVisible = ref(false)
const commentVisible = ref(false)
const currentWorklog = ref({})
const commentFormRef = ref(null)
const dateRange = ref([])

const filters = reactive({
  type: null,
  start_date: null,
  end_date: null
})

const commentForm = reactive({
  content: ''
})

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
}

const loadWorklogs = async () => {
  try {
    const params = {}
    if (filters.type) params.type = filters.type
    if (filters.start_date) params.start_date = filters.start_date
    if (filters.end_date) params.end_date = filters.end_date
    
    const res = await api.get('/worklogs/subordinates', { params })
    worklogs.value = res
  } catch (error) {
    console.error('加载团队日志失败:', error)
  }
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

const handleComment = async (row) => {
  try {
    const res = await api.get(`/worklogs/${row.id}`)
    currentWorklog.value = res
    commentForm.content = ''
    commentVisible.value = true
  } catch (error) {
    console.error('加载详情失败:', error)
  }
}

const submitComment = async () => {
  if (!commentForm.content) {
    ElMessage.warning('请输入点评内容')
    return
  }
  
  try {
    await api.post(`/worklogs/${currentWorklog.value.id}/comments`, {
      content: commentForm.content
    })
    ElMessage.success('点评成功')
    commentVisible.value = false
    loadWorklogs()
  } catch (error) {
    console.error('点评失败:', error)
  }
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
