import os
import json
import time

DATA_FILE = 'users_data.json'
AVATAR_DIR = 'avatars'

def init_directories():
    """初始化目录"""
    if not os.path.exists(AVATAR_DIR):
        os.makedirs(AVATAR_DIR)

def load_users():
    """加载用户数据"""
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_users(users):
    """保存用户数据"""
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(users, f, ensure_ascii=False, indent=2)

def get_next_user_id(users):
    """获取下一个用户ID"""
    max_id = 0
    for u in users.values():
        uid = u.get('uid', 0)
        if uid > max_id:
            max_id = uid
    return max_id + 1