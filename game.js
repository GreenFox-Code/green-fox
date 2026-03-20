const tg = window.Telegram?.WebApp;
if (tg) tg.expand();

// ROLE
const role = new URLSearchParams(window.location.search).get('role') || 'beta';
document.getElementById('role').innerText = role;

// CANVAS
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// MAP
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
let bestTime = null;
let finished = false;

// HELPERS
function canMove(x,y){
    return map[y] && map[y][x] === 0;
}

// RESET GAME
function resetGame(){
    fox = {x:1, y:13, dx:0, dy:0};

    hunters = [
        {x:9, y:1, type:'chaser'},
        {x:17, y:7, type:'ambush'},
        {x:1, y:7, type:'random'}
    ];

    score = 0;
    updateUI();
}

// FOX
function moveFox(dx,dy){
    if(!running) return;

    let nx = fox.x + dx;
    let ny = fox.y + dy;

    if(canMove(nx,ny)){
        fox.x = nx;
        fox.y = ny;
        fox.dx = dx;
        fox.dy = dy;
        score++;
        updateUI();
    }
}

// AI
function moveHunters(){
    hunters.forEach(h => {
        let options = [
            {x:h.x+1,y:h.y},
            {x:h.x-1,y:h.y},
            {x:h.x,y:h.y+1},
            {x:h.x,y:h.y-1}
        ].filter(p => canMove(p.x,p.y));

        if (!options.length) return;

        let target;

        if (h.type === 'chaser') {
            target = {x: fox.x, y: fox.y};
        } else if (h.type === 'ambush') {
            target = {
                x: fox.x + fox.dx * 2,
                y: fox.y + fox.dy * 2
            };
        } else {
            if (Math.random() < 0.5) {
                let r = options[Math.floor(Math.random()*options.length)];
                h.x = r.x;
                h.y = r.y;
                return;
            }
            target = {x: fox.x, y: fox.y};
        }

        options.sort((a,b)=>
            (Math.abs(a.x-target.x)+Math.abs(a.y-target.y)) -
            (Math.abs(b.x-target.x)+Math.abs(b.y-target.y))
        );

        h.x = options[0].x;
        h.y = options[0].y;
    });
}

// CHECK
function check(){
    for(let h of hunters){
        if(h.x===fox.x && h.y===fox.y){
            end(false);
            return;
        }
    }

    if(fox.x===17 && fox.y===1){
        end(true);
    }
}

// END
function end(win){
    running = false;

    let duration = (Date.now() - startTime) / 1000;

    if(win){
        finished = true;
        bestTime = duration;

        document.getElementById('msg').innerText = '🎉 ПОБЕДА!';

        if(tg){
            tg.sendData(JSON.stringify({
                reached_den: true,
                time: duration
            }));
        }

        startBtn.disabled = true;
    } else {
        document.getElementById('msg').innerText = '💀 ПОЙМАН!';

        if(attempt >= maxAttempts){
            if(tg){
                tg.sendData(JSON.stringify({
                    reached_den: false,
                    time: duration
                }));
            }

            startBtn.disabled = true;
            document.getElementById('msg').innerText += ' 🛑 Попытки закончились';
        }
    }
}

// DRAW
function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);

    for(let y=0;y<ROWS;y++){
        for(let x=0;x<COLS;x++){
            if(map[y][x]===1){
                ctx.fillStyle="#022";
                ctx.fillRect(x*CELL,y*CELL,CELL,CELL);
            }
        }
    }

    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText("🕳️",17*CELL+CELL/2,1*CELL+CELL/2);
    ctx.fillText("🦊",fox.x*CELL+CELL/2,fox.y*CELL+CELL/2);

    hunters.forEach(h=>{
        ctx.fillText("🔴",h.x*CELL+CELL/2,h.y*CELL+CELL/2);
    });
}

// UI
function updateUI(){
    document.getElementById('score').innerText = score;
    document.getElementById('hunters').innerText = hunters.length;
}

// LOOP
let last = 0;
function loop(t){
    if(t - last > 250 && running){
        moveHunters();
        check();
        last = t;
    }

    draw();
    requestAnimationFrame(loop);
}

// BUTTONS
document.getElementById('up').onclick = ()=>moveFox(0,-1);
document.getElementById('down').onclick = ()=>moveFox(0,1);
document.getElementById('left').onclick = ()=>moveFox(-1,0);
document.getElementById('right').onclick = ()=>moveFox(1,0);

// START BUTTON
const startBtn = document.createElement('button');
startBtn.innerText = 'НАЧАТЬ';
startBtn.style.marginBottom = '10px';

startBtn.onclick = ()=>{
    if(finished) return;

    if(attempt >= maxAttempts){
        alert('Попытки закончились');
        return;
    }

    attempt++;
    resetGame();
    running = true;
    startTime = Date.now();
    document.getElementById('msg').innerText = '';
};

document.querySelector('.game').prepend(startBtn);

// INIT
resetGame();
updateUI();
requestAnimationFrame(loop);
