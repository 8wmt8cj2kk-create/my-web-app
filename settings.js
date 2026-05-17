// ========== 设置菜单组件 ==========

const API_BASE = window.location.origin;

// 获取当前登录用户完整信息
function getCurrentUserFull() {
    // 优先从 sessionStorage 获取
    const currentUser = sessionStorage.getItem('currentUser');
    if (currentUser) {
        return JSON.parse(currentUser);
    }
    // 备用：从 localStorage 获取
    const username = localStorage.getItem('saved_username');
    if (username) {
        return {
            username: username,
            nickname: localStorage.getItem('saved_nickname') || username,
            avatar: localStorage.getItem('user_avatar') || '👤',
            uid: localStorage.getItem('user_uid') || null
        };
    }
    return null;
}

// 更新用户信息到服务器
async function updateUserInfo(username, updates) {
    try {
        let url = `${API_BASE}/updateUser?username=${encodeURIComponent(username)}`;
        if (updates.nickname) {
            url += `&nickname=${encodeURIComponent(updates.nickname)}`;
        }
        if (updates.avatar) {
            url += `&avatar=${encodeURIComponent(updates.avatar)}`;
        }
        if (updates.oldPassword && updates.newPassword) {
            url += `&oldPassword=${encodeURIComponent(updates.oldPassword)}&newPassword=${encodeURIComponent(updates.newPassword)}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            const currentUser = getCurrentUserFull();
            if (currentUser && currentUser.username === username) {
                const updatedUser = { ...currentUser, ...updates };
                sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
                if (updates.nickname) localStorage.setItem('saved_nickname', updates.nickname);
                if (updates.avatar) localStorage.setItem('user_avatar', updates.avatar);
            }
            return true;
        } else {
            alert(data.error || '更新失败');
            return false;
        }
    } catch (error) {
        console.error('更新用户信息失败:', error);
        alert('网络错误，请确保服务器已启动');
        return false;
    }
}

// 上传头像
async function uploadAvatar(file) {
    const currentUser = getCurrentUserFull();
    if (!currentUser) return false;
    
    const formData = new FormData();
    formData.append('username', currentUser.username);
    formData.append('avatar', file);
    
    try {
        const response = await fetch('/uploadAvatar', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            currentUser.avatar = data.avatar;
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            alert('头像上传成功！');
            location.reload();
            return true;
        } else {
            alert('上传失败');
            return false;
        }
    } catch (error) {
        console.error('上传失败:', error);
        alert('网络错误');
        return false;
    }
}

// 显示弹窗
function showModal(title, contentHtml, onConfirm, confirmText = '确认') {
    const existingModal = document.querySelector('.modal-popup');
    const existingOverlay = document.querySelector('.modal-overlay');
    if (existingModal) existingModal.remove();
    if (existingOverlay) existingOverlay.remove();
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 1002;
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal-popup';
    modal.innerHTML = `
        <div class="modal-header">
            <h3>${title}</h3>
        </div>
        <div class="modal-body">
            ${contentHtml}
        </div>
        <div class="modal-footer">
            <button class="modal-cancel">取消</button>
            <button class="modal-confirm">${confirmText}</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
    
    const cancelBtn = modal.querySelector('.modal-cancel');
    const confirmBtn = modal.querySelector('.modal-confirm');
    
    cancelBtn.addEventListener('click', () => {
        modal.remove();
        overlay.remove();
    });
    
    if (onConfirm) {
        confirmBtn.addEventListener('click', () => {
            onConfirm();
            modal.remove();
            overlay.remove();
        });
    } else {
        confirmBtn.addEventListener('click', () => {
            modal.remove();
            overlay.remove();
        });
    }
    
    overlay.addEventListener('click', () => {
        modal.remove();
        overlay.remove();
    });
}

// ========== 在线人数功能 ==========

let heartbeatInterval = null;

function getUserId() {
    let userId = localStorage.getItem('userId');
    if (!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('userId', userId);
    }
    return userId;
}

async function updateOnlineStatus() {
    const userId = getUserId();
    const currentUser = getCurrentUserFull();
    
    const username = currentUser?.username || '游客';
    const nickname = currentUser?.nickname || '游客';
    const avatar = currentUser?.avatar || '👤';
    
    try {
        const response = await fetch(`/online?userId=${encodeURIComponent(userId)}&username=${encodeURIComponent(username)}&nickname=${encodeURIComponent(nickname)}&avatar=${encodeURIComponent(avatar)}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('获取在线人数失败:', error);
        return { count: 0, users: [] };
    }
}

async function showOnlineCount() {
    const data = await updateOnlineStatus();
    const currentUser = getCurrentUserFull();
    
    let usersHtml = '<div style="max-height: 300px; overflow-y: auto;">';
    if (data.users && data.users.length > 0) {
        for (let user of data.users) {
            const isMe = currentUser && (user.username === currentUser.username);
            usersHtml += `
                <div style="display: flex; align-items: center; gap: 10px; padding: 8px; border-bottom: 1px solid #eee;">
                    <span style="font-size: 24px;">${user.avatar || '👤'}</span>
                    <div>
                        <div style="font-weight: bold;">${user.nickname || user.username} ${isMe ? '(我)' : ''}</div>
                        <div style="font-size: 12px; color: #999;">@${user.username}</div>
                    </div>
                    <span style="margin-left: auto; font-size: 12px; color: green;">● 在线</span>
                </div>
            `;
        }
    } else {
        usersHtml += '<p style="text-align: center; padding: 20px;">暂无其他在线用户</p>';
    }
    usersHtml += '</div>';
    
    showModal('📊 在线人数', `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 48px; font-weight: bold; color: #222;">${data.count || 0}</div>
            <div style="color: #666;">当前在线人数</div>
        </div>
        <div style="margin-top: 20px;">
            <div style="font-weight: bold; margin-bottom: 10px;">在线用户列表：</div>
            ${usersHtml}
        </div>
        <p style="font-size: 12px; color: #999; margin-top: 15px; text-align: center;">※ 离开页面10秒后自动离线</p>
    `, null, '关闭');
}

function startHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
        updateOnlineStatus();
    }, 5000);
}

function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

// ========== 个人信息设置 ==========

function showAvatarSettings() {
    const currentUser = getCurrentUserFull();
    if (!currentUser) return;
    
    const avatars = ['👤', '😀', '😎', '🐱', '🐶', '🦊', '🐼', '🌟', '💀', '🤖', '👻', '🎃'];
    let currentAvatar = currentUser.avatar || '👤';
    let currentNickname = currentUser.nickname || currentUser.username;
    
    let avatarsHtml = `
        <div class="avatar-settings">
            <div class="current-avatar" style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 80px; margin-bottom: 10px;" id="previewAvatar">${currentAvatar}</div>
                <div style="font-size: 18px; font-weight: bold;" id="previewNickname">${currentNickname}</div>
                <div style="font-size: 12px; color: #999; margin-top: 5px;">ID: ${currentUser.uid || '暂无'}</div>
            </div>
            
            <div class="input-group" style="margin-bottom: 15px;">
                <label>昵称</label>
                <input type="text" id="nicknameInput" placeholder="请输入昵称" value="${currentNickname}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
            </div>
            
            <div class="input-group" style="margin-bottom: 15px;">
                <label>自定义头像（输入emoji）</label>
                <input type="text" id="customAvatarInput" placeholder="😀" maxlength="2" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
                <small style="color: #666;">输入表情符号，如 😀 🎉 ❤️ 等</small>
            </div>
            
            <div class="input-group" style="margin-bottom: 15px;">
                <label>上传图片头像</label>
                <input type="file" id="avatarFileInput" accept="image/*" style="width: 100%; padding: 8px;">
                <small style="color: #666;">支持jpg、png格式</small>
            </div>
            
            <div class="avatar-options" style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 15px;">
    `;
    
    avatars.forEach(avatar => {
        const isSelected = currentAvatar === avatar;
        avatarsHtml += `
            <div class="avatar-option" data-avatar="${avatar}" style="
                width: 50px;
                height: 50px;
                background: ${isSelected ? '#222' : '#f0f0f0'};
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                cursor: pointer;
                transition: all 0.2s;
                border: 2px solid ${isSelected ? '#222' : 'transparent'};
            ">
                ${avatar}
            </div>
        `;
    });
    
    avatarsHtml += `
            </div>
        </div>
    `;
    
    showModal('编辑个人信息', avatarsHtml, async () => {
        const newNickname = document.getElementById('nicknameInput').value.trim();
        const customAvatar = document.getElementById('customAvatarInput').value.trim();
        const avatarFile = document.getElementById('avatarFileInput').files[0];
        
        let selectedAvatar = currentAvatar;
        const selected = document.querySelector('.avatar-option[style*="background: #222"]');
        if (selected) {
            selectedAvatar = selected.getAttribute('data-avatar');
        }
        
        let finalAvatar = selectedAvatar;
        if (customAvatar) {
            const emojiMatch = customAvatar.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}]/u);
            if (emojiMatch) {
                finalAvatar = emojiMatch[0];
            } else if (customAvatar.length === 1) {
                finalAvatar = customAvatar;
            }
        }
        
        let success = true;
        if (newNickname && newNickname !== currentNickname) {
            success = await updateUserInfo(currentUser.username, { nickname: newNickname });
        }
        if (success && finalAvatar !== currentAvatar && finalAvatar !== '/avatars/default.png') {
            success = await updateUserInfo(currentUser.username, { avatar: finalAvatar });
        }
        
        if (avatarFile) {
            await uploadAvatar(avatarFile);
        }
        
        if (success) {
            alert('个人信息已更新！');
            location.reload();
        }
    }, '保存');
}

function showPasswordChange() {
    const currentUser = getCurrentUserFull();
    if (!currentUser) return;
    
    showModal('修改密码', `
        <input type="password" id="oldPassword" placeholder="请输入原密码" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 12px; margin-bottom: 10px;">
        <input type="password" id="newPassword" placeholder="请输入新密码" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 12px; margin-bottom: 10px;">
        <input type="password" id="confirmPassword" placeholder="请确认新密码" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 12px;">
    `, async () => {
        const oldPwd = document.getElementById('oldPassword').value;
        const newPwd = document.getElementById('newPassword').value;
        const confirmPwd = document.getElementById('confirmPassword').value;
        
        if (newPwd.length < 3) {
            alert('新密码至少3位！');
            return;
        }
        if (newPwd !== confirmPwd) {
            alert('两次输入的新密码不一致！');
            return;
        }
        
        const success = await updateUserInfo(currentUser.username, { oldPassword: oldPwd, newPassword: newPwd });
        
        if (success) {
            alert('密码修改成功！请重新登录');
            sessionStorage.removeItem('isLoggedIn');
            sessionStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        }
    }, '确认修改');
}

function showDeleteAccount() {
    const currentUser = getCurrentUserFull();
    if (!currentUser) return;
    
    showModal('⚠️ 注销账号', `
        <p style="color: #d32f2f; margin-bottom: 15px;">此操作不可逆！</p>
        <p>注销后将删除所有数据，确定要继续吗？</p>
        <input type="password" id="confirmPwd" placeholder="请输入密码确认" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 12px;">
    `, async () => {
        const confirmPwd = document.getElementById('confirmPwd').value;
        
        try {
            const response = await fetch(`${API_BASE}/deleteUser?username=${encodeURIComponent(currentUser.username)}&password=${encodeURIComponent(confirmPwd)}`);
            const data = await response.json();
            
            if (data.success) {
                sessionStorage.clear();
                alert('账号已注销');
                window.location.href = 'index.html';
            } else {
                alert(data.error || '密码错误！');
            }
        } catch (error) {
            alert('网络错误，请确保服务器已启动');
        }
    }, '确认注销');
}

// 查看所有账号
async function showAllUsers() {
    const currentUser = getCurrentUserFull();
    if (!currentUser || currentUser.username !== 'admin') {
        alert('只有管理员可以查看所有账号');
        return;
    }
    
    try {
        const response = await fetch(`/getAllUsers?username=admin`);
        const data = await response.json();
        
        if (data.success && data.users) {
            let usersHtml = '<div style="max-height: 400px; overflow-y: auto;">';
            for (let user of data.users) {
                const statusBadge = user.status === 'banned' 
                    ? '<span style="color: red;">🔴 已封禁</span>' 
                    : '<span style="color: green;">🟢 正常</span>';
                
                let banInfo = '';
                if (user.status === 'banned' && user.banUntil > 0) {
                    const now = Date.now() / 1000;
                    if (user.banUntil > now) {
                        const hoursLeft = Math.ceil((user.banUntil - now) / 3600);
                        banInfo = `<div style="font-size: 11px; color: red;">封禁剩余: ${hoursLeft} 小时</div>`;
                    }
                }
                
                usersHtml += `
                    <div style="display: flex; align-items: center; gap: 10px; padding: 10px; border-bottom: 1px solid #eee;">
                        <span style="font-size: 30px;">${user.avatar || '👤'}</span>
                        <div style="flex: 1;">
                            <div style="font-weight: bold;">${user.nickname}</div>
                            <div style="font-size: 12px; color: #999;">@${user.username} | ID:${user.uid}</div>
                            ${banInfo}
                        </div>
                        <div>
                            ${statusBadge}
                            ${user.username !== 'admin' ? `
                                <select id="banSelect_${user.username}" style="margin-top: 5px; padding: 4px; font-size: 11px;">
                                    <option value="">操作</option>
                                    <option value="ban_permanent">永久封禁</option>
                                    <option value="ban_1">封禁1小时</option>
                                    <option value="ban_6">封禁6小时</option>
                                    <option value="ban_24">封禁24小时</option>
                                    <option value="unban">解封</option>
                                </select>
                                <input type="text" id="reason_${user.username}" placeholder="原因" style="width: 70px; font-size: 10px; margin-top: 3px;">
                                <button onclick="banUser('${user.username}')" style="font-size: 10px; margin-top: 3px;">执行</button>
                            ` : '<div style="font-size: 11px; color: #999;">管理员</div>'}
                        </div>
                    </div>
                `;
            }
            usersHtml += '</div>';
            
            showModal('📋 用户管理', `
                <div style="margin-bottom: 15px; padding: 10px; background: #f0f0f0; border-radius: 8px;">
                    共 <strong>${data.users.length}</strong> 个注册用户
                </div>
                ${usersHtml}
            `, null, '关闭');
        } else {
            alert(data.error || '获取用户列表失败');
        }
    } catch (error) {
        console.error('获取用户列表失败:', error);
        alert('网络错误，请确保服务器已启动');
    }
}

// 查看所有账号密码（仅管理员）
async function showAllUsersWithPassword() {
    const currentUser = getCurrentUserFull();
    if (!currentUser || currentUser.username !== 'admin') {
        alert('只有管理员可以查看');
        return;
    }
    
    try {
        const response = await fetch(`/getAllUsers?username=admin`);
        const data = await response.json();
        
        if (data.success && data.users) {
            let usersHtml = '<div style="max-height: 400px; overflow-y: auto;">';
            usersHtml += '<table style="width: 100%; border-collapse: collapse;">';
            usersHtml += '<tr style="background: #222; color: white;"><th style="padding: 8px;">ID</th><th style="padding: 8px;">用户名</th><th style="padding: 8px;">密码</th><th style="padding: 8px;">昵称</th><th style="padding: 8px;">状态</th> </tr>';
            
            for (let user of data.users) {
                const statusText = user.status === 'banned' ? '🔴 封禁' : '🟢 正常';
                usersHtml += `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 8px; text-align: center;">${user.uid}</td>
                        <td style="padding: 8px;">${user.username}</td>
                        <td style="padding: 8px; color: #d32f2f;">${user.password}</td>
                        <td style="padding: 8px;">${user.nickname}</td>
                        <td style="padding: 8px;">${statusText}</td>
                    </tr>
                `;
            }
            usersHtml += '</table></div>';
            
            showModal('📋 所有账号信息（含密码）', usersHtml, null, '关闭');
        } else {
            alert(data.error || '获取失败');
        }
    } catch (error) {
        console.error('获取用户列表失败:', error);
        alert('网络错误，请确保服务器已启动');
    }
}

// 封禁/解封用户
async function banUser(username) {
    const select = document.getElementById(`banSelect_${username}`);
    const action = select.value;
    const reasonInput = document.getElementById(`reason_${username}`);
    const reason = reasonInput.value || '违规操作';
    
    if (!action) {
        alert('请选择操作');
        return;
    }
    
    let apiUrl = '';
    if (action === 'unban') {
        apiUrl = `/banUser?admin=admin&username=${encodeURIComponent(username)}&action=unban`;
    } else if (action === 'ban_permanent') {
        apiUrl = `/banUser?admin=admin&username=${encodeURIComponent(username)}&action=ban&hours=0&reason=${encodeURIComponent(reason)}`;
    } else if (action === 'ban_1') {
        apiUrl = `/banUser?admin=admin&username=${encodeURIComponent(username)}&action=ban&hours=1&reason=${encodeURIComponent(reason)}`;
    } else if (action === 'ban_6') {
        apiUrl = `/banUser?admin=admin&username=${encodeURIComponent(username)}&action=ban&hours=6&reason=${encodeURIComponent(reason)}`;
    } else if (action === 'ban_24') {
        apiUrl = `/banUser?admin=admin&username=${encodeURIComponent(username)}&action=ban&hours=24&reason=${encodeURIComponent(reason)}`;
    }
    
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data.success) {
            alert(data.message);
            location.reload();
        } else {
            alert(data.error || '操作失败');
        }
    } catch (error) {
        alert('网络错误');
    }
}

window.banUser = banUser;

// 退出登录
function logout() {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// 切换账号
function switchAccount() {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// 更新头像和昵称显示
function updateAvatarDisplay() {
    const currentUser = getCurrentUserFull();
    if (currentUser) {
        const avatar = currentUser.avatar || '👤';
        const nickname = currentUser.nickname || currentUser.username;
        
        const avatarElements = document.querySelectorAll('.user-avatar-display');
        avatarElements.forEach(el => {
            if (el) el.textContent = avatar;
        });
        
        const nicknameElements = document.querySelectorAll('.user-nickname-display');
        nicknameElements.forEach(el => {
            if (el) el.textContent = nickname;
        });
    }
}

// 创建设置菜单HTML
function createSettingsMenu() {
    const currentUser = getCurrentUserFull();
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    const avatar = currentUser?.avatar || '👤';
    const nickname = currentUser?.nickname || currentUser?.username || '游客';
    const isAdmin = currentUser?.username === 'admin';
    
    let menuHtml = `
        <div class="settings-overlay" id="settingsOverlay"></div>
        <div class="settings-menu" id="settingsMenu">
            <div class="settings-header">
                <div class="avatar-preview" style="margin-bottom: 10px;">
                    <div class="avatar-circle user-avatar-display" style="background: #222; font-size: 40px;">${avatar}</div>
                </div>
                <h3 class="user-nickname-display">${nickname}</h3>
                <p style="font-size: 12px; color: #999; margin-top: 5px;">@${currentUser?.username || ''}</p>
                <p style="font-size: 12px; color: #666; margin-top: 3px;">ID: ${currentUser?.uid || '暂无'}</p>
            </div>
            <div class="settings-items">
    `;
    
    if (isLoggedIn) {
        menuHtml += `
            <div class="settings-item" data-action="avatar">
                <div class="icon">🖼️</div>
                <div class="text">编辑个人信息</div>
                <div class="arrow">›</div>
            </div>
            <div class="settings-item" data-action="password">
                <div class="icon">🔒</div>
                <div class="text">密码修改</div>
                <div class="arrow">›</div>
            </div>
            <div class="settings-item" data-action="online">
                <div class="icon">👥</div>
                <div class="text">在线人数</div>
                <div class="arrow">›</div>
            </div>
        `;
        if (isAdmin) {
            menuHtml += `
                <div class="settings-item" data-action="allusers">
                    <div class="icon">📋</div>
                    <div class="text">用户管理</div>
                    <div class="arrow">›</div>
                </div>
                <div class="settings-item" data-action="alluserspw">
                    <div class="icon">🔐</div>
                    <div class="text">查看所有账号密码</div>
                    <div class="arrow">›</div>
                </div>
            `;
        }
        menuHtml += `
            <div class="settings-item" data-action="gamecenter">
                <div class="icon">🎮</div>
                <div class="text">游戏中心</div>
                <div class="arrow">›</div>
            </div>
            <div class="settings-divider"></div>
            <div class="settings-item danger-item" data-action="delete">
                <div class="icon">🗑️</div>
                <div class="text">注销账号</div>
                <div class="arrow">›</div>
            </div>
            <div class="settings-item" data-action="logout">
                <div class="icon">🚪</div>
                <div class="text">退出登录</div>
                <div class="arrow">›</div>
            </div>
            <div class="settings-item" data-action="switch">
                <div class="icon">🔄</div>
                <div class="text">切换账号</div>
                <div class="arrow">›</div>
            </div>
        `;
    } else {
        menuHtml += `
            <div class="settings-item" data-action="gamecenter">
                <div class="icon">🎮</div>
                <div class="text">游戏中心</div>
                <div class="arrow">›</div>
            </div>
        `;
    }
    
    menuHtml += `
            </div>
        </div>
    `;
    
    return menuHtml;
}

// 初始化设置按钮
function initSettings() {
    const settingsHtml = `
        <div class="gear-settings">
            <div class="gear-icon" id="gearIcon">
                ⚙️
            </div>
        </div>
    `;
    
    if (!document.querySelector('.gear-settings')) {
        document.body.insertAdjacentHTML('beforeend', settingsHtml);
    }
    
    const gearIcon = document.getElementById('gearIcon');
    if (gearIcon) {
        // 移除旧事件避免重复
        const newGearIcon = gearIcon.cloneNode(true);
        gearIcon.parentNode.replaceChild(newGearIcon, gearIcon);
        newGearIcon.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleSettingsMenu();
        });
    }
}

// 切换设置菜单显示
function toggleSettingsMenu() {
    const existingMenu = document.querySelector('.settings-menu');
    const existingOverlay = document.querySelector('.settings-overlay');
    
    if (existingMenu) {
        existingMenu.remove();
        if (existingOverlay) existingOverlay.remove();
        return;
    }
    
    const menuHtml = createSettingsMenu();
    document.body.insertAdjacentHTML('beforeend', menuHtml);
    
    const overlay = document.getElementById('settingsOverlay');
    const menu = document.getElementById('settingsMenu');
    
    if (overlay) {
        overlay.addEventListener('click', () => {
            menu.remove();
            overlay.remove();
        });
    }
    
    // 绑定各选项点击事件
    const avatarItem = document.querySelector('[data-action="avatar"]');
    if (avatarItem) avatarItem.addEventListener('click', showAvatarSettings);
    
    const passwordItem = document.querySelector('[data-action="password"]');
    if (passwordItem) passwordItem.addEventListener('click', showPasswordChange);
    
    const onlineItem = document.querySelector('[data-action="online"]');
    if (onlineItem) onlineItem.addEventListener('click', showOnlineCount);
    
    const allusersItem = document.querySelector('[data-action="allusers"]');
    if (allusersItem) allusersItem.addEventListener('click', showAllUsers);
    
    const alluserspwItem = document.querySelector('[data-action="alluserspw"]');
    if (alluserspwItem) alluserspwItem.addEventListener('click', showAllUsersWithPassword);
    
    const gamecenterItem = document.querySelector('[data-action="gamecenter"]');
    if (gamecenterItem) gamecenterItem.addEventListener('click', () => {
        window.location.href = 'gamecenter.html';
    });
    
    const deleteItem = document.querySelector('[data-action="delete"]');
    if (deleteItem) deleteItem.addEventListener('click', showDeleteAccount);
    
    const logoutItem = document.querySelector('[data-action="logout"]');
    if (logoutItem) logoutItem.addEventListener('click', logout);
    
    const switchItem = document.querySelector('[data-action="switch"]');
    if (switchItem) switchItem.addEventListener('click', switchAccount);
}

// 检查并启动心跳
function checkAndStartHeartbeat() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    if (isLoggedIn) {
        startHeartbeat();
    } else {
        stopHeartbeat();
    }
}

// 页面关闭时清理
window.addEventListener('beforeunload', function() {
    const userId = getUserId();
    if (userId) {
        fetch(`/online?userId=${userId}&clear=true`).catch(() => {});
    }
});

// 监听登录状态变化
window.addEventListener('storage', function(e) {
    if (e.key === 'isLoggedIn') {
        checkAndStartHeartbeat();
    }
});

// 页面加载时初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initSettings();
        updateAvatarDisplay();
        checkAndStartHeartbeat();
    });
} else {
    initSettings();
    updateAvatarDisplay();
    checkAndStartHeartbeat();
}

// 确保齿轮按钮存在
function ensureGearIcon() {
    if (!document.querySelector('.gear-settings')) {
        initSettings();
    }
}

// 暴露给全局使用
window.ensureGearIcon = ensureGearIcon;
window.initSettings = initSettings;