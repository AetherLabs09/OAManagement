<template>
  <div class="schedule-page">
    <div class="page-header">
      <h2>日程安排</h2>
    </div>
    
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-button @click="prevMonth"><el-icon><ArrowLeft /></el-icon></el-button>
            <span class="current-month">{{ currentYear }}年{{ currentMonth }}月</span>
            <el-button @click="nextMonth"><el-icon><ArrowRight /></el-icon></el-button>
            <el-button @click="goToday">今天</el-button>
          </div>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增日程
          </el-button>
        </div>
      </template>
      
      <el-calendar v-model="calendarDate">
        <template #date-cell="{ data }">
          <div class="calendar-cell" @click="handleDateClick(data)">
            <div class="date-number">{{ data.day.split('-')[2] }}</div>
            <div class="schedule-dots">
              <div
                v-for="(schedule, index) in getDateSchedules(data.day)"
                :key="index"
                class="schedule-dot"
                :style="{ backgroundColor: getStatusColor(schedule.status) }"
              ></div>
            </div>
          </div>
        </template>
      </el-calendar>
    </el-card>
    
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px" @close="resetForm">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入日程标题" />
        </el-form-item>
        <el-form-item label="开始时间" prop="start_time">
          <el-date-picker
            v-model="form.start_time"
            type="datetime"
            placeholder="请选择开始时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="结束时间" prop="end_time">
          <el-date-picker
            v-model="form.end_time"
            type="datetime"
            placeholder="请选择结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="地点" prop="location">
          <el-input v-model="form.location" placeholder="请输入地点" />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="3"
            placeholder="请输入日程内容"
          />
        </el-form-item>
        <el-form-item label="提醒">
          <el-switch v-model="form.reminder" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
    
    <el-dialog v-model="dayDialogVisible" :title="selectedDate + ' 日程'" width="600px">
      <el-table :data="daySchedules" style="width: 100%" border>
        <el-table-column prop="title" label="标题" />
        <el-table-column prop="start_time" label="开始时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.start_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="end_time" label="结束时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.end_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button
              v-if="row.status === 'scheduled'"
              type="success"
              link
              @click="handleComplete(row)"
            >
              完成
            </el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/utils/api'

const calendarDate = ref(new Date())
const schedules = ref([])
const dialogVisible = ref(false)
const dayDialogVisible = ref(false)
const formRef = ref(null)
const isEdit = ref(false)
const selectedDate = ref('')
const daySchedules = ref([])

const form = reactive({
  id: null,
  title: '',
  content: '',
  start_time: '',
  end_time: '',
  location: '',
  reminder: false,
  status: 'scheduled'
})

const rules = {
  title: [{ required: true, message: '请输入日程标题', trigger: 'blur' }],
  start_time: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  end_time: [{ required: true, message: '请选择结束时间', trigger: 'change' }]
}

const currentYear = computed(() => calendarDate.value.getFullYear())
const currentMonth = computed(() => calendarDate.value.getMonth() + 1)
const dialogTitle = computed(() => isEdit.value ? '编辑日程' : '新增日程')

const getStatusColor = (status) => {
  const colors = {
    scheduled: '#409eff',
    completed: '#67c23a',
    cancelled: '#f56c6c'
  }
  return colors[status] || '#909399'
}

const getStatusType = (status) => {
  const types = {
    scheduled: 'primary',
    completed: 'success',
    cancelled: 'danger'
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    scheduled: '待办',
    completed: '已完成',
    cancelled: '已取消'
  }
  return texts[status] || status
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('zh-CN')
}

const formatDateTime = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN')
}

const loadSchedules = async () => {
  try {
    const year = currentYear.value
    const month = currentMonth.value
    const res = await api.get(`/schedules/month/${year}/${month}`)
    schedules.value = res
  } catch (error) {
    console.error('加载日程失败:', error)
  }
}

const getDateSchedules = (dateStr) => {
  return schedules.value.filter(s => s.start_time.startsWith(dateStr))
}

const prevMonth = () => {
  const date = new Date(calendarDate.value)
  date.setMonth(date.getMonth() - 1)
  calendarDate.value = date
}

const nextMonth = () => {
  const date = new Date(calendarDate.value)
  date.setMonth(date.getMonth() + 1)
  calendarDate.value = date
}

const goToday = () => {
  calendarDate.value = new Date()
}

const handleDateClick = (data) => {
  selectedDate.value = data.day
  daySchedules.value = getDateSchedules(data.day)
  dayDialogVisible.value = true
}

const handleAdd = () => {
  isEdit.value = false
  Object.assign(form, {
    id: null,
    title: '',
    content: '',
    start_time: '',
    end_time: '',
    location: '',
    reminder: false,
    status: 'scheduled'
  })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  Object.assign(form, {
    id: row.id,
    title: row.title,
    content: row.content,
    start_time: row.start_time,
    end_time: row.end_time,
    location: row.location,
    reminder: row.reminder,
    status: row.status
  })
  dayDialogVisible.value = false
  dialogVisible.value = true
}

const handleComplete = async (row) => {
  try {
    await api.put(`/schedules/${row.id}/complete`)
    ElMessage.success('已标记为完成')
    loadSchedules()
    daySchedules.value = getDateSchedules(selectedDate.value)
  } catch (error) {
    console.error('操作失败:', error)
  }
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确定要删除该日程吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await api.delete(`/schedules/${row.id}`)
      ElMessage.success('删除成功')
      loadSchedules()
      daySchedules.value = getDateSchedules(selectedDate.value)
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
          await api.put(`/schedules/${form.id}`, form)
          ElMessage.success('更新成功')
        } else {
          await api.post('/schedules', form)
          ElMessage.success('创建成功')
        }
        dialogVisible.value = false
        loadSchedules()
        if (selectedDate.value) {
          daySchedules.value = getDateSchedules(selectedDate.value)
        }
      } catch (error) {
        console.error('提交失败:', error)
      }
    }
  })
}

const resetForm = () => {
  formRef.value?.resetFields()
}

watch(calendarDate, () => {
  loadSchedules()
})

onMounted(() => {
  loadSchedules()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.current-month {
  font-size: 16px;
  font-weight: bold;
  min-width: 100px;
  text-align: center;
}

.calendar-cell {
  min-height: 60px;
  padding: 4px;
  cursor: pointer;
}

.date-number {
  font-size: 14px;
  margin-bottom: 4px;
}

.schedule-dots {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

.schedule-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

:deep(.el-calendar-table .el-calendar-day) {
  padding: 0;
}
</style>
