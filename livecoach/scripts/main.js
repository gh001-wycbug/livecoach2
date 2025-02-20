// 全局变量存储消息历史
let messageHistory = [];

// DOM元素
const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const chatHistory = document.getElementById('chatHistory');
const statusText = document.querySelector('.header__status-text');

// 添加消息到聊天历史
function addMessage(content, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'message--user' : 'message--assistant'}`;
    messageDiv.textContent = content;
    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// 处理用户提交的消息
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userMessage = userInput.value.trim();
    if (!userMessage) return;

    // 添加用户消息到界面
    addMessage(userMessage, true);
    
    // 更新消息历史
    messageHistory.push({ role: 'user', content: userMessage });
    
    // 清空输入框
    userInput.value = '';
    
    try {
        statusText.textContent = '思考中...';
        
        // 发送请求到后端
        const response = await fetch('http://localhost:3000/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ messages: messageHistory })
        });

        if (!response.ok) throw new Error('网络响应不正常');

        // 创建新的消息元素
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message message--assistant';
        chatHistory.appendChild(messageDiv);

        // 处理流式响应
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // 解码并处理数据
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const content = line.slice(6);
                    if (content === '[DONE]') continue;
                    
                    try {
                        const data = JSON.parse(content);
                        if (data.choices && data.choices[0].delta.content) {
                            const text = data.choices[0].delta.content;
                            assistantMessage += text;
                            messageDiv.textContent = assistantMessage;
                            chatHistory.scrollTop = chatHistory.scrollHeight;
                        }
                    } catch (e) {
                        console.error('解析响应数据失败:', e);
                    }
                }
            }
        }

        // 将完整的助手回复添加到消息历史
        messageHistory.push({ role: 'assistant', content: assistantMessage });
        statusText.textContent = '在线';

    } catch (error) {
        console.error('Error:', error);
        statusText.textContent = '错误';
        addMessage('抱歉，发生了错误，请稍后重试。');
    }
});

// 允许用户使用Enter发送消息，Shift+Enter换行
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event('submit'));
    }
});