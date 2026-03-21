const tg = window.Telegram?.WebApp;
if(tg) tg.expand();

// --- Индикатор версии ---
const header = document.createElement('div');
header.innerText = '🎯 Green Fox v2';
header.style.fontSize = '18px';
header.style.fontWeight = 'bold';
header.style.marginBottom = '10px';
document.querySelector('.game').prepend(header);

// ROLE
const role = new URLSearchParams(window.location.search).get('role') || 'beta';
document.getElementById('role').innerText = role;

// CANVAS
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// STATE
let fox, hunters, score=0, running=false, attempt=0, maxAttempts=3, startTime=0, finished=false;

// RESET
function resetGame(){
    fox={x:1,y:13,dx:0,dy:0};
    hunters=[
        {x:9,y:1,type:'chaser'},
        {x:17,y:7,type:'ambush'},
        {x:1,y:7,type:'random'}
    ];
    score=0;
    updateUI();
}

// MOVE
function moveFox(dx,dy){
    if(!running) return;
    let nx=fox.x+dx, ny=fox.y+dy;
    if(map[ny][nx]===0){ fox.x=nx; fox.y=ny; fox.dx=dx; fox.dy=dy; score++; updateUI(); }
}

// END
function end(win){
    running=false;
    let duration=(Date.now()-startTime)/1000;
    if(tg){
        try{ tg.sendData(JSON.stringify({reached_den:win,time:duration})); console.log("DEBUG: JSON отправлен",win,duration);}
        catch(e){ console.error("ERROR: tg.sendData",e);}
    }
    finished = win || attempt>=maxAttempts;
    document.getElementById('msg').innerText = win?'🎉 ПОБЕДА!':'💀 ПОЙМАН!';
    if(!win && attempt>=maxAttempts) document.getElementById('msg').innerText+=' 🛑 Попытки закончены';
    startBtn.disabled = finished;
    ['up','down','left','right'].forEach(id=>document.getElementById(id).disabled=finished);
}

// START BUTTON
const startBtn = document.createElement('button');
startBtn.innerText='НАЧАТЬ';
startBtn.style.backgroundColor='red';
startBtn.style.color='white';
startBtn.style.border='2px solid white';
startBtn.onclick=()=>{
    if(finished){ alert('Игра завершена'); return; }
    if(attempt>=maxAttempts){ alert('Попытки закончились'); return; }
    attempt++; resetGame(); running=true; startTime=Date.now();
    document.getElementById('msg').innerText='';
    ['up','down','left','right'].forEach(id=>document.getElementById(id).disabled=false);
    console.log("DEBUG: старт попытки", attempt);
};
document.querySelector('.game').prepend(startBtn);
