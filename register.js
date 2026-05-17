// API 地址
const API_BASE = window.location.origin;

// 注册函数（供其他页面调用）
async function registerUser(username, password, nickname) {
    if (!username || !password || !nickname) {
        return { success: false, error: '请填写完整信息' };
    }
    
    if (password.length < 3) {
        return { success: false, error: '密码至少3位' };
    }
    
    try {
        const response = await fetch(`${API_BASE}/register?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&nickname=${encodeURIComponent(nickname)}`);
        const data = await response.json();
        
        if (data.success) {
            // 设置登录状态
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('currentUser', JSON.stringify({
                username: data.user.username,
                nickname: data.user.nickname,
                avatar: data.user.avatar,
                uid: data.user.uid,
                role: data.user.role,
                friends: data.user.friends || []
            }));
            return { success: true, user: data.user };
        } else {
            return { success: false, error: data.error };
        }
    } catch (error) {
        return { success: false, error: '网络错误' };
    }
}

// 获取当前用户
function getCurrentUser() {
    const user = sessionStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
}

// 退出登录
function logout() {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}