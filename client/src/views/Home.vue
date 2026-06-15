<template>
  <div class="home-container">
    <div class="card secret-card">
      <div class="card-header">
        <span class="icon">💫</span>
        <h2>今日被宽恕的秘密</h2>
      </div>

      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>正在寻找一段温暖的秘密...</p>
      </div>

      <div v-else-if="!hasSecret" class="empty-state">
        <span class="empty-icon">🌸</span>
        <p>{{ message }}</p>
        <button class="btn btn-primary" @click="goToConfess">
          分享第一个秘密
        </button>
      </div>

      <transition name="fade" v-else>
        <div class="secret-content" :key="secret?.id">
          <p class="secret-text">"{{ secret.content }}"</p>
          <div class="secret-footer">
            <span class="status-badge">{{ secret.status }}</span>
            <button class="btn btn-secondary refresh-btn" @click="fetchRandomSecret" :disabled="refreshing">
              <span v-if="refreshing">
                <span class="btn-spinner-sm"></span>
                加载中...
              </span>
              <span v-else>🔄 换一个</span>
            </button>
          </div>

          <div class="reply-section">
            <div class="reply-header">
              <h3>💝 送上你的安慰</h3>
              <p class="reply-subtitle">每一句温暖的话语，都可能成为照亮他人的光</p>
            </div>

            <div class="reply-form">
              <textarea
                v-model="replyContent"
                class="reply-input"
                placeholder="写下你想说的安慰的话...（300字以内）"
                rows="3"
                :disabled="submittingReply"
              ></textarea>
              <div class="reply-form-row">
                <span class="char-count">{{ replyContent.length }} / 300</span>
                <button
                  class="btn btn-primary submit-reply-btn"
                  @click="submitReply"
                  :disabled="submittingReply || !replyContent.trim() || replyContent.length > 300"
                >
                  <span v-if="submittingReply">
                    <span class="btn-spinner-sm"></span>
                    提交中...
                  </span>
                  <span v-else>🌟 送出安慰</span>
                </button>
              </div>
              <div v-if="replySuccess" class="success-message">
                ✓ {{ replySuccessMsg }}
              </div>
              <div v-if="replyError" class="error-message">
                {{ replyError }}
              </div>
            </div>

            <div class="replies-list">
              <div class="replies-list-header">
                <span class="replies-title">📮 已展示的安慰 ({{ replies.length }})</span>
                <button
                  v-if="replies.length > 0"
                  class="btn btn-link refresh-replies-btn"
                  @click="fetchReplies"
                >
                  刷新
                </button>
              </div>

              <div v-if="loadingReplies" class="replies-loading">
                <div class="spinner-sm"></div>
              </div>

              <div v-else-if="replies.length === 0" class="no-replies">
                <p>暂时还没有人送上安慰，成为第一个吧 💜</p>
              </div>

              <transition-group name="reply-list" tag="div" v-else class="replies-container">
                <div v-for="reply in replies" :key="reply.id" class="reply-item">
                  <p class="reply-content">{{ reply.content }}</p>
                  <div class="reply-meta">
                    <span class="reply-date">{{ formatDate(reply.createdAt) }}</span>
                  </div>
                </div>
              </transition-group>
            </div>
          </div>
        </div>
      </transition>

      <div class="card-actions">
        <button class="btn btn-primary" @click="goToConfess">
          我也想倾诉
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(true)
const refreshing = ref(false)
const hasSecret = ref(false)
const secret = ref(null)
const message = ref('')

const replyContent = ref('')
const submittingReply = ref(false)
const replyError = ref('')
const replySuccess = ref(false)
const replySuccessMsg = ref('')

const replies = ref([])
const loadingReplies = ref(false)

function formatDate(isoString) {
  const date = new Date(isoString)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

async function fetchRandomSecret() {
  if (refreshing.value) return
  refreshing.value = true
  loading.value = true
  hasSecret.value = false
  secret.value = null
  replies.value = []
  replyContent.value = ''
  replyError.value = ''
  replySuccess.value = false

  try {
    const response = await fetch('/api/secrets/random')
    const data = await response.json()
    hasSecret.value = data.hasSecret
    secret.value = data.secret
    message.value = data.message

    if (data.hasSecret && data.secret) {
      fetchReplies()
    }
  } catch (error) {
    console.error('获取秘密失败:', error)
    hasSecret.value = false
    message.value = '暂时无法连接到服务器'
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function fetchReplies() {
  if (!secret.value) return
  loadingReplies.value = true
  try {
    const response = await fetch(`/api/secrets/${secret.value.id}/replies`)
    const data = await response.json()
    if (data.success) {
      replies.value = data.replies
    }
  } catch (error) {
    console.error('获取回复失败:', error)
  } finally {
    loadingReplies.value = false
  }
}

async function submitReply() {
  if (!secret.value || !replyContent.value.trim()) return

  submittingReply.value = true
  replyError.value = ''
  replySuccess.value = false

  try {
    const response = await fetch(`/api/secrets/${secret.value.id}/replies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: replyContent.value
      })
    })

    const data = await response.json()

    if (response.ok && data.success) {
      replySuccess.value = true
      replySuccessMsg.value = data.message
      replyContent.value = ''
    } else {
      replyError.value = data.error || '提交失败，请稍后重试'
    }
  } catch (err) {
    console.error('提交回复失败:', err)
    replyError.value = '无法连接到服务器，请稍后重试'
  } finally {
    submittingReply.value = false
  }
}

function goToConfess() {
  router.push('/confess')
}

onMounted(() => {
  fetchRandomSecret()
})
</script>

<style scoped>
.home-container {
  width: 100%;
  max-width: 700px;
}

.secret-card {
  animation: slideUp 0.6s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-header {
  text-align: center;
  margin-bottom: 30px;
}

.icon {
  font-size: 48px;
  display: block;
  margin-bottom: 10px;
}

.card-header h2 {
  color: #333;
  font-size: 24px;
  font-weight: 600;
}

.loading {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(102, 126, 234, 0.3);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

.spinner-sm {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(102, 126, 234, 0.3);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 20px;
}

.empty-state p {
  color: #666;
  font-size: 16px;
  margin-bottom: 30px;
}

.secret-content {
  padding: 20px 0;
}

.secret-text {
  font-size: 20px;
  line-height: 1.8;
  color: #333;
  font-style: italic;
  text-align: center;
  margin-bottom: 30px;
  padding: 0 10px;
}

.secret-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.status-badge {
  background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
  color: #2d5a4a;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.refresh-btn {
  padding: 8px 20px;
  font-size: 14px;
  color: #666;
  background: #f0f0f0;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.refresh-btn:hover:not(:disabled) {
  background: #e0e0e0;
  transform: translateY(-1px);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.reply-section {
  margin-top: 40px;
  padding-top: 30px;
  border-top: 1px solid #eee;
}

.reply-header {
  margin-bottom: 20px;
}

.reply-header h3 {
  color: #333;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.reply-subtitle {
  color: #888;
  font-size: 13px;
  margin: 0;
}

.reply-form {
  margin-bottom: 25px;
}

.reply-input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 15px;
  font-family: inherit;
  resize: none;
  transition: all 0.3s ease;
  line-height: 1.6;
  background: #fafafa;
  box-sizing: border-box;
}

.reply-input:focus {
  outline: none;
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.reply-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.reply-input::placeholder {
  color: #aaa;
}

.reply-form-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  gap: 15px;
  flex-wrap: wrap;
}

.char-count {
  font-size: 13px;
  color: #999;
}

.submit-reply-btn {
  font-size: 15px;
  padding: 10px 24px;
}

.btn-spinner-sm {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 6px;
  vertical-align: middle;
}

.success-message {
  margin-top: 12px;
  background: #f0fdf4;
  color: #15803d;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  border-left: 4px solid #22c55e;
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 10px 16px;
  border-radius: 8px;
  margin-top: 12px;
  font-size: 14px;
  border-left: 4px solid #dc2626;
}

.replies-list {
  margin-top: 20px;
}

.replies-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.replies-title {
  color: #555;
  font-size: 15px;
  font-weight: 500;
}

.btn-link {
  background: none;
  border: none;
  color: #667eea;
  padding: 4px 8px;
  font-size: 13px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.2s ease;
}

.btn-link:hover {
  background: rgba(102, 126, 234, 0.1);
}

.replies-loading {
  padding: 25px;
  text-align: center;
}

.no-replies {
  padding: 25px;
  text-align: center;
  background: #fafafa;
  border-radius: 12px;
}

.no-replies p {
  color: #999;
  font-size: 14px;
  margin: 0;
}

.replies-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reply-item {
  background: linear-gradient(135deg, #fef9ff 0%, #f0f4ff 100%);
  padding: 16px 18px;
  border-radius: 12px;
  border-left: 3px solid #a78bfa;
}

.reply-content {
  color: #444;
  font-size: 14px;
  line-height: 1.7;
  margin: 0 0 8px 0;
}

.reply-meta {
  text-align: right;
}

.reply-date {
  color: #aaa;
  font-size: 12px;
}

.reply-list-enter-active {
  animation: replyIn 0.4s ease;
}

.reply-list-leave-active {
  animation: replyOut 0.3s ease;
}

@keyframes replyIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes replyOut {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-10px);
  }
}

.card-actions {
  margin-top: 40px;
  text-align: center;
  padding-top: 30px;
  border-top: 1px solid #eee;
}
</style>
