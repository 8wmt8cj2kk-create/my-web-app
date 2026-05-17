from http.server import BaseHTTPRequestHandler
import os

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        
        # 获取项目根目录路径
        base_path = os.path.dirname(os.path.dirname(__file__))
        html_path = os.path.join(base_path, 'index.html')
        
        try:
            with open(html_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except:
            content = """
            <!DOCTYPE html>
            <html>
            <head><title>My App</title></head>
            <body>
                <h1>Hello from Vercel!</h1>
                <p>Your app is running.</p>
                <a href="/login.html">Go to Login</a>
            </body>
            </html>
            """
        
        self.wfile.write(content.encode())