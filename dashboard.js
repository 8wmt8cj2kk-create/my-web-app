// 检查是否已登录（如果没有登录就跳回登录页）
if (sessionStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = 'login.html';
}

// 显示欢迎信息
const savedUsername = localStorage.getItem('saved_username');
const welcomeMsg = document.getElementById('welcomeMsg');

if (savedUsername) {
    welcomeMsg.textContent = `欢迎回来，${savedUsername}！`;
} else {
    welcomeMsg.textContent = '欢迎登录！';
}

// 返回首页按钮
const goHomeBtn = document.getElementById('goHomeBtn');
goHomeBtn.addEventListener('click', function() {
    window.location.href = 'index.html';
});

// 退出登录按钮
const logoutBtn = document.getElementById('logoutBtn');
logoutBtn.addEventListener('click', function() {
    sessionStorage.removeItem('isLoggedIn');
    window.location.href = 'login.html';
});