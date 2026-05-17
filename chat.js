// 当前用户
let currentUser = null;
let currentChatId = null;
let currentChatType = null;
let currentChatName = '';
let isSending = false;
let lastSendTime = 0;
let lastSendText = '';

// 全局消息存储
let messages = {};

// 初始化
async function initChat() {
    currentUser = getCurrentUser();
    if (!currentUser) {
        alert('请先登录');
        window.location.href = 'login.html';
        return;
    }
    
    updateUserInfoDisplay();
    await loadMessages();
    loadConversations();
    loadFriendRequests();
    bindEvents();
    startPolling();
}

// 获取当前用户
function getCurrentUser() {
    const user = sessionStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
}

// 获取头像HTML
function getAvatarHtml(avatar, name) {
    if (!avatar || avatar === '👤') {
        return '👤';
    }
    if (avatar.startsWith('/avatars/')) {
        return `<img src="${avatar}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.src='/avatars/default.png'">`;
    }
    return avatar;
}

// 更新用户信息显示
function updateUserInfoDisplay() {
    const userInfoDiv = document.getElementById('userInfo');
    if (userInfoDiv && currentUser) {
        userInfoDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 50px; height: 50px; background: #222; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                    ${getAvatarHtml(currentUser.avatar, currentUser.nickname)}
                </div>
                <div>
                    <div><strong>${currentUser.nickname}</strong></div>
                    <div style="font-size: 12px; color: #999;">ID: ${currentUser.uid} | @${currentUser.username}</div>
                </div>
            </div>
        `;
    }
}

// 加载消息
async function loadMessages() {
    try {
        const response = await fetch(`/getMessages?username=${encodeURIComponent(currentUser.username)}`);
        const data = await response.json();
        if (data.success) {
            messages = data.messages || {};
        }
    } catch (error) {
        console.error('加载消息失败:', error);
    }
}

// 加载会话列表
function loadConversations() {
    const convList = document.getElementById('convList');
    if (!convList) return;
    
    const conversations = [];
    const seenChats = new Set();
    
    // 添加"我的笔记"（自己跟自己对话）
    conversations.push({
        id: 'mynotes',
        name: '我的笔记',
        lastMsg: '记录你的想法...',
        lastTime: '',
        avatar: '📝',
        isGroup: false,
        isNotes: true
    });
    
    // 从消息中提取会话
    for (let chatId in messages) {
        if (seenChats.has(chatId)) continue;
        if (chatId === 'mynotes') continue;
        if (chatId.startsWith('group_')) continue;
        seenChats.add(chatId);
        
        const msgs = messages[chatId];
        const lastMsg = msgs[msgs.length - 1];
        
        const otherUser = chatId.replace(currentUser.username + '_', '').replace('_' + currentUser.username, '');
        const name = otherUser;
        
        conversations.push({
            id: chatId,
            name: name,
            lastMsg: lastMsg?.text || '',
            lastTime: lastMsg?.time || '',
            avatar: '👤',
            isGroup: false,
            isNotes: false
        });
    }
    
    // 添加好友会话
    if (currentUser.friends && currentUser.friends.length > 0) {
        for (let friend of currentUser.friends) {
            const chatId = [currentUser.username, friend].sort().join('_');
            if (!conversations.find(c => c.id === chatId)) {
                conversations.push({
                    id: chatId,
                    name: friend,
                    lastMsg: '暂无消息',
                    lastTime: '',
                    avatar: '👤',
                    isGroup: false,
                    isNotes: false
                });
            }
        }
    }
    
    // 排序
    conversations.sort((a, b) => {
        if (a.isNotes) return -1;
        if (b.isNotes) return 1;
        return (b.lastTime || '').localeCompare(a.lastTime || '');
    });
    
    if (conversations.length === 0) {
        convList.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">暂无消息，点击+添加好友</div>';
        return;
    }
    
    convList.innerHTML = conversations.map(conv => `
        <div class="conversation-item" onclick="openChat('${conv.id}', '${conv.name.replace(/'/g, "\\'")}', ${conv.isNotes || false})">
            <div class="conversation-avatar" style="overflow: hidden;">
                ${getAvatarHtml(conv.avatar, conv.name)}
            </div>
            <div class="conversation-info">
                <div class="conversation-name">
                    ${conv.name}
                    ${conv.isNotes ? '<span class="group-badge" style="background:#ff9800;">笔记</span>' : ''}
                </div>
                <div class="conversation-lastmsg">${escapeHtml(conv.lastMsg)}</div>
            </div>
            <div class="conversation-time">${conv.lastTime || ''}</div>
        </div>
    `).join('');
}

// 加载好友请求
async function loadFriendRequests() {
    try {
        const response = await fetch(`/getFriendRequests?username=${encodeURIComponent(currentUser.username)}`);
        const data = await response.json();
        const requestDiv = document.getElementById('friendRequests');
        
        if (requestDiv) {
            if (data.success && data.requests && data.requests.length > 0) {
                let requestsHtml = '<div style="padding: 10px; background: #fff3e0; border-radius: 12px; margin: 10px;">';
                requestsHtml += '<div style="font-weight: bold; margin-bottom: 8px;">📨 好友请求</div>';
                for (let req of data.requests) {
                    requestsHtml += `
                        <div style="display: flex; align-items: center; gap: 10px; padding: 8px; border-bottom: 1px solid #eee;">
                            <div style="width: 35px; height: 35px; background: #222; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                                ${getAvatarHtml(req.fromAvatar, req.fromNickname)}
                            </div>
                            <div style="flex: 1;">
                                <div>${escapeHtml(req.fromNickname)}</div>
                                <div style="font-size: 11px; color: #999;">@${req.from}</div>
                            </div>
                            <button onclick="acceptFriendRequest('${req.from}')" style="background: #4caf50; color: white; border: none; padding: 5px 12px; border-radius: 15px;">接受</button>
                        </div>
                    `;
                }
                requestsHtml += '</div>';
                requestDiv.innerHTML = requestsHtml;
            } else {
                requestDiv.innerHTML = '';
            }
        }
    } catch (error) {
        console.error('加载好友请求失败:', error);
    }
}

// 打开聊天
function openChat(chatId, chatName, isNotes) {
    currentChatId = chatId;
    currentChatType = isNotes ? 'notes' : 'private';
    currentChatName = chatName;
    
    document.getElementById('conversationView').style.display = 'none';
    document.getElementById('chatView').style.display = 'flex';
    document.getElementById('chatTargetName').innerText = chatName;
    
    loadChatMessages();
}

// 加载聊天消息
function loadChatMessages() {
    const messagesDiv = document.getElementById('chatMessages');
    if (!messagesDiv) return;
    
    const msgs = messages[currentChatId] || [];
    
    if (msgs.length === 0) {
        if (currentChatType === 'notes') {
            messagesDiv.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">📝 记录你的想法、灵感或待办事项<br>这里的内容只有你能看到</div>';
        } else {
            messagesDiv.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">暂无消息，发送第一条吧！</div>';
        }
        return;
    }
    
    messagesDiv.innerHTML = msgs.map(msg => `
        <div class="message ${msg.sender === currentUser.username ? 'message-self' : ''}">
            <div class="message-avatar" style="overflow: hidden;">
                ${getAvatarHtml(msg.avatar, msg.sender)}
            </div>
            <div>
                <div class="message-name">${msg.sender === currentUser.username ? '我' : (msg.senderNickname || msg.sender)}</div>
                <div class="message-bubble">${escapeHtml(msg.text)}</div>
                <div class="message-time">${msg.time || ''}</div>
            </div>
        </div>
    `).join('');
    
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// 发送消息
async function sendMessage() {
    if (isSending) return;
    
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text) return;
    
    const now = Date.now();
    if (now - lastSendTime < 500 && text === lastSendText) {
        return;
    }
    
    isSending = true;
    lastSendTime = now;
    lastSendText = text;
    
    const message = {
        sender: currentUser.username,
        senderNickname: currentUser.nickname,
        avatar: currentUser.avatar || '👤',
        text: text,
        time: new Date().toLocaleTimeString(),
        timestamp: now
    };
    
    if (!messages[currentChatId]) messages[currentChatId] = [];
    messages[currentChatId].push(message);
    loadChatMessages();
    
    try {
        if (currentChatType === 'notes') {
            await fetch(`/saveMessage?username=${encodeURIComponent(currentUser.username)}&chatId=${encodeURIComponent(currentChatId)}&message=${encodeURIComponent(JSON.stringify(message))}`);
        } else {
            const targetUser = currentChatId.replace(currentUser.username + '_', '').replace('_' + currentUser.username, '');
            await fetch(`/sendPrivateMessage?to=${encodeURIComponent(targetUser)}&message=${encodeURIComponent(JSON.stringify(message))}`);
        }
    } catch (error) {
        console.error('保存失败:', error);
    }
    
    input.value = '';
    loadConversations();
    
    setTimeout(() => {
        isSending = false;
    }, 500);
}

// 显示加好友弹窗
function showAddFriendDialog() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1002;';
    
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 300px; background: white; border-radius: 20px; z-index: 1003; overflow: hidden;';
    modal.innerHTML = `
        <div style="padding: 20px; text-align: center; border-bottom: 1px solid #eee;">
            <h3>添加好友</h3>
        </div>
        <div style="padding: 20px;">
            <input id="friendUid" placeholder="输入对方ID" type="number" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 12px; margin-bottom: 15px;">
            <button onclick="sendFriendRequest()" style="width: 100%; padding: 12px; background: #222; color: white; border: none; border-radius: 12px;">发送请求</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
    
    window.sendFriendRequest = async () => {
        const uid = document.getElementById('friendUid').value;
        if (!uid) {
            alert('请输入对方ID');
            return;
        }
        
        if (parseInt(uid) === currentUser.uid) {
            alert('不能添加自己为好友');
            return;
        }
        
        try {
            const response = await fetch(`/sendFriendRequest?from=${encodeURIComponent(currentUser.username)}&toUid=${uid}`);
            const data = await response.json();
            if (data.success) {
                alert('好友请求已发送');
                modal.remove();
                overlay.remove();
            } else {
                alert(data.error || '发送失败');
            }
        } catch (error) {
            alert('网络错误');
        }
    };
}

// A币相关
let userACoin = 0;

// 获取A币余额
async function getACoin() {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        const response = await fetch(`/getACoin?username=${encodeURIComponent(user.username)}`);
        const data = await response.json();
        if (data.success) {
            userACoin = data.a_coin;
            document.getElementById('aCoinAmount').innerText = userACoin;
            return userACoin;
        }
    } catch (error) {
        console.error('获取A币失败:', error);
    }
    return 0;
}

// 发送A币
async function sendACoin(toUser, amount, message) {
    const user = getCurrentUser();
    if (!user) return false;
    
    if (amount <= 0) {
        alert('金额必须大于0');
        return false;
    }
    
    if (userACoin < amount) {
        alert('A币不足！当前余额：' + userACoin);
        return false;
    }
    
    try {
        const response = await fetch(`/sendACoin?from=${encodeURIComponent(user.username)}&to=${encodeURIComponent(toUser)}&amount=${amount}`);
        const data = await response.json();
        if (data.success) {
            userACoin = data.from_coin;
            document.getElementById('aCoinAmount').innerText = userACoin;
            
            // 发送转账消息
            const coinMessage = {
                sender: user.username,
                senderNickname: user.nickname,
                avatar: user.avatar || '👤',
                text: `💰 转账 ${amount} A币 ${message ? ': ' + message : ''}`,
                type: 'coin',
                amount: amount,
                time: new Date().toLocaleTimeString(),
                timestamp: Date.now()
            };
            
            if (!messages[currentChatId]) messages[currentChatId] = [];
            messages[currentChatId].push(coinMessage);
            loadChatMessages();
            
            await fetch(`/sendPrivateMessage?to=${encodeURIComponent(toUser)}&message=${encodeURIComponent(JSON.stringify(coinMessage))}`);
            return true;
        } else {
            alert(data.error || '转账失败');
            return false;
        }
    } catch (error) {
        alert('网络错误');
        return false;
    }
}

// 发送图片
async function sendImage(file) {
    const user = getCurrentUser();
    if (!user) return;
    
    if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        alert('图片不能超过5MB');
        return;
    }
    
    const formData = new FormData();
    formData.append('image', file);
    formData.append('username', user.username);
    
    try {
        const response = await fetch('/uploadImage', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            const imageMessage = {
                sender: user.username,
                senderNickname: user.nickname,
                avatar: user.avatar || '👤',
                text: '[图片]',
                imageUrl: data.url,
                type: 'image',
                time: new Date().toLocaleTimeString(),
                timestamp: Date.now()
            };
            
            if (!messages[currentChatId]) messages[currentChatId] = [];
            messages[currentChatId].push(imageMessage);
            loadChatMessages();
            
            await fetch(`/sendPrivateMessage?to=${encodeURIComponent(currentChatId.replace(user.username + '_', '').replace('_' + user.username, ''))}&message=${encodeURIComponent(JSON.stringify(imageMessage))}`);
        } else {
            alert('图片上传失败');
        }
    } catch (error) {
        alert('上传失败');
    }
}

// 修改加载聊天消息函数，支持图片显示
function loadChatMessages() {
    const messagesDiv = document.getElementById('chatMessages');
    if (!messagesDiv) return;
    
    const msgs = messages[currentChatId] || [];
    
    if (msgs.length === 0) {
        if (currentChatType === 'notes') {
            messagesDiv.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">📝 记录你的想法、灵感或待办事项<br>这里的内容只有你能看到</div>';
        } else {
            messagesDiv.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">暂无消息，发送第一条吧！</div>';
        }
        return;
    }
    
    messagesDiv.innerHTML = msgs.map(msg => {
        let content = '';
        if (msg.type === 'image') {
            content = `<img src="${msg.imageUrl}" style="max-width: 200px; max-height: 150px; border-radius: 10px; cursor: pointer;" onclick="window.open('${msg.imageUrl}')">`;
        } else if (msg.type === 'coin') {
            content = `<span style="color: #ff9800;">💰 ${msg.text}</span>`;
        } else {
            content = escapeHtml(msg.text);
        }
        
        return `
            <div class="message ${msg.sender === currentUser.username ? 'message-self' : ''}">
                <div class="message-avatar" style="overflow: hidden;">
                    ${getAvatarHtml(msg.avatar, msg.sender)}
                </div>
                <div>
                    <div class="message-name">${msg.sender === currentUser.username ? '我' : (msg.senderNickname || msg.sender)}</div>
                    <div class="message-bubble">${content}</div>
                    <div class="message-time">${msg.time || ''}</div>
                </div>
            </div>
        `;
    }).join('');
    
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// 添加充值功能
function rechargeACoin() {
    const amount = parseInt(prompt('请输入充值金额（1元=10A币）', '10'));
    if (isNaN(amount) || amount <= 0) return;
    
    // 模拟充值（实际应该接入支付接口）
    const coinAmount = amount * 10;
    alert(`充值成功！获得 ${coinAmount} A币（演示模式）`);
    // 刷新A币余额
    getACoin();
}

// 发送A币弹窗
function showSendCoinDialog() {
    const targetUser = currentChatType === 'private' ? currentChatName : null;
    if (!targetUser) {
        alert('只能在私聊中发送A币');
        return;
    }
    
    const amount = parseInt(prompt('请输入A币数量', '10'));
    if (isNaN(amount) || amount <= 0) return;
    const message = prompt('请输入留言（可选）', '');
    
    sendACoin(targetUser, amount, message);
}

// 绑定事件时添加
function bindEvents() {
    if (eventsBound) return;
    eventsBound = true;
    
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.removeEventListener('click', sendMessage);
        sendBtn.addEventListener('click', sendMessage);
    }
    
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.removeEventListener('keypress', handleKeyPress);
        messageInput.addEventListener('keypress', handleKeyPress);
    }
    
    const addFriendBtn = document.getElementById('addFriendBtn');
    if (addFriendBtn) {
        addFriendBtn.removeEventListener('click', showAddFriendDialog);
        addFriendBtn.addEventListener('click', showAddFriendDialog);
    }
    
    // 图片按钮
    const imageBtn = document.getElementById('imageBtn');
    if (imageBtn) {
        imageBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                if (e.target.files[0]) {
                    sendImage(e.target.files[0]);
                }
            };
            input.click();
        });
    }
    
    // A币按钮
    const coinBtn = document.getElementById('coinBtn');
    if (coinBtn) {
        coinBtn.addEventListener('click', showSendCoinDialog);
    }
    
    // 充值按钮
    const rechargeBtn = document.getElementById('rechargeBtn');
    if (rechargeBtn) {
        rechargeBtn.addEventListener('click', rechargeACoin);
    }
}

// 初始化时获取A币
async function initChat() {
    currentUser = getCurrentUser();
    if (!currentUser) {
        alert('请先登录');
        window.location.href = 'login.html';
        return;
    }
    
    updateUserInfoDisplay();
    await loadMessages();
    await getACoin();  // 获取A币余额
    loadConversations();
    loadFriendRequests();
    bindEvents();
    startPolling();
}

// 接受好友请求
async function acceptFriendRequest(fromUsername) {
    try {
        const response = await fetch(`/acceptFriendRequest?username=${encodeURIComponent(currentUser.username)}&from=${encodeURIComponent(fromUsername)}`);
        const data = await response.json();
        if (data.success) {
            alert('已添加好友');
            location.reload();
        } else {
            alert('操作失败');
        }
    } catch (error) {
        alert('网络错误');
    }
}

// 返回会话列表
function backToConversations() {
    document.getElementById('chatView').style.display = 'none';
    document.getElementById('conversationView').style.display = 'flex';
    loadConversations();
    loadFriendRequests();
}

// HTML转义
function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// 轮询
let pollInterval = null;
function startPolling() {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(async () => {
        if (currentUser) {
            await loadMessages();
            if (currentChatId) {
                loadChatMessages();
            }
            loadConversations();
            loadFriendRequests();
        }
    }, 3000);
}

// 绑定事件
let eventsBound = false;
function bindEvents() {
    if (eventsBound) return;
    eventsBound = true;
    
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.removeEventListener('click', sendMessage);
        sendBtn.addEventListener('click', sendMessage);
    }
    
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.removeEventListener('keypress', handleKeyPress);
        messageInput.addEventListener('keypress', handleKeyPress);
    }
    
    const addFriendBtn = document.getElementById('addFriendBtn');
    if (addFriendBtn) {
        addFriendBtn.removeEventListener('click', showAddFriendDialog);
        addFriendBtn.addEventListener('click', showAddFriendDialog);
    }
}

function handleKeyPress(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }
}

window.addEventListener('beforeunload', () => {
    if (pollInterval) clearInterval(pollInterval);
});

initChat();