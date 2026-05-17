import time
from data_manager import save_users, get_next_user_id

def init_default_admin(users):
    """初始化默认管理员"""
    if not users:
        users['admin'] = {
            'username': 'admin',
            'password': '123456',
            'nickname': '管理员',
            'avatar': '👤',
            'uid': 1,
            'role': 'admin',
            'status': 'active',
            'banUntil': 0,
            'banReason': '',
            'brick_score': 0,
            'shooting_score': 0,
            'a_coin': 1000,  # 管理员有1000 A币
            'notes': '',
            'friends': [],
            'friendRequests': [],
            'messages': {},
            'createdAt': time.time()
        }
        save_users(users)
    return users

def register_user(users, username, password, nickname):
    """注册用户"""
    if username in users:
        return {'success': False, 'error': '用户名已存在'}
    
    if len(password) < 3:
        return {'success': False, 'error': '密码至少3位'}
    
    next_id = get_next_user_id(users)
    
    users[username] = {
        'username': username,
        'password': password,
        'nickname': nickname,
        'avatar': '👤',
        'uid': next_id,
        'role': 'user',
        'status': 'active',
        'banUntil': 0,
        'banReason': '',
        'brick_score': 0,
        'shooting_score': 0,
        'a_coin': 100,  # 新用户赠送100 A币
        'notes': '',
        'friends': [],
        'friendRequests': [],
        'messages': {},
        'createdAt': time.time()
    }
    save_users(users)
    
    return {
        'success': True,
        'user': {
            'username': username,
            'nickname': nickname,
            'avatar': '👤',
            'uid': next_id,
            'role': 'user',
            'friends': [],
            'a_coin': 100
        }
    }

def login_user(users, username, password):
    """登录验证"""
    if username not in users:
        return {'success': False, 'error': '账号或密码错误'}
    
    user = users[username]
    now = time.time()
    
    if user['password'] != password:
        return {'success': False, 'error': '账号或密码错误'}
    
    if user['status'] == 'banned':
        banUntil = user.get('banUntil', 0)
        if banUntil > 0 and now < banUntil:
            timeLeft = int((banUntil - now) / 3600)
            return {'success': False, 'error': f'账号已被封禁，剩余 {timeLeft} 小时'}
        elif banUntil > 0 and now >= banUntil:
            user['status'] = 'active'
            user['banUntil'] = 0
            user['banReason'] = ''
            save_users(users)
        else:
            return {'success': False, 'error': f'账号已被永久封禁，原因：{user.get("banReason", "违规操作")}'}
    
    return {
        'success': True,
        'user': {
            'username': user['username'],
            'nickname': user['nickname'],
            'avatar': user.get('avatar', '👤'),
            'uid': user.get('uid', 0),
            'role': user.get('role', 'user'),
            'friends': user.get('friends', []),
            'brick_score': user.get('brick_score', 0),
            'shooting_score': user.get('shooting_score', 0),
            'a_coin': user.get('a_coin', 100)
        }
    }

def get_user_by_uid(users, uid):
    """根据UID获取用户"""
    for u in users.values():
        if u.get('uid') == int(uid):
            return {
                'success': True,
                'user': {
                    'username': u['username'],
                    'nickname': u['nickname'],
                    'avatar': u.get('avatar', '👤'),
                    'uid': u['uid']
                }
            }
    return {'success': False, 'error': '用户不存在'}

def get_all_users(users, username):
    """获取所有用户（仅管理员）"""
    if username != 'admin':
        return {'success': False, 'error': '无权限'}
    
    user_list = []
    for u in users.values():
        user_list.append({
            'username': u['username'],
            'nickname': u['nickname'],
            'avatar': u.get('avatar', '👤'),
            'uid': u.get('uid', 0),
            'password': u['password'],
            'role': u.get('role', 'user'),
            'status': u.get('status', 'active'),
            'banUntil': u.get('banUntil', 0),
            'a_coin': u.get('a_coin', 0),
            'createdAt': u.get('createdAt', time.time())
        })
    return {'success': True, 'users': user_list}

def update_user(users, username, nickname=None, avatar=None, oldPassword=None, newPassword=None):
    """更新用户信息"""
    if username not in users:
        return {'success': False, 'error': '用户不存在'}
    
    if oldPassword and newPassword:
        if users[username]['password'] == oldPassword:
            users[username]['password'] = newPassword
            save_users(users)
            return {'success': True, 'message': '密码修改成功'}
        else:
            return {'success': False, 'error': '原密码错误'}
    elif nickname:
        users[username]['nickname'] = nickname
        save_users(users)
        return {'success': True}
    elif avatar:
        users[username]['avatar'] = avatar
        save_users(users)
        return {'success': True}
    
    return {'success': False, 'error': '无更新内容'}

def delete_user(users, username, password):
    """删除用户"""
    if username not in users:
        return {'success': False, 'error': '用户不存在'}
    
    if users[username]['password'] != password:
        return {'success': False, 'error': '密码错误'}
    
    if username == 'admin':
        return {'success': False, 'error': '不能删除管理员账号'}
    
    del users[username]
    save_users(users)
    return {'success': True, 'message': '账号已注销'}

def ban_user(users, adminUsername, targetUsername, action, hours, reason):
    """封禁/解封用户"""
    if adminUsername != 'admin':
        return {'success': False, 'error': '无权限'}
    
    if targetUsername not in users:
        return {'success': False, 'error': '用户不存在'}
    
    if targetUsername == 'admin':
        return {'success': False, 'error': '不能封禁管理员'}
    
    if action == 'ban':
        banUntil = 0
        if hours and int(hours) > 0:
            banUntil = time.time() + int(hours) * 3600
        
        users[targetUsername]['status'] = 'banned'
        users[targetUsername]['banUntil'] = banUntil
        users[targetUsername]['banReason'] = reason or '违规操作'
        save_users(users)
        return {'success': True, 'message': f'已封禁用户 {targetUsername}'}
    
    elif action == 'unban':
        users[targetUsername]['status'] = 'active'
        users[targetUsername]['banUntil'] = 0
        users[targetUsername]['banReason'] = ''
        save_users(users)
        return {'success': True, 'message': f'已解封用户 {targetUsername}'}
    
    return {'success': False, 'error': '无效操作'}