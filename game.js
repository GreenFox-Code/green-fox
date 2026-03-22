// game.js — с Google Sheets интеграцией

const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
if (tg) {
    tg.expand();
}

// ТВОЙ Google Sheet URL (готов!)
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbwECgEU1gmPtV0Rkf9ebfpskEXx7lC9tVmwdu9OcJHClwCvN6NoQ1xgjlFNfH1ISA7w/exec';

// РУЧНОЙ ВВОД НОМЕРА ЛИСЫ (временно)
if (!window.fox_number || window.fox_number === "UNKNOWN") {
    const foxNum = prompt("Введите номер игрока:");
    window.fox_number = foxNum ? foxNum : "UNKNOWN";
}

// --- Индикатор версии ---
const header = document.createElement('div');
header.innerText = 'Green Fox';
header.style.fontSize = '18px';
header.style.fontWeight = 'bold';
header.style.marginBottom = '10px';
document.querySelector('.game').prepend(header);

// ROLE из параметров URL
const role = new URLSearchParams(window.location.search).get('role') || 'beta';
document.getElementById('role').innerText = role;

// FOX_NUMBER
window.fox_number = document.getElementById('fox_number')?.innerText || "UNKNOWN";

// CANVAS
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// MAP (твоя карта)
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
const CELL = Math.min(canvas.width / COLS, canvas.height / ROWS);

// STATE
let fox, hunters;
let score = 0;
let running = false;
let attempt = 0;
const maxAttempts = 3;
let startTime = 0;
let finished = false;

// HELPERS
function canMove(x, y) { return map[y] && map[y][x] === 0; }

// RESET GAME
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

// FOX
function moveFox(dx, dy) {
    if (!running) return;
    const nx = fox.x + dx;
    const ny = fox.y + dy;
    if (canMove(nx, ny)) {
        fox.x = nx;
        fox.y = ny;
        fox.dx = dx;
        fox.dy = dy;
        score++;
        updateUI();
    }
}

// AI
function moveHunters() {
    hunters.forEach(h => {
        let options = [
            { x: h.x + 1, y: h.y }, { x: h.x - 1, y: h.y },
            { x: h.x, y: h.y + 1 }, { x: h.x, y: h.y - 1 }
        ].filter(p => canMove(p.x, p.y));
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
        options.sort((a, b) =>
            (Math.abs(a.x - target.x) + Math.abs(a.y - target.y)) -
            (Math.abs(b.x - target.x) + Math.abs(b.y - target.y))
        );
        h.x = options[0].x;
        h.y = options[0].y;
    });
}

// CHECK
function check() {
    for (let h of hunters) {
        if (h.x === fox.x && h.y === fox.y) { end(false); return; }
    }
    if (fox.x === 17 && fox.y === 1) end(true);
}

// END — отправляем в Google Sheet!
async function end(win) {
    running = false;
    const duration = (Date.now() - startTime) / 1000;

    // Формируем результат
    const result = {
        fox_number: window.fox_number,
        role: role,
        win: win,
        time: duration,
        score: score
    };

    // Отправляем в Google Sheet
    try {
        await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(result),
            headers: { 'Content-Type': 'application/json' }
        });
        
        document.getElementById('msg').innerText = 
            `✅ ОТПРАВЛЕНО В GOOGLE!\n${win ? '🎉 ПОБЕДА' : '💀 ПОЙМАН'}\nВремя: ${duration.toFixed(1)}с`;
            
    } catch(e) {
        document.getElementById('msg').innerText = 
            `⚠️ Нет интернета\n${win ? '🎉 ПОБЕДА' : '💀 ПОЙМАН'}\nВремя: ${duration.toFixed(1)}с`;
    }

    finished = win || (!win && attempt >= maxAttempts);
    startBtn.disabled = finished;
    ['up', 'down', 'left', 'right'].forEach(id => {
        document.getElementById(id).disabled = finished;
    });
}

// DRAW
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < ROWS; y++)
        for (let x = 0; x < COLS; x++)
            if (map[y][x] === 1) {
                ctx.fillStyle = "#022";
                ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
            }

    ctx.font = "20px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("🕳️", 17 * CELL + CELL / 2, 1 * CELL + CELL / 2);
    ctx.fillText("🦊", fox.x * CELL + CELL / 2, fox.y * CELL + CELL / 2);
    hunters.forEach(h => ctx.fillText("🔴", h.x * CELL + CELL / 2, h.y * CELL + CELL / 2));
}

// UI
function updateUI() {
    document.getElementById('score').innerText = score;
    document.getElementById('hunters').innerText = hunters.length;
}

// LOOP
let last = 0;
function loop(t) {
    if (t - last > 250 && running) { moveHunters(); check(); last = t; }
    draw();
    requestAnimationFrame(loop);
}

// BUTTONS
['up', 'down', 'left', 'right'].forEach(id => {
    document.getElementById(id).onclick = () => {
        const dir = {up:[0,-1], down:[0,1], left:[-1,0], right:[1,0]}[id];
        moveFox(...dir);
    };
});

// START BUTTON
const startBtn = document.createElement('button');
startBtn.innerText = 'НАЧАТЬ';
startBtn.style.marginBottom = '10px';
startBtn.style.backgroundColor = 'red';
startBtn.style.color = 'white';
startBtn.style.border = '2px solid white';
startBtn.onclick = () => {
    if (finished) { alert('Игра завершена'); return; }
    if (attempt >= maxAttempts) { alert('Попытки закончились'); return; }
    attempt++;
    resetGame();
    running = true;
    startTime = Date.now();
    document.getElementById('msg').innerText = '';
    ['up', 'down', 'left', 'right'].forEach(id => document.getElementById(id).disabled = false);
};
document.querySelector('.game').prepend(startBtn);

// INIT
resetGame();
updateUI();
requestAnimationFrame(loop);
