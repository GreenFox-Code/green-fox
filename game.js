// game.js — финальная версия: ввод номера + 5 попыток + счётчик + плашка

const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
if (tg) {
    tg.expand();
}

const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbwECgEU1gmPtV0Rkf9ebfpskEXx7lC9tVmwdu9OcJHClwCvN6NoQ1xgjlFNfH1ISA7w/exec';

// Глобальные переменные
let window_fox_number = "UNKNOWN";
let role = new URLSearchParams(window.location.search).get('role') || 'beta';

// ★ ЭКРАН ВВОДА НОМЕРА ЛИСЫ ★
function showFoxNumberInput() {
    const gameDiv = document.querySelector('.game');
    gameDiv.innerHTML = `
        <div style="font-size:24px; margin-bottom:20px;">🦊 GREEN FOX</div>
        <div style="font-size:18px; margin-bottom:20px; color:#0f0;">Ваша роль: <strong>${role.toUpperCase()}</strong></div>
        <div style="margin-bottom:15px;">Введите номер лисы:</div>
        <input type="number" id="foxInput" placeholder="123" style="
            width:200px; padding:12px; font-size:18px; 
            background:#111; color:#0f0; border:2px solid #0f0; 
            border-radius:10px; text-align:center;
        ">
        <div style="margin-top:20px;">
            <button id="startWithNumber" style="
                background:linear-gradient(45deg, #0f0, #0a0); 
                color:#000; border:2px solid #0f0; 
                padding:15px 30px; font-size:20px; 
                border-radius:15px; font-weight:bold;
                cursor:pointer;
            ">🚀 НАЧАТЬ ИГРУ</button>
        </div>
        <div id="errorMsg" style="color:#f00; margin-top:10px; display:none;"></div>
    `;

    document.getElementById('startWithNumber').onclick = () => {
        const foxInput = document.getElementById('foxInput');
        const foxNum = foxInput.value.trim();
        
        if (!foxNum || foxNum === '') {
            document.getElementById('errorMsg').innerText = '❌ Введите номер лисы!';
            document.getElementById('errorMsg').style.display = 'block';
            return;
        }
        
        if (foxNum.length > 4) {
            document.getElementById('errorMsg').innerText = '❌ Номер слишком длинный (макс. 4 цифры)';
            document.getElementById('errorMsg').style.display = 'block';
            return;
        }
        
        window_fox_number = foxNum;
        document.getElementById('errorMsg').style.display = 'none';
        initGame();
    };
}

// ★ ИНИЦИАЛИЗАЦИЯ С ПЛАШКОЙ + СЧЁТЧИК ПОПЫТОК ★
function initGame() {
    document.querySelector('.game').innerHTML = `
        <div style="font-size:18px; font-weight:bold; margin-bottom:10px;">Green Fox #${window_fox_number}</div>
        <div class="top" style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <div>🦊 <span id="role">${role}</span></div>
            <div>🔴 <span id="hunters">3</span></div>
            <div>⭐ <span id="score">0</span></div>
            <div>❤️ <span id="attempts">5</span>/5</div>
        </div>
        <canvas id="canvas" width="450" height="450"></canvas>
        <div class="controls">
            <button id="up" disabled>▲</button>
            <div>
                <button id="left" disabled>◀</button>
                <button id="down" disabled>▼</button>
                <button id="right" disabled>▶</button>
            </div>
        </div>
        <div id="msg"></div>
    `;
    
    // Плашка "5 попыток" на 3 секунды
    const msgEl = document.getElementById('msg');
    msgEl.innerText = '🎮 У вас 5 попыток! Удачи! 🦊';
    msgEl.style.cssText = 'color:#0f0; font-size:18px; font-weight:bold; background:#111; padding:10px; border-radius:10px; border:2px solid #0f0; margin-top:10px;';
    
    setTimeout(() => {
        msgEl.innerText = '';
        msgEl.style.cssText = '';
    }, 3000);
    
    startGameplay();
}

// Игровые переменные
let fox, hunters, score = 0, running = false;
let attempt = 0, maxAttempts = 5, startTime = 0, finished = false;

// Карта
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const map = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
    [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,1],
    [1,0,1,1,1,0,1,1,1,0,1,1,1,1,1,0,1,0,1],
    [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,1],
    [1,1,1,0,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
    [1,0,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,0,1],
    [1,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,1,0,1],
    [1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const ROWS = map.length, COLS = map[0].length;
const CELL = Math.min(canvas.width / COLS, canvas.height / ROWS);

function canMove(x, y) { return map[y] && map[y][x] === 0; }

function resetGame() {
    fox = { x: 1, y: 13, dx: 0, dy: 0 };
    hunters = [
        { x: 9, y: 1, type: 'chaser' },
        { x: 17, y: 7, type: 'ambush' },
        { x: 1, y: 7, type: 'random' }
    ];
    score = 0;
    updateUI();
}

function moveFox(dx, dy) {
    if (!running) return;
    const nx = fox.x + dx, ny = fox.y + dy;
    if (canMove(nx, ny)) {
        fox.x = nx; fox.y = ny; fox.dx = dx; fox.dy = dy; score++; updateUI();
    }
}

function moveHunters() {
    hunters.forEach(h => {
        let options = [{x:h.x+1,y:h.y},{x:h.x-1,y:h.y},{x:h.x,y:h.y+1},{x:h.x,y:h.y-1}].filter(p=>canMove(p.x,p.y));
        if (!options.length) return;
        let target;
        if (h.type === 'chaser') target = { x: fox.x, y: fox.y };
        else if (h.type === 'ambush') target = { x: fox.x + fox.dx * 2, y: fox.y + fox.dy * 2 };
        else {
            if (Math.random() < 0.5) {
                const r = options[Math.floor(Math.random() * options.length)];
                h.x = r.x; h.y = r.y; return;
            }
            target = { x: fox.x, y: fox.y };
        }
        options.sort((a,b)=>
            (Math.abs(a.x-target.x)+Math.abs(a.y-target.y))-(Math.abs(b.x-target.x)+Math.abs(b.y-target.y))
        );
        h.x = options[0].x; h.y = options[0].y;
    });
}

function check() {
    for (let h of hunters) if (h.x===fox.x && h.y===fox.y) { end(false); return; }
    if (fox.x===17 && fox.y===1) end(true);
}

async function end(win) {
    running = false;
    const duration = (Date.now() - startTime) / 1000;
    
    const result = {
        fox_number: window_fox_number,
        role: role,
        win: win,
        time: duration,
        score: score,
        attempts_used: attempt
    };

    try {
        await fetch(GOOGLE_SHEET_URL, {
            method: 'POST', mode: 'no-cors',
            body: JSON.stringify(result),
            headers: {'Content-Type': 'application/json'}
        });
        let msg = `✅ ОТПРАВЛЕНО!\n#${window_fox_number}\n${win?'🎉 ПОБЕДА':'💀 ПОЙМАН'}\n${duration.toFixed(1)}с`;
        if (!win && attempt >= maxAttempts) msg += '\n🛑 Попытки закончились';
        document.getElementById('msg').innerText = msg;
    } catch(e) {
        let msg = `⚠️ Нет 
