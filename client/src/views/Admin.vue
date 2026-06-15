<template>
  <div class="admin-container">
    <div v-if="!isLoggedIn" class="card login-card">
      <div class="login-header">
        <span class="login-icon">🔐</span>
        <h2>管理后台登录</h2>
        <p class="login-subtitle">请输入管理员密码以继续</p>
      </div>

      <div class="login-form">
        <div class="form-group">
          <input
            v-model="passwordInput"
            type="password"
            class="password-input"
            placeholder="请输入管理员密码"
            @keyup.enter="handleLogin"
            :disabled="loggingIn"
          />
        </div>
        <div v-if="loginError" class="error-message">
          {{ loginError }}
        </div>
        <button
          class="btn btn-primary login-btn"
          @click="handleLogin"
          :disabled="loggingIn || !passwordInput"
        >
          <span v-if="loggingIn">
            <span class="btn-spinner"></span>
            登录中...
          </span>
          <span v-else>登 录</span>
        </button>
      </div>
    </div>

    <div v-else class="dashboard">
      <div class="dashboard-header">
        <h2>📊 回复管理中心</h2>
        <button class="btn btn-secondary logout-btn" @click="handleLogout">
          退出登录
        </button>
      </div>

      <div class="stats-row">
        <div class="stat-card stat-total">
          <div class="stat-icon">📝</div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.totalSecrets }}</span>
            <span class="stat-label">秘密总数</span>
          </div>
        </div>
        <div class="stat-card stat-replies">
          <div class="stat-icon">💬</div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.totalReplies }}</span>
            <span class="stat-label">回复总数</span>
          </div>
        </div>
        <div class="stat-card stat-pending">
          <div class="stat-icon">⏳</div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.pendingReplies }}</span>
            <span class="stat-label">待审核</span>
          </div>
        </div>
        <div class="stat-card stat-show">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.showReplies }}</span>
            <span class="stat-label">已展示</span>
          </div>
        </div>
        <div class="stat-card stat-hidden">
          <div class="stat-icon">🚫</div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.hiddenReplies }}</span>
            <span class="stat-label">已隐藏</span>
          </div>
        </div>
      </div>

      <div class="main-content">
        <div class="secrets-panel card">
          <div class="panel-header">
            <h3>📋 秘密列表</h3>
            <button class="btn btn-link" @click="fetchSecrets">刷新</button>
          </div>
          <div v-if="loadingSecrets" class="loading-small">
            <div class="spinner-sm"></div>
          </div>
          <div v-else-if="secrets.length === 0" class="empty-tip">
            暂无秘密数据
          </div>
          <div v-else class="secrets-list">
            <div
              v-for="secret in secrets"
              :key="secret.id"
              class="secret-item"
              :class="{ active: selectedSecretId === secret.id }"
              @click="selectSecret(secret)"
            >
              <p class="secret-preview">{{ secret.content }}</p>
              <div class="secret-meta">
                <span class="meta-time">{{ formatDate(secret.createdAt) }}</span>
                <div class="reply-counts">
                  <span v-if="secret.pendingCount > 0" class="count-pending" :title="`待审 ${secret.pendingCount} 条`">
                    ⏳ {{ secret.pendingCount }}
                  </span>
                  <span v-if="secret.showCount > 0" class="count-show" :title="`已展示 ${secret.showCount} 条`">
                    ✅ {{ secret.showCount }}
                  </span>
                  <span v-if="secret.hiddenCount > 0" class="count-hidden" :title="`已隐藏 ${secret.hiddenCount} 条`">
                    🚫 {{ secret.hiddenCount }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="replies-panel card">
          <div v-if="!selectedSecretId" class="no-selection">
            <span class="no-selection-icon">👈</span>
            <p>请从左侧选择一个秘密查看回复</p>
          </div>
          <div v-else>
            <div class="panel-header">
              <h3>💬 回复管理</h3>
              <div class="filter-group">
                <button
                  v-for="status in statusFilters"
                  :key="status.value"
                  class="filter-btn"
                  :class="{ active: currentFilter === status.value }"
                  @click="setFilter(status.value)"
                >
                  {{ status.label }}
                </button>
              </div>
            </div>

            <div class="selected-secret-preview">
              <p class="selected-secret-text">"{{ selectedSecretContent }}"</p>
            </div>

            <div v-if="loadingReplies" class="loading-small">
              <div class="spinner-sm"></div>
            </div>
            <div v-else-if="replies.length === 0" class="empty-tip">
              当前筛选条件下暂无回复
            </div>
            <div v-else class="replies-manage-list">
              <div
                v-for="reply in replies"
                :key="reply.id"
                class="reply-manage-item"
                :class="`status-${reply.status}`"
              >
                <div class="reply-main">
                  <div class="reply-status-tag">
                    <span :class="`status-tag status-tag-${reply.status}`">{{ reply.status }}</span>
                  </div>
                  <p class="reply-manage-content">{{ reply.content }}</p>
                  <div class="reply-manage-meta">
                    <span>📅 {{ formatFullDate(reply.createdAt) }}</span>
                  </div>
                </div>
                <div class="reply-actions">
                  <button
                    v-if="reply.status !== '已展示'"
                    class="action-btn action-show"
                    @click="updateReplyStatus(reply.id, '已展示')"
                    :disabled="updatingReplyId === reply.id"
                    title="设为已展示"
                  >
                    ✅ 展示
                  </button>
                  <button
                    v-if="reply.status !== '已隐藏'"
                    class="action-btn action-hide"
                    @click="updateReplyStatus(reply.id, '已隐藏')"
                    :disabled="updatingReplyId === reply.id"
                    title="设为已隐藏"
                  >
                    🚫 隐藏
                  </button>
                  <button
                    v-if="reply.status !== '待审'"
                    class="action-btn action-pending"
                    @click="updateReplyStatus(reply.id, '待审')"
                    :disabled="updatingReplyId === reply.id"
                    title="设为待审核"
                  >
                    ⏳ 待审
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const ADMIN_TOKEN_KEY = 'admin_session_token'

const isLoggedIn = ref(false)
const passwordInput = ref('')
const loginError = ref('')
const loggingIn = ref(false)
const sessionToken = ref(null)

const stats = ref({
  totalSecrets: 0,
  totalReplies: 0,
  pendingReplies: 0,
  showReplies: 0,
  hiddenReplies: 0
})

const secrets = ref([])
const loadingSecrets = ref(false)
const selectedSecretId = ref(null)
const selectedSecretContent = ref('')

const statusFilters = [
  { label: '全部', value: '全部' },
  { label: '⏳ 待审', value: '待审' },
  { label: '✅ 已展示', value: '已展示' },
  { label: '🚫 已隐藏', value: '已隐藏' }
]
const currentFilter = ref('全部')
const replies = ref([])
const loadingReplies = ref(false)
const updatingReplyId = ref(null)

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-admin-token': sessionToken.value || ''
  }
}

function formatDate(isoString) {
  const date = new Date(isoString)
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit'
  })
}

function formatFullDate(isoString) {
  const date = new Date(isoString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function truncateText(text, maxLen = 50) {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}

async function handleLogin() {
  if (!passwordInput.value.trim()) return

  loggingIn.value = true
  loginError.value = ''

  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password: passwordInput.value })
    })

    const data = await response.json()

    if (response.ok && data.success) {
      sessionToken.value = data.token
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token)
      isLoggedIn.value = true
      passwordInput.value = ''
      await Promise.all([fetchStats(), fetchSecrets()])
    } else {
      loginError.value = data.error || '登录失败，请检查密码'
    }
  } catch (error) {
    console.error('登录失败:', error)
    loginError.value = '无法连接到服务器'
  } finally {
    loggingIn.value = false
  }
}

async function handleLogout() {
  try {
    await fetch('/api/admin/logout', {
      method: 'POST',
      headers: authHeaders()
    })
  } catch (e) {
    // ignore
  }
  localStorage.removeItem(ADMIN_TOKEN_KEY)
  sessionToken.value = null
  isLoggedIn.value = false
  passwordInput.value = ''
  loginError.value = ''
  secrets.value = []
  replies.value = []
  selectedSecretId.value = ''
}

async function fetchStats() {
  try {
    const response = await fetch('/api/admin/stats', {
      headers: authHeaders()
    })
    if (response.status === 401) {
      forceLogout()
      return
    }
    const data = await response.json()
    if (data.success) {
      stats.value = data.stats
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

async function fetchSecrets() {
  loadingSecrets.value = true
  try {
    const response = await fetch('/api/admin/secrets', {
      headers: authHeaders()
    })
    if (response.status === 401) {
      forceLogout()
      return
    }
    const data = await response.json()
    if (data.success) {
      secrets.value = data.secrets
    }
  } catch (error) {
    console.error('获取秘密列表失败:', error)
  } finally {
    loadingSecrets.value = false
  }
}

async function selectSecret(secret) {
  selectedSecretId.value = secret.id
  selectedSecretContent.value = secret.content
  await fetchReplies()
}

function setFilter(status) {
  currentFilter.value = status
  if (selectedSecretId.value) {
    fetchReplies()
  }
}

async function fetchReplies() {
  if (!selectedSecretId.value) return

  loadingReplies.value = true
  try {
    const url = new URL(`/api/admin/secrets/${selectedSecretId.value}/replies`, window.location.origin)
    if (currentFilter.value !== '全部') {
      url.searchParams.set('status', currentFilter.value)
    }

    const response = await fetch(url.toString(), {
      headers: authHeaders()
    })
    if (response.status === 401) {
      forceLogout()
      return
    }
    const data = await response.json()
    if (data.success) {
      replies.value = data.replies
    }
  } catch (error) {
    console.error('获取回复列表失败:', error)
  } finally {
    loadingReplies.value = false
  }
}

async function updateReplyStatus(replyId, newStatus) {
  updatingReplyId.value = replyId
  try {
    const response = await fetch(`/api/admin/replies/${replyId}/status`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ status: newStatus })
    })
    if (response.status === 401) {
      forceLogout()
      return
    }
    const data = await response.json()
    if (data.success) {
      await Promise.all([fetchStats(), fetchSecrets(), fetchReplies()])
    } else {
      alert(data.error || '操作失败')
    }
  } catch (error) {
    console.error('更新回复状态失败:', error)
    alert('操作失败，请稍后重试')
  } finally {
    updatingReplyId.value = null
  }
}

function forceLogout() {
  localStorage.removeItem(ADMIN_TOKEN_KEY)
  sessionToken.value = null
  isLoggedIn.value = false
  loginError.value = '会话已过期，请重新登录'
  secrets.value = []
  replies.value = []
  selectedSecretId.value = ''
}

async function verifyAndRestore() {
  const savedToken = localStorage.getItem(ADMIN_TOKEN_KEY)
  if (!savedToken) return

  sessionToken.value = savedToken
  try {
    const response = await fetch('/api/admin/verify', {
      headers: authHeaders()
    })
    if (response.ok) {
      isLoggedIn.value = true
      await Promise.all([fetchStats(), fetchSecrets()])
    } else {
      localStorage.removeItem(ADMIN_TOKEN_KEY)
      sessionToken.value = null
    }
  } catch (error) {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    sessionToken.value = null
  }
}

onMounted(() => {
  verifyAndRestore()
})
</script>

<style scoped>
.admin-container {
  width: 100%;
  max-width: 1400px;
}

.login-card {
  max-width: 420px;
  margin: 0 auto;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-icon {
  font-size: 56px;
  display: block;
  margin-bottom: 15px;
}

.login-header h2 {
  color: #333;
  font-size: 24px;
  margin-bottom: 8px;
}

.login-subtitle {
  color: #888;
  font-size: 14px;
  margin: 0;
}

.login-form {
  margin-bottom: 0;
}

.password-input {
  width: 100%;
  padding: 14px 18px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 16px;
  box-sizing: border-box;
  transition: all 0.3s ease;
}

.password-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.password-input:disabled {
  opacity: 0.6;
  background: #f5f5f5;
}

.login-btn {
  width: 100%;
  margin-top: 20px;
  padding: 14px;
  font-size: 16px;
}

.btn-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 8px;
  vertical-align: middle;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.dashboard-header h2 {
  color: #333;
  font-size: 26px;
  margin: 0;
}

.logout-btn {
  padding: 8px 20px;
  font-size: 14px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 25px;
}

.stat-card {
  background: white;
  border-radius: 14px;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border-left: 4px solid #667eea;
}

.stat-total { border-left-color: #667eea; }
.stat-replies { border-left-color: #8b5cf6; }
.stat-pending { border-left-color: #f59e0b; }
.stat-show { border-left-color: #22c55e; }
.stat-hidden { border-left-color: #ef4444; }

.stat-icon {
  font-size: 32px;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #333;
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: #888;
  margin-top: 4px;
}

.main-content {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 20px;
  align-items: start;
}

.card {
  background: white;
  border-radius: 14px;
  padding: 22px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid #f0f0f0;
}

.panel-header h3 {
  color: #333;
  font-size: 17px;
  margin: 0;
}

.loading-small {
  padding: 30px;
  text-align: center;
}

.spinner-sm {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(102, 126, 234, 0.2);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}

.empty-tip {
  padding: 40px 20px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

.secrets-list {
  max-height: 620px;
  overflow-y: auto;
  padding-right: 4px;
}

.secrets-list::-webkit-scrollbar {
  width: 6px;
}

.secrets-list::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 3px;
}

.secret-item {
  padding: 14px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  margin-bottom: 10px;
}

.secret-item:hover {
  background: #f8f9ff;
}

.secret-item.active {
  background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%);
  border-color: #c7d2fe;
}

.secret-preview {
  color: #444;
  font-size: 14px;
  line-height: 1.6;
  margin: 0 0 10px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.secret-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.meta-time {
  font-size: 12px;
  color: #aaa;
}

.reply-counts {
  display: flex;
  gap: 8px;
}

.count-pending,
.count-show,
.count-hidden {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.count-pending {
  background: #fffbeb;
  color: #b45309;
}

.count-show {
  background: #f0fdf4;
  color: #15803d;
}

.count-hidden {
  background: #fef2f2;
  color: #b91c1c;
}

.no-selection {
  padding: 80px 20px;
  text-align: center;
  color: #aaa;
}

.no-selection-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 15px;
  opacity: 0.6;
}

.filter-group {
  display: flex;
  gap: 6px;
}

.filter-btn {
  padding: 6px 14px;
  font-size: 13px;
  border: 1px solid #e0e0e0;
  background: white;
  border-radius: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #666;
}

.filter-btn:hover {
  background: #f5f5f5;
  border-color: #ccc;
}

.filter-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: transparent;
  color: white;
}

.selected-secret-preview {
  background: linear-gradient(135deg, #fef9ff 0%, #f0f4ff 100%);
  padding: 16px 20px;
  border-radius: 12px;
  margin-bottom: 20px;
  border-left: 4px solid #a78bfa;
}

.selected-secret-text {
  color: #555;
  font-size: 14px;
  line-height: 1.7;
  margin: 0;
  font-style: italic;
}

.replies-manage-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 540px;
  overflow-y: auto;
  padding-right: 4px;
}

.replies-manage-list::-webkit-scrollbar {
  width: 6px;
}

.replies-manage-list::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 3px;
}

.reply-manage-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #eee;
  transition: all 0.2s ease;
}

.reply-manage-item:hover {
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.reply-manage-item.status-待审 {
  background: #fffbeb;
  border-color: #fde68a;
}

.reply-manage-item.status-已展示 {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.reply-manage-item.status-已隐藏 {
  background: #fef2f2;
  border-color: #fecaca;
}

.reply-main {
  flex: 1;
  min-width: 0;
}

.reply-status-tag {
  margin-bottom: 8px;
}

.status-tag {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 10px;
  font-weight: 500;
}

.status-tag-待审 {
  background: #f59e0b;
  color: white;
}

.status-tag-已展示 {
  background: #22c55e;
  color: white;
}

.status-tag-已隐藏 {
  background: #ef4444;
  color: white;
}

.reply-manage-content {
  color: #333;
  font-size: 14px;
  line-height: 1.7;
  margin: 0 0 10px 0;
}

.reply-manage-meta {
  font-size: 12px;
  color: #999;
}

.reply-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.action-btn {
  padding: 7px 14px;
  font-size: 13px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  white-space: nowrap;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-show {
  background: #22c55e;
  color: white;
}

.action-show:hover:not(:disabled) {
  background: #16a34a;
}

.action-hide {
  background: #ef4444;
  color: white;
}

.action-hide:hover:not(:disabled) {
  background: #dc2626;
}

.action-pending {
  background: #f59e0b;
  color: white;
}

.action-pending:hover:not(:disabled) {
  background: #d97706;
}

@media (max-width: 1100px) {
  .stats-row {
    grid-template-columns: repeat(3, 1fr);
  }
  .main-content {
    grid-template-columns: 1fr;
  }
  .secrets-list {
    max-height: 300px;
  }
}

@media (max-width: 640px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .dashboard-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  .filter-group {
    flex-wrap: wrap;
  }
  .reply-manage-item {
    flex-direction: column;
  }
  .reply-actions {
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
