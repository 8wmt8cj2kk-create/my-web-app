from data_manager import save_users

def get_messages(users, username):
    """获取用户所有消息"""
    if username not in users:
        return {'success': False, 'messages': {}}
    
    if 'messages' not in users[username]:
        users[username]['messages'] = {}
    return {'success': True, 'messages': users[username]['messages']}

def save_message(users, username, chatId, messageJson):
    """保存消息"""
    if username not in users:
        return {'success': False}
    
    import json
    if 'messages' not in users[username]:
        users[username]['messages'] = {}
    if chatId not in users[username]['messages']:
        users[username]['messages'][chatId] = []
    
    try:
        msg = json.loads(messageJson)
        users[username]['messages'][chatId].append(msg)
        if len(users[username]['messages'][chatId]) > 100:
            users[username]['messages'][chatId] = users[username]['messages'][chatId][-100:]
        save_users(users)
        return {'success': True}
    except:
        return {'success': False}

def broadcast_message(users, chatId, messageJson):
    """群发消息"""
    import json
    try:
        msg = json.loads(messageJson)
        for username, user in users.items():
            if 'messages' not in user:
                user['messages'] = {}
            if chatId not in user['messages']:
                user['messages'][chatId] = []
            user['messages'][chatId].append(msg)
            if len(user['messages'][chatId]) > 100:
                user['messages'][chatId] = user['messages'][chatId][-100:]
        save_users(users)
        return {'success': True}
    except:
        return {'success': False}

def send_private_message(users, toUser, messageJson):
    """发送私聊消息"""
    import json
    if toUser not in users:
        return {'success': False}
    
    try:
        msg = json.loads(messageJson)
        for username in [msg['sender'], toUser]:
            if username not in users:
                continue
            chatId = [msg['sender'], toUser]
            chatId.sort()
            chatId = '_'.join(chatId)
            
            if 'messages' not in users[username]:
                users[username]['messages'] = {}
            if chatId not in users[username]['messages']:
                users[username]['messages'][chatId] = []
            users[username]['messages'][chatId].append(msg)
            if len(users[username]['messages'][chatId]) > 100:
                users[username]['messages'][chatId] = users[username]['messages'][chatId][-100:]
        save_users(users)
        return {'success': True}
    except:
        return {'success': False}