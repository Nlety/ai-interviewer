/**
 * AI 服务 - 面试官
 */
const CONFIG_KEY = 'ai_interviewer_config';
const REMOTE_CONFIG_URL = 'https://ai-pages.dc616fa1.er.aliyun-esa.net/api/storage?key=config';
const DECRYPT_KEY = 'shfn73fnein348un';

function decryptConfig(encryptedValue) {
    try {
        const decrypted = CryptoJS.RC4.decrypt(encryptedValue, DECRYPT_KEY).toString(CryptoJS.enc.Utf8);
        if (!decrypted) return null;
        const config = JSON.parse(decrypted);
        config.modelName = 'GLM-4-Flash';
        return config;
    } catch (e) { console.error('Decrypt error:', e); return null; }
}

async function fetchRemoteConfig() {
    try {
        const response = await fetch(REMOTE_CONFIG_URL);
        if (!response.ok) return null;
        const data = await response.json();
        if (data && data.value) {
            const config = decryptConfig(data.value);
            if (config && config.apiUrl && config.apiKey) {
                localStorage.setItem(CONFIG_KEY + '_remote', JSON.stringify(config));
                return config;
            }
        }
        return null;
    } catch (e) { return null; }
}

function getModelConfig() {
    try {
        const userConfig = localStorage.getItem(CONFIG_KEY);
        if (userConfig) { const parsed = JSON.parse(userConfig); if (parsed && parsed.apiUrl && parsed.apiKey && parsed.modelName) return parsed; }
        const remoteConfig = localStorage.getItem(CONFIG_KEY + '_remote');
        if (remoteConfig) return JSON.parse(remoteConfig);
        return null;
    } catch (e) { return null; }
}

function saveModelConfig(config) { localStorage.setItem(CONFIG_KEY, JSON.stringify(config)); }
async function initConfig() { const c = getModelConfig(); if (c) return c; return await fetchRemoteConfig(); }
async function hasAvailableConfig() { const c = getModelConfig(); if (c && c.apiUrl && c.apiKey) return true; const r = await fetchRemoteConfig(); return !!(r && r.apiUrl && r.apiKey); }

async function streamChat(systemPrompt, userPrompt, onMessage, onComplete, onError) {
    let config = getModelConfig();
    if (!config || !config.apiUrl || !config.apiKey) config = await fetchRemoteConfig();
    if (!config || !config.apiUrl || !config.apiKey || !config.modelName) { onError(new Error('请先配置模型')); return { abort: () => { } }; }

    const controller = new AbortController();
    try {
        const response = await fetch(`${config.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
            body: JSON.stringify({ model: config.modelName, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], stream: true, temperature: 0.7 }),
            signal: controller.signal
        });
        if (!response.ok) throw new Error(`请求失败: ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) { onComplete(); break; }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();
                    if (data === '[DONE]') { onComplete(); return; }
                    try { const content = JSON.parse(data).choices?.[0]?.delta?.content; if (content) onMessage(content); } catch (e) { }
                }
            }
        }
    } catch (error) { if (error.name !== 'AbortError') onError(error); }
    return { abort: () => controller.abort() };
}

async function generateQuestion(jobTitle, type, difficulty, history, onMessage, onComplete, onError) {
    const typeLabels = { tech: '技术面试', behavior: '行为面试', product: '产品面试', hr: 'HR面试' };
    const diffLabels = { junior: '初级', mid: '中级', senior: '高级' };
    const systemPrompt = `你是一位专业的${typeLabels[type]}面试官，正在面试${diffLabels[difficulty]}${jobTitle}岗位的候选人。
请提出一个专业、有深度的面试问题。问题应该：
1. 符合${diffLabels[difficulty]}难度
2. 针对${jobTitle}岗位的核心技能
3. 能够有效考察候选人能力
直接提问，不要说"我的问题是"之类的前缀。`;
    const historyText = history.length > 0 ? `\n\n之前的对话：\n${history.map(h => `问：${h.question}\n答：${h.answer}`).join('\n\n')}\n\n请提出下一个问题：` : '请提出第一个面试问题：';
    return streamChat(systemPrompt, historyText, onMessage, onComplete, onError);
}

async function evaluateAnswer(jobTitle, question, answer, onMessage, onComplete, onError) {
    const systemPrompt = `你是一位资深的面试官，请对候选人的回答进行评价。请从以下几个维度评估：
1. 答案的专业性和准确性
2. 表达的清晰度和逻辑性
3. 亮点和不足
4. 改进建议
请给出具体、有建设性的反馈。`;
    const userPrompt = `职位：${jobTitle}\n面试问题：${question}\n候选人回答：${answer}\n\n请给出你的评价：`;
    return streamChat(systemPrompt, userPrompt, onMessage, onComplete, onError);
}

async function generateSummary(jobTitle, history, onMessage, onComplete, onError) {
    const systemPrompt = `你是一位资深HR总监，请根据面试记录给出整体评估报告。包括：
1. 综合评分（满分100分）
2. 核心优势
3. 待提升领域
4. 是否推荐录用
5. 具体改进建议`;
    const historyText = history.map((h, i) => `问题${i + 1}：${h.question}\n回答：${h.answer}\n评价：${h.evaluation || '无'}`).join('\n\n');
    const userPrompt = `职位：${jobTitle}\n\n面试记录：\n${historyText}\n\n请给出整体评估：`;
    return streamChat(systemPrompt, userPrompt, onMessage, onComplete, onError);
}

window.AIService = { getModelConfig, saveModelConfig, initConfig, hasAvailableConfig, generateQuestion, evaluateAnswer, generateSummary };
