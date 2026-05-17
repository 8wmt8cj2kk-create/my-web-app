from http.server import BaseHTTPRequestHandler
import os

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        
        # 读取 index.html
        html_path = os.path.join(os.path.dirname(__file__), '..', 'index.html')
        try:
            with open(html_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except:
            content = "<h1>Hello from Vercel!</h1>"
        
        self.wfile.write(content.encode())
    
    def do_POST(self):
        # 处理 POST 请求（如果需要）
        self.do_GET()