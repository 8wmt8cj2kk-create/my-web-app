import json
import os
from fastapi import FastAPI, Request, Response
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()

# 尝试挂载静态文件目录（如果有需要）
try:
    app.mount("/avatars", StaticFiles(directory="avatars"), name="avatars")
except:
    pass
try:
    app.mount("/images", StaticFiles(directory="images"), name="images")
except:
    pass

# 模拟原来的 all_users 和 online_users（实际会用数据库）
all_users = {}
online_users = {}

# ========== 你原来的 API 逻辑，改写为 FastAPI 路由 ==========

@app.get("/")
async def root():
    """提供前端入口页面"""
    try:
        with open("index.html", "r", encoding="utf-8") as f:
            html_content = f.read()
        return HTMLResponse(content=html_content)
    except:
        return HTMLResponse(content="<h1>404</h1><p>index.html not found</p>", status_code=404)


@app.get("/login")
async def login(username: str = None, password: str = None):
    if username and password:
        return JSONResponse(content={"success": True, "user": {"username": username, "nickname": "测试用户"}})
    return JSONResponse(content={"success": False, "error": "参数错误"})


@app.get("/register")
async def register(username: str = None, password: str = None, nickname: str = None):
    if username and password and nickname:
        return JSONResponse(content={"success": True, "user": {"username": username, "nickname": nickname}})
    return JSONResponse(content={"success": False, "error": "参数错误"})


@app.get("/getMessages")
async def get_messages(username: str = None):
    if username:
        return JSONResponse(content={"success": True, "messages": {}})
    return JSONResponse(content={"success": False, "messages": {}})


@app.get("/getFriends")
async def get_friends(username: str = None):
    if username:
        return JSONResponse(content={"success": True, "friends": []})
    return JSONResponse(content={"success": False, "friends": []})


@app.get("/sendFriendRequest")
async def send_friend_request(from_user: str = None, toUid: int = None):
    return JSONResponse(content={"success": True})


@app.get("/acceptFriendRequest")
async def accept_friend_request(username: str = None, from_user: str = None):
    return JSONResponse(content={"success": True})


@app.get("/getFriendRequests")
async def get_friend_requests(username: str = None):
    return JSONResponse(content={"success": True, "requests": []})


@app.get("/sendPrivateMessage")
async def send_private_message(to: str = None, message: str = None):
    return JSONResponse(content={"success": True})


@app.get("/online")
async def online(userId: str = None, username: str = None, nickname: str = None, avatar: str = None, clear: str = None):
    return JSONResponse(content={"count": 0, "users": []})


@app.get("/updateUser")
async def update_user(username: str = None, nickname: str = None, avatar: str = None, oldPassword: str = None, newPassword: str = None):
    return JSONResponse(content={"success": True})


@app.get("/updateScore")
async def update_score(username: str = None, score: int = None, game: str = "default"):
    return JSONResponse(content={"success": True, "score": score})


@app.get("/getRanking")
async def get_ranking(game: str = "brick"):
    return JSONResponse(content={"success": True, "ranking": []})


@app.get("/getAllUsers")
async def get_all_users(username: str = None):
    if username == "admin":
        return JSONResponse(content={"success": True, "users": []})
    return JSONResponse(content={"success": False, "error": "无权限"})


@app.get("/banUser")
async def ban_user(admin: str = None, username: str = None, action: str = None, hours: int = None, reason: str = None):
    return JSONResponse(content={"success": True})


@app.get("/getACoin")
async def get_a_coin(username: str = None):
    return JSONResponse(content={"success": True, "a_coin": 100})


@app.get("/sendACoin")
async def send_a_coin(from_user: str = None, to: str = None, amount: int = None):
    return JSONResponse(content={"success": True})