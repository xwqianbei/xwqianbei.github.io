const REPO_OWNER = 'xwqianbei';
const REPO_NAME = 'xwqianbei.github.io';
const TOKEN_KEY = 'content_studio_token';
const DRAFT_KEY = 'content_studio_post_drafts';

const PATHS = {
    posts: 'blog-source/source/_posts/',
    images: 'blog-source/source/images/',
    life: 'blog-source/source/_data/life.json',
    works: 'blog-source/source/_data/projects.json',
    profile: 'blog-source/source/_data/profile.json'
};

const state = {
    token: localStorage.getItem(TOKEN_KEY) || '',
    module: 'posts',
    posts: [],
    drafts: [],
    life: { interestTypes: [], records: [] },
    works: [],
    profile: {},
    shas: {},
    currentPost: null,
    currentLifeIndex: 0,
    currentWorkIndex: 0,
    dirty: false
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const dom = {
    authOverlay: $('#authOverlay'),
    tokenInput: $('#tokenInput'),
    loginBtn: $('#loginBtn'),
    authError: $('#authError'),
    app: $('#app'),
    connectionStatus: $('#connectionStatus'),
    saveStatus: $('#saveStatus'),
    refreshBtn: $('#refreshBtn'),
    openRepoBtn: $('#openRepoBtn'),
    publishBtn: $('#publishBtn'),
    moduleEyebrow: $('#moduleEyebrow'),
    moduleTitle: $('#moduleTitle'),
    addItemBtn: $('#addItemBtn'),
    searchInput: $('#searchInput'),
    listMeta: $('#listMeta'),
    itemList: $('#itemList'),
    toast: $('#toast'),
    postTitle: $('#postTitle'),
    postFilename: $('#postFilename'),
    postDate: $('#postDate'),
    postTags: $('#postTags'),
    postCategories: $('#postCategories'),
    postCover: $('#postCover'),
    postExcerpt: $('#postExcerpt'),
    postContent: $('#postContent'),
    postPreview: $('#postPreview'),
    postStats: $('#postStats'),
    imageFileInput: $('#imageFileInput'),
    imagePathInput: $('#imagePathInput'),
    imageAltInput: $('#imageAltInput'),
    imageCaptionInput: $('#imageCaptionInput'),
    imageLayoutSelect: $('#imageLayoutSelect'),
    imageSecondPathInput: $('#imageSecondPathInput'),
    uploadImageBtn: $('#uploadImageBtn'),
    insertImageBtn: $('#insertImageBtn'),
    insertGalleryBtn: $('#insertGalleryBtn'),
    imageUploadStatus: $('#imageUploadStatus'),
    saveDraftBtn: $('#saveDraftBtn'),
    newPostBtn: $('#newPostBtn'),
    lifeTitle: $('#lifeTitle'),
    lifeId: $('#lifeId'),
    lifeKind: $('#lifeKind'),
    lifeLabel: $('#lifeLabel'),
    lifeIcon: $('#lifeIcon'),
    lifeDate: $('#lifeDate'),
    lifeYear: $('#lifeYear'),
    lifeStat: $('#lifeStat'),
    lifePlace: $('#lifePlace'),
    lifeCover: $('#lifeCover'),
    lifeFocus: $('#lifeFocus'),
    lifeMood: $('#lifeMood'),
    lifeTags: $('#lifeTags'),
    lifeDetails: $('#lifeDetails'),
    lifeContent: $('#lifeContent'),
    insertLifeImageBtn: $('#insertLifeImageBtn'),
    insertLifeGalleryBtn: $('#insertLifeGalleryBtn'),
    duplicateLifeBtn: $('#duplicateLifeBtn'),
    deleteLifeBtn: $('#deleteLifeBtn'),
    workTitle: $('#workTitle'),
    workTag: $('#workTag'),
    workHref: $('#workHref'),
    workImage: $('#workImage'),
    workDesc: $('#workDesc'),
    workStats: $('#workStats'),
    duplicateWorkBtn: $('#duplicateWorkBtn'),
    deleteWorkBtn: $('#deleteWorkBtn'),
    profileName: $('#profileName'),
    profileNameCn: $('#profileNameCn'),
    profileEmail: $('#profileEmail'),
    profileGithub: $('#profileGithub'),
    profileAvatar: $('#profileAvatar'),
    profileRole: $('#profileRole'),
    profileJson: $('#profileJson'),
    formatProfileBtn: $('#formatProfileBtn')
};

init();

function init() {
    loadDrafts();
    bindEvents();
    hydrateEmptyPost();
    if (state.token) verifyToken(state.token, { silent: true });
}

function bindEvents() {
    dom.loginBtn.addEventListener('click', () => verifyToken(dom.tokenInput.value.trim()));
    dom.tokenInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') verifyToken(dom.tokenInput.value.trim());
    });
    dom.refreshBtn.addEventListener('click', loadAll);
    dom.openRepoBtn.addEventListener('click', () => {
        window.open(`https://github.com/${REPO_OWNER}/${REPO_NAME}`, '_blank', 'noopener');
    });
    dom.publishBtn.addEventListener('click', publishCurrentModule);
    dom.addItemBtn.addEventListener('click', addItemForModule);
    dom.searchInput.addEventListener('input', renderList);

    $$('.module-btn').forEach((button) => {
        button.addEventListener('click', () => setModule(button.dataset.module));
    });

    [
        dom.postTitle, dom.postFilename, dom.postDate, dom.postTags, dom.postCategories,
        dom.postCover, dom.postExcerpt, dom.postContent
    ].forEach((input) => input.addEventListener('input', handlePostInput));

    [
        dom.lifeTitle, dom.lifeId, dom.lifeKind, dom.lifeLabel, dom.lifeIcon, dom.lifeDate,
        dom.lifeYear, dom.lifeStat, dom.lifePlace, dom.lifeCover, dom.lifeFocus,
        dom.lifeMood, dom.lifeTags, dom.lifeDetails, dom.lifeContent
    ].forEach((input) => input.addEventListener('input', handleLifeInput));

    [dom.workTitle, dom.workTag, dom.workHref, dom.workImage, dom.workDesc, dom.workStats]
        .forEach((input) => input.addEventListener('input', handleWorkInput));

    [dom.profileName, dom.profileNameCn, dom.profileEmail, dom.profileGithub, dom.profileAvatar, dom.profileRole]
        .forEach((input) => input.addEventListener('input', handleProfileFieldsInput));
    dom.profileJson.addEventListener('input', handleProfileJsonInput);
    dom.formatProfileBtn.addEventListener('click', formatProfileJson);

    dom.saveDraftBtn.addEventListener('click', saveCurrentDraft);
    dom.newPostBtn.addEventListener('click', newPost);
    dom.imageFileInput.addEventListener('change', handleImageFileChange);
    dom.uploadImageBtn.addEventListener('click', uploadSelectedImage);
    dom.insertImageBtn.addEventListener('click', insertImageBlock);
    dom.insertGalleryBtn.addEventListener('click', insertGalleryBlock);
    dom.insertLifeImageBtn.addEventListener('click', () => insertImageBlock('life'));
    dom.insertLifeGalleryBtn.addEventListener('click', () => insertGalleryBlock('life'));
    dom.duplicateLifeBtn.addEventListener('click', duplicateLife);
    dom.deleteLifeBtn.addEventListener('click', deleteLife);
    dom.duplicateWorkBtn.addEventListener('click', duplicateWork);
    dom.deleteWorkBtn.addEventListener('click', deleteWork);
}

async function verifyToken(token, options = {}) {
    if (!token) {
        dom.authError.textContent = 'Token 不能为空';
        return;
    }
    setConnection('connecting', 'Connecting');
    dom.authError.textContent = '';

    try {
        const response = await fetch('https://api.github.com/user', { headers: githubHeaders(token) });
        if (!response.ok) throw new Error('Token 无效或权限不足');
        const user = await response.json();
        state.token = token;
        localStorage.setItem(TOKEN_KEY, token);
        dom.authOverlay.classList.remove('active');
        dom.authOverlay.classList.add('hidden');
        dom.app.classList.remove('hidden');
        setConnection('connected', user.login || 'Connected');
        await loadAll();
    } catch (error) {
        localStorage.removeItem(TOKEN_KEY);
        state.token = '';
        setConnection('disconnected', 'Disconnected');
        dom.authOverlay.classList.add('active');
        dom.authOverlay.classList.remove('hidden');
        dom.authError.textContent = options.silent ? '保存的 Token 已失效，请重新连接' : error.message;
    }
}

async function loadAll() {
    setSave('loading', 'Loading');
    await Promise.all([loadPosts(), loadDataFile('life'), loadDataFile('works'), loadDataFile('profile')]);
    renderCurrentModule();
    setSave('idle', 'Loaded');
}

async function loadPosts() {
    const response = await fetch(apiUrl(`contents/${PATHS.posts}`), { headers: githubHeaders() });
    if (!response.ok) throw new Error('无法读取文章列表');
    const files = await response.json();
    state.posts = files
        .filter((file) => file.type === 'file' && file.name.endsWith('.md'))
        .map((file) => ({
            id: file.sha,
            type: 'remote',
            title: readableTitle(file.name),
            filename: file.name,
            path: file.path,
            sha: file.sha,
            url: file.url
        }))
        .sort((a, b) => b.filename.localeCompare(a.filename));
}

async function loadDataFile(module) {
    const response = await fetch(apiUrl(`contents/${PATHS[module]}`), { headers: githubHeaders() });
    if (!response.ok) throw new Error(`无法读取 ${PATHS[module]}`);
    const file = await response.json();
    state.shas[module] = file.sha;
    state[module] = JSON.parse(decodeBase64(file.content));
}

function setModule(module) {
    state.module = module;
    $$('.module-btn').forEach((button) => button.classList.toggle('active', button.dataset.module === module));
    $$('.module-view').forEach((view) => view.classList.remove('active'));
    $(`#${module}View`).classList.add('active');
    dom.searchInput.value = '';
    renderCurrentModule();
}

function renderCurrentModule() {
    const labels = {
        posts: ['Markdown', 'Posts'],
        life: ['Structured JSON', 'Life Records'],
        works: ['Structured JSON', 'Works'],
        profile: ['Structured JSON', 'Profile']
    };
    dom.moduleEyebrow.textContent = labels[state.module][0];
    dom.moduleTitle.textContent = labels[state.module][1];
    renderList();
    if (state.module === 'life') hydrateLife(state.currentLifeIndex);
    if (state.module === 'works') hydrateWork(state.currentWorkIndex);
    if (state.module === 'profile') hydrateProfile();
}

function renderList() {
    const query = dom.searchInput.value.trim().toLowerCase();
    let items = [];
    if (state.module === 'posts') items = state.posts.concat(state.drafts);
    if (state.module === 'life') items = state.life.records || [];
    if (state.module === 'works') items = state.works || [];
    if (state.module === 'profile') items = [{ title: state.profile.name || 'Profile', subtitle: state.profile.role || 'About page' }];

    const filtered = items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => JSON.stringify(item).toLowerCase().includes(query));

    dom.listMeta.textContent = `${filtered.length} item${filtered.length === 1 ? '' : 's'}`;
    dom.itemList.innerHTML = filtered.map(({ item, index }) => {
        const title = item.title || item.name || item.filename || 'Untitled';
        const subtitle = item.subtitle || item.date || item.tag || item.filename || item.role || '';
        const active = isActiveListItem(item, index) ? 'active' : '';
        return `
            <button class="list-item ${active}" data-index="${index}" data-id="${escapeHtml(item.id || item.sha || '')}">
                <strong>${escapeHtml(title)}</strong>
                <span>${escapeHtml(subtitle)}</span>
            </button>
        `;
    }).join('');

    $$('.list-item').forEach((button) => {
        button.addEventListener('click', () => selectListItem(Number(button.dataset.index), button.dataset.id));
    });
}

function isActiveListItem(item, index) {
    if (state.module === 'posts') return state.currentPost && (item.id === state.currentPost.id || item.sha === state.currentPost.sha);
    if (state.module === 'life') return index === state.currentLifeIndex;
    if (state.module === 'works') return index === state.currentWorkIndex;
    return true;
}

function selectListItem(index, id) {
    if (state.module === 'posts') {
        const item = state.posts.concat(state.drafts).find((entry) => entry.id === id || entry.sha === id);
        if (!item) return;
        if (item.type === 'draft') hydratePost(item, item);
        else openRemotePost(item);
    }
    if (state.module === 'life') hydrateLife(index);
    if (state.module === 'works') hydrateWork(index);
}

async function openRemotePost(post) {
    setSave('loading', 'Loading post');
    const response = await fetch(post.url, { headers: githubHeaders() });
    if (!response.ok) return showToast('文章读取失败', 'error');
    const data = await response.json();
    const parsed = parsePost(decodeBase64(data.content));
    hydratePost({
        id: post.sha,
        type: 'remote',
        title: parsed.meta.title || post.title,
        filename: post.filename,
        date: parsed.meta.date || '',
        tags: toTextList(parsed.meta.tags),
        categories: toTextList(parsed.meta.categories),
        cover: parsed.meta.cover || '',
        excerpt: parsed.meta.excerpt || '',
        content: parsed.body,
        path: post.path,
        sha: post.sha
    }, post);
    setSave('idle', 'Post loaded');
}

function hydratePost(data, source = {}) {
    state.currentPost = { id: data.id || createId(), type: data.type || 'draft', path: data.path || source.path || '', sha: data.sha || source.sha || '' };
    dom.postTitle.value = data.title || '';
    dom.postFilename.value = ensureMarkdownFilename(data.filename || buildFilename(data.title || 'untitled'));
    dom.postDate.value = data.date ? toDateTimeLocal(data.date) : toDateTimeLocal(new Date());
    dom.postTags.value = toTextList(data.tags);
    dom.postCategories.value = toTextList(data.categories);
    dom.postCover.value = data.cover || '';
    dom.postExcerpt.value = data.excerpt || '';
    dom.postContent.value = data.content || '';
    updatePostPreview();
    renderList();
}

function hydrateEmptyPost() {
    hydratePost({
        id: createId(),
        type: 'draft',
        title: 'Untitled Note',
        filename: buildFilename('untitled-note'),
        date: toDateTimeLocal(new Date()),
        content: '',
        tags: '',
        categories: '',
        cover: '',
        excerpt: ''
    });
}

function handlePostInput() {
    if (!dom.postFilename.value.trim()) dom.postFilename.value = buildFilename(dom.postTitle.value || 'untitled');
    updatePostPreview();
    setDirty();
}

function updatePostPreview() {
    const text = dom.postContent.value || '';
    const words = countWords(text);
    dom.postStats.textContent = `${words} words`;
    if (window.marked && text.trim()) dom.postPreview.innerHTML = window.marked.parse(text);
    else dom.postPreview.innerHTML = '<p class="preview-empty">Markdown preview will appear here.</p>';
}

function handleImageFileChange() {
    const file = dom.imageFileInput.files && dom.imageFileInput.files[0];
    if (!file) {
        dom.imageUploadStatus.textContent = 'No image selected';
        return;
    }
    if (!file.type.startsWith('image/')) {
        dom.imageUploadStatus.textContent = '请选择图片文件';
        return;
    }
    const year = new Date().getFullYear();
    const safeName = sanitizeFilename(file.name);
    dom.imagePathInput.value = `/images/posts/${year}/${safeName}`;
    if (!dom.imageAltInput.value.trim()) {
        dom.imageAltInput.value = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
    }
    dom.imageUploadStatus.textContent = `${file.name} · ${formatBytes(file.size)}`;
}

async function uploadSelectedImage() {
    const file = dom.imageFileInput.files && dom.imageFileInput.files[0];
    const sitePath = normalizeImageSitePath(dom.imagePathInput.value);
    if (!file) return showToast('请先选择图片', 'error');
    if (!sitePath) return showToast('请填写图片路径', 'error');
    if (!state.token) return showToast('请先连接 GitHub', 'error');

    const repoPath = `blog-source/source${sitePath}`;
    setSave('loading', 'Uploading image');
    dom.imageUploadStatus.textContent = 'Uploading...';

    try {
        const content = await readFileAsBase64(file);
        const existingSha = await getExistingSha(repoPath);
        const response = await fetch(apiUrl(`contents/${repoPath}`), {
            method: 'PUT',
            headers: githubHeaders(),
            body: JSON.stringify({
                message: `Upload image: ${sitePath}`,
                content,
                sha: existingSha || undefined
            })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || '图片上传失败');
        dom.imagePathInput.value = sitePath;
        dom.imageUploadStatus.textContent = `Uploaded ${sitePath}`;
        setSave('idle', 'Image uploaded');
        showToast('图片已上传', 'success');
    } catch (error) {
        dom.imageUploadStatus.textContent = 'Upload failed';
        setSave('error', 'Upload failed');
        showToast(error.message, 'error');
    }
}

function insertImageBlock(target = 'post') {
    const sitePath = normalizeImageSitePath(dom.imagePathInput.value);
    const alt = dom.imageAltInput.value.trim() || 'Image';
    const caption = dom.imageCaptionInput.value.trim();
    const layout = dom.imageLayoutSelect.value || 'full';
    if (!sitePath) return showToast('请先填写图片路径', 'error');

    let html = '';
    if (layout === 'two') {
        const second = normalizeImageSitePath(dom.imageSecondPathInput.value);
        if (!second) return showToast('Two columns 需要第二张图片路径', 'error');
        html = buildImagePairBlock(sitePath, second, alt, caption);
    } else if (layout === 'gallery') {
        html = buildGalleryBlock([sitePath].concat(splitComma(dom.imageSecondPathInput.value)), alt, caption);
    } else {
        html = buildSingleImageBlock(sitePath, alt, caption, layout);
    }

    insertAtCursor(`\n${html}\n`, target);
    showToast('图片排版块已插入', 'success');
}

function insertGalleryBlock(target = 'post') {
    const first = normalizeImageSitePath(dom.imagePathInput.value);
    const others = splitComma(dom.imageSecondPathInput.value).map(normalizeImageSitePath).filter(Boolean);
    const paths = [first].concat(others).filter(Boolean);
    if (!paths.length) return showToast('请填写至少一张图片路径', 'error');
    insertAtCursor(`\n${buildGalleryBlock(paths, dom.imageAltInput.value.trim() || 'Gallery', dom.imageCaptionInput.value.trim())}\n`, target);
    showToast('Gallery 已插入', 'success');
}

function buildSingleImageBlock(src, alt, caption, layout) {
    return [
        `<figure class="image-block image-${layout}">`,
        `  <img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}">`,
        caption ? `  <figcaption>${escapeHtml(caption)}</figcaption>` : '',
        `</figure>`
    ].filter(Boolean).join('\n');
}

function buildImagePairBlock(first, second, alt, caption) {
    return [
        `<figure class="image-block image-pair">`,
        `  <div class="image-pair-grid">`,
        `    <img src="${escapeAttribute(first)}" alt="${escapeAttribute(alt)}">`,
        `    <img src="${escapeAttribute(second)}" alt="${escapeAttribute(alt)}">`,
        `  </div>`,
        caption ? `  <figcaption>${escapeHtml(caption)}</figcaption>` : '',
        `</figure>`
    ].filter(Boolean).join('\n');
}

function buildGalleryBlock(paths, alt, caption) {
    return [
        `<figure class="image-block image-gallery">`,
        `  <div class="image-gallery-grid">`,
        paths.map((path, index) => `    <img src="${escapeAttribute(path)}" alt="${escapeAttribute(index === 0 ? alt : `${alt} ${index + 1}`)}">`).join('\n'),
        `  </div>`,
        caption ? `  <figcaption>${escapeHtml(caption)}</figcaption>` : '',
        `</figure>`
    ].filter(Boolean).join('\n');
}

function insertAtCursor(text, target = 'post') {
    const textarea = target === 'life' ? dom.lifeContent : dom.postContent;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    textarea.setRangeText(text, start, end, 'end');
    textarea.focus();
    if (target === 'life') handleLifeInput();
    else handlePostInput();
}

function newPost() {
    hydrateEmptyPost();
    setModule('posts');
}

function saveCurrentDraft() {
    const draft = buildDraft();
    const index = state.drafts.findIndex((item) => item.id === draft.id);
    if (index >= 0) state.drafts[index] = draft;
    else state.drafts.unshift(draft);
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state.drafts));
    state.currentPost = { id: draft.id, type: 'draft' };
    renderList();
    showToast('草稿已保存', 'success');
}

function buildDraft() {
    return {
        id: state.currentPost?.type === 'draft' ? state.currentPost.id : createId(),
        type: 'draft',
        title: dom.postTitle.value.trim() || 'Untitled Note',
        filename: ensureMarkdownFilename(dom.postFilename.value.trim()),
        date: dom.postDate.value,
        tags: dom.postTags.value,
        categories: dom.postCategories.value,
        cover: dom.postCover.value,
        excerpt: dom.postExcerpt.value,
        content: dom.postContent.value,
        updatedAt: new Date().toISOString()
    };
}

function loadDrafts() {
    try {
        state.drafts = JSON.parse(localStorage.getItem(DRAFT_KEY) || '[]');
    } catch {
        state.drafts = [];
    }
}

function hydrateLife(index) {
    const records = state.life.records || [];
    if (!records.length) records.push(newLifeRecord());
    state.currentLifeIndex = Math.max(0, Math.min(index || 0, records.length - 1));
    const item = records[state.currentLifeIndex];
    dom.lifeTitle.value = item.title || '';
    dom.lifeId.value = item.id || '';
    dom.lifeKind.value = item.kind || 'travel';
    dom.lifeLabel.value = item.label || '';
    dom.lifeIcon.value = item.icon || '';
    dom.lifeDate.value = item.date || '';
    dom.lifeYear.value = item.year || '';
    dom.lifeStat.value = item.stat || '';
    dom.lifePlace.value = item.place || '';
    dom.lifeCover.value = item.cover || '';
    dom.lifeFocus.value = item.focus || '';
    dom.lifeMood.value = item.mood || '';
    dom.lifeTags.value = toTextList(item.tags);
    dom.lifeDetails.value = (item.details || []).join('\n');
    dom.lifeContent.value = item.content || '';
    renderList();
}

function handleLifeInput() {
    const records = state.life.records || [];
    records[state.currentLifeIndex] = {
        id: dom.lifeId.value.trim() || slugify(dom.lifeTitle.value || 'life-record'),
        kind: dom.lifeKind.value,
        label: dom.lifeLabel.value.trim(),
        icon: dom.lifeIcon.value.trim() || 'fa-compass',
        date: dom.lifeDate.value.trim(),
        year: dom.lifeYear.value.trim(),
        title: dom.lifeTitle.value.trim(),
        place: dom.lifePlace.value.trim(),
        focus: dom.lifeFocus.value.trim(),
        mood: dom.lifeMood.value.trim(),
        stat: dom.lifeStat.value.trim(),
        cover: dom.lifeCover.value.trim(),
        details: splitLines(dom.lifeDetails.value),
        content: dom.lifeContent.value.trim(),
        tags: splitComma(dom.lifeTags.value)
    };
    setDirty();
    renderList();
}

function newLifeRecord() {
    return {
        id: `life-${Date.now()}`,
        kind: 'travel',
        label: '旅行',
        icon: 'fa-route',
        date: '',
        year: String(new Date().getFullYear()),
        title: 'New Life Record',
        place: '',
        focus: '',
        mood: '',
        stat: '',
        cover: '',
        details: [],
        content: '',
        tags: []
    };
}

function duplicateLife() {
    const copy = { ...(state.life.records[state.currentLifeIndex] || newLifeRecord()) };
    copy.id = `${copy.id || 'life'}-copy-${Date.now()}`;
    copy.title = `${copy.title || 'Life Record'} Copy`;
    state.life.records.splice(state.currentLifeIndex + 1, 0, copy);
    hydrateLife(state.currentLifeIndex + 1);
    setDirty();
}

function deleteLife() {
    if (!confirm('确认删除这条生活记录？')) return;
    state.life.records.splice(state.currentLifeIndex, 1);
    hydrateLife(Math.max(0, state.currentLifeIndex - 1));
    setDirty();
}

function hydrateWork(index) {
    if (!state.works.length) state.works.push(newWork());
    state.currentWorkIndex = Math.max(0, Math.min(index || 0, state.works.length - 1));
    const item = state.works[state.currentWorkIndex];
    dom.workTitle.value = item.title || '';
    dom.workTag.value = item.tag || '';
    dom.workHref.value = item.href || '';
    dom.workImage.value = item.image || '';
    dom.workDesc.value = item.desc || '';
    dom.workStats.value = toTextList(item.stats);
    renderList();
}

function handleWorkInput() {
    state.works[state.currentWorkIndex] = {
        title: dom.workTitle.value.trim(),
        tag: dom.workTag.value.trim(),
        href: dom.workHref.value.trim(),
        image: dom.workImage.value.trim(),
        desc: dom.workDesc.value.trim(),
        stats: splitComma(dom.workStats.value)
    };
    setDirty();
    renderList();
}

function newWork() {
    return { title: 'New Project', tag: 'Project', href: '', image: '/images/self/life_photo.jpg', desc: '', stats: [] };
}

function duplicateWork() {
    const copy = { ...(state.works[state.currentWorkIndex] || newWork()) };
    copy.title = `${copy.title || 'Project'} Copy`;
    state.works.splice(state.currentWorkIndex + 1, 0, copy);
    hydrateWork(state.currentWorkIndex + 1);
    setDirty();
}

function deleteWork() {
    if (!confirm('确认删除这个作品？')) return;
    state.works.splice(state.currentWorkIndex, 1);
    hydrateWork(Math.max(0, state.currentWorkIndex - 1));
    setDirty();
}

function hydrateProfile() {
    dom.profileName.value = state.profile.name || '';
    dom.profileNameCn.value = state.profile.nameCn || '';
    dom.profileEmail.value = state.profile.email || '';
    dom.profileGithub.value = state.profile.github || '';
    dom.profileAvatar.value = state.profile.avatar || '';
    dom.profileRole.value = state.profile.role || '';
    dom.profileJson.value = JSON.stringify(state.profile, null, 2);
    renderList();
}

function handleProfileFieldsInput() {
    Object.assign(state.profile, {
        name: dom.profileName.value.trim(),
        nameCn: dom.profileNameCn.value.trim(),
        email: dom.profileEmail.value.trim(),
        github: dom.profileGithub.value.trim(),
        avatar: dom.profileAvatar.value.trim(),
        role: dom.profileRole.value.trim()
    });
    dom.profileJson.value = JSON.stringify(state.profile, null, 2);
    setDirty();
}

function handleProfileJsonInput() {
    try {
        state.profile = JSON.parse(dom.profileJson.value);
        hydrateProfileFieldsOnly();
        setDirty();
    } catch {
        setSave('error', 'Invalid JSON');
    }
}

function hydrateProfileFieldsOnly() {
    dom.profileName.value = state.profile.name || '';
    dom.profileNameCn.value = state.profile.nameCn || '';
    dom.profileEmail.value = state.profile.email || '';
    dom.profileGithub.value = state.profile.github || '';
    dom.profileAvatar.value = state.profile.avatar || '';
    dom.profileRole.value = state.profile.role || '';
}

function formatProfileJson() {
    try {
        state.profile = JSON.parse(dom.profileJson.value);
        dom.profileJson.value = JSON.stringify(state.profile, null, 2);
        hydrateProfileFieldsOnly();
        showToast('JSON 已格式化', 'success');
    } catch {
        showToast('Profile JSON 格式错误', 'error');
    }
}

function addItemForModule() {
    if (state.module === 'posts') return newPost();
    if (state.module === 'life') {
        state.life.records = state.life.records || [];
        state.life.records.unshift(newLifeRecord());
        hydrateLife(0);
        setDirty();
    }
    if (state.module === 'works') {
        state.works.unshift(newWork());
        hydrateWork(0);
        setDirty();
    }
}

async function publishCurrentModule() {
    if (!state.token) return showToast('请先连接 GitHub', 'error');
    if (state.module === 'posts') return publishPost();
    return publishDataFile(state.module);
}

async function publishPost() {
    const title = dom.postTitle.value.trim();
    const filename = ensureMarkdownFilename(dom.postFilename.value.trim() || buildFilename(title || 'untitled'));
    if (!title) return showToast('请输入标题', 'error');
    if (!dom.postContent.value.trim()) return showToast('请输入内容', 'error');

    const path = `${PATHS.posts}${filename}`;
    const content = `${buildFrontmatter()}\n${dom.postContent.value}`;
    await putFile(path, content, state.currentPost?.path === path ? state.currentPost.sha : null, `Publish post: ${title}`);
    await loadPosts();
    setDirty(false);
    showToast('文章已发布', 'success');
}

async function publishDataFile(module) {
    const payload = module === 'life' ? state.life : module === 'works' ? state.works : state.profile;
    await putFile(PATHS[module], JSON.stringify(payload, null, 2) + '\n', state.shas[module], `Update ${module} content via Content Studio`);
    await loadDataFile(module);
    setDirty(false);
    showToast(`${module} 已发布`, 'success');
}

async function putFile(path, content, sha, message) {
    setSave('loading', 'Publishing');
    const existingSha = sha || await getExistingSha(path);
    const response = await fetch(apiUrl(`contents/${path}`), {
        method: 'PUT',
        headers: githubHeaders(),
        body: JSON.stringify({
            message,
            content: encodeBase64(content),
            sha: existingSha || undefined
        })
    });
    const result = await response.json();
    if (!response.ok) {
        setSave('error', 'Publish failed');
        throw new Error(result.message || '发布失败');
    }
    setSave('idle', 'Published');
    return result;
}

async function getExistingSha(path) {
    const response = await fetch(apiUrl(`contents/${path}`), { headers: githubHeaders() });
    if (!response.ok) return null;
    const data = await response.json();
    return data.sha;
}

function buildFrontmatter() {
    const lines = [
        '---',
        `title: ${quoteYaml(dom.postTitle.value.trim() || 'Untitled Note')}`,
        `date: ${formatDateForHexo(dom.postDate.value || new Date())}`
    ];
    const categories = splitComma(dom.postCategories.value);
    const tags = splitComma(dom.postTags.value);
    if (categories.length) {
        lines.push('categories:');
        categories.forEach((item) => lines.push(`  - ${quoteYaml(item)}`));
    }
    if (tags.length) {
        lines.push('tags:');
        tags.forEach((item) => lines.push(`  - ${quoteYaml(item)}`));
    }
    if (dom.postCover.value.trim()) lines.push(`cover: ${quoteYaml(dom.postCover.value.trim())}`);
    if (dom.postExcerpt.value.trim()) lines.push(`excerpt: ${quoteYaml(dom.postExcerpt.value.trim())}`);
    lines.push('---');
    return lines.join('\n');
}

function setDirty(value = true) {
    state.dirty = value;
    setSave(value ? 'dirty' : 'idle', value ? 'Unsaved' : 'Saved');
}

function setConnection(type, label) {
    dom.connectionStatus.className = `status ${type}`;
    dom.connectionStatus.textContent = label;
}

function setSave(type, label) {
    dom.saveStatus.className = `status ${type}`;
    dom.saveStatus.textContent = label;
}

function showToast(message, type = 'success') {
    dom.toast.textContent = message;
    dom.toast.className = `toast ${type} show`;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => dom.toast.className = 'toast', 2600);
}

function apiUrl(path) {
    return `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/${path}`;
}

function githubHeaders(token = state.token) {
    return {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
    };
}

function encodeBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    bytes.forEach((byte) => binary += String.fromCharCode(byte));
    return btoa(binary);
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const value = String(reader.result || '');
            resolve(value.includes(',') ? value.split(',')[1] : value);
        };
        reader.onerror = () => reject(new Error('图片读取失败'));
        reader.readAsDataURL(file);
    });
}

function decodeBase64(content) {
    const clean = content.replace(/\s/g, '');
    const binary = atob(clean);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
}

function parsePost(raw) {
    if (!raw.startsWith('---')) return { meta: {}, body: raw };
    const end = raw.indexOf('\n---', 3);
    if (end === -1) return { meta: {}, body: raw };
    const frontmatter = raw.slice(3, end).trim();
    const body = raw.slice(raw.indexOf('\n', end + 1) + 1).trimStart();
    return { meta: parseFrontmatter(frontmatter), body };
}

function parseFrontmatter(text) {
    const meta = {};
    const lines = text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
        const match = lines[index].match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
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

function stripYamlQuotes(value) {
    return String(value).replace(/^['"]|['"]$/g, '');
}

function quoteYaml(value) {
    const text = String(value).replace(/"/g, '\\"');
    return /[:#\[\]{}&,*!|>'"%@`]/.test(text) ? `"${text}"` : text;
}

function toTextList(value) {
    if (Array.isArray(value)) return value.join(', ');
    return value || '';
}

function splitComma(value) {
    return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function splitLines(value) {
    return String(value || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function formatDateForHexo(value) {
    const date = value instanceof Date ? value : new Date(String(value).replace(' ', 'T'));
    const safe = Number.isNaN(date.getTime()) ? new Date() : date;
    return `${safe.getFullYear()}-${pad(safe.getMonth() + 1)}-${pad(safe.getDate())} ${pad(safe.getHours())}:${pad(safe.getMinutes())}:${pad(safe.getSeconds())}`;
}

function toDateTimeLocal(value) {
    const date = value instanceof Date ? value : new Date(String(value).replace(' ', 'T'));
    const safe = Number.isNaN(date.getTime()) ? new Date() : date;
    const offset = safe.getTimezoneOffset() * 60000;
    return new Date(safe.getTime() - offset).toISOString().slice(0, 16);
}

function countWords(text) {
    const cjk = String(text).match(/[\u3400-\u9fff]/g) || [];
    const western = String(text).match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g) || [];
    return cjk.length + western.length;
}

function buildFilename(title) {
    const date = new Date().toISOString().slice(0, 10);
    return `${date}-${slugify(title || 'untitled')}.md`;
}

function sanitizeFilename(filename) {
    const dotIndex = filename.lastIndexOf('.');
    const ext = dotIndex >= 0 ? filename.slice(dotIndex).toLowerCase().replace(/[^a-z0-9.]/g, '') : '';
    const base = dotIndex >= 0 ? filename.slice(0, dotIndex) : filename;
    return `${slugify(base)}${ext || '.jpg'}`;
}

function normalizeImageSitePath(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    const normalized = text.startsWith('/') ? text : `/${text}`;
    if (normalized.startsWith('/images/')) return normalized;
    return `/images/${normalized.replace(/^\/+/, '')}`;
}

function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, index)).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function ensureMarkdownFilename(filename) {
    if (!filename) return '';
    return filename.endsWith('.md') ? filename : `${filename}.md`;
}

function readableTitle(filename = '') {
    return filename.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/[-_]+/g, ' ').trim() || 'Untitled';
}

function slugify(value) {
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/[^\w\u3400-\u9fff]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'untitled';
}

function createId() {
    return `item_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function pad(value) {
    return String(value).padStart(2, '0');
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, '&#096;');
}
