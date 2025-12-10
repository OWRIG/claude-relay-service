import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '@/config/api'
import { showToast } from '@/utils/toast'

export const useConversationLogsStore = defineStore('conversationLogs', () => {
  // 状态
  const loading = ref(false)
  const logs = ref([])
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(20)
  const totalPages = ref(0)

  // 统计数据
  const stats = ref({
    totalConversations: 0,
    todayConversations: 0,
    totalTokens: {
      input: 0,
      output: 0,
      cacheCreate: 0,
      cacheRead: 0,
      total: 0
    },
    byModel: []
  })

  // 可用的过滤选项
  const availableTags = ref([])
  const availableModels = ref([])

  // 筛选条件
  const filters = ref({
    apiKeyName: '',
    tag: '',
    model: '',
    startDate: '',
    endDate: '',
    status: '' // 'success' or 'error'
  })

  // 排序
  const sortBy = ref('created_at')
  const sortOrder = ref('desc')

  // 详情模态框
  const selectedLog = ref(null)
  const showDetailModal = ref(false)

  // 加载对话记录列表
  async function loadLogs() {
    loading.value = true
    try {
      const params = {
        page: currentPage.value,
        pageSize: pageSize.value,
        sortBy: sortBy.value,
        sortOrder: sortOrder.value
      }

      // 添加筛选参数
      if (filters.value.apiKeyName) params.apiKeyName = filters.value.apiKeyName
      if (filters.value.tag) params.tag = filters.value.tag
      if (filters.value.model) params.model = filters.value.model
      if (filters.value.startDate) params.startDate = filters.value.startDate
      if (filters.value.endDate) params.endDate = filters.value.endDate
      if (filters.value.status) params.status = filters.value.status

      const response = await apiClient.get('/admin/conversation-logs', { params })

      if (response.success) {
        logs.value = response.data
        total.value = response.total
        currentPage.value = response.page
        totalPages.value = response.totalPages

        // 更新可用的过滤选项
        if (response.availableTags) {
          availableTags.value = response.availableTags
        }
        if (response.availableModels) {
          availableModels.value = response.availableModels
        }
      }
    } catch (error) {
      console.error('Failed to load conversation logs:', error)
      showToast(error.message || '加载对话记录失败', 'error')
    } finally {
      loading.value = false
    }
  }

  // 加载统计数据
  async function loadStats() {
    try {
      const response = await apiClient.get('/admin/conversation-logs/stats')

      if (response.success) {
        stats.value = response.data
      }
    } catch (error) {
      console.error('Failed to load conversation stats:', error)
      showToast(error.message || '加载统计数据失败', 'error')
    }
  }

  // 加载单条记录详情
  async function loadLogDetail(id) {
    loading.value = true
    try {
      const response = await apiClient.get(`/admin/conversation-logs/${id}`)

      if (response.success) {
        selectedLog.value = response.data
        showDetailModal.value = true
      }
    } catch (error) {
      console.error('Failed to load log detail:', error)
      showToast(error.message || '加载详情失败', 'error')
    } finally {
      loading.value = false
    }
  }

  // 设置筛选条件
  function setFilters(newFilters) {
    filters.value = { ...filters.value, ...newFilters }
    currentPage.value = 1 // 重置到第一页
    loadLogs()
  }

  // 清空筛选条件
  function clearFilters() {
    filters.value = {
      apiKeyName: '',
      tag: '',
      model: '',
      startDate: '',
      endDate: '',
      status: ''
    }
    currentPage.value = 1
    loadLogs()
  }

  // 设置排序
  function setSorting(field, order) {
    sortBy.value = field
    sortOrder.value = order
    loadLogs()
  }

  // 切换页码
  function setPage(page) {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
      loadLogs()
    }
  }

  // 关闭详情模态框
  function closeDetailModal() {
    showDetailModal.value = false
    selectedLog.value = null
  }

  return {
    // 状态
    loading,
    logs,
    total,
    currentPage,
    pageSize,
    totalPages,
    stats,
    availableTags,
    availableModels,
    filters,
    sortBy,
    sortOrder,
    selectedLog,
    showDetailModal,

    // 方法
    loadLogs,
    loadStats,
    loadLogDetail,
    setFilters,
    clearFilters,
    setSorting,
    setPage,
    closeDetailModal
  }
})
