<template>
  <div class="main-container">
    <el-container style="height: 100%">
      <el-aside :width="isCollapse ? '64px' : '220px'" class="sidebar">
        <div class="logo">
          <span v-if="!isCollapse">OA管理系统</span>
          <span v-else>OA</span>
        </div>
        <el-menu
          :default-active="activeMenu"
          :collapse="isCollapse"
          :router="true"
          background-color="#304156"
          text-color="#bfcbd9"
          active-text-color="#409eff"
        >
          <el-menu-item index="/dashboard">
            <el-icon><HomeFilled /></el-icon>
            <template #title>工作台</template>
          </el-menu-item>
          
          <el-sub-menu index="organization">
            <template #title>
              <el-icon><OfficeBuilding /></el-icon>
              <span>组织架构</span>
            </template>
            <el-menu-item index="/organization/department">部门管理</el-menu-item>
            <el-menu-item index="/organization/employee">员工管理</el-menu-item>
          </el-sub-menu>
          
          <el-sub-menu index="approval">
            <template #title>
              <el-icon><DocumentChecked /></el-icon>
              <span>流程审批</span>
            </template>
            <el-menu-item index="/approval/create">发起申请</el-menu-item>
            <el-menu-item index="/approval/my">我的申请</el-menu-item>
            <el-menu-item index="/approval/pending">待我审批</el-menu-item>
          </el-sub-menu>
          
          <el-sub-menu index="notice">
            <template #title>
              <el-icon><Bell /></el-icon>
              <span>公告通知</span>
            </template>
            <el-menu-item index="/notice/list">公告列表</el-menu-item>
            <el-menu-item index="/notice/publish" v-if="isAdmin">发布公告</el-menu-item>
          </el-sub-menu>
          
          <el-sub-menu index="worklog">
            <template #title>
              <el-icon><Notebook /></el-icon>
              <span>工作日志</span>
            </template>
            <el-menu-item index="/worklog/my">我的日志</el-menu-item>
            <el-menu-item index="/worklog/team">团队日志</el-menu-item>
          </el-sub-menu>
          
          <el-menu-item index="/schedule">
            <el-icon><Calendar /></el-icon>
            <template #title>日程安排</template>
          </el-menu-item>
        </el-menu>
      </el-aside>
      
      <el-container>
        <el-header class="header">
          <div class="header-left">
            <el-icon 
              class="collapse-btn" 
              @click="isCollapse = !isCollapse"
            >
              <Fold v-if="!isCollapse" />
              <Expand v-else />
            </el-icon>
          </div>
          <div class="header-right">
            <el-dropdown @command="handleCommand">
              <span class="user-info">
                <el-avatar :size="32" icon="UserFilled" />
                <span class="username">{{ userName }}</span>
                <el-icon><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">个人信息</el-dropdown-item>
                  <el-dropdown-item command="password">修改密码</el-dropdown-item>
                  <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>
        
        <el-main class="content">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
    
    <el-dialog v-model="passwordDialogVisible" title="修改密码" width="400px">
      <el-form :model="passwordForm" :rules="passwordRules" ref="passwordFormRef">
        <el-form-item label="旧密码" prop="oldPassword">
          <el-input v-model="passwordForm.oldPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="passwordForm.newPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleChangePassword">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const isCollapse = ref(false)
const passwordDialogVisible = ref(false)
const passwordFormRef = ref(null)

const activeMenu = computed(() => route.path)
const userName = computed(() => authStore.user?.employee?.name || authStore.user?.username || '用户')
const isAdmin = computed(() => authStore.user?.role === 'admin')

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const passwordRules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

const handleCommand = (command) => {
  switch (command) {
    case 'profile':
      router.push('/profile')
      break
    case 'password':
      passwordDialogVisible.value = true
      break
    case 'logout':
      ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        authStore.logout()
        router.push('/login')
        ElMessage.success('已退出登录')
      }).catch(() => {})
      break
  }
}

const handleChangePassword = async () => {
  if (!passwordFormRef.value) return
  
  await passwordFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        await api.put('/auth/password', {
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword
        })
        ElMessage.success('密码修改成功')
        passwordDialogVisible.value = false
        passwordForm.oldPassword = ''
        passwordForm.newPassword = ''
        passwordForm.confirmPassword = ''
      } catch (error) {
        console.error('修改密码失败:', error)
      }
    }
  })
}
</script>

<style scoped>
.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  background: #263445;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.username {
  margin: 0 8px;
  font-size: 14px;
}
</style>
