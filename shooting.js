// 登录检查
function checkLogin() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    const loginDiv = document.getElementById('loginRequired');
    const gameArea = document.getElementById('gameArea');
    
    if (!isLoggedIn) {
        if (loginDiv) loginDiv.style.display = 'block';
        if (gameArea) gameArea.style.display = 'none';
        return false;
    }
    if (loginDiv) loginDiv.style.display = 'none';
    if (gameArea) gameArea.style.display = 'block';
    return true;
}

const goToLoginBtn = document.getElementById('goToLogin');
if (goToLoginBtn) {
    goToLoginBtn.addEventListener('click', () => {
        window.location.href = 'login.html';
    });
}

// 获取当前用户
function getCurrentUser() {
    const user = sessionStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
}

// 保存分数到服务器
async function saveScore(score) {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        const response = await fetch(`/updateScore?username=${encodeURIComponent(user.username)}&score=${score}&game=shooting`);
        const data = await response.json();
        if (data.success) {
            user.shooting_score = data.score;
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            console.log('分数已保存:', data.score);
        }
    } catch (e) { console.error(e); }
}

// 粒子特效类
class Particle {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = 1;
        this.maxLife = 30;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.3;
        this.life -= 1 / this.maxLife;
        return this.life > 0;
    }
    
    draw(ctx) {
        ctx.fillStyle = `rgba(200, 50, 50, ${this.life})`;
        ctx.fillRect(this.x - 2, this.y - 2, 4, 4);
    }
}

// 游戏主类
class ShootingGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // 世界设置
        this.worldWidth = 2000;
        this.cameraX = 0;
        
        // 玩家
        this.player = {
            x: 400,
            y: 340,
            width: 24,
            height: 24,
            health: 5,
            maxHealth: 5,
            ammo: 30,
            maxAmmo: 30
        };
        
        // 子弹
        this.bullets = [];
        
        // 敌人
        this.enemies = [];
        this.enemySpawnTimer = 0;
        
        // 弹药箱
        this.ammoCrates = [];
        this.crateSpawnTimer = 0;
        
        // 特效
        this.particles = [];
        
        // 分数
        this.score = 0;
        this.gameRunning = true;
        
        // 射击冷却
        this.shootCooldown = 0;
        
        // 瞄准方向（鼠标/触摸位置）
        this.aimX = this.player.x;
        this.aimY = this.player.y - 30;
        
        // 控制状态
        this.leftPressed = false;
        this.rightPressed = false;
        
        this.setupControls();
        this.setupEvents();
        this.spawnInitial();
    }
    
    spawnInitial() {
        for (let i = 0; i < 3; i++) {
            this.spawnEnemy();
        }
        for (let i = 0; i < 2; i++) {
            this.spawnAmmoCrate();
        }
    }
    
    spawnEnemy() {
        const side = Math.random() > 0.5 ? -1 : 1;
        let x;
        if (side === -1) {
            x = this.cameraX - 80;
        } else {
            x = this.cameraX + this.canvas.width + 80;
        }
        
        this.enemies.push({
            x: x,
            y: 340,
            width: 28,
            height: 28,
            health: 3,
            maxHealth: 3,
            type: 'normal',
            speed: 1.5
        });
    }
    
    spawnAmmoCrate() {
        const x = this.cameraX + Math.random() * this.canvas.width;
        this.ammoCrates.push({
            x: x,
            y: 350,
            width: 20,
            height: 20,
            ammoAmount: 10
        });
    }
    
    // 产生碎裂特效
    spawnExplosion(x, y) {
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed - 2;
            this.particles.push(new Particle(x, y, vx, vy));
        }
    }
    
    setupControls() {
        const leftBtn = document.getElementById('leftBtn');
        const rightBtn = document.getElementById('rightBtn');
        const shootBtn = document.getElementById('shootBtn');
        const restartBtn = document.getElementById('restartBtn');
        
        const startLeft = () => { this.leftPressed = true; };
        const endLeft = () => { this.leftPressed = false; };
        const startRight = () => { this.rightPressed = true; };
        const endRight = () => { this.rightPressed = false; };
        
        if (leftBtn) {
            leftBtn.addEventListener('mousedown', startLeft);
            leftBtn.addEventListener('mouseup', endLeft);
            leftBtn.addEventListener('mouseleave', endLeft);
            leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startLeft(); });
            leftBtn.addEventListener('touchend', (e) => { e.preventDefault(); endLeft(); });
        }
        
        if (rightBtn) {
            rightBtn.addEventListener('mousedown', startRight);
            rightBtn.addEventListener('mouseup', endRight);
            rightBtn.addEventListener('mouseleave', endRight);
            rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startRight(); });
            rightBtn.addEventListener('touchend', (e) => { e.preventDefault(); endRight(); });
        }
        
        // 射击按钮
        const shoot = () => { this.shoot(); };
        if (shootBtn) {
            shootBtn.addEventListener('click', shoot);
            shootBtn.addEventListener('touchstart', (e) => { e.preventDefault(); shoot(); });
        }
        
        if (restartBtn) {
            restartBtn.addEventListener('click', () => this.restart());
        }
    }
    
    setupEvents() {
        // 键盘控制
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.leftPressed = true;
            if (e.key === 'ArrowRight') this.rightPressed = true;
            if (e.key === ' ' || e.key === 'Space') {
                e.preventDefault();
                this.shoot();
            }
        });
        window.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft') this.leftPressed = false;
            if (e.key === 'ArrowRight') this.rightPressed = false;
        });
        
        // 鼠标移动瞄准
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            let mouseX = (e.clientX - rect.left) * scaleX;
            let mouseY = (e.clientY - rect.top) * scaleY;
            mouseX = Math.max(0, Math.min(mouseX, this.canvas.width));
            mouseY = Math.max(0, Math.min(mouseY, this.canvas.height));
            this.aimX = mouseX;
            this.aimY = mouseY;
        });
        
        // 触摸移动瞄准
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            let touchX = (e.touches[0].clientX - rect.left) * scaleX;
            let touchY = (e.touches[0].clientY - rect.top) * scaleY;
            touchX = Math.max(0, Math.min(touchX, this.canvas.width));
            touchY = Math.max(0, Math.min(touchY, this.canvas.height));
            this.aimX = touchX;
            this.aimY = touchY;
        });
    }
    
    shoot() {
        if (!this.gameRunning) return;
        if (this.shootCooldown > 0) return;
        if (this.player.ammo <= 0) return;
        
        // 计算子弹方向（从玩家指向瞄准点）
        const dx = this.aimX - this.player.x;
        const dy = this.aimY - this.player.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length > 0.01) {
            const normX = dx / length;
            const normY = dy / length;
            const speed = 10;
            
            this.bullets.push({
                x: this.player.x + normX * 15,
                y: this.player.y - 5 + normY * 10,
                width: 6,
                height: 6,
                vx: normX * speed,
                vy: normY * speed,
                life: 1
            });
        } else {
            // 默认向上射击
            this.bullets.push({
                x: this.player.x,
                y: this.player.y - 15,
                width: 6,
                height: 6,
                vx: 0,
                vy: -10,
                life: 1
            });
        }
        
        this.player.ammo--;
        this.shootCooldown = 12;
        this.updateUI();
    }
    
    update() {
        if (!this.gameRunning) return;
        
        // 射击冷却
        if (this.shootCooldown > 0) this.shootCooldown--;
        
        // 玩家移动
        let move = 0;
        if (this.leftPressed) move = -6;
        if (this.rightPressed) move = 6;
        this.player.x += move;
        this.player.x = Math.max(30, Math.min(this.player.x, this.canvas.width - 30));
        
        // 相机跟随
        let targetCamera = this.player.x - this.canvas.width / 2;
        targetCamera = Math.max(0, Math.min(targetCamera, this.worldWidth - this.canvas.width));
        this.cameraX = targetCamera;
        
        // 更新子弹
        for (let i = 0; i < this.bullets.length; i++) {
            this.bullets[i].x += this.bullets[i].vx;
            this.bullets[i].y += this.bullets[i].vy;
            if (this.bullets[i].x < -50 || this.bullets[i].x > this.canvas.width + 50 ||
                this.bullets[i].y < -50 || this.bullets[i].y > this.canvas.height + 50) {
                this.bullets.splice(i, 1);
                i--;
            }
        }
        
        // 更新敌人并移动
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            const playerWorldX = this.player.x + this.cameraX;
            
            if (enemy.x < playerWorldX) {
                enemy.x += enemy.speed;
            } else {
                enemy.x -= enemy.speed;
            }
            
            // 边界移除
            if (enemy.x < this.cameraX - 150 || enemy.x > this.cameraX + this.canvas.width + 150) {
                this.enemies.splice(i, 1);
                i--;
                continue;
            }
            
            // 子弹碰撞
            for (let j = 0; j < this.bullets.length; j++) {
                const bullet = this.bullets[j];
                const screenEnemyX = enemy.x - this.cameraX;
                if (Math.abs(bullet.x - screenEnemyX) < 18 && Math.abs(bullet.y - enemy.y) < 18) {
                    enemy.health--;
                    this.bullets.splice(j, 1);
                    j--;
                    
                    if (enemy.health <= 0) {
                        // 产生碎裂特效
                        this.spawnExplosion(screenEnemyX + 14, enemy.y + 14);
                        this.enemies.splice(i, 1);
                        this.score += 10;
                        this.updateUI();
                        i--;
                        break;
                    }
                }
            }
        }
        
        // 玩家与敌人碰撞
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            const screenEnemyX = enemy.x - this.cameraX;
            if (Math.abs(this.player.x - screenEnemyX) < 25 && Math.abs(this.player.y - enemy.y) < 25) {
                this.spawnExplosion(screenEnemyX + 14, enemy.y + 14);
                this.player.health--;
                this.enemies.splice(i, 1);
                this.updateUI();
                if (this.player.health <= 0) {
                    this.gameOver();
                }
                i--;
            }
        }
        
        // 弹药箱碰撞
        for (let i = 0; i < this.ammoCrates.length; i++) {
            const crate = this.ammoCrates[i];
            const screenCrateX = crate.x - this.cameraX;
            if (Math.abs(this.player.x - screenCrateX) < 20 && Math.abs(this.player.y - crate.y) < 20) {
                this.player.ammo = Math.min(this.player.ammo + crate.ammoAmount, this.player.maxAmmo);
                this.ammoCrates.splice(i, 1);
                i--;
                this.updateUI();
            }
        }
        
        // 更新粒子特效
        for (let i = 0; i < this.particles.length; i++) {
            if (!this.particles[i].update()) {
                this.particles.splice(i, 1);
                i--;
            }
        }
        
        // 生成敌人
        if (this.enemySpawnTimer <= 0) {
            if (this.enemies.length < 8) {
                this.spawnEnemy();
            }
            this.enemySpawnTimer = 45 + Math.random() * 45;
        } else {
            this.enemySpawnTimer--;
        }
        
        // 生成弹药箱
        if (this.crateSpawnTimer <= 0) {
            if (this.ammoCrates.length < 3) {
                this.spawnAmmoCrate();
            }
            this.crateSpawnTimer = 350 + Math.random() * 250;
        } else {
            this.crateSpawnTimer--;
        }
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 水墨风格背景
        this.ctx.fillStyle = '#fafaf5';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 地面
        this.ctx.beginPath();
        this.ctx.moveTo(0, 360);
        this.ctx.lineTo(this.canvas.width, 360);
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#333';
        this.ctx.stroke();
        
        // 远山
        this.ctx.beginPath();
        this.ctx.moveTo(0, 360);
        this.ctx.lineTo(100, 300);
        this.ctx.lineTo(200, 340);
        this.ctx.lineTo(300, 280);
        this.ctx.lineTo(400, 320);
        this.ctx.lineTo(500, 270);
        this.ctx.lineTo(600, 310);
        this.ctx.lineTo(700, 290);
        this.ctx.lineTo(this.canvas.width, 330);
        this.ctx.lineTo(this.canvas.width, 360);
        this.ctx.fillStyle = '#e8e8dd';
        this.ctx.fill();
        
        // 瞄准线
        this.ctx.beginPath();
        this.ctx.moveTo(this.player.x, this.player.y - 10);
        this.ctx.lineTo(this.aimX, this.aimY);
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = '#999';
        this.ctx.setLineDash([5, 5]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // 弹药箱
        for (const crate of this.ammoCrates) {
            const x = crate.x - this.cameraX;
            if (x + crate.width > 0 && x < this.canvas.width) {
                this.ctx.fillStyle = '#8B6914';
                this.ctx.fillRect(x, crate.y, crate.width, crate.height);
                this.ctx.fillStyle = '#DAA520';
                this.ctx.fillRect(x + 5, crate.y + 5, crate.width - 10, 5);
                this.ctx.fillStyle = '#333';
                this.ctx.font = '14px Arial';
                this.ctx.fillText('📦', x + 4, crate.y + 16);
            }
        }
        
        // 敌人
        for (const enemy of this.enemies) {
            const x = enemy.x - this.cameraX;
            if (x + enemy.width > 0 && x < this.canvas.width) {
                this.ctx.fillStyle = '#444';
                this.ctx.beginPath();
                this.ctx.ellipse(x + 14, enemy.y + 14, 14, 12, 0, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = '#222';
                this.ctx.beginPath();
                this.ctx.arc(x + 8, enemy.y + 10, 3, 0, Math.PI * 2);
                this.ctx.arc(x + 20, enemy.y + 10, 3, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = '#d32f2f';
                this.ctx.fillRect(x + 10, enemy.y + 18, 8, 4);
                // 血条
                this.ctx.fillStyle = '#d32f2f';
                this.ctx.fillRect(x, enemy.y - 8, (enemy.health / enemy.maxHealth) * enemy.width, 4);
                this.ctx.fillStyle = '#ccc';
                this.ctx.fillRect(x + (enemy.health / enemy.maxHealth) * enemy.width, enemy.y - 8, 
                    (1 - enemy.health / enemy.maxHealth) * enemy.width, 4);
            }
        }
        
        // 玩家
        this.ctx.fillStyle = '#222';
        this.ctx.beginPath();
        this.ctx.ellipse(this.player.x + 12, this.player.y + 12, 12, 14, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#f5f5dc';
        this.ctx.beginPath();
        this.ctx.arc(this.player.x + 8, this.player.y + 8, 5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#222';
        this.ctx.beginPath();
        this.ctx.arc(this.player.x + 6, this.player.y + 7, 1.5, 0, Math.PI * 2);
        this.ctx.arc(this.player.x + 10, this.player.y + 7, 1.5, 0, Math.PI * 2);
        this.ctx.fill();
        // 枪（指向瞄准方向）
        const angle = Math.atan2(this.aimY - (this.player.y + 10), this.aimX - (this.player.x + 12));
        const gunX = this.player.x + 20;
        const gunY = this.player.y + 12;
        const gunEndX = gunX + Math.cos(angle) * 20;
        const gunEndY = gunY + Math.sin(angle) * 6;
        this.ctx.beginPath();
        this.ctx.moveTo(gunX, gunY - 3);
        this.ctx.lineTo(gunEndX, gunEndY);
        this.ctx.lineTo(gunX, gunY + 3);
        this.ctx.fillStyle = '#555';
        this.ctx.fill();
        
        // 子弹
        for (const bullet of this.bullets) {
            this.ctx.fillStyle = '#d32f2f';
            this.ctx.fillRect(bullet.x - 3, bullet.y - 2, 6, 4);
        }
        
        // 粒子特效
        for (const particle of this.particles) {
            particle.draw(this.ctx);
        }
        
        // 血条背景
        this.ctx.fillStyle = '#ddd';
        this.ctx.fillRect(20, 20, 100, 12);
        this.ctx.fillStyle = '#d32f2f';
        this.ctx.fillRect(20, 20, (this.player.health / this.player.maxHealth) * 100, 12);
        
        // 相机边界提示
        this.ctx.fillStyle = '#999';
        if (this.cameraX > 0) {
            this.ctx.fillRect(5, this.canvas.height / 2 - 20, 4, 40);
        }
        if (this.cameraX < this.worldWidth - this.canvas.width) {
            this.ctx.fillRect(this.canvas.width - 9, this.canvas.height / 2 - 20, 4, 40);
        }
    }
    
    updateUI() {
        const scoreEl = document.getElementById('score');
        const ammoEl = document.getElementById('ammo');
        if (scoreEl) scoreEl.innerText = this.score;
        if (ammoEl) ammoEl.innerText = this.player.ammo;
    }
    
    gameOver() {
        this.gameRunning = false;
        saveScore(this.score);
        setTimeout(() => {
            alert(`游戏结束！\n得分：${this.score}\n最高分已保存`);
            this.restart();
        }, 100);
    }
    
    restart() {
        this.player = {
            x: 400,
            y: 340,
            width: 24,
            height: 24,
            health: 5,
            maxHealth: 5,
            ammo: 30,
            maxAmmo: 30
        };
        this.bullets = [];
        this.enemies = [];
        this.ammoCrates = [];
        this.particles = [];
        this.score = 0;
        this.gameRunning = true;
        this.cameraX = 0;
        this.shootCooldown = 0;
        this.aimX = this.player.x;
        this.aimY = this.player.y - 30;
        this.updateUI();
        this.spawnInitial();
    }
}

// 初始化游戏
if (checkLogin()) {
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        const game = new ShootingGame(canvas);
        
        function gameLoop() {
            game.update();
            game.draw();
            requestAnimationFrame(gameLoop);
        }
        gameLoop();
    }
}