import json
import time
from urllib.parse import urlparse, parse_qs
import http.server
import os
import hashlib

from data_manager import init_directories, load_users, save_users
from user_manager import *
from friend_manager import *
from chat_manager import *
from game_manager import *

# 加载用户数据
all_users = load_users()

# 在线用户
online_users = {}

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        # 静态文件（头像）
        if parsed_path.path.startswith('/avatars/'):
            self.serve_avatar(parsed_path.path)
            return
        
        # 静态文件（图片）
        if parsed_path.path.startswith('/images/'):
            self.serve_image(parsed_path.path)
            return
        
        # API路由
        routes = {
            '/online': self.handle_online,
            '/login': self.handle_login,
            '/register': self.handle_register,
            '/getUserByUid': self.handle_get_user_by_uid,
            '/sendFriendRequest': self.handle_send_friend_request,
            '/acceptFriendRequest': self.handle_accept_friend_request,
            '/getFriendRequests': self.handle_get_friend_requests,
            '/getFriends': self.handle_get_friends,
            '/getMessages': self.handle_get_messages,
            '/saveMessage': self.handle_save_message,
            '/broadcastMessage': self.handle_broadcast_message,
            '/sendPrivateMessage': self.handle_send_private_message,
            '/updateUser': self.handle_update_user,
            '/updateScore': self.handle_update_score,
            '/getRanking': self.handle_get_ranking,
            '/getAllUsers': self.handle_get_all_users,
            '/banUser': self.handle_ban_user,
            '/getACoin': self.handle_get_a_coin,
            '/sendACoin': self.handle_send_a_coin,
        }
        
        if parsed_path.path in routes:
            routes[parsed_path.path]()
        else:
            super().do_GET()
    
    def do_POST(self):
        parsed_path = urlparse(self.path)
        if parsed_path.path == '/uploadAvatar':
            self.handle_upload_avatar()
        elif parsed_path.path == '/uploadImage':
            self.handle_upload_image()
        else:
            super().do_GET()
    
    def send_json(self, data):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def get_params(self):
        return parse_qs(urlparse(self.path).query)
    
    # ========== 在线人数 ==========
    def handle_online(self):
        params = self.get_params()
        user_id = params.get('userId', [None])[0]
        username = params.get('username', [None])[0]
        nickname = params.get('nickname', [None])[0]
        avatar = params.get('avatar', ['👤'])[0]
        clear = params.get('clear', [None])[0]
        
        now = time.time()
        timeout_ids = [uid for uid, data in online_users.items() if now - data['lastHeartbeat'] > 10]
        for uid in timeout_ids:
            del online_users[uid]
        
        if clear and user_id and user_id in online_users:
            del online_users[user_id]
        elif user_id:
            online_users[user_id] = {
                'userId': user_id,
                'username': username or '游客',
                'nickname': nickname or '游客',
                'avatar': avatar,
                'lastHeartbeat': now
            }
        
        user_list = [{'userId': data['userId'], 'username': data['username'], 'nickname': data['nickname'], 'avatar': data['avatar']} for data in online_users.values()]
        self.send_json({'count': len(online_users), 'users': user_list})
    
    # ========== 用户相关 ==========
    def handle_login(self):
        params = self.get_params()
        username = params.get('username', [None])[0]
        password = params.get('password', [None])[0]
        
        if username and password:
            result = login_user(all_users, username, password)
            self.send_json(result)
        else:
            self.send_json({'success': False, 'error': '参数错误'})
    
    def handle_register(self):
        params = self.get_params()
        username = params.get('username', [None])[0]
        password = params.get('password', [None])[0]
        nickname = params.get('nickname', [None])[0]
        
        if username and password and nickname:
            result = register_user(all_users, username, password, nickname)
            self.send_json(result)
        else:
            self.send_json({'success': False, 'error': '请填写完整信息'})
    
    def handle_get_user_by_uid(self):
        params = self.get_params()
        uid = params.get('uid', [None])[0]
        
        if uid:
            result = get_user_by_uid(all_users, uid)
            self.send_json(result)
        else:
            self.send_json({'success': False, 'error': '参数错误'})
    
    def handle_update_user(self):
        params = self.get_params()
        username = params.get('username', [None])[0]
        nickname = params.get('nickname', [None])[0]
        avatar = params.get('avatar', [None])[0]
        oldPassword = params.get('oldPassword', [None])[0]
        newPassword = params.get('newPassword', [None])[0]
        
        result = update_user(all_users, username, nickname, avatar, oldPassword, newPassword)
        self.send_json(result)
    
    def handle_get_all_users(self):
        params = self.get_params()
        username = params.get('username', [None])[0]
        result = get_all_users(all_users, username)
        self.send_json(result)
    
    def handle_ban_user(self):
        params = self.get_params()
        adminUsername = params.get('admin', [None])[0]
        targetUsername = params.get('username', [None])[0]
        action = params.get('action', [None])[0]
        hours = params.get('hours', [None])[0]
        reason = params.get('reason', [None])[0]
        
        result = ban_user(all_users, adminUsername, targetUsername, action, hours, reason)
        self.send_json(result)
    
    # ========== 好友相关 ==========
    def handle_send_friend_request(self):
        params = self.get_params()
        fromUsername = params.get('from', [None])[0]
        toUid = params.get('toUid', [None])[0]
        
        result = send_friend_request(all_users, fromUsername, toUid)
        self.send_json(result)
    
    def handle_accept_friend_request(self):
        params = self.get_params()
        username = params.get('username', [None])[0]
        fromUsername = params.get('from', [None])[0]
        
        result = accept_friend_request(all_users, username, fromUsername)
        self.send_json(result)
    
    def handle_get_friend_requests(self):
        params = self.get_params()
        username = params.get('username', [None])[0]
        result = get_friend_requests(all_users, username)
        self.send_json(result)
    
    def handle_get_friends(self):
        params = self.get_params()
        username = params.get('username', [None])[0]
        result = get_friends(all_users, username)
        self.send_json(result)
    
    # ========== 聊天相关 ==========
    def handle_get_messages(self):
        params = self.get_params()
        username = params.get('username', [None])[0]
        result = get_messages(all_users, username)
        self.send_json(result)
    
    def handle_save_message(self):
        params = self.get_params()
        username = params.get('username', [None])[0]
        chatId = params.get('chatId', [None])[0]
        messageJson = params.get('message', [None])[0]
        
        result = save_message(all_users, username, chatId, messageJson)
        self.send_json(result)
    
    def handle_broadcast_message(self):
        params = self.get_params()
        chatId = params.get('chatId', [None])[0]
        messageJson = params.get('message', [None])[0]
        
        result = broadcast_message(all_users, chatId, messageJson)
        self.send_json(result)
    
    def handle_send_private_message(self):
        params = self.get_params()
        toUser = params.get('to', [None])[0]
        messageJson = params.get('message', [None])[0]
        
        result = send_private_message(all_users, toUser, messageJson)
        self.send_json(result)
    
    # ========== 游戏相关 ==========
    def handle_update_score(self):
        params = self.get_params()
        username = params.get('username', [None])[0]
        score = params.get('score', [None])[0]
        game = params.get('game', ['default'])[0]
        
        result = update_score(all_users, username, score, game)
        self.send_json(result)
    
    def handle_get_ranking(self):
        params = self.get_params()
        game = params.get('game', ['brick'])[0]
        result = get_ranking(all_users, game)
        self.send_json(result)
    
    # ========== A币相关 ==========
    def handle_get_a_coin(self):
        params = self.get_params()
        username = params.get('username', [None])[0]
        
        if username and username in all_users:
            self.send_json({'success': True, 'a_coin': all_users[username].get('a_coin', 100)})
        else:
            self.send_json({'success': False, 'a_coin': 0})
    
    def handle_send_a_coin(self):
        params = self.get_params()
        fromUser = params.get('from', [None])[0]
        toUser = params.get('to', [None])[0]
        amount = params.get('amount', [None])[0]
        
        if fromUser and toUser and amount and fromUser in all_users and toUser in all_users:
            amount = int(amount)
            if amount <= 0:
                self.send_json({'success': False, 'error': '金额必须大于0'})
                return
            if all_users[fromUser].get('a_coin', 100) < amount:
                self.send_json({'success': False, 'error': 'A币不足'})
                return
            
            all_users[fromUser]['a_coin'] = all_users[fromUser].get('a_coin', 100) - amount
            all_users[toUser]['a_coin'] = all_users[toUser].get('a_coin', 100) + amount
            save_users(all_users)
            
            self.send_json({'success': True, 'from_coin': all_users[fromUser]['a_coin'], 'to_coin': all_users[toUser]['a_coin']})
        else:
            self.send_json({'success': False, 'error': '参数错误'})
    
    # ========== 头像上传 ==========
    def handle_upload_avatar(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        boundary = self.headers['Content-Type'].split('boundary=')[1].encode()
        parts = post_data.split(boundary)
        
        username = None
        image_data = None
        
        for part in parts:
            if b'Content-Disposition' in part:
                if b'name="username"' in part:
                    username = part.split(b'\r\n\r\n')[1].split(b'\r\n')[0].decode()
                if b'name="avatar"' in part:
                    data_start = part.find(b'\r\n\r\n') + 4
                    image_data = part[data_start:].rstrip(b'\r\n--')
        
        if username and image_data and username in all_users:
            if not os.path.exists('avatars'):
                os.makedirs('avatars')
            
            filename = f'{username}_{int(time.time())}.png'
            filepath = os.path.join('avatars', filename)
            
            with open(filepath, 'wb') as f:
                f.write(image_data)
            
            avatar_url = f'/avatars/{filename}'
            all_users[username]['avatar'] = avatar_url
            save_users(all_users)
            
            self.send_json({'success': True, 'avatar': avatar_url})
        else:
            self.send_json({'success': False, 'error': '上传失败'})
    
    # ========== 图片上传 ==========
    def handle_upload_image(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        boundary = self.headers['Content-Type'].split('boundary=')[1].encode()
        parts = post_data.split(boundary)
        
        username = None
        image_data = None
        
        for part in parts:
            if b'Content-Disposition' in part:
                if b'name="username"' in part:
                    username = part.split(b'\r\n\r\n')[1].split(b'\r\n')[0].decode()
                if b'name="image"' in part:
                    data_start = part.find(b'\r\n\r\n') + 4
                    image_data = part[data_start:].rstrip(b'\r\n--')
        
        if username and image_data and username in all_users:
            if not os.path.exists('images'):
                os.makedirs('images')
            
            file_hash = hashlib.md5(image_data).hexdigest()[:16]
            filename = f'img_{file_hash}_{int(time.time())}.png'
            filepath = os.path.join('images', filename)
            
            with open(filepath, 'wb') as f:
                f.write(image_data)
            
            image_url = f'/images/{filename}'
            self.send_json({'success': True, 'url': image_url})
        else:
            self.send_json({'success': False, 'error': '上传失败'})
    
    def serve_avatar(self, path):
        file_path = '.' + path
        if os.path.exists(file_path):
            self.send_response(200)
            if file_path.endswith('.png'):
                self.send_header('Content-type', 'image/png')
            elif file_path.endswith('.jpg') or file_path.endswith('.jpeg'):
                self.send_header('Content-type', 'image/jpeg')
            else:
                self.send_header('Content-type', 'image/png')
            self.end_headers()
            with open(file_path, 'rb') as f:
                self.wfile.write(f.read())
        else:
            self.send_response(404)
            self.end_headers()
    
    def serve_image(self, path):
        file_path = '.' + path
        if os.path.exists(file_path):
            self.send_response(200)
            if file_path.endswith('.png'):
                self.send_header('Content-type', 'image/png')
            elif file_path.endswith('.jpg') or file_path.endswith('.jpeg'):
                self.send_header('Content-type', 'image/jpeg')
            else:
                self.send_header('Content-type', 'image/png')
            self.end_headers()
            with open(file_path, 'rb') as f:
                self.wfile.write(f.read())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        pass