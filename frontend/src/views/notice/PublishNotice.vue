<template>
  <div class="publish-notice-page">
    <div class="page-header">
      <h2>发布公告</h2>
    </div>
    
    <el-card>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px" style="max-width: 800px">
        <el-form-item label="公告标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入公告标题" />
        </el-form-item>
        <el-form-item label="公告类型" prop="type">
          <el-select v-model="form.type" placeholder="请选择公告类型" style="width: 100%">
            <el-option label="公司公告" value="company" />
            <el-option label="部门通知" value="department" />
            <el-option label="规章制度" value="regulation" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.type === 'department'" label="发布部门" prop="department_id">
          <el-tree-select
            v-model="form.department_id"
            :data="departmentTree"
            :props="{ label: 'name', value: 'id' }"
            placeholder="请选择部门"
            check-strictly
          />
        </el-form-item>
        <el-form-item label="公告内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="10"
            placeholder="请输入公告内容"
          />
        </el-form-item>
        <el-form-item label="弹窗提醒">
          <el-switch v-model="form.is_popup" />
          <span style="margin-left: 10px; color: #909399; font-size: 12px">
            开启后，用户登录时会弹出提醒
          </span>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="loading">发布公告</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '@/utils/api'

const router = useRouter()
const formRef = ref(null)
const loading = ref(false)
const departments = ref([])

const form = reactive({
  title: '',
  type: 'company',
  department_id: null,
  content: '',
  is_popup: false,
  status: 'published'
})

const rules = {
  title: [{ required: true, message: '请输入公告标题', trigger: 'blur' }],
  type: [{ required: true, message: '请选择公告类型', trigger: 'change' }],
  content: [{ required: true, message: '请输入公告内容', trigger: 'blur' }]
}

const departmentTree = computed(() => {
  const buildTree = (items, parentId = null) => {
    return items
      .filter(item => item.parent_id === parentId)
      .map(item => ({
        ...item,
        children: buildTree(items, item.id)
      }))
  }
  return buildTree(departments.value)
})

const loadDepartments = async () => {
  try {
    const res = await api.get('/departments')
    departments.value = res
  } catch (error) {
    console.error('加载部门失败:', error)
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        await api.post('/notices', form)
        ElMessage.success('公告发布成功')
        router.push('/notice/list')
      } catch (error) {
        console.error('发布失败:', error)
      } finally {
        loading.value = false
      }
    }
  })
}

const resetForm = () => {
  form.title = ''
  form.type = 'company'
  form.department_id = null
  form.content = ''
  form.is_popup = false
  formRef.value?.resetFields()
}

onMounted(() => {
  loadDepartments()
})
</script>
