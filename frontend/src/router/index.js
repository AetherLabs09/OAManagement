import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/layout/MainLayout.vue'),
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '工作台', icon: 'HomeFilled' }
      },
      {
        path: 'organization',
        name: 'Organization',
        redirect: '/organization/department',
        meta: { title: '组织架构', icon: 'OfficeBuilding' },
        children: [
          {
            path: 'department',
            name: 'Department',
            component: () => import('@/views/organization/Department.vue'),
            meta: { title: '部门管理' }
          },
          {
            path: 'employee',
            name: 'Employee',
            component: () => import('@/views/organization/Employee.vue'),
            meta: { title: '员工管理' }
          }
        ]
      },
      {
        path: 'approval',
        name: 'Approval',
        redirect: '/approval/my',
        meta: { title: '流程审批', icon: 'DocumentChecked' },
        children: [
          {
            path: 'my',
            name: 'MyApproval',
            component: () => import('@/views/approval/MyApproval.vue'),
            meta: { title: '我的申请' }
          },
          {
            path: 'pending',
            name: 'PendingApproval',
            component: () => import('@/views/approval/PendingApproval.vue'),
            meta: { title: '待我审批' }
          },
          {
            path: 'create',
            name: 'CreateApproval',
            component: () => import('@/views/approval/CreateApproval.vue'),
            meta: { title: '发起申请' }
          }
        ]
      },
      {
        path: 'notice',
        name: 'Notice',
        redirect: '/notice/list',
        meta: { title: '公告通知', icon: 'Bell' },
        children: [
          {
            path: 'list',
            name: 'NoticeList',
            component: () => import('@/views/notice/NoticeList.vue'),
            meta: { title: '公告列表' }
          },
          {
            path: 'publish',
            name: 'PublishNotice',
            component: () => import('@/views/notice/PublishNotice.vue'),
            meta: { title: '发布公告' }
          }
        ]
      },
      {
        path: 'worklog',
        name: 'Worklog',
        redirect: '/worklog/my',
        meta: { title: '工作日志', icon: 'Notebook' },
        children: [
          {
            path: 'my',
            name: 'MyWorklog',
            component: () => import('@/views/worklog/MyWorklog.vue'),
            meta: { title: '我的日志' }
          },
          {
            path: 'team',
            name: 'TeamWorklog',
            component: () => import('@/views/worklog/TeamWorklog.vue'),
            meta: { title: '团队日志' }
          }
        ]
      },
      {
        path: 'schedule',
        name: 'Schedule',
        component: () => import('@/views/schedule/Schedule.vue'),
        meta: { title: '日程安排', icon: 'Calendar' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth !== false && !authStore.token) {
    next('/login')
  } else if (to.path === '/login' && authStore.token) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
