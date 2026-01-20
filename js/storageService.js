/**
 * 存储服务 - 面试记录
 */
const STORAGE_KEY = 'ai_interviewer_records';
const API_BASE = '/api/interview-storage';

async function getRecords() {
    try {
        const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        try {
            const response = await fetch(`${API_BASE}?action=list`);
            if (response.ok) {
                const cloud = await response.json();
                if (cloud.records) {
                    const merged = mergeRecords(local, cloud.records);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
                    return merged;
                }
            }
        } catch (e) { }
        return local;
    } catch (e) { return []; }
}

function mergeRecords(local, cloud) {
    const map = new Map();
    [...local, ...cloud].forEach(r => { if (!map.has(r.id) || r.updatedAt > map.get(r.id).updatedAt) map.set(r.id, r); });
    return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
}

async function saveRecord(record) {
    try {
        const records = await getRecords();
        const now = Date.now();
        if (!record.id) {
            record.id = `interview_${now}_${Math.random().toString(36).slice(2, 8)}`;
            record.createdAt = now;
        }
        record.updatedAt = now;
        const index = records.findIndex(r => r.id === record.id);
        if (index >= 0) records[index] = record; else records.unshift(record);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));

        let cloudSync = false;
        try {
            const response = await fetch(API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save', record })
            });
            cloudSync = response.ok;
        } catch (e) { }
        return { success: true, cloudSync, record };
    } catch (e) { return { success: false, error: e.message }; }
}

async function deleteRecord(id) {
    try {
        let records = await getRecords();
        records = records.filter(r => r.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        try { await fetch(API_BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id }) }); } catch (e) { }
        return { success: true };
    } catch (e) { return { success: false }; }
}

window.StorageService = { getRecords, saveRecord, deleteRecord };
