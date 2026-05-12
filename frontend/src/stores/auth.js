import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))

  function setToken(newToken) {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  function setUser(newUser) {
    user.value = newUser
    localStorage.setItem('user', JSON.stringify(newUser))
  }

  async function login(username, password) {
    const res = await api.post('/auth/login', { username, password })
    setToken(res.token)
    setUser(res.user)
    return res
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  async function getProfile() {
    const res = await api.get('/auth/profile')
    setUser(res.user)
    return res
  }

  return {
    token,
    user,
    setToken,
    setUser,
    login,
    logout,
    getProfile
  }
})
