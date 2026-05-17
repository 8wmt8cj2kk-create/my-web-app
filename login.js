// API 地址（使用当前页面的地址）
const API_BASE = window.location.origin;

// 获取页面元素
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const rememberCheckbox = document.getElementById('rememberBtn');
const loginBtn = document.getElementById('loginBtn');
const loginErrorMsg = document.getElementById('loginErrorMsg');

const regNickname = document.getElementById('regNickname');
const regUsername = document.getElementById('regUsername');
const regPassword = document.getElementById('regPassword');
const regConfirmPassword = document.getElementById('regConfirmPassword');
const registerBtn = document.getElementById('registerBtn');
const registerErrorMsg = document.getElementById('registerErrorMsg');

// 切换标签
loginTab.addEventListener('click', function() {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    loginErrorMsg.textContent = '';
    registerErrorMsg.textContent = '';
});

registerTab.addEventListener('click', function() {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.style.display = 'block';
    loginForm.style.display = 'none';
    loginErrorMsg.textContent = '';
    registerErrorMsg.textContent = '';
});

// 设置当前登录用户
function setCurrentUser(user) {
    // 确保头像路径正确
    let avatarUrl = user.avatar;
    if (!avatarUrl || avatarUrl === '👤') {
        avatarUrl = '👤';
    }
    
    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('currentUser', JSON.stringify({
        username: user.username,
        nickname: user.nickname,
        avatar: avatarUrl,
        uid: user.uid,
        role: user.role,
        friends: user.friends || [],
        brick_score: user.brick_score || 0,
        shooting_score: user.shooting_score || 0
    }));
    
    if (rememberCheckbox && rememberCheckbox.checked) {
        localStorage.setItem('saved_username', user.username);
        localStorage.setItem('saved_password', loginPassword.value);
    } else {
        localStorage.removeItem('saved_username');
        localStorage.removeItem('saved_password');
    }
}

// 登录逻辑
async function doLogin() {
    const username = loginUsername.value.trim();
    const password = loginPassword.value.trim();
    
    if (!username || !password) {
        loginErrorMsg.textContent = '请输入账号和密码！';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`);
        const data = await response.json();
        
        if (data.success) {
            setCurrentUser(data.user);
            // 登录成功后跳转到即时通讯页面
            window.location.href = 'chat.html';
        } else {
            loginErrorMsg.textContent = data.error || '账号或密码错误！';
            setTimeout(() => {
                loginErrorMsg.textContent = '';
            }, 2000);
        }
    } catch (error) {
        loginErrorMsg.textContent = '网络错误，请确保服务器已启动';
        console.error(error);
    }
}

// 注册逻辑
async function doRegister() {
    const nickname = regNickname.value.trim();
    const username = regUsername.value.trim();
    const password = regPassword.value.trim();
    const confirmPassword = regConfirmPassword.value.trim();
    
    if (!nickname || !username || !password) {
        registerErrorMsg.textContent = '请填写完整信息！';
        return;
    }
    
    if (password !== confirmPassword) {
        registerErrorMsg.textContent = '两次输入的密码不一致！';
        return;
    }
    
    if (password.length < 3) {
        registerErrorMsg.textContent = '密码至少3位！';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/register?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&nickname=${encodeURIComponent(nickname)}`);
        const data = await response.json();
        
        if (data.success) {
            setCurrentUser(data.user);
            // 注册成功后跳转到即时通讯页面
            window.location.href = 'chat.html';
        } else {
            registerErrorMsg.textContent = data.error || '注册失败！';
            setTimeout(() => {
                registerErrorMsg.textContent = '';
            }, 2000);
        }
    } catch (error) {
        registerErrorMsg.textContent = '网络错误，请确保服务器已启动';
        console.error(error);
    }
}

// 记住密码功能
window.addEventListener('DOMContentLoaded', function() {
    const savedUsername = localStorage.getItem('saved_username');
    const savedPassword = localStorage.getItem('saved_password');
    
    if (savedUsername && savedPassword) {
        loginUsername.value = savedUsername;
        loginPassword.value = savedPassword;
        if (rememberCheckbox) rememberCheckbox.checked = true;
    }
});

// 绑定事件
loginBtn.addEventListener('click', doLogin);
registerBtn.addEventListener('click', doRegister);

// 按回车键登录/注册
loginPassword.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') doLogin();
});
regConfirmPassword.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') doRegister();
});