# AI 面试官

本项目由阿里云ESA提供加速、计算和保护

<img src="https://img.alicdn.com/imgextra/i1/O1CN01VlMQfr1PcMblVlmtZ_!!6000000001861-0-tps-994-562.jpg" width="50%" />

## 项目简介

AI 面试官是一款模拟面试助手，通过 AI 技术模拟真实面试场景，帮助用户提升面试技能。

## 核心功能

- 🎯 **多类型面试**：技术面试、行为面试、产品面试、HR面试
- 💬 **智能问答**：AI 根据职位生成专业面试问题
- 📝 **实时评价**：对每个回答给出详细点评和建议
- 📊 **综合评估**：面试结束后生成完整评估报告
- 💾 **记录保存**：支持本地和云端存储面试记录

## 技术栈

- 原生 HTML/CSS/JavaScript
- Tailwind CSS (CDN)
- OpenAI API (流式输出)
- 阿里云 ESA EdgeKV

## 本地运行

直接用浏览器打开 `index.html` 即可使用。

## 项目结构

```
ai-interviewer/
├── index.html
├── css/style.css
├── js/
│   ├── aiService.js
│   ├── storageService.js
│   └── app.js
├── edge-functions/
│   └── interview-storage.js
├── README.md
└── esa.jsonc
```
