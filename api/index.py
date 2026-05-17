from http.server import BaseHTTPRequestHandler
import os

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        
        # 读取 index.html
        try:
            with open('index.html', 'r', encoding='utf-8') as f:
                content = f.read()
        except:
            content = "<h1>Hello from Vercel!</h1>"
        
        self.wfile.write(content.encode())