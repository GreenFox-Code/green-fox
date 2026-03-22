// game.js — с вводом номера лисы перед игрой

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
        
        // Сохраняем номер и запускаем игру
        window_fox_number = foxNum;
        document.getElementById('errorMsg').style.display = 'none';
        initGame();
    };
}

// ИНИЦИАЛИЗАЦИЯ ИГРЫ ПОСЛЕ ВВОДА НОМЕРА
function initGame() {
    // Восстанавливаем UI игры
    document.querySelector('.game').innerHTML = `
        <div style="font-size:18px; font-weight:bold; margin-bottom:10px;">Green Fox #${window_fox_number}</div>
        <div class="top">
            <div>🦊 <span id="role">${role}</span></div>
            <div>🔴 <span id="hunters">0</span></div>
            <div>⭐ <span id="score">0</span></div>
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
    
    startGameplay();
}

let fox, hunters, score = 0, running = false;
let attempt = 0, maxAttempts = 3, startTime = 0, finished = false;
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
        let target = h.type==='chaser' ? {x:fox.x,y:fox.y} : 
                     h.type==='ambush' ? {x:fox.x+fox.dx*2,y:fox.y+fox.dy*2} :
                     (Math.random()<0.5 ? options[Math.floor(Math.random()*options.length)] : {x:fox.x,y:fox.y});
        if (typeof target === 'object') {
            options.sort((a,b)=>(Math.abs(a.x-target.x)+Math.abs(a.y-target.y))-(Math.abs(b.x-target.x)+Math.abs(b.y-target.y)));
            h.x=options[0].x; h.y=options[0].y;
        } else {
            h.x = target.x; h.y = target.y;
        }
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
        score: score
    };

    try {
        await fetch(GOOGLE_SHEET_URL, {
            method: 'POST', mode: 'no-cors',
            body: JSON.stringify(result),
            headers: {'Content-Type': 'application/json'}
        });
        document.getElementById('msg').innerText = `✅ ОТПРАВЛЕНО!\n#${window_fox_number}\n${win?'🎉 ПОБЕДА':'💀 ПОЙМАН'}\n${duration.toFixed(1)}с`;
    } catch(e) {
        document.getElementById('msg').innerText = `⚠️ Нет сети\n#${window_fox_number}\n${win?'🎉 ПОБЕДА':'💀 ПОЙМАН'}\n${duration.toFixed(1)}с`;
    }

    finished = win || (!win && attempt >= maxAttempts);
    startBtn.disabled = finished;
    ['up','down','left','right'].forEach(id=>document.getElementById(id).disabled=finished);
}

function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for (let y=0; y<ROWS; y++) for (let x=0; x<COLS; x++)
        if (map[y][x]===1) { ctx.fillStyle="#022"; ctx.fillRect(x*CELL,y*CELL,CELL,CELL); }
    ctx.font="20px Arial"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText("🕳️",17*CELL+CELL/2,1*CELL+CELL/2);
    ctx.fillText("🦊",fox.x*CELL+CELL/2,fox.y*CELL+CELL/2);
    hunters.forEach(h=>ctx.fillText("🔴",h.x*CELL+CELL/2,h.y*CELL+CELL/2));
}

function updateUI() {
    document.getElementById('score').innerText = score;
    document.getElementById('hunters').innerText = hunters.length;
}

let last = 0;
function loop(t) {
    if (t-last>250 && running) { moveHunters(); check(); last=t; }
    draw();
    requestAnimationFrame(loop);
}

function startGameplay() {
    ['up','down','left','right'].forEach(id => {
        document.getElementById(id).onclick = () => {
            const dir={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[id];
            moveFox(...dir);
        };
    });

    const startBtn = document.createElement('button');
    startBtn.innerText='НАЧАТЬ';
    startBtn.style.cssText='margin-bottom:10px;background:red;color:white;border:2px solid white;padding:12px 24px;font-size:18px;border-radius:10px;cursor:pointer;';
    startBtn.onclick = () => {
        if (finished) { alert('Игра завершена'); return; }
        if (attempt >= maxAttempts) { alert('Попытки закончились'); return; }
        attempt++; resetGame(); running=true; startTime=Date.now();
        document.getElementById('msg').innerText='';
        ['up','down','left','right'].forEach(id=>document.getElementById(id).disabled=false);
    };
    document.querySelector('.game').prepend(startBtn);

    resetGame(); updateUI(); requestAnimationFrame(loop);
}

// ★ ЗАПУСК ★
showFoxNumberInput();
