// 检查登录状态并更新UI
function updateUIByLoginStatus() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    const toLoginBtn = document.getElementById('toLoginBtn');
    const userInfoDiv = document.getElementById('userInfo');
    
    if (isLoggedIn) {
        if (toLoginBtn) toLoginBtn.style.display = 'none';
        
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        if (currentUser) {
            const avatar = currentUser.avatar || '👤';
            const nickname = currentUser.nickname || currentUser.username;
            const brickScore = currentUser.brick_score || currentUser.score || 0;
            const shootingScore = currentUser.shooting_score || 0;
            userInfoDiv.innerHTML = `
                <div class="user-welcome">
                    <span style="font-size: 24px;">${avatar}</span>
                    <span>欢迎，${nickname}！</span>
                    <span style="font-size: 12px; color: #999;">🎮:${brickScore} 🔫:${shootingScore}</span>
                    <button id="logoutFromHome" class="btn-logout-small">退出登录</button>
                </div>
            `;
            const logoutBtn = document.getElementById('logoutFromHome');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function() {
                    sessionStorage.removeItem('isLoggedIn');
                    sessionStorage.removeItem('currentUser');
                    window.location.reload();
                });
            }
        }
    } else {
        if (toLoginBtn) toLoginBtn.style.display = 'block';
        if (userInfoDiv) userInfoDiv.innerHTML = '';
    }
}

// 页面加载完成后绑定事件
document.addEventListener('DOMContentLoaded', function() {
    // 登录跳转
    const toLoginBtn = document.getElementById('toLoginBtn');
    if (toLoginBtn) {
        toLoginBtn.addEventListener('click', () => {
            window.location.href = 'login.html';
        });
    }
    
    // 弹球游戏
    const toGameBtn = document.getElementById('toGameBtn');
    if (toGameBtn) {
        toGameBtn.addEventListener('click', () => {
            window.location.href = 'game.html';
        });
    }
    
    // 枪战游戏
    const toShootingBtn = document.getElementById('toShootingBtn');
    if (toShootingBtn) {
        toShootingBtn.addEventListener('click', () => {
            window.location.href = 'shooting.html';
        });
    }
    
    // 弹球排行榜
    const toRankingBrickBtn = document.getElementById('toRankingBrickBtn');
    if (toRankingBrickBtn) {
        toRankingBrickBtn.addEventListener('click', () => showRanking('brick', '弹球游戏'));
    }
    
    // 枪战排行榜
    const toRankingShootingBtn = document.getElementById('toRankingShootingBtn');
    if (toRankingShootingBtn) {
        toRankingShootingBtn.addEventListener('click', () => showRanking('shooting', '枪战肉鸽'));
    }
    
    // 即时通讯
    const toChatBtn = document.getElementById('toChatBtn');
    if (toChatBtn) {
        toChatBtn.addEventListener('click', () => {
            window.location.href = 'chat.html';
        });
    }
    
    updateUIByLoginStatus();
});

// 显示排行榜
async function showRanking(gameType, gameName) {
    try {
        const response = await fetch(`/getRanking?game=${gameType}`);
        const data = await response.json();
        
        if (data.success) {
            let rankingHtml = '<div style="max-height: 400px; overflow-y: auto;">';
            rankingHtml += '<table style="width: 100%; border-collapse: collapse;">';
            rankingHtml += `<tr style="background: #222; color: white;"><th style="padding: 10px;">排名</th><th>头像</th><th>昵称</th><th>${gameName}最高分</th></tr>`;
            
            data.ranking.forEach((user, index) => {
                rankingHtml += `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 10px; text-align: center; font-weight: bold;">${index + 1}</td>
                        <td style="text-align: center;"><span style="font-size: 24px;">${user.avatar || '👤'}</span></td>
                        <td style="padding: 10px;">${user.nickname}</td>
                        <td style="padding: 10px; text-align: center; font-weight: bold; color: #d32f2f;">${user.score}</td>
                    </tr>
                `;
            });
            
            rankingHtml += '</table></div>';
            
            showModal(`🏆 ${gameName}排行榜`, rankingHtml);
        }
    } catch (error) {
        alert('获取排行榜失败');
    }
}

function getCurrentUser() {
    const user = sessionStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showModal(title, contentHtml) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1002;';
    
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%; max-width: 400px; background: white; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); z-index: 1003; overflow: hidden; max-height: 80vh;';
    modal.innerHTML = `
        <div style="padding: 20px; background: #f8f8f8; border-bottom: 1px solid #eee; text-align: center;">
            <h3 style="margin: 0;">${title}</h3>
        </div>
        <div style="padding: 20px; overflow-y: auto; max-height: 60vh;">
            ${contentHtml}
        </div>
        <div style="padding: 15px 20px; border-top: 1px solid #eee; text-align: center;">
            <button id="closeModalBtn" style="padding: 10px 30px; background: #222; color: white; border: none; border-radius: 10px; cursor: pointer;">关闭</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
    
    document.getElementById('closeModalBtn').addEventListener('click', () => {
        modal.remove();
        overlay.remove();
    });
    overlay.addEventListener('click', () => {
        modal.remove();
        overlay.remove();
    });
}