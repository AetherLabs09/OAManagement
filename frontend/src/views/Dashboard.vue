<template>
  <div class="dashboard">
    <div class="page-header">
      <h2>工作台</h2>
    </div>
    
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon" style="color: #409eff"><Document /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.myApprovals }}</div>
              <div class="stat-label">我的申请</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon" style="color: #67c23a"><DocumentChecked /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.pendingApprovals }}</div>
              <div class="stat-label">待我审批</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon" style="color: #e6a23c"><Bell /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.unreadNotices }}</div>
              <div class="stat-label">未读公告</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon" style="color: #f56c6c"><Calendar /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.todaySchedules }}</div>
              <div class="stat-label">今日日程</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>待办事项</span>
            </div>
          </template>
          <el-table :data="todos" style="width: 100%">
            <el-table-column prop="title" label="标题" />
            <el-table-column prop="type" label="类型" width="100">
              <template #default="{ row }">
                <el-tag :type="getTodoType(row.type)">{{ row.type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="date" label="日期" width="120" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>最新公告</span>
            </div>
          </template>
          <el-table :data="latestNotices" style="width: 100%">
            <el-table-column prop="title" label="标题" />
            <el-table-column prop="publisher_name" label="发布人" width="100" />
            <el-table-column prop="publish_time" label="发布时间" width="160">
              <template #default="{ row }">
                {{ formatDate(row.publish_time) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/utils/api'

const stats = ref({
  myApprovals: 0,
  pendingApprovals: 0,
  unreadNotices: 0,
  todaySchedules: 0
})

const todos = ref([])
const latestNotices = ref([])

const getTodoType = (type) => {
  const types = {
    '审批': 'warning',
    '日志': 'success',
    '日程': 'info'
  }
  return types[type] || ''
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN')
}

const loadStats = async () => {
  try {
    const [approvals, pending, notices, schedules] = await Promise.all([
      api.get('/approvals/requests'),
      api.get('/approvals/requests/pending'),
      api.get('/notices/popup'),
      api.get('/schedules', {
        params: {
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0]
        }
      })
    ])
    
    stats.value.myApprovals = approvals.length || 0
    stats.value.pendingApprovals = pending.length || 0
    stats.value.unreadNotices = notices.length || 0
    stats.value.todaySchedules = schedules.length || 0
    
    todos.value = [
      ...approvals.slice(0, 3).map(item => ({
        title: item.title,
        type: '审批',
        date: new Date(item.created_at).toLocaleDateString()
      })),
      ...schedules.slice(0, 2).map(item => ({
        title: item.title,
        type: '日程',
        date: new Date(item.start_time).toLocaleDateString()
      }))
    ]
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

const loadNotices = async () => {
  try {
    const res = await api.get('/notices', {
      params: { limit: 5 }
    })
    latestNotices.value = res.slice(0, 5)
  } catch (error) {
    console.error('加载公告失败:', error)
  }
}

onMounted(() => {
  loadStats()
  loadNotices()
})
</script>

<style scoped>
.stat-card {
  cursor: pointer;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-content {
  display: flex;
  align-items: center;
}

.stat-icon {
  font-size: 48px;
  margin-right: 16px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
