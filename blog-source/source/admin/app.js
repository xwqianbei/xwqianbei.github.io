// ===== State & Configuration =====
const REPO_OWNER = 'xwqianbei';
const REPO_NAME = 'xwqianbei.github.io';
const REPO_PATH = 'blog-source/source/_posts/';

let githubToken = localStorage.getItem('gh_token') || '';
let currentSessionWords = 0;
let startTime = null;

// ===== DOM Elements =====
const authOverlay = document.getElementById('auth-overlay');
const appContainer = document.getElementById('app');
const tokenInput = document.getElementById('gh-token-input');
const loginBtn = document.getElementById('login-btn');
const authError = document.getElementById('auth-error');

const titleInput = document.getElementById('post-title');
const contentInput = document.getElementById('post-content');
const filenameInput = document.getElementById('post-filename');
const categoriesInput = document.getElementById('post-categories');
const tagsInput = document.getElementById('post-tags');

const publishBtn = document.getElementById('publish-btn');
const wordCountEl = document.getElementById('footer-word-count');
const sessionWordCountEl = document.getElementById('session-word-count');
const typingSpeedEl = document.getElementById('typing-speed');
const writingTimeEl = document.getElementById('writing-time');
const clockEl = document.getElementById('clock');
const toastEl = document.getElementById('toast');

// ===== Initialization =====
function init() {
    if (githubToken) {
        verifyToken(githubToken);
    }
    updateClock();
    setInterval(updateClock, 1000);
}

// ===== Authentication =====
loginBtn.addEventListener('click', () => {
    const token = tokenInput.value.trim();
    if (!token) {
        authError.textContent = 'Token 不能为空';
        return;
    }
    loginBtn.textContent = '验证中...';
    verifyToken(token);
});

async function verifyToken(token) {
    try {
        const response = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        if (response.ok) {
            githubToken = token;
            localStorage.setItem('gh_token', token);
            unlockApp();
        } else {
            authError.textContent = 'Token 无效或已过期';
            loginBtn.textContent = '进入写作';
            localStorage.removeItem('gh_token');
        }
    } catch (e) {
        authError.textContent = '网络错误，请检查连接';
        loginBtn.textContent = '进入写作';
    }
}

function unlockApp() {
    authOverlay.classList.remove('active');
    setTimeout(() => authOverlay.classList.add('hidden'), 300);
    appContainer.classList.remove('hidden');
    startTime = new Date();
    setInterval(updateWritingStats, 1000);
}

// ===== Editor Logic =====
contentInput.addEventListener('input', () => {
    const text = contentInput.value;
    // Simple Chinese/English word count
    const words = text.replace(/[\s\n\r]+/g, '').length;
    wordCountEl.textContent = `本文: ${words}字`;
    sessionWordCountEl.textContent = `${words}字`;
    currentSessionWords = words;
});

// Sync filename with title if empty
titleInput.addEventListener('blur', () => {
    if (!filenameInput.value && titleInput.value) {
        // Convert to pinyin-like or just url-safe string
        filenameInput.value = new Date().toISOString().split('T')[0] + '-' + titleInput.value.replace(/\s+/g, '-');
    }
});

function updateClock() {
    const now = new Date();
    clockEl.textContent = now.getFullYear() + '.' + 
        String(now.getMonth()+1).padStart(2,'0') + '.' + 
        String(now.getDate()).padStart(2,'0') + ' ' + 
        String(now.getHours()).padStart(2,'0') + ':' + 
        String(now.getMinutes()).padStart(2,'0');
}

function updateWritingStats() {
    if (!startTime) return;
    const now = new Date();
    const diff = Math.floor((now - startTime) / 1000);
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    writingTimeEl.textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
    
    if (mins > 0) {
        const speed = Math.round(currentSessionWords / mins);
        typingSpeedEl.textContent = `${speed} 字/分`;
    }
}

// ===== Publish to GitHub =====
publishBtn.addEventListener('click', async () => {
    if (!titleInput.value) return showToast('请输入文章标题', 'error');
    if (!filenameInput.value) return showToast('请输入文件名', 'error');
    if (!contentInput.value) return showToast('内容不能为空', 'error');

    publishBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
    
    // 1. Build Front-matter
    const dateStr = new Date().toISOString().replace('T', ' ').split('.')[0];
    const tags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t);
    const categories = categoriesInput.value.split(',').map(c => c.trim()).filter(c => c);
    
    let frontMatter = `---\ntitle: ${titleInput.value}\ndate: ${dateStr}\n`;
    if (tags.length) frontMatter += `tags:\n${tags.map(t => `  - ${t}`).join('\n')}\n`;
    if (categories.length) frontMatter += `categories:\n${categories.map(c => `  - ${c}`).join('\n')}\n`;
    frontMatter += `---\n\n`;

    const fullContent = frontMatter + contentInput.value;
    const filename = filenameInput.value.endsWith('.md') ? filenameInput.value : `${filenameInput.value}.md`;
    const path = `${REPO_PATH}${filename}`;

    try {
        // 2. Check if file exists to get SHA (for updates)
        let sha = undefined;
        const getRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
            headers: { 'Authorization': `token ${githubToken}` }
        });
        if (getRes.ok) {
            const data = await getRes.json();
            sha = data.sha;
        }

        // 3. UTF-8 Base64 Encoding
        const base64Content = btoa(unescape(encodeURIComponent(fullContent)));

        // 4. PUT Request
        const putRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Publish post: ${titleInput.value} via Admin UI`,
                content: base64Content,
                sha: sha
            })
        });

        if (putRes.ok) {
            showToast('文章发布成功！', 'success');
        } else {
            const err = await putRes.json();
            showToast(`发布失败: ${err.message}`, 'error');
        }
    } catch (e) {
        showToast('网络错误，发布失败', 'error');
    } finally {
        publishBtn.innerHTML = '<i class="ph ph-upload-simple"></i>';
    }
});

// ===== Utilities =====
function showToast(msg, type = 'success') {
    toastEl.textContent = msg;
    toastEl.className = `toast ${type} show`;
    setTimeout(() => {
        toastEl.className = 'toast';
    }, 3000);
}

// Start app
init();
