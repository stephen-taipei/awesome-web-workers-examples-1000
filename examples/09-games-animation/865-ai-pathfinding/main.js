let worker=null,canvas,ctx,isRunning=false,agents=[],target={x:700,y:400};
document.addEventListener('DOMContentLoaded',()=>{
    canvas=document.getElementById('gameCanvas');ctx=canvas.getContext('2d');
    document.getElementById('startBtn').addEventListener('click',start);
    document.getElementById('stopBtn').addEventListener('click',stop);
    canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect();target={x:(e.clientX-r.left)*(canvas.width/r.width),y:(e.clientY-r.top)*(canvas.height/r.height)};if(worker)worker.postMessage({type:'TARGET',payload:target});});
});
function start(){if(worker)worker.terminate();worker=new Worker('worker.js');worker.onmessage=e=>{if(e.data.type==='STATE'){agents=e.data.payload.agents;target=e.data.payload.target;}};worker.postMessage({type:'START',payload:{width:canvas.width,height:canvas.height}});isRunning=true;document.getElementById('startBtn').disabled=true;document.getElementById('stopBtn').disabled=false;render();}
function stop(){if(worker){worker.terminate();worker=null;}isRunning=false;document.getElementById('startBtn').disabled=false;document.getElementById('stopBtn').disabled=true;}
function render(){if(!isRunning)return;ctx.fillStyle='#1a1a2e';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.beginPath();ctx.arc(target.x,target.y,15,0,Math.PI*2);ctx.fillStyle='#ffc107';ctx.fill();for(const a of agents){ctx.beginPath();ctx.arc(a.x,a.y,12,0,Math.PI*2);ctx.fillStyle=a.color;ctx.fill();}requestAnimationFrame(render);}
