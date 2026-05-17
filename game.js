// ========== 登录检查 ==========
function checkLoginStatus() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    const loginRequiredDiv = document.getElementById('loginRequired');
    const gameAreaDiv = document.getElementById('gameArea');
    
    if (!isLoggedIn) {
        if (loginRequiredDiv) loginRequiredDiv.style.display = 'flex';
        if (gameAreaDiv) gameAreaDiv.style.display = 'none';
        return false;
    } else {
        if (loginRequiredDiv) loginRequiredDiv.style.display = 'none';
        if (gameAreaDiv) gameAreaDiv.style.display = 'block';
        return true;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const goToLoginBtn = document.getElementById('goToLoginFromGame');
    if (goToLoginBtn) {
        goToLoginBtn.addEventListener('click', function() {
            window.location.href = 'login.html';
        });
    }
    initGame();
});

// 获取当前用户信息
function getCurrentUserFull() {
    const currentUser = sessionStorage.getItem('currentUser');
    if (currentUser) {
        return JSON.parse(currentUser);
    }
    return null;
}

// 保存积分到服务器
async function saveScoreToServer(currentScore) {
    const currentUser = getCurrentUserFull();
    if (!currentUser) return;
    
    try {
        const response = await fetch(`/updateScore?username=${encodeURIComponent(currentUser.username)}&score=${currentScore}&game=brick`);
        const data = await response.json();
        if (data.success) {
            currentUser.brick_score = data.score;
            currentUser.score = data.score;  // 兼容
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            console.log('积分已保存:', data.score);
        }
    } catch (error) {
        console.error('保存积分失败:', error);
    }
}

function initGame() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // 适配屏幕大小
    function resizeCanvas() {
        const container = canvas.parentElement;
        const maxWidth = Math.min(800, window.innerWidth - 60);
        const scale = maxWidth / 800;
        canvas.style.width = `${maxWidth}px`;
        canvas.style.height = `${500 * scale}px`;
        canvas.width = 800;
        canvas.height = 500;
        return scale;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // 游戏设置
    let score = 0;
    let lives = 3;
    let gameRunning = true;
    
    // 挡板设置
    const paddleWidth = 120;
    const paddleHeight = 12;
    let paddleX = (canvas.width - paddleWidth) / 2;
    
    // 弹球设置
    let ball = {
        x: canvas.width / 2,
        y: canvas.height - 50,
        radius: 6,
        dx: 3,
        dy: -3
    };
    
    // 鼠标/触摸控制
    let targetPaddleX = paddleX;
    
    // 砖块设置
    const brickRowCount = 5;
    const brickColumnCount = 8;
    const brickWidth = 85;
    const brickHeight = 20;
    const brickPadding = 8;
    const brickOffsetTop = 60;
    const brickOffsetLeft = 30;
    
    let bricks = [];
    function initBricks() {
        bricks = [];
        for (let i = 0; i < brickRowCount; i++) {
            bricks[i] = [];
            for (let j = 0; j < brickColumnCount; j++) {
                bricks[i][j] = { status: 1 };
            }
        }
    }
    initBricks();
    
    // 键盘控制
    let rightPressed = false;
    let leftPressed = false;
    
    // 手机按钮控制
    let mobileLeftPressed = false;
    let mobileRightPressed = false;
    
    // 鼠标/触摸移动
    function handleMove(clientX) {
        const rect = canvas.getBoundingClientRect();
        const scale = canvas.width / rect.width;
        let canvasX = (clientX - rect.left) * scale;
        canvasX = Math.max(0, Math.min(canvasX, canvas.width));
        targetPaddleX = canvasX - paddleWidth / 2;
        targetPaddleX = Math.max(0, Math.min(targetPaddleX, canvas.width - paddleWidth));
        paddleX = targetPaddleX;
    }
    
    function mouseMoveHandler(e) {
        handleMove(e.clientX);
    }
    
    function touchMoveHandler(e) {
        e.preventDefault();
        const touch = e.touches[0];
        handleMove(touch.clientX);
    }
    
    function keyDownHandler(e) {
        if (e.key === 'Right' || e.key === 'ArrowRight') {
            rightPressed = true;
        } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
            leftPressed = true;
        }
    }
    
    function keyUpHandler(e) {
        if (e.key === 'Right' || e.key === 'ArrowRight') {
            rightPressed = false;
        } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
            leftPressed = false;
        }
    }
    
    // 手机按钮事件
    const leftCtrl = document.getElementById('leftCtrl');
    const rightCtrl = document.getElementById('rightCtrl');
    
    if (leftCtrl) {
        leftCtrl.addEventListener('mousedown', () => { mobileLeftPressed = true; });
        leftCtrl.addEventListener('mouseup', () => { mobileLeftPressed = false; });
        leftCtrl.addEventListener('mouseleave', () => { mobileLeftPressed = false; });
        leftCtrl.addEventListener('touchstart', (e) => { e.preventDefault(); mobileLeftPressed = true; });
        leftCtrl.addEventListener('touchend', (e) => { e.preventDefault(); mobileLeftPressed = false; });
    }
    
    if (rightCtrl) {
        rightCtrl.addEventListener('mousedown', () => { mobileRightPressed = true; });
        rightCtrl.addEventListener('mouseup', () => { mobileRightPressed = false; });
        rightCtrl.addEventListener('mouseleave', () => { mobileRightPressed = false; });
        rightCtrl.addEventListener('touchstart', (e) => { e.preventDefault(); mobileRightPressed = true; });
        rightCtrl.addEventListener('touchend', (e) => { e.preventDefault(); mobileRightPressed = false; });
    }
    
    canvas.addEventListener('mousemove', mouseMoveHandler);
    canvas.addEventListener('touchmove', touchMoveHandler);
    canvas.addEventListener('touchstart', touchMoveHandler);
    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);
    
    const resetBtn = document.getElementById('resetGameBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetGame);
    }
    
    // 键盘+按钮控制挡板移动
    function handleControls() {
        let move = 0;
        if (rightPressed || mobileRightPressed) move = 8;
        if (leftPressed || mobileLeftPressed) move = -8;
        
        if (move !== 0) {
            targetPaddleX = paddleX + move;
            targetPaddleX = Math.max(0, Math.min(targetPaddleX, canvas.width - paddleWidth));
            paddleX = targetPaddleX;
        }
    }
    
    // 碰撞检测
    function collisionDetection() {
        for (let i = 0; i < brickRowCount; i++) {
            for (let j = 0; j < brickColumnCount; j++) {
                const brick = bricks[i][j];
                if (brick.status === 1) {
                    const brickX = j * (brickWidth + brickPadding) + brickOffsetLeft;
                    const brickY = i * (brickHeight + brickPadding) + brickOffsetTop;
                    
                    if (ball.x > brickX && ball.x < brickX + brickWidth &&
                        ball.y > brickY && ball.y < brickY + brickHeight) {
                        
                        ball.dy = -ball.dy;
                        brick.status = 0;
                        score += 10;
                        const scoreSpan = document.getElementById('score');
                        if (scoreSpan) scoreSpan.innerText = score;
                        
                        // 检查胜利
                        if (score === brickRowCount * brickColumnCount * 10) {
                            gameRunning = false;
                            // 保存最高分到服务器
                            saveScoreToServer(score);
                            setTimeout(() => {
                                alert('🎉 恭喜你赢了！🎉\n点击确定重新开始');
                                resetGame();
                            }, 100);
                        }
                    }
                }
            }
        }
    }
    
    // 弹球移动
    function moveBall() {
        if (!gameRunning) return;
        
        ball.x += ball.dx;
        ball.y += ball.dy;
        
        if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
            ball.dx = -ball.dx;
        }
        
        if (ball.y - ball.radius < 0) {
            ball.dy = -ball.dy;
        }
        
        // 挡板碰撞（带白边效果）
        if (ball.y + ball.radius > canvas.height - paddleHeight &&
            ball.x > paddleX &&
            ball.x < paddleX + paddleWidth) {
            
            const hitPos = (ball.x - paddleX) / paddleWidth;
            const angle = (hitPos - 0.5) * 1.2;
            const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
            
            ball.dx = Math.sin(angle) * speed;
            ball.dy = -Math.cos(angle) * speed;
            
            if (Math.abs(ball.dx) < 2) ball.dx = ball.dx > 0 ? 2 : -2;
            if (Math.abs(ball.dy) < 2) ball.dy = ball.dy > 0 ? 2 : -2;
            
            ball.dy = -Math.abs(ball.dy);
        }
        
        if (ball.y + ball.radius > canvas.height) {
            lives--;
            const livesSpan = document.getElementById('lives');
            if (livesSpan) livesSpan.innerText = lives;
            
            if (lives === 0) {
                gameRunning = false;
                // 保存最高分到服务器
                saveScoreToServer(score);
                setTimeout(() => {
                    alert('💀 游戏结束！💀\n点击确定重新开始');
                    resetGame();
                }, 100);
            } else {
                ball.x = canvas.width / 2;
                ball.y = canvas.height - 50;
                ball.dx = 3;
                ball.dy = -3;
                paddleX = (canvas.width - paddleWidth) / 2;
                targetPaddleX = paddleX;
            }
        }
    }
    
    // 绘制（挡板加白边）
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 绘制砖块
        for (let i = 0; i < brickRowCount; i++) {
            for (let j = 0; j < brickColumnCount; j++) {
                if (bricks[i][j].status === 1) {
                    const brickX = j * (brickWidth + brickPadding) + brickOffsetLeft;
                    const brickY = i * (brickHeight + brickPadding) + brickOffsetTop;
                    
                    const gradient = ctx.createLinearGradient(brickX, brickY, brickX + brickWidth, brickY + brickHeight);
                    gradient.addColorStop(0, '#444');
                    gradient.addColorStop(1, '#222');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(brickX, brickY, brickWidth, brickHeight);
                    
                    ctx.strokeStyle = '#666';
                    ctx.strokeRect(brickX, brickY, brickWidth, brickHeight);
                }
            }
        }
        
        // 绘制挡板（黑色 + 白色边框）
        ctx.fillStyle = '#222';
        ctx.fillRect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight);
        
        // 绘制弹球
        const ballGradient = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 2, ball.x, ball.y, ball.radius);
        ballGradient.addColorStop(0, '#888');
        ballGradient.addColorStop(1, '#222');
        ctx.fillStyle = ballGradient;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    }
    
    function resetGame() {
        score = 0;
        lives = 3;
        gameRunning = true;
        const scoreSpan = document.getElementById('score');
        const livesSpan = document.getElementById('lives');
        if (scoreSpan) scoreSpan.innerText = score;
        if (livesSpan) livesSpan.innerText = lives;
        
        ball.x = canvas.width / 2;
        ball.y = canvas.height - 50;
        ball.dx = 3;
        ball.dy = -3;
        paddleX = (canvas.width - paddleWidth) / 2;
        targetPaddleX = paddleX;
        
        initBricks();
        
        rightPressed = false;
        leftPressed = false;
        mobileLeftPressed = false;
        mobileRightPressed = false;
    }
    
    function gameLoop() {
        const isLoggedIn = checkLoginStatus();
        
        if (isLoggedIn && gameRunning) {
            handleControls();
            moveBall();
            collisionDetection();
            draw();
        } else if (isLoggedIn) {
            draw();
        }
        requestAnimationFrame(gameLoop);
    }
    
    checkLoginStatus();
    resetGame();
    gameLoop();
}