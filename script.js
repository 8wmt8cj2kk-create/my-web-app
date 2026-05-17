// 获取按钮和文字元素
const button = document.getElementById('clickBtn');
const message = document.getElementById('message');

// 添加点击事件
let clickCount = 0;
button.addEventListener('click', function() {
    clickCount++;
    if (clickCount === 1) {
        message.textContent = '你点了我一次！';
    } else {
        message.textContent = `你点了我 ${clickCount} 次！`;
    }
    
    // 添加一个小动画效果
    message.style.transform = 'scale(1.1)';
    setTimeout(() => {
        message.style.transform = 'scale(1)';
    }, 200);
});