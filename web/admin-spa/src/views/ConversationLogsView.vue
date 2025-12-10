<template>
  <div class="conversation-logs-view space-y-4">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-100">
        <i class="fas fa-comments mr-2 text-blue-500"></i>
        对话记录
      </h1>
      <button
        class="rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
        :disabled="loading"
        @click="refreshLogs"
      >
        <i class="fas fa-sync-alt mr-2" :class="{ 'fa-spin': loading }"></i>
        刷新
      </button>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div
        class="glass-strong rounded-lg p-4 transition-transform hover:scale-105 dark:bg-gray-800/50"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">总对话数</p>
            <p class="mt-1 text-2xl font-bold text-gray-800 dark:text-gray-100">
              {{ stats.totalConversations.toLocaleString() }}
            </p>
          </div>
          <div class="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
            <i class="fas fa-comments text-2xl text-blue-500 dark:text-blue-400"></i>
          </div>
        </div>
      </div>

      <div
        class="glass-strong rounded-lg p-4 transition-transform hover:scale-105 dark:bg-gray-800/50"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">今日对话</p>
            <p class="mt-1 text-2xl font-bold text-gray-800 dark:text-gray-100">
              {{ stats.todayConversations.toLocaleString() }}
            </p>
          </div>
          <div class="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
            <i class="fas fa-calendar-day text-2xl text-green-500 dark:text-green-400"></i>
          </div>
        </div>
      </div>

      <div
        class="glass-strong rounded-lg p-4 transition-transform hover:scale-105 dark:bg-gray-800/50"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">输入 Tokens</p>
            <p class="mt-1 text-2xl font-bold text-gray-800 dark:text-gray-100">
              {{ formatNumber(stats.totalTokens.input) }}
            </p>
          </div>
          <div class="rounded-full bg-purple-100 p-3 dark:bg-purple-900/30">
            <i class="fas fa-arrow-down text-2xl text-purple-500 dark:text-purple-400"></i>
          </div>
        </div>
      </div>

      <div
        class="glass-strong rounded-lg p-4 transition-transform hover:scale-105 dark:bg-gray-800/50"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">输出 Tokens</p>
            <p class="mt-1 text-2xl font-bold text-gray-800 dark:text-gray-100">
              {{ formatNumber(stats.totalTokens.output) }}
            </p>
          </div>
          <div class="rounded-full bg-orange-100 p-3 dark:bg-orange-900/30">
            <i class="fas fa-arrow-up text-2xl text-orange-500 dark:text-orange-400"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- 筛选区域 -->
    <div class="glass-strong rounded-lg p-4 dark:bg-gray-800/50">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">
          <i class="fas fa-filter mr-2"></i>
          筛选条件
        </h2>
        <button
          class="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
          @click="handleClearFilters"
        >
          <i class="fas fa-redo mr-1"></i>
          清空筛选
        </button>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <!-- API Key 名称 -->
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            API Key 名称
          </label>
          <input
            v-model="filters.apiKeyName"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            placeholder="搜索 API Key"
            type="text"
          />
        </div>

        <!-- Tag -->
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            标签
          </label>
          <select
            v-model="filters.tag"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="">全部标签</option>
            <option v-for="tag in availableTags" :key="tag" :value="tag">{{ tag }}</option>
          </select>
        </div>

        <!-- Model -->
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            模型
          </label>
          <select
            v-model="filters.model"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="">全部模型</option>
            <option v-for="model in availableModels" :key="model" :value="model">
              {{ model }}
            </option>
          </select>
        </div>

        <!-- 状态 -->
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            状态
          </label>
          <select
            v-model="filters.status"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="">全部状态</option>
            <option value="success">成功</option>
            <option value="error">失败</option>
          </select>
        </div>

        <!-- 日期范围 -->
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            日期范围
          </label>
          <el-date-picker
            v-model="dateRange"
            class="w-full"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            range-separator="至"
            :size="'default'"
            start-placeholder="开始日期"
            type="daterange"
            value-format="YYYY-MM-DD"
          />
        </div>
      </div>

      <!-- 应用筛选按钮 -->
      <div class="mt-3 flex justify-end">
        <button
          class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
          @click="applyFilters"
        >
          <i class="fas fa-search mr-2"></i>
          应用筛选
        </button>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="glass-strong overflow-hidden rounded-lg dark:bg-gray-800/50">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th
                class="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600/50"
                @click="handleSort('created_at')"
              >
                <div class="flex items-center">
                  时间
                  <i
                    v-if="sortBy === 'created_at'"
                    :class="['fas ml-1', sortOrder === 'desc' ? 'fa-sort-down' : 'fa-sort-up']"
                  ></i>
                </div>
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300"
              >
                API Key
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300"
              >
                模型
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300"
              >
                Tokens
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300"
              >
                响应时间
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300"
              >
                状态
              </th>
              <th
                class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300"
              >
                操作
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            <tr v-if="loading" class="animate-pulse">
              <td class="px-4 py-8 text-center text-gray-500 dark:text-gray-400" colspan="7">
                <i class="fas fa-spinner fa-spin mr-2"></i>
                加载中...
              </td>
            </tr>
            <tr v-else-if="logs.length === 0">
              <td class="px-4 py-8 text-center text-gray-500 dark:text-gray-400" colspan="7">
                <i class="fas fa-inbox mr-2"></i>
                暂无数据
              </td>
            </tr>
            <tr
              v-for="log in logs"
              v-else
              :key="log.id"
              class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <td class="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                {{ formatDate(log.created_at) }}
              </td>
              <td class="px-4 py-3 text-sm">
                <div class="font-medium text-gray-900 dark:text-gray-100">
                  {{ log.api_key_name }}
                </div>
                <div v-if="log.api_key_tag" class="text-xs text-gray-500 dark:text-gray-400">
                  <i class="fas fa-tag mr-1"></i>{{ log.api_key_tag }}
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                {{ log.model }}
              </td>
              <td class="px-4 py-3 text-sm">
                <div class="space-y-1">
                  <div class="text-xs text-gray-600 dark:text-gray-400">
                    <span class="font-medium">输入:</span> {{ formatNumber(log.input_tokens) }}
                  </div>
                  <div class="text-xs text-gray-600 dark:text-gray-400">
                    <span class="font-medium">输出:</span> {{ formatNumber(log.output_tokens) }}
                  </div>
                  <div
                    v-if="log.cache_create_tokens > 0"
                    class="text-xs text-blue-600 dark:text-blue-400"
                  >
                    <span class="font-medium">缓存创建:</span>
                    {{ formatNumber(log.cache_create_tokens) }}
                  </div>
                  <div
                    v-if="log.cache_read_tokens > 0"
                    class="text-xs text-green-600 dark:text-green-400"
                  >
                    <span class="font-medium">缓存读取:</span>
                    {{ formatNumber(log.cache_read_tokens) }}
                  </div>
                </div>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                {{ log.response_time_ms }}ms
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-sm">
                <span
                  v-if="log.status_code >= 200 && log.status_code < 300"
                  class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400"
                >
                  <i class="fas fa-check-circle mr-1"></i>
                  成功
                </span>
                <span
                  v-else
                  class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400"
                >
                  <i class="fas fa-times-circle mr-1"></i>
                  失败 ({{ log.status_code }})
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-center text-sm">
                <button
                  class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  title="查看详情"
                  @click="viewDetail(log.id)"
                >
                  <i class="fas fa-eye"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div
        v-if="totalPages > 1"
        class="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-700/50"
      >
        <div class="text-sm text-gray-700 dark:text-gray-300">
          显示第 {{ (currentPage - 1) * pageSize + 1 }} 至
          {{ Math.min(currentPage * pageSize, total) }} 条，共 {{ total }} 条
        </div>
        <div class="flex items-center space-x-2">
          <button
            class="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            :disabled="currentPage === 1"
            @click="handlePageChange(currentPage - 1)"
          >
            <i class="fas fa-chevron-left"></i>
          </button>
          <span class="text-sm text-gray-700 dark:text-gray-300">
            第 {{ currentPage }} / {{ totalPages }} 页
          </span>
          <button
            class="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            :disabled="currentPage === totalPages"
            @click="handlePageChange(currentPage + 1)"
          >
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- 详情模态框 -->
    <div
      v-if="showDetailModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="closeDetailModal"
    >
      <div
        class="glass-strong max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl shadow-2xl dark:bg-gray-800"
      >
        <!-- 模态框头部 -->
        <div
          class="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800"
        >
          <h3 class="text-xl font-semibold text-gray-800 dark:text-gray-100">
            <i class="fas fa-info-circle mr-2 text-blue-500"></i>
            对话详情
          </h3>
          <button
            class="text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            @click="closeDetailModal"
          >
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>

        <!-- 模态框内容 -->
        <div class="max-h-[calc(90vh-80px)] overflow-y-auto bg-white p-6 dark:bg-gray-800">
          <div v-if="selectedLog" class="space-y-6">
            <!-- 基本信息 -->
            <div>
              <h4 class="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-100">基本信息</h4>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="text-sm font-medium text-gray-600 dark:text-gray-400"
                    >API Key:</label
                  >
                  <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {{ selectedLog.api_key_name }}
                  </p>
                </div>
                <div v-if="selectedLog.api_key_tag">
                  <label class="text-sm font-medium text-gray-600 dark:text-gray-400">标签:</label>
                  <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {{ selectedLog.api_key_tag }}
                  </p>
                </div>
                <div>
                  <label class="text-sm font-medium text-gray-600 dark:text-gray-400">模型:</label>
                  <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {{ selectedLog.model }}
                  </p>
                </div>
                <div>
                  <label class="text-sm font-medium text-gray-600 dark:text-gray-400"
                    >账户类型:</label
                  >
                  <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {{ selectedLog.account_type }}
                  </p>
                </div>
                <div>
                  <label class="text-sm font-medium text-gray-600 dark:text-gray-400"
                    >响应时间:</label
                  >
                  <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {{ selectedLog.response_time_ms }}ms
                  </p>
                </div>
                <div>
                  <label class="text-sm font-medium text-gray-600 dark:text-gray-400"
                    >状态码:</label
                  >
                  <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {{ selectedLog.status_code }}
                  </p>
                </div>
                <div>
                  <label class="text-sm font-medium text-gray-600 dark:text-gray-400"
                    >创建时间:</label
                  >
                  <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {{ formatDate(selectedLog.created_at) }}
                  </p>
                </div>
                <div>
                  <label class="text-sm font-medium text-gray-600 dark:text-gray-400"
                    >客户端 IP:</label
                  >
                  <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {{ selectedLog.client_ip || 'N/A' }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Token 使用 -->
            <div>
              <h4 class="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-100">
                Token 使用统计
              </h4>
              <div class="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <div class="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                  <p class="text-xs text-gray-600 dark:text-gray-400">输入</p>
                  <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {{ formatNumber(selectedLog.input_tokens) }}
                  </p>
                </div>
                <div class="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                  <p class="text-xs text-gray-600 dark:text-gray-400">输出</p>
                  <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {{ formatNumber(selectedLog.output_tokens) }}
                  </p>
                </div>
                <div class="rounded-lg bg-purple-50 p-3 dark:bg-purple-900/20">
                  <p class="text-xs text-gray-600 dark:text-gray-400">缓存创建</p>
                  <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {{ formatNumber(selectedLog.cache_create_tokens) }}
                  </p>
                </div>
                <div class="rounded-lg bg-orange-50 p-3 dark:bg-orange-900/20">
                  <p class="text-xs text-gray-600 dark:text-gray-400">缓存读取</p>
                  <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {{ formatNumber(selectedLog.cache_read_tokens) }}
                  </p>
                </div>
                <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                  <p class="text-xs text-gray-600 dark:text-gray-400">总计</p>
                  <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {{ formatNumber(selectedLog.total_tokens) }}
                  </p>
                </div>
              </div>
            </div>

            <!-- 请求消息 -->
            <div>
              <div class="mb-2 flex items-center justify-between">
                <h4 class="text-lg font-semibold text-gray-800 dark:text-gray-100">请求消息</h4>
                <button
                  class="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                  @click="copyToClipboard(JSON.stringify(selectedLog.request_messages, null, 2))"
                >
                  <i class="fas fa-copy mr-1"></i>复制
                </button>
              </div>
              <pre
                class="max-h-60 overflow-auto rounded-lg bg-gray-100 p-4 text-xs text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                >{{ JSON.stringify(selectedLog.request_messages, null, 2) }}</pre
              >
            </div>

            <!-- 系统提示 (如果有) -->
            <div v-if="selectedLog.request_system">
              <div class="mb-2 flex items-center justify-between">
                <h4 class="text-lg font-semibold text-gray-800 dark:text-gray-100">系统提示</h4>
                <button
                  class="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                  @click="copyToClipboard(selectedLog.request_system)"
                >
                  <i class="fas fa-copy mr-1"></i>复制
                </button>
              </div>
              <pre
                class="max-h-40 overflow-auto rounded-lg bg-gray-100 p-4 text-xs text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                >{{ selectedLog.request_system }}</pre
              >
            </div>

            <!-- 响应内容 -->
            <div>
              <div class="mb-2 flex items-center justify-between">
                <h4 class="text-lg font-semibold text-gray-800 dark:text-gray-100">响应内容</h4>
                <button
                  class="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                  @click="copyToClipboard(selectedLog.response_content)"
                >
                  <i class="fas fa-copy mr-1"></i>复制
                </button>
              </div>
              <pre
                class="max-h-60 overflow-auto rounded-lg bg-gray-100 p-4 text-xs text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                >{{ selectedLog.response_content }}</pre
              >
            </div>

            <!-- 错误信息 (如果有) -->
            <div v-if="selectedLog.error_message">
              <h4 class="mb-2 text-lg font-semibold text-red-600 dark:text-red-400">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                错误信息
              </h4>
              <pre
                class="max-h-40 overflow-auto rounded-lg bg-red-50 p-4 text-xs text-red-800 dark:bg-red-900/20 dark:text-red-400"
                >{{ selectedLog.error_message }}</pre
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useConversationLogsStore } from '@/stores/conversationLogs'
import { showToast } from '@/utils/toast'

const conversationLogsStore = useConversationLogsStore()
const {
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
  showDetailModal
} = storeToRefs(conversationLogsStore)

// 日期范围
const dateRange = ref(null)

// 监听日期范围变化
watch(dateRange, (newValue) => {
  if (newValue && newValue.length === 2) {
    filters.value.startDate = newValue[0]
    filters.value.endDate = newValue[1]
  } else {
    filters.value.startDate = ''
    filters.value.endDate = ''
  }
})

// 格式化数字
const formatNumber = (num) => {
  return (num || 0).toLocaleString()
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 应用筛选
const applyFilters = async () => {
  await conversationLogsStore.setFilters(filters.value)
}

// 清空筛选
const handleClearFilters = async () => {
  dateRange.value = null
  await conversationLogsStore.clearFilters()
}

// 排序
const handleSort = (field) => {
  const newOrder = sortBy.value === field && sortOrder.value === 'desc' ? 'asc' : 'desc'
  conversationLogsStore.setSorting(field, newOrder)
}

// 分页
const handlePageChange = (page) => {
  conversationLogsStore.setPage(page)
}

// 查看详情
const viewDetail = async (id) => {
  await conversationLogsStore.loadLogDetail(id)
}

// 关闭详情模态框
const closeDetailModal = () => {
  conversationLogsStore.closeDetailModal()
}

// 刷新列表
const refreshLogs = async () => {
  await conversationLogsStore.loadLogs()
  await conversationLogsStore.loadStats()
  showToast('数据已刷新', 'success')
}

// 复制到剪贴板
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    showToast('已复制到剪贴板', 'success')
  } catch (err) {
    showToast('复制失败', 'error')
  }
}

// 初始化加载数据
onMounted(async () => {
  await conversationLogsStore.loadLogs()
  await conversationLogsStore.loadStats()
})
</script>

<style scoped>
.conversation-logs-view {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 自定义滚动条 */
pre::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

pre::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

pre::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

pre::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.5);
}
</style>
