// ===== Configuration =====
const REPO_OWNER = 'xwqianbei';
const REPO_NAME = 'xwqianbei.github.io';
const REPO_PATH = 'blog-source/source/_posts/';
const TOKEN_KEY = 'gh_token';
const DRAFT_KEY = 'hexo_admin_drafts_v2';
const THEME_KEY = 'hexo_admin_theme';

const state = {
    githubToken: localStorage.getItem(TOKEN_KEY) || '',
    remotePosts: [],
    drafts: [],
    currentDoc: null,
    currentSha: null,
    currentPath: '',
    activeListView: 'posts',
    editorMode: 'split',
    autosaveTimer: null,
    writingTimer: null,
    startTime: null,
    currentWords: 0,
    isHydrating: false,
    activity: []
};

// ===== DOM =====
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const dom = {
    authOverlay: $('#auth-overlay'),
    app: $('#app'),
    tokenInput: $('#gh-token-input'),
    loginBtn: $('#login-btn'),
    authError: $('#auth-error'),
    connectionStatus: $('#connection-status'),
    saveStatus: $('#save-status'),
    themeToggle: $('#theme-toggle'),
    openRepoBtn: $('#open-repo-btn'),
    refreshPostsBtn: $('#refresh-posts-btn'),
    postSearch: $('#post-search'),
    docList: $('#doc-list'),
    remoteCount: $('#remote-count'),
    draftCount: $('#draft-count'),
    newPostBtn: $('#new-post-btn'),
    saveDraftBtn: $('#save-draft-btn'),
    editorPanel: $('.editor-panel'),
    titleInput: $('#post-title'),
    contentInput: $('#post-content'),
    filenameInput: $('#post-filename'),
    dateInput: $('#post-date'),
    tagsInput: $('#post-tags'),
    categoriesInput: $('#post-categories'),
    coverInput: $('#post-cover'),
    excerptInput: $('#post-excerpt'),
    currentFileStatus: $('#current-file-status'),
    currentPathChip: $('#current-path-chip'),
    currentShaChip: $('#current-sha-chip'),
    lastSavedChip: $('#last-saved-chip'),
    duplicateBtn: $('#duplicate-btn'),
    publishBtn: $('#publish-btn'),
    preview: $('#preview'),
    previewWordCount: $('#preview-word-count'),
    wordCount: $('#word-count'),
    charCount: $('#char-count'),
    lineCount: $('#line-count'),
    readingTime: $('#reading-time'),
    metricChars: $('#metric-chars'),
    metricWords: $('#metric-words'),
    metricRead: $('#metric-read'),
    metricLines: $('#metric-lines'),
    sessionWordCount: $('#session-word-count'),
    typingSpeed: $('#typing-speed'),
    writingTime: $('#writing-time'),
    copyFrontmatterBtn: $('#copy-frontmatter-btn'),
    insertHeading: $('#insert-heading'),
    insertQuote: $('#insert-quote'),
    insertCode: $('#insert-code'),
    insertDivider: $('#insert-divider'),
    activityList: $('#activity-list'),
    toast: $('#toast')
};

// ===== Initialization =====
init();

function init() {
    loadTheme();
    loadDrafts();
    bindEvents();
    resetEditor();
    setEditorMode(state.editorMode);
    renderDraftCount();
    renderActivity('写作台已就绪');

    if (state.githubToken) {
        verifyToken(state.githubToken, { silent: true });
    }
}

function bindEvents() {
    dom.loginBtn.addEventListener('click', handleLogin);
    dom.tokenInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') handleLogin();
    });

    dom.themeToggle.addEventListener('click', toggleTheme);
    dom.openRepoBtn.addEventListener('click', () => {
        window.open(`https://github.com/${REPO_OWNER}/${REPO_NAME}/tree/main/${REPO_PATH}`, '_blank', 'noopener');
    });
    dom.refreshPostsBtn.addEventListener('click', loadRemotePosts);
    dom.postSearch.addEventListener('input', renderDocList);

    $$('#list-tabs [data-list-view]').forEach((button) => {
        button.addEventListener('click', () => setListView(button.dataset.listView));
    });

    $$('#mode-tabs [data-editor-mode]').forEach((button) => {
        button.addEventListener('click', () => setEditorMode(button.dataset.editorMode));
    });

    [
        dom.titleInput,
        dom.contentInput,
        dom.filenameInput,
        dom.dateInput,
        dom.tagsInput,
        dom.categoriesInput,
        dom.coverInput,
        dom.excerptInput
    ].forEach((input) => {
        input.addEventListener('input', handleEditorInput);
    });

    dom.titleInput.addEventListener('blur', () => {
        if (!dom.filenameInput.value.trim() && dom.titleInput.value.trim()) {
            dom.filenameInput.value = buildFilename(dom.titleInput.value);
            handleEditorInput();
        }
    });

    dom.newPostBtn.addEventListener('click', newDraft);
    dom.saveDraftBtn.addEventListener('click', () => saveCurrentDraft(true));
    dom.duplicateBtn.addEventListener('click', duplicateAsDraft);
    dom.publishBtn.addEventListener('click', publishPost);
    dom.copyFrontmatterBtn.addEventListener('click', copyFrontmatter);
    dom.insertHeading.addEventListener('click', () => insertMarkdown('## ', '', '小标题'));
    dom.insertQuote.addEventListener('click', () => insertMarkdown('> ', '', '引用内容'));
    dom.insertCode.addEventListener('click', () => insertMarkdown('```js\n', '\n```', 'console.log("hello");'));
    dom.insertDivider.addEventListener('click', () => insertMarkdown('\n---\n', '', ''));

    document.addEventListener('keydown', (event) => {
        const primary = event.metaKey || event.ctrlKey;
        if (!primary) return;

        if (event.key.toLowerCase() === 's') {
            event.preventDefault();
            saveCurrentDraft(true);
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            publishPost();
        }
    });
}

// ===== Authentication =====
function handleLogin() {
    const token = dom.tokenInput.value.trim();
    if (!token) {
        dom.authError.textContent = 'Token 不能为空';
        return;
    }
    verifyToken(token);
}

async function verifyToken(token, options = {}) {
    setConnectionStatus('connecting', 'Connecting');
    setButtonLoading(dom.loginBtn, true, '验证中');
    dom.authError.textContent = '';

    try {
        const response = await fetch('https://api.github.com/user', {
            headers: githubHeaders(token)
        });

        if (!response.ok) {
            throw new Error('Token 无效或已过期');
        }

        const user = await response.json();
        state.githubToken = token;
        localStorage.setItem(TOKEN_KEY, token);
        unlockApp(user.login);
    } catch (error) {
        localStorage.removeItem(TOKEN_KEY);
        state.githubToken = '';
        setConnectionStatus('error', 'Disconnected');
        dom.authOverlay.classList.remove('hidden');
        dom.authOverlay.classList.add('active');
        dom.authError.textContent = options.silent ? '保存的 Token 已失效，请重新验证' : error.message;
    } finally {
        setButtonLoading(dom.loginBtn, false, '验证并进入');
    }
}

function unlockApp(username) {
    dom.authOverlay.classList.remove('active');
    setTimeout(() => dom.authOverlay.classList.add('hidden'), 280);
    dom.app.classList.remove('hidden');
    setConnectionStatus('ok', username || 'Connected');

    if (!state.startTime) {
        state.startTime = Date.now();
        state.writingTimer = setInterval(updateWritingStats, 1000);
    }

    loadRemotePosts();
}

// ===== Remote Posts =====
async function loadRemotePosts() {
    if (!state.githubToken) return;

    renderListLoading('正在加载远程文章');
    setConnectionStatus('connecting', 'Syncing');

    try {
        const response = await fetch(apiUrl(`contents/${REPO_PATH}`), {
            headers: githubHeaders()
        });

        if (!response.ok) {
            throw new Error('无法读取远程文章列表');
        }

        const files = await response.json();
        state.remotePosts = files
            .filter((file) => file.type === 'file' && file.name.endsWith('.md'))
            .map((file) => ({
                id: file.sha,
                type: 'remote',
                title: readableTitle(file.name),
                filename: file.name,
                path: file.path,
                sha: file.sha,
                url: file.url,
                updatedAt: null
            }))
            .sort((a, b) => b.filename.localeCompare(a.filename));

        setConnectionStatus('ok', 'Connected');
        renderDocList();
        renderActivity(`同步 ${state.remotePosts.length} 篇远程文章`);
    } catch (error) {
        setConnectionStatus('error', 'Sync failed');
        renderDocList();
        showToast(error.message, 'error');
    }
}

async function openRemotePost(post) {
    renderActivity(`打开远程文章 ${post.filename}`);
    setSaveStatus('loading', 'Loading remote');

    try {
        const response = await fetch(post.url, {
            headers: githubHeaders()
        });

        if (!response.ok) {
            throw new Error('文章读取失败');
        }

        const data = await response.json();
        const raw = decodeBase64(data.content);
        const parsed = parsePost(raw);

        hydrateEditor({
            title: parsed.meta.title || post.title,
            content: parsed.body,
            filename: post.filename,
            date: parsed.meta.date || '',
            tags: normalizeList(parsed.meta.tags).join(', '),
            categories: normalizeList(parsed.meta.categories).join(', '),
            cover: parsed.meta.cover || '',
            excerpt: parsed.meta.excerpt || ''
        }, {
            type: 'remote',
            id: post.sha,
            sha: post.sha,
            path: post.path
        });

        setSaveStatus('saved', 'Remote loaded');
    } catch (error) {
        setSaveStatus('error', 'Load failed');
        showToast(error.message, 'error');
    }
}

// ===== Drafts =====
function loadDrafts() {
    try {
        state.drafts = JSON.parse(localStorage.getItem(DRAFT_KEY) || '[]');
    } catch {
        state.drafts = [];
    }
}

function persistDrafts() {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state.drafts));
    renderDraftCount();
}

function newDraft() {
    saveCurrentDraft(false);
    resetEditor();
    state.currentDoc = {
        type: 'draft',
        id: createId()
    };
    setListView('drafts');
    saveCurrentDraft(false);
    renderActivity('新建本地草稿');
    dom.titleInput.focus();
}

function saveCurrentDraft(showMessage = false) {
    if (state.isHydrating) return;

    const draft = buildDraftFromEditor();
    const existingIndex = state.drafts.findIndex((item) => item.id === draft.id);

    if (existingIndex >= 0) {
        state.drafts[existingIndex] = draft;
    } else {
        state.drafts.unshift(draft);
    }

    state.currentDoc = { type: 'draft', id: draft.id };
    persistDrafts();
    renderDocList();
    setSaveStatus('saved', `Draft saved ${formatTime(new Date())}`);
    dom.lastSavedChip.textContent = `Draft saved ${formatTime(new Date())}`;

    if (showMessage) {
        showToast('草稿已保存', 'success');
        renderActivity('保存本地草稿');
    }
}

function openDraft(draft) {
    hydrateEditor(draft, {
        type: 'draft',
        id: draft.id,
        sha: draft.sourceSha || null,
        path: draft.sourcePath || ''
    });
    setSaveStatus('saved', 'Draft loaded');
    renderActivity(`打开草稿 ${draft.title || draft.filename}`);
}

function duplicateAsDraft() {
    const duplicate = buildDraftFromEditor();
    duplicate.id = createId();
    duplicate.title = `${duplicate.title || '未命名文章'} Copy`;
    duplicate.filename = buildFilename(duplicate.title);
    duplicate.createdAt = new Date().toISOString();
    duplicate.updatedAt = duplicate.createdAt;
    duplicate.sourceSha = null;
    duplicate.sourcePath = '';
    state.drafts.unshift(duplicate);
    persistDrafts();
    hydrateEditor(duplicate, { type: 'draft', id: duplicate.id, sha: null, path: '' });
    setListView('drafts');
    showToast('已复制为新草稿', 'success');
    renderActivity('复制当前内容为草稿');
}

function buildDraftFromEditor() {
    const now = new Date().toISOString();
    const id = state.currentDoc?.type === 'draft' ? state.currentDoc.id : createId();
    const filename = ensureMarkdownFilename(dom.filenameInput.value.trim() || buildFilename(dom.titleInput.value || 'untitled'));

    return {
        id,
        title: dom.titleInput.value.trim() || '未命名文章',
        content: dom.contentInput.value,
        filename,
        date: dom.dateInput.value,
        tags: dom.tagsInput.value,
        categories: dom.categoriesInput.value,
        cover: dom.coverInput.value,
        excerpt: dom.excerptInput.value,
        createdAt: state.drafts.find((item) => item.id === id)?.createdAt || now,
        updatedAt: now,
        sourceSha: state.currentSha,
        sourcePath: state.currentPath
    };
}

function scheduleAutosave() {
    clearTimeout(state.autosaveTimer);
    setSaveStatus('dirty', 'Unsaved changes');
    dom.lastSavedChip.textContent = 'Unsaved changes';
    state.autosaveTimer = setTimeout(() => saveCurrentDraft(false), 900);
}

// ===== Editor =====
function resetEditor() {
    hydrateEditor({
        title: '未命名文章',
        content: '',
        filename: buildFilename('untitled'),
        date: toDateTimeLocal(new Date()),
        tags: '',
        categories: '',
        cover: '',
        excerpt: ''
    }, {
        type: 'draft',
        id: createId(),
        sha: null,
        path: ''
    });
}

function hydrateEditor(data, doc) {
    state.isHydrating = true;
    state.currentDoc = doc;
    state.currentSha = doc.sha || null;
    state.currentPath = doc.path || '';

    dom.titleInput.value = data.title || '未命名文章';
    dom.contentInput.value = data.content || '';
    dom.filenameInput.value = ensureMarkdownFilename(data.filename || buildFilename(data.title || 'untitled'));
    dom.dateInput.value = data.date ? toDateTimeLocal(data.date) : toDateTimeLocal(new Date());
    dom.tagsInput.value = Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || '');
    dom.categoriesInput.value = Array.isArray(data.categories) ? data.categories.join(', ') : (data.categories || '');
    dom.coverInput.value = data.cover || '';
    dom.excerptInput.value = data.excerpt || '';

    const path = state.currentPath || `${REPO_PATH}${dom.filenameInput.value}`;
    dom.currentFileStatus.textContent = doc.type === 'remote' ? 'Editing remote post' : 'Local draft';
    dom.currentPathChip.textContent = path;
    dom.currentShaChip.textContent = `SHA: ${state.currentSha ? state.currentSha.slice(0, 7) : '--'}`;

    updateEditorDerivedState();
    renderDocList();
    state.isHydrating = false;
}

function handleEditorInput() {
    if (!dom.filenameInput.value.trim() && dom.titleInput.value.trim()) {
        dom.filenameInput.value = buildFilename(dom.titleInput.value);
    }

    const path = `${REPO_PATH}${ensureMarkdownFilename(dom.filenameInput.value.trim())}`;
    dom.currentPathChip.textContent = state.currentPath || path;
    updateEditorDerivedState();

    if (!state.isHydrating) {
        scheduleAutosave();
    }
}

function updateEditorDerivedState() {
    updateStats();
    updatePreview();
}

function updateStats() {
    const text = dom.contentInput.value;
    const words = countWords(text);
    const chars = text.length;
    const lines = text ? text.split(/\r\n|\r|\n/).length : 0;
    const read = words ? `${Math.max(1, Math.ceil(words / 450))} min` : '0 min';

    state.currentWords = words;
    dom.wordCount.textContent = words;
    dom.charCount.textContent = chars;
    dom.lineCount.textContent = lines;
    dom.readingTime.textContent = read;
    dom.metricWords.textContent = words;
    dom.metricChars.textContent = chars;
    dom.metricLines.textContent = lines;
    dom.metricRead.textContent = read;
    dom.previewWordCount.textContent = `${words} words`;
    dom.sessionWordCount.textContent = `${words} words`;
}

function updatePreview() {
    const markdown = dom.contentInput.value.trim();
    if (!markdown) {
        dom.preview.innerHTML = '<p class="preview-empty">Markdown 预览会实时显示在这里。</p>';
        return;
    }

    if (window.marked) {
        window.marked.setOptions({ breaks: true, gfm: true });
        dom.preview.innerHTML = window.marked.parse(markdown);
    } else {
        dom.preview.innerHTML = `<pre>${escapeHtml(markdown)}</pre>`;
    }
}

function setEditorMode(mode) {
    state.editorMode = mode;
    dom.editorPanel.classList.remove('mode-write', 'mode-split', 'mode-preview');
    dom.editorPanel.classList.add(`mode-${mode}`);
    $$('#mode-tabs [data-editor-mode]').forEach((button) => {
        button.classList.toggle('active', button.dataset.editorMode === mode);
    });
}

function insertMarkdown(before, after = '', fallback = '') {
    const textarea = dom.contentInput;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.slice(start, end) || fallback;
    const next = `${before}${selected}${after}`;

    textarea.setRangeText(next, start, end, 'end');
    textarea.focus();
    handleEditorInput();
}

// ===== Publish =====
async function publishPost() {
    const title = dom.titleInput.value.trim();
    const body = dom.contentInput.value.trim();
    const filename = ensureMarkdownFilename(dom.filenameInput.value.trim());

    if (!title) return showToast('请输入文章标题', 'error');
    if (!filename) return showToast('请输入文件名', 'error');
    if (!body) return showToast('内容不能为空', 'error');
    if (!state.githubToken) return showToast('请先验证 GitHub Token', 'error');

    setButtonLoading(dom.publishBtn, true, 'Publishing');
    setSaveStatus('loading', 'Publishing');

    const path = `${REPO_PATH}${filename}`;
    const content = `${buildFrontmatter()}\n${dom.contentInput.value}`;

    try {
        let sha = state.currentPath === path ? state.currentSha : null;

        if (!sha) {
            const existing = await fetch(apiUrl(`contents/${path}`), {
                headers: githubHeaders()
            });

            if (existing.ok) {
                const data = await existing.json();
                sha = data.sha;
            }
        }

        const response = await fetch(apiUrl(`contents/${path}`), {
            method: 'PUT',
            headers: githubHeaders(),
            body: JSON.stringify({
                message: `Publish post: ${title} via Admin UI`,
                content: encodeBase64(content),
                sha: sha || undefined
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || '发布失败');
        }

        state.currentSha = result.content.sha;
        state.currentPath = result.content.path;
        dom.currentShaChip.textContent = `SHA: ${state.currentSha.slice(0, 7)}`;
        dom.currentPathChip.textContent = state.currentPath;
        setSaveStatus('saved', 'Published');
        showToast('文章已发布到 GitHub', 'success');
        renderActivity(`发布文章 ${title}`);
        await loadRemotePosts();
    } catch (error) {
        setSaveStatus('error', 'Publish failed');
        showToast(error.message, 'error');
    } finally {
        setButtonLoading(dom.publishBtn, false, 'Publish');
    }
}

function buildFrontmatter() {
    const tags = splitComma(dom.tagsInput.value);
    const categories = splitComma(dom.categoriesInput.value);
    const lines = [
        '---',
        `title: ${quoteYaml(dom.titleInput.value.trim() || '未命名文章')}`,
        `date: ${formatDateForHexo(dom.dateInput.value || new Date())}`
    ];

    if (categories.length) {
        lines.push('categories:');
        categories.forEach((item) => lines.push(`  - ${quoteYaml(item)}`));
    }

    if (tags.length) {
        lines.push('tags:');
        tags.forEach((item) => lines.push(`  - ${quoteYaml(item)}`));
    }

    if (dom.coverInput.value.trim()) {
        lines.push(`cover: ${quoteYaml(dom.coverInput.value.trim())}`);
    }

    if (dom.excerptInput.value.trim()) {
        lines.push(`excerpt: ${quoteYaml(dom.excerptInput.value.trim())}`);
    }

    lines.push('---');
    return lines.join('\n');
}

async function copyFrontmatter() {
    const frontmatter = buildFrontmatter();

    try {
        await navigator.clipboard.writeText(frontmatter);
        showToast('Front Matter 已复制', 'success');
    } catch {
        showToast('浏览器不允许复制，请手动选择文本', 'error');
    }
}

// ===== Rendering =====
function renderDocList() {
    const query = dom.postSearch.value.trim().toLowerCase();
    const list = state.activeListView === 'posts' ? state.remotePosts : state.drafts;
    const filtered = list.filter((item) => {
        const haystack = [
            item.title,
            item.filename,
            item.path,
            item.tags,
            item.categories
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(query);
    });

    renderDraftCount();
    dom.remoteCount.textContent = state.remotePosts.length;

    if (!filtered.length) {
        dom.docList.innerHTML = `
            <div class="empty-state">
                <i class="ph ph-file-dashed"></i>
                <span>${state.activeListView === 'posts' ? '暂无远程文章' : '暂无本地草稿'}</span>
            </div>
        `;
        return;
    }

    dom.docList.innerHTML = filtered.map((item) => {
        const active = isActiveDoc(item) ? 'active' : '';
        const meta = item.type === 'remote'
            ? `${item.filename} · ${item.sha.slice(0, 7)}`
            : `Saved ${formatRelative(item.updatedAt)}`;
        const icon = item.type === 'remote' ? 'ph-file-cloud' : 'ph-note-pencil';
        return `
            <button class="doc-item ${active}" data-id="${item.id}" data-type="${item.type}">
                <span class="doc-icon"><i class="ph ${icon}"></i></span>
                <span class="doc-copy">
                    <strong>${escapeHtml(item.title || readableTitle(item.filename))}</strong>
                    <small>${escapeHtml(meta)}</small>
                </span>
            </button>
        `;
    }).join('');

    $$('.doc-item').forEach((button) => {
        button.addEventListener('click', () => {
            const id = button.dataset.id;
            const type = button.dataset.type;
            const collection = type === 'remote' ? state.remotePosts : state.drafts;
            const doc = collection.find((item) => item.id === id);
            if (!doc) return;
            if (type === 'remote') openRemotePost(doc);
            if (type === 'draft') openDraft(doc);
        });
    });
}

function renderListLoading(text) {
    dom.docList.innerHTML = `
        <div class="empty-state">
            <i class="ph ph-spinner-gap ph-spin"></i>
            <span>${text}</span>
        </div>
    `;
}

function renderDraftCount() {
    dom.draftCount.textContent = state.drafts.length;
}

function renderActivity(message) {
    state.activity.unshift({
        message,
        time: formatTime(new Date())
    });
    state.activity = state.activity.slice(0, 6);

    dom.activityList.innerHTML = state.activity.map((item) => `
        <li>
            <span>${escapeHtml(item.message)}</span>
            <time>${item.time}</time>
        </li>
    `).join('');
}

function setListView(view) {
    state.activeListView = view;
    $$('#list-tabs [data-list-view]').forEach((button) => {
        button.classList.toggle('active', button.dataset.listView === view);
    });
    renderDocList();
}

function isActiveDoc(item) {
    if (!state.currentDoc) return false;
    if (item.type !== state.currentDoc.type) return false;
    return item.id === state.currentDoc.id;
}

function setConnectionStatus(type, label) {
    dom.connectionStatus.className = `status-pill ${type}`;
    dom.connectionStatus.textContent = label;
}

function setSaveStatus(type, label) {
    dom.saveStatus.className = `save-chip ${type}`;
    dom.saveStatus.textContent = label;
}

function setButtonLoading(button, loading, label) {
    button.disabled = loading;
    if (loading) {
        button.dataset.originalLabel = button.innerHTML;
        button.innerHTML = `<i class="ph ph-spinner-gap ph-spin"></i><span>${label}</span>`;
        return;
    }

    if (button === dom.loginBtn) {
        button.innerHTML = '<i class="ph ph-lock-key"></i><span>验证并进入</span>';
        return;
    }

    if (button === dom.publishBtn) {
        button.innerHTML = '<i class="ph ph-upload-simple"></i><span>Publish</span>';
        return;
    }

    if (button.dataset.originalLabel) {
        button.innerHTML = button.dataset.originalLabel;
    }
}

function showToast(message, type = 'success') {
    dom.toast.textContent = message;
    dom.toast.className = `toast ${type} show`;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
        dom.toast.className = 'toast';
    }, 2800);
}

function updateWritingStats() {
    if (!state.startTime) return;
    const seconds = Math.floor((Date.now() - state.startTime) / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const wpm = minutes > 0 ? Math.round(state.currentWords / minutes) : 0;

    dom.writingTime.textContent = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    dom.typingSpeed.textContent = `${wpm} wpm`;
}

// ===== Theme =====
function loadTheme() {
    const theme = localStorage.getItem(THEME_KEY) || 'light';
    document.body.classList.toggle('theme-dark', theme === 'dark');
    document.body.classList.toggle('theme-light', theme !== 'dark');
    updateThemeIcon();
}

function toggleTheme() {
    const dark = !document.body.classList.contains('theme-dark');
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    document.body.classList.toggle('theme-dark', dark);
    document.body.classList.toggle('theme-light', !dark);
    updateThemeIcon();
}

function updateThemeIcon() {
    const icon = dom.themeToggle.querySelector('i');
    icon.className = document.body.classList.contains('theme-dark') ? 'ph ph-sun' : 'ph ph-moon';
}

// ===== Utilities =====
function apiUrl(path) {
    return `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/${path}`;
}

function githubHeaders(token = state.githubToken) {
    return {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
    };
}

function encodeBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary);
}

function decodeBase64(content) {
    const clean = content.replace(/\s/g, '');
    const binary = atob(clean);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
}

function parsePost(raw) {
    if (!raw.startsWith('---')) {
        return { meta: {}, body: raw };
    }

    const end = raw.indexOf('\n---', 3);
    if (end === -1) {
        return { meta: {}, body: raw };
    }

    const frontmatter = raw.slice(3, end).trim();
    const body = raw.slice(raw.indexOf('\n', end + 1) + 1).trimStart();
    return {
        meta: parseFrontmatter(frontmatter),
        body
    };
}

function parseFrontmatter(text) {
    const meta = {};
    const lines = text.split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (!match) continue;

        const key = match[1];
        const value = match[2].trim();

        if (!value) {
            const list = [];
            while (lines[index + 1] && /^\s+-\s+/.test(lines[index + 1])) {
                index += 1;
                list.push(stripYamlQuotes(lines[index].replace(/^\s+-\s+/, '').trim()));
            }
            meta[key] = list;
        } else {
            meta[key] = stripYamlQuotes(value);
        }
    }

    return meta;
}

function normalizeList(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    return splitComma(String(value));
}

function splitComma(value) {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function stripYamlQuotes(value) {
    return value.replace(/^['"]|['"]$/g, '');
}

function quoteYaml(value) {
    const text = String(value).replace(/"/g, '\\"');
    return /[:#\[\]{}&,*!|>'"%@`]/.test(text) ? `"${text}"` : text;
}

function formatDateForHexo(value) {
    const date = value instanceof Date ? value : new Date(value);
    const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
    return [
        safeDate.getFullYear(),
        String(safeDate.getMonth() + 1).padStart(2, '0'),
        String(safeDate.getDate()).padStart(2, '0')
    ].join('-') + ' ' + [
        String(safeDate.getHours()).padStart(2, '0'),
        String(safeDate.getMinutes()).padStart(2, '0'),
        String(safeDate.getSeconds()).padStart(2, '0')
    ].join(':');
}

function toDateTimeLocal(value) {
    const date = value instanceof Date ? value : new Date(String(value).replace(' ', 'T'));
    const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
    const offset = safeDate.getTimezoneOffset() * 60000;
    return new Date(safeDate.getTime() - offset).toISOString().slice(0, 16);
}

function countWords(text) {
    const cjk = text.match(/[\u3400-\u9fff]/g) || [];
    const western = text.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g) || [];
    return cjk.length + western.length;
}

function buildFilename(title) {
    const date = new Date().toISOString().slice(0, 10);
    const slug = String(title)
        .trim()
        .toLowerCase()
        .replace(/[^\w\u3400-\u9fff]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'untitled';
    return `${date}-${slug}.md`;
}

function ensureMarkdownFilename(filename) {
    if (!filename) return '';
    return filename.endsWith('.md') ? filename : `${filename}.md`;
}

function readableTitle(filename = '') {
    return filename
        .replace(/\.md$/, '')
        .replace(/^\d{4}-\d{2}-\d{2}-/, '')
        .replace(/[-_]+/g, ' ')
        .trim() || '未命名文章';
}

function createId() {
    return `draft_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function formatTime(date) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatRelative(value) {
    if (!value) return 'just now';
    const date = new Date(value);
    const diff = Math.max(0, Date.now() - date.getTime());
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / 1440)}d ago`;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
