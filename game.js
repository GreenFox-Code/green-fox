// ===== TELEGRAM =====
const tg = window.Telegram?.WebApp || null;
if (tg) tg.expand();

// ===== CONFIG =====
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbwECgEU1gmPtV0Rkf9ebfpskEXx7lC9tVmwdu9OcJHClwCvN6NoQ1xgjlFNfH1ISA7w/exec';

let role = new URLSearchParams(window.location.search).get('role') || 'beta';
let foxNumber = "UNKNOWN";

// ===== STATE =====
let canvas, ctx, CELL;
let fox, hunters;
let score = 0;
let running = false;
let attempt = 0;
let maxAttempts = 3;
let startTime = 0;
let finished = false;
let startBtn;

// ===== MAP =====
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

const ROWS = map.length;
const COLS = map[0].length;

// ===== UI =====
function showInputScreen() {
    const root = document.querySelector('.game');
    root.innerHTML = `
        <h2>🦊 GREEN FOX</h2>
        <p>Роль: <b>${role.toUpperCase()}</b></p>
        <input id="foxInput" placeholder="Номер" />
        <button id="startBtn">НАЧАТЬ</button>
        <div id="error" style="color:red;"></div>
    `;

    document.getElementById('startBtn').onclick = () => {
        const val = document.getElementById('foxInput').value.trim();

        if (!val) {
            document.getElementById('error').innerText = 'Введите номер';
            return;
        }

        foxNumber = val;
        initGameUI();
    };
}

function initGameUI() {
    const root = document.querySelector('.game');
    root.innerHTML = `
        <div>🦊 #${foxNumber} (${role})</div>
        <div>⭐ <span id="score">0</span></div>
        <canvas id="canvas" width="450" height="450"></canvas>
        <div>
            <button id="up">▲</button>
            <button id="left">◀</button>
            <button id="down">▼</button>
            <button id="right">▶</button>
        </div>
        <div id="msg"></div>
    `;

    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    CELL = canvas.width / COLS;

    startGameplay();
}

// ===== GAME =====
function canMove(x, y) {
    return map[y] && map[y][x] === 0;
}

function resetGame() {
    fox = { x: 1, y: 13, dx: 0, dy: 0 };
    hunters = [
        { x: 9, y: 1 },
        { x: 17, y: 7 },
        { x: 1, y: 7 }
    ];
    score = 0;
}

function moveFox(dx, dy) {
    if (!running) return;
    const nx = fox.x + dx;
    const ny = fox.y + dy;

    if (canMove(nx, ny)) {
        fox.x = nx;
        fox.y = ny;
        score++;
        document.getElementById('score').innerText = score;
    }
}

function moveHunters() {
    hunters.forEach(h => {
        const options = [
            {x:h.x+1,y:h.y},
            {x:h.x-1,y:h.y},
            {x:h.x,y:h.y+1},
            {x:h.x,y:h.y-1}
        ].filter(p => canMove(p.x, p.y));

        if (options.length) {
            const move = options[Math.floor(Math.random()*options.length)];
            h.x = move.x;
            h.y = move.y;
        }
    });
}

function check() {
    for (let h of hunters) {
        if (h.x === fox.x && h.y === fox.y) {
            end(false);
            return;
        }
    }

    if (fox.x === 17 && fox.y === 1) {
        end(true);
    }
}

async function end(win) {
    running = false;
    const time = (Date.now() - startTime) / 1000;

    const result = {
        fox_number: foxNumber,
        role: role,
        win: win,
        time: time
    };

    try {
        await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(result)
        });
    } catch {}

    document.getElementById('msg').innerText =
        `${win ? '🎉 ПОБЕДА' : '💀 ПОЙМАН'} (${time.toFixed(1)}с)`;

    if (win || attempt >= maxAttempts) finished = true;
}

function draw() {
    if (!ctx || !fox) return;

    ctx.clearRect(0,0,canvas.width,canvas.height);

    for (let y=0;y<ROWS;y++){
        for (let x=0;x<COLS;x++){
            if (map[y][x] === 1) {
                ctx.fillStyle = "#022";
                ctx.fillRect(x*CELL,y*CELL,CELL,CELL);
            }
        }
    }

    ctx.fillText("🦊", fox.x*CELL+10, fox.y*CELL+20);
    hunters.forEach(h => ctx.fillText("🔴", h.x*CELL+10, h.y*CELL+20));
    ctx.fillText("🕳️", 17*CELL+10, 1*CELL+20);
}

let last = 0;
function loop(t) {
    if (running && t - last > 250) {
        moveHunters();
        check();
        last = t;
    }
    draw();
    requestAnimationFrame(loop);
}

function startGameplay() {
    resetGame();

    document.getElementById('up').onclick = () => moveFox(0,-1);
    document.getElementById('down').onclick = () => moveFox(0,1);
    document.getElementById('left').onclick = () => moveFox(-1,0);
    document.getElementById('right').onclick = () => moveFox(1,0);

    startBtn = document.createElement('button');
    startBtn.innerText = 'СТАРТ';
    startBtn.onclick = () => {
        if (finished) return alert('Игра окончена');
        if (attempt >= maxAttempts) return alert('Нет попыток');

        attempt++;
        resetGame();
        running = true;
        startTime = Date.now();
        document.getElementById('msg').innerText = '';
    };

    document.querySelector('.game').prepend(startBtn);

    requestAnimationFrame(loop);
}

// ===== START =====
showInputScreen();
