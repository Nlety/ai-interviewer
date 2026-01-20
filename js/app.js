/**
 * AI 面试官 - 主应用
 */
const DOM = {};
const AppState = { type: 'tech', jobTitle: '', difficulty: 'mid', history: [], currentQuestion: '', isInterviewing: false, records: [] };

function initDOM() {
    DOM.jobTitle = document.getElementById('job-title');
    DOM.difficulty = document.getElementById('difficulty');
    DOM.chatArea = document.getElementById('chat-area');
    DOM.answerInput = document.getElementById('answer-input');
    DOM.btnStart = document.getElementById('btn-start');
    DOM.btnSubmit = document.getElementById('btn-submit');
    DOM.evaluationPanel = document.getElementById('evaluation-panel');
    DOM.evaluationContent = document.getElementById('evaluation-content');
    DOM.historyPanel = document.getElementById('history-panel');
    DOM.historyList = document.getElementById('history-list');
    DOM.historyOverlay = document.getElementById('history-overlay');
    DOM.settingsModal = document.getElementById('settings-modal');
    DOM.loadingOverlay = document.getElementById('loading-overlay');
    DOM.loadingText = document.getElementById('loading-text');
    DOM.toast = document.getElementById('toast');
}

function initEvents() {
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.type = btn.dataset.type;
        });
    });

    DOM.jobTitle.addEventListener('input', () => AppState.jobTitle = DOM.jobTitle.value);
    DOM.difficulty.addEventListener('change', () => AppState.difficulty = DOM.difficulty.value);

    DOM.btnStart.addEventListener('click', startInterview);
    DOM.btnSubmit.addEventListener('click', submitAnswer);
    document.getElementById('btn-save-interview').addEventListener('click', saveInterview);

    document.getElementById('btn-history').addEventListener('click', () => { DOM.historyPanel.classList.add('open'); DOM.historyOverlay.classList.remove('hidden'); });
    document.getElementById('btn-close-history').addEventListener('click', closeHistory);
    DOM.historyOverlay.addEventListener('click', closeHistory);

    document.getElementById('btn-settings').addEventListener('click', () => { DOM.settingsModal.classList.add('show'); loadSettings(); });
    document.getElementById('btn-close-settings').addEventListener('click', () => DOM.settingsModal.classList.remove('show'));
    document.getElementById('btn-cancel-settings').addEventListener('click', () => DOM.settingsModal.classList.remove('show'));
    document.getElementById('btn-save-settings').addEventListener('click', saveSettings);

    document.querySelectorAll('.example-btn').forEach(btn => btn.addEventListener('click', () => loadExample(btn.dataset.example)));

    DOM.answerInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && AppState.isInterviewing) { e.preventDefault(); submitAnswer(); } });
}

const EXAMPLES = {
    frontend: { title: '前端工程师', type: 'tech' },
    backend: { title: '后端工程师', type: 'tech' },
    pm: { title: '产品经理', type: 'product' },
    data: { title: '数据分析师', type: 'tech' }
};

function loadExample(key) {
    const ex = EXAMPLES[key];
    if (!ex) return;
    DOM.jobTitle.value = ex.title;
    AppState.jobTitle = ex.title;
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.type-btn[data-type="${ex.type}"]`)?.classList.add('active');
    AppState.type = ex.type;
    showToast('info', '已选择职位', '点击"开始面试"');
}

async function startInterview() {
    if (!AppState.jobTitle.trim()) { showToast('warning', '请输入职位', ''); return; }

    AppState.isInterviewing = true;
    AppState.history = [];
    AppState.currentQuestion = '';
    DOM.btnStart.classList.add('hidden');
    DOM.btnSubmit.classList.remove('hidden');
    DOM.evaluationPanel.classList.add('hidden');
    DOM.chatArea.innerHTML = '';

    addMessage('ai', '');
    await AIService.generateQuestion(AppState.jobTitle, AppState.type, AppState.difficulty, AppState.history,
        (text) => { AppState.currentQuestion += text; updateLastMessage(AppState.currentQuestion); },
        () => showToast('info', '请回答问题', ''),
        (e) => showToast('error', '生成问题失败', e.message)
    );
}

async function submitAnswer() {
    const answer = DOM.answerInput.value.trim();
    if (!answer) { showToast('warning', '请输入回答', ''); return; }

    addMessage('user', answer);
    DOM.answerInput.value = '';

    // 评价回答
    let evaluation = '';
    addMessage('ai', '');
    await AIService.evaluateAnswer(AppState.jobTitle, AppState.currentQuestion, answer,
        (text) => { evaluation += text; updateLastMessage(evaluation); },
        () => {
            AppState.history.push({ question: AppState.currentQuestion, answer, evaluation });
            if (AppState.history.length < 5) {
                setTimeout(() => askNextQuestion(), 1000);
            } else {
                finishInterview();
            }
        },
        (e) => showToast('error', '评价失败', e.message)
    );
}

async function askNextQuestion() {
    AppState.currentQuestion = '';
    addMessage('ai', '');
    await AIService.generateQuestion(AppState.jobTitle, AppState.type, AppState.difficulty, AppState.history,
        (text) => { AppState.currentQuestion += text; updateLastMessage(AppState.currentQuestion); },
        () => { },
        (e) => showToast('error', '生成问题失败', e.message)
    );
}

async function finishInterview() {
    AppState.isInterviewing = false;
    DOM.btnStart.classList.remove('hidden');
    DOM.btnStart.textContent = '重新面试';
    DOM.btnSubmit.classList.add('hidden');
    DOM.evaluationPanel.classList.remove('hidden');
    DOM.evaluationContent.textContent = '';

    await AIService.generateSummary(AppState.jobTitle, AppState.history,
        (text) => DOM.evaluationContent.textContent += text,
        () => showToast('success', '面试完成', '查看评估报告'),
        (e) => showToast('error', '生成报告失败', e.message)
    );
}

async function saveInterview() {
    showLoading('保存中...');
    const record = {
        jobTitle: AppState.jobTitle,
        type: AppState.type,
        difficulty: AppState.difficulty,
        history: AppState.history,
        summary: DOM.evaluationContent.textContent
    };
    const result = await StorageService.saveRecord(record);
    hideLoading();
    if (result.success) {
        showToast('success', '保存成功', result.cloudSync ? '已同步云端' : '已保存本地');
        loadHistory();
    }
}

function addMessage(role, content) {
    const div = document.createElement('div');
    div.className = `message message-${role}`;
    div.innerHTML = `<div class="text-xs ${role === 'ai' ? 'text-blue-400' : 'text-indigo-400'} mb-1">${role === 'ai' ? '🎯 面试官' : '👤 我的回答'}</div><div class="text-blue-100">${content}</div>`;
    DOM.chatArea.appendChild(div);
    DOM.chatArea.scrollTop = DOM.chatArea.scrollHeight;
}

function updateLastMessage(content) {
    const last = DOM.chatArea.querySelector('.message:last-child .text-blue-100');
    if (last) last.textContent = content;
    DOM.chatArea.scrollTop = DOM.chatArea.scrollHeight;
}

async function loadHistory() {
    AppState.records = await StorageService.getRecords();
    renderHistory();
}

function renderHistory() {
    if (AppState.records.length === 0) {
        DOM.historyList.innerHTML = '<p class="text-blue-400/50 text-sm text-center">暂无面试记录</p>';
        return;
    }
    DOM.historyList.innerHTML = AppState.records.map(r => `
        <div class="p-3 bg-blue-800/30 rounded-xl cursor-pointer hover:bg-blue-700/30 transition-all" data-id="${r.id}">
            <div class="font-medium text-blue-200">${r.jobTitle}</div>
            <div class="text-xs text-blue-400/70 mt-1">${new Date(r.createdAt).toLocaleString()}</div>
        </div>
    `).join('');
}

function closeHistory() { DOM.historyPanel.classList.remove('open'); DOM.historyOverlay.classList.add('hidden'); }

function loadSettings() {
    const config = AIService.getModelConfig() || {};
    document.getElementById('api-url').value = config.apiUrl || '';
    document.getElementById('api-key').value = config.apiKey || '';
    document.getElementById('model-name').value = config.modelName || '';
}

function saveSettings() {
    const config = {
        apiUrl: document.getElementById('api-url').value.trim(),
        apiKey: document.getElementById('api-key').value.trim(),
        modelName: document.getElementById('model-name').value.trim() || 'GLM-4-Flash'
    };
    if (!config.apiUrl || !config.apiKey) { showToast('warning', '请填写完整', ''); return; }
    AIService.saveModelConfig(config);
    DOM.settingsModal.classList.remove('show');
    showToast('success', '配置已保存', '');
}

function showLoading(text) { DOM.loadingText.textContent = text; DOM.loadingOverlay.classList.add('show'); }
function hideLoading() { DOM.loadingOverlay.classList.remove('show'); }

function showToast(type, title, message) {
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const colors = { success: 'bg-green-500', error: 'bg-red-500', warning: 'bg-yellow-500', info: 'bg-blue-500' };
    document.getElementById('toast-icon').className = `w-8 h-8 rounded-full flex items-center justify-center ${colors[type]}`;
    document.getElementById('toast-icon').textContent = icons[type];
    document.getElementById('toast-title').textContent = title;
    document.getElementById('toast-message').textContent = message;
    DOM.toast.classList.remove('hidden');
    setTimeout(() => DOM.toast.classList.add('hidden'), 3000);
}

async function init() {
    initDOM();
    initEvents();
    await loadHistory();
    const config = await AIService.initConfig();
    if (!config) setTimeout(() => { DOM.settingsModal.classList.add('show'); showToast('info', '欢迎使用', '请配置 AI 模型'); }, 500);
}

document.addEventListener('DOMContentLoaded', init);
