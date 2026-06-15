const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 41115;

const DATA_DIR = path.join(__dirname, 'data');
const SECRETS_FILE = path.join(DATA_DIR, 'secrets.json');
const REPLIES_FILE = path.join(DATA_DIR, 'replies.json');

const REPLY_STATUS = {
  PENDING: '待审',
  SHOW: '已展示',
  HIDDEN: '已隐藏'
};

const ADMIN_PASSWORD = 'admin123';

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(SECRETS_FILE)) {
  fs.writeFileSync(SECRETS_FILE, JSON.stringify([]));
}

if (!fs.existsSync(REPLIES_FILE)) {
  fs.writeFileSync(REPLIES_FILE, JSON.stringify([]));
}

app.use(cors());
app.use(express.json());

function readSecrets() {
  const data = fs.readFileSync(SECRETS_FILE, 'utf8');
  return JSON.parse(data);
}

function writeSecrets(secrets) {
  fs.writeFileSync(SECRETS_FILE, JSON.stringify(secrets, null, 2));
}

function readReplies() {
  const data = fs.readFileSync(REPLIES_FILE, 'utf8');
  return JSON.parse(data);
}

function writeReplies(replies) {
  fs.writeFileSync(REPLIES_FILE, JSON.stringify(replies, null, 2));
}

function verifyAuth(req, res, next) {
  const authHeader = req.headers['x-admin-password'];
  if (authHeader !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: '未授权的访问' });
  }
  next();
}

app.post('/api/secrets', (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: '秘密内容不能为空' });
    }

    const secrets = readSecrets();
    const newSecret = {
      id: uuidv4(),
      content: content.trim(),
      status: '已宽恕',
      createdAt: new Date().toISOString()
    };

    secrets.push(newSecret);
    writeSecrets(secrets);

    res.json({
      success: true,
      message: '你的秘密已被宽恕',
      secret: newSecret
    });
  } catch (error) {
    console.error('保存秘密时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/secrets/random', (req, res) => {
  try {
    const secrets = readSecrets();
    const forgivenSecrets = secrets.filter(s => s.status === '已宽恕');

    if (forgivenSecrets.length === 0) {
      return res.json({
        hasSecret: false,
        message: '还没有被宽恕的秘密，成为第一个分享的人吧'
      });
    }

    const randomIndex = Math.floor(Math.random() * forgivenSecrets.length);
    const randomSecret = forgivenSecrets[randomIndex];

    res.json({
      hasSecret: true,
      secret: {
        id: randomSecret.id,
        content: randomSecret.content,
        status: randomSecret.status
      }
    });
  } catch (error) {
    console.error('获取随机秘密时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/secrets/:id/replies', (req, res) => {
  try {
    const { id } = req.params;
    const replies = readReplies();
    const secretReplies = replies
      .filter(r => r.secretId === id && r.status === REPLY_STATUS.SHOW)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      replies: secretReplies.map(r => ({
        id: r.id,
        content: r.content,
        status: r.status,
        createdAt: r.createdAt
      }))
    });
  } catch (error) {
    console.error('获取回复时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.post('/api/secrets/:id/replies', (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: '回复内容不能为空' });
    }

    if (content.length > 300) {
      return res.status(400).json({ error: '回复不能超过300字' });
    }

    const secrets = readSecrets();
    const secret = secrets.find(s => s.id === id);
    if (!secret) {
      return res.status(404).json({ error: '秘密不存在' });
    }

    const replies = readReplies();
    const newReply = {
      id: uuidv4(),
      secretId: id,
      content: content.trim(),
      status: REPLY_STATUS.PENDING,
      createdAt: new Date().toISOString()
    };

    replies.push(newReply);
    writeReplies(replies);

    res.json({
      success: true,
      message: '回复已提交，等待审核展示',
      reply: {
        id: newReply.id,
        status: newReply.status
      }
    });
  } catch (error) {
    console.error('保存回复时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.post('/api/admin/login', (req, res) => {
  try {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
      res.json({ success: true, message: '登录成功' });
    } else {
      res.status(401).json({ success: false, error: '密码错误' });
    }
  } catch (error) {
    console.error('登录时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/admin/secrets', verifyAuth, (req, res) => {
  try {
    const secrets = readSecrets();
    const replies = readReplies();

    const secretsWithReplyCount = secrets.map(secret => {
      const secretReplies = replies.filter(r => r.secretId === secret.id);
      return {
        ...secret,
        replyCount: secretReplies.length,
        pendingCount: secretReplies.filter(r => r.status === REPLY_STATUS.PENDING).length,
        showCount: secretReplies.filter(r => r.status === REPLY_STATUS.SHOW).length,
        hiddenCount: secretReplies.filter(r => r.status === REPLY_STATUS.HIDDEN).length
      };
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      secrets: secretsWithReplyCount
    });
  } catch (error) {
    console.error('获取秘密列表时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/admin/secrets/:id/replies', verifyAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.query;
    const replies = readReplies();

    let secretReplies = replies.filter(r => r.secretId === id);

    if (status && status !== '全部') {
      secretReplies = secretReplies.filter(r => r.status === status);
    }

    secretReplies.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      replies: secretReplies
    });
  } catch (error) {
    console.error('获取回复时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.put('/api/admin/replies/:id/status', verifyAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!Object.values(REPLY_STATUS).includes(status)) {
      return res.status(400).json({ error: '无效的状态值' });
    }

    const replies = readReplies();
    const replyIndex = replies.findIndex(r => r.id === id);

    if (replyIndex === -1) {
      return res.status(404).json({ error: '回复不存在' });
    }

    replies[replyIndex].status = status;
    writeReplies(replies);

    res.json({
      success: true,
      message: '状态已更新',
      reply: replies[replyIndex]
    });
  } catch (error) {
    console.error('更新回复状态时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/admin/stats', verifyAuth, (req, res) => {
  try {
    const secrets = readSecrets();
    const replies = readReplies();

    res.json({
      success: true,
      stats: {
        totalSecrets: secrets.length,
        totalReplies: replies.length,
        pendingReplies: replies.filter(r => r.status === REPLY_STATUS.PENDING).length,
        showReplies: replies.filter(r => r.status === REPLY_STATUS.SHOW).length,
        hiddenReplies: replies.filter(r => r.status === REPLY_STATUS.HIDDEN).length
      }
    });
  } catch (error) {
    console.error('获取统计时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`忏悔室后端服务运行在 http://localhost:${PORT}`);
  console.log(`管理员默认密码: ${ADMIN_PASSWORD}`);
});
