from data_manager import save_users

def update_score(users, username, score, game):
    """更新游戏积分"""
    if username not in users:
        return {'success': False, 'error': '用户不存在'}
    
    if score:
        scoreKey = f'{game}_score'
        currentScore = users[username].get(scoreKey, 0)
        newScore = max(currentScore, int(score))
        users[username][scoreKey] = newScore
        save_users(users)
        return {'success': True, 'score': newScore}
    
    return {'success': False, 'error': '无效分数'}

def get_ranking(users, game):
    """获取排行榜"""
    scoreKey = f'{game}_score'
    
    ranking = []
    for u in users.values():
        ranking.append({
            'username': u['username'],
            'nickname': u['nickname'],
            'avatar': u.get('avatar', '👤'),
            'score': u.get(scoreKey, 0)
        })
    ranking.sort(key=lambda x: x['score'], reverse=True)
    return {'success': True, 'ranking': ranking[:20]}