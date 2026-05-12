<template>
  <div class="employee-page">
    <div class="page-header">
      <h2>员工管理</h2>
    </div>
    
    <div class="filter-container">
      <el-form :inline="true">
        <el-form-item label="部门">
          <el-tree-select
            v-model="filters.department_id"
            :data="departmentTree"
            :props="{ label: 'name', value: 'id' }"
            placeholder="请选择部门"
            clearable
            check-strictly
            @change="loadEmployees"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="请选择状态" clearable @change="loadEmployees">
            <el-option label="在职" value="active" />
            <el-option label="离职" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="姓名/工号/手机号"
            clearable
            @keyup.enter="loadEmployees"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadEmployees">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
          <el-button type="success" @click="handleAdd">新增员工</el-button>
        </el-form-item>
      </el-form>
    </div>
    
    <div class="table-container">
      <el-table :data="employees" style="width: 100%" border>
        <el-table-column prop="employee_no" label="工号" width="100" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="department_name" label="部门" width="120" />
        <el-table-column prop="position_name" label="岗位" width="120" />
        <el-table-column prop="phone" label="手机号" width="120" />
        <el-table-column prop="email" label="邮箱" />
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? '在职' : '离职' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      @close="resetForm"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="form.name" placeholder="请输入姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="工号" prop="employee_no">
              <el-input v-model="form.employee_no" placeholder="请输入工号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="部门" prop="department_id">
              <el-tree-select
                v-model="form.department_id"
                :data="departmentTree"
                :props="{ label: 'name', value: 'id' }"
                placeholder="请选择部门"
                clearable
                check-strictly
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="岗位" prop="position_id">
              <el-select v-model="form.position_id" placeholder="请选择岗位" clearable>
                <el-option
                  v-for="pos in positions"
                  :key="pos.id"
                  :label="pos.name"
                  :value="pos.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="form.phone" placeholder="请输入手机号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" placeholder="请输入邮箱" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="性别" prop="gender">
              <el-radio-group v-model="form.gender">
                <el-radio label="男">男</el-radio>
                <el-radio label="女">女</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="出生日期" prop="birth_date">
              <el-date-picker
                v-model="form.birth_date"
                type="date"
                placeholder="请选择出生日期"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="入职日期" prop="hire_date">
              <el-date-picker
                v-model="form.hire_date"
                type="date"
                placeholder="请选择入职日期"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-select v-model="form.status" placeholder="请选择状态">
                <el-option label="在职" value="active" />
                <el-option label="离职" value="inactive" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="地址" prop="address">
          <el-input v-model="form.address" placeholder="请输入地址" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="紧急联系人" prop="emergency_contact">
              <el-input v-model="form.emergency_contact" placeholder="请输入紧急联系人" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="紧急联系电话" prop="emergency_phone">
              <el-input v-model="form.emergency_phone" placeholder="请输入紧急联系电话" />
            </el-form-item>
          </el-col>
        </el-row>
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

const employees = ref([])
const departments = ref([])
const positions = ref([])
const dialogVisible = ref(false)
const formRef = ref(null)
const isEdit = ref(false)

const filters = reactive({
  department_id: null,
  status: null,
  keyword: ''
})

const form = reactive({
  id: null,
  name: '',
  employee_no: '',
  department_id: null,
  position_id: null,
  phone: '',
  email: '',
  gender: '',
  birth_date: '',
  hire_date: '',
  address: '',
  emergency_contact: '',
  emergency_phone: '',
  status: 'active'
})

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  employee_no: [{ required: true, message: '请输入工号', trigger: 'blur' }]
}

const dialogTitle = computed(() => isEdit.value ? '编辑员工' : '新增员工')

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

const loadEmployees = async () => {
  try {
    const params = {}
    if (filters.department_id) params.department_id = filters.department_id
    if (filters.status) params.status = filters.status
    if (filters.keyword) params.keyword = filters.keyword
    
    const res = await api.get('/employees', { params })
    employees.value = res
  } catch (error) {
    console.error('加载员工失败:', error)
  }
}

const loadDepartments = async () => {
  try {
    const res = await api.get('/departments')
    departments.value = res
  } catch (error) {
    console.error('加载部门失败:', error)
  }
}

const loadPositions = async () => {
  try {
    const res = await api.get('/employees/positions/list')
    positions.value = res
  } catch (error) {
    console.error('加载岗位失败:', error)
  }
}

const handleAdd = () => {
  isEdit.value = false
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  Object.assign(form, {
    id: row.id,
    name: row.name,
    employee_no: row.employee_no,
    department_id: row.department_id,
    position_id: row.position_id,
    phone: row.phone,
    email: row.email,
    gender: row.gender,
    birth_date: row.birth_date,
    hire_date: row.hire_date,
    address: row.address,
    emergency_contact: row.emergency_contact,
    emergency_phone: row.emergency_phone,
    status: row.status
  })
  dialogVisible.value = true
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确定要删除该员工吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await api.delete(`/employees/${row.id}`)
      ElMessage.success('删除成功')
      loadEmployees()
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
          await api.put(`/employees/${form.id}`, form)
          ElMessage.success('更新成功')
        } else {
          await api.post('/employees', form)
          ElMessage.success('创建成功')
        }
        dialogVisible.value = false
        loadEmployees()
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
    employee_no: '',
    department_id: null,
    position_id: null,
    phone: '',
    email: '',
    gender: '',
    birth_date: '',
    hire_date: '',
    address: '',
    emergency_contact: '',
    emergency_phone: '',
    status: 'active'
  })
  formRef.value?.resetFields()
}

const resetFilters = () => {
  filters.department_id = null
  filters.status = null
  filters.keyword = ''
  loadEmployees()
}

onMounted(() => {
  loadEmployees()
  loadDepartments()
  loadPositions()
})
</script>
