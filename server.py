import socketserver
import socket
import json
import time
import os
from urllib.parse import urlparse, parse_qs
from handlers import MyHandler

PORT = 3762

if __name__ == '__main__':
    print("=" * 40)
    print("🚀 服务器启动中...")
    print("=" * 40)
    
    try:
        with socketserver.TCPServer(("0.0.0.0", PORT), MyHandler) as httpd:
            hostname = socket.gethostname()
            local_ip = socket.gethostbyname(hostname)
            
            print(f"✅ 服务器运行在 http://0.0.0.0:{PORT}")
            print(f"📱 本机访问: http://localhost:{PORT}")
            print(f"📱 局域网访问: http://{local_ip}:{PORT}")
            print(f"👤 管理员账号: admin / 123456")
            print("=" * 40)
            print("按 Ctrl+C 停止服务器")
            
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n✅ 服务器已停止")
    except Exception as e:
        print(f"❌ 启动失败: {e}")