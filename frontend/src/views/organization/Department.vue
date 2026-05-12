<template>
  <div class="department-page">
    <div class="page-header">
      <h2>部门管理</h2>
    </div>
    
    <div class="filter-container">
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        新增部门
      </el-button>
    </div>
    
    <div class="table-container">
      <el-table
        :data="departments"
        style="width: 100%"
        row-key="id"
        border
        default-expand-all
        :tree-props="{ children: 'children' }"
      >
        <el-table-column prop="name" label="部门名称" width="200" />
        <el-table-column prop="description" label="描述" />
        <el-table-column prop="manager_name" label="部门负责人" width="120" />
        <el-table-column prop="employee_count" label="员工数量" width="100" align="center" />
        <el-table-column label="操作" width="200" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="primary" link @click="handleAddChild(row)">添加子部门</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
      @close="resetForm"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="部门名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入部门名称" />
        </el-form-item>
        <el-form-item label="上级部门" prop="parent_id">
          <el-tree-select
            v-model="form.parent_id"
            :data="departmentTree"
            :props="{ label: 'name', value: 'id' }"
            placeholder="请选择上级部门"
            clearable
            check-strictly
          />
        </el-form-item>
        <el-form-item label="部门负责人" prop="manager_id">
          <el-select v-model="form.manager_id" placeholder="请选择部门负责人" clearable>
            <el-option
              v-for="emp in employees"
              :key="emp.id"
              :label="emp.name"
              :value="emp.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" rows="3" placeholder="请输入描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/utils/api'

const departments = ref([])
const employees = ref([])
const dialogVisible = ref(false)
const formRef = ref(null)
const isEdit = ref(false)

const form = reactive({
  id: null,
  name: '',
  parent_id: null,
  manager_id: null,
  description: ''
})

const rules = {
  name: [{ required: true, message: '请输入部门名称', trigger: 'blur' }]
}

const dialogTitle = computed(() => isEdit.value ? '编辑部门' : '新增部门')

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
    const res = await api.get('/departments/tree')
    departments.value = res
  } catch (error) {
    console.error('加载部门失败:', error)
  }
}

const loadEmployees = async () => {
  try {
    const res = await api.get('/employees')
    employees.value = res
  } catch (error) {
    console.error('加载员工失败:', error)
  }
}

const handleAdd = () => {
  isEdit.value = false
  dialogVisible.value = true
}

const handleAddChild = (row) => {
  isEdit.value = false
  form.parent_id = row.id
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  Object.assign(form, {
    id: row.id,
    name: row.name,
    parent_id: row.parent_id,
    manager_id: row.manager_id,
    description: row.description
  })
  dialogVisible.value = true
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确定要删除该部门吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await api.delete(`/departments/${row.id}`)
      ElMessage.success('删除成功')
      loadDepartments()
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
          await api.put(`/departments/${form.id}`, form)
          ElMessage.success('更新成功')
        } else {
          await api.post('/departments', form)
          ElMessage.success('创建成功')
        }
        dialogVisible.value = false
        loadDepartments()
      } catch (error) {
        console.error('提交失败:', error)
      }
    }
  })
}

const resetForm = () => {
  Object.assign(form, {
    id: null,
    name: '',
    parent_id: null,
    manager_id: null,
    description: ''
  })
  formRef.value?.resetFields()
}

onMounted(() => {
  loadDepartments()
  loadEmployees()
})
</script>
