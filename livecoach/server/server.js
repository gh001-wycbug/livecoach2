const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const app = express();

// 配置CORS和请求体解析
app.use(cors());
app.use(express.json());

// API密钥配置
const API_KEY = process.env.API_KEY || '***********';
const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

// 处理聊天请求
app.post('/chat', async (req, res) => {
    try {
        // 设置响应头，支持流式输出
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-r1-250120',
                messages: [
                    {
                        role: 'system',
                        content: '你是一个专业的Life Coach，擅长倾听、共情，并给出有建设性的建议。你的目标是通过对话帮助用户实现个人成长。'
                    },
                    ...req.body.messages
                ],
                stream: true,
                temperature: 0.6
            }),
            timeout: 60000 // 60秒超时设置
        });

        // 处理流式响应
        const reader = response.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            // 将二进制数据转换为文本
            const chunk = new TextDecoder().decode(value);
            // 发送数据给客户端
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const content = line.slice(6).trim();
                    if (content && content !== '[DONE]') {
                        try {
                            const data = JSON.parse(content);
                            if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                                res.write(`data: ${JSON.stringify(data)}\n\n`);
                            }
                        } catch (e) {
                            console.error('解析响应数据失败:', e);
                        }
                    }
                }
            }
        }

        res.write('data: [DONE]\n\n');
        res.end();
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});