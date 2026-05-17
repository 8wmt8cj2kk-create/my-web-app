import time
from data_manager import save_users

def send_friend_request(users, fromUsername, toUid):
    """发送好友请求"""
    targetUser = None
    for u in users.values():
        if u.get('uid') == int(toUid):
            targetUser = u
            break
    
    if not targetUser:
        return {'success': False, 'error': '用户不存在'}
    
    if targetUser['username'] == fromUsername:
        return {'success': False, 'error': '不能添加自己为好友'}
    
    request = {
        'from': fromUsername,
        'fromNickname': users[fromUsername]['nickname'],
        'fromAvatar': users[fromUsername].get('avatar', '👤'),
        'time': time.time()
    }
    
    if 'friendRequests' not in targetUser:
        targetUser['friendRequests'] = []
    targetUser['friendRequests'].append(request)
    save_users(users)
    return {'success': True}

def accept_friend_request(users, username, fromUsername):
    """接受好友请求"""
    if username not in users or fromUsername not in users:
        return {'success': False, 'error': '用户不存在'}
    
    user = users[username]
    friend = users[fromUsername]
    
    if 'friends' not in user:
        user['friends'] = []
    if 'friends' not in friend:
        friend['friends'] = []
    
    if fromUsername not in user['friends']:
        user['friends'].append(fromUsername)
    if username not in friend['friends']:
        friend['friends'].append(username)
    
    if 'friendRequests' in user:
        user['friendRequests'] = [r for r in user['friendRequests'] if r['from'] != fromUsername]
    
    save_users(users)
    return {'success': True}

def get_friend_requests(users, username):
    """获取好友请求列表"""
    if username not in users:
        return {'success': False, 'requests': []}
    return {'success': True, 'requests': users[username].get('friendRequests', [])}

def get_friends(users, username):
    """获取好友列表"""
    if username not in users:
        return {'success': False, 'friends': []}
    
    friends = []
    for friendName in users[username].get('friends', []):
        if friendName in users:
            friend = users[friendName]
            friends.append({
                'username': friend['username'],
                'nickname': friend['nickname'],
                'avatar': friend.get('avatar', '👤'),
                'uid': friend.get('uid', 0)
            })
    return {'success': True, 'friends': friends}