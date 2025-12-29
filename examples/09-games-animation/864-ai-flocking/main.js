let worker=null,canvas,ctx,isRunning=false,boids=[];
document.addEventListener('DOMContentLoaded',()=>{
    canvas=document.getElementById('gameCanvas');ctx=canvas.getContext('2d');
    document.getElementById('startBtn').addEventListener('click',start);
    document.getElementById('stopBtn').addEventListener('click',stop);
});
function start(){
    if(worker)worker.terminate();
    worker=new Worker('worker.js');
    worker.onmessage=e=>{if(e.data.type==='STATE')boids=e.data.payload;};
    worker.postMessage({type:'START',payload:{count:parseInt(document.getElementById('count').value),separation:parseFloat(document.getElementById('separation').value),width:canvas.width,height:canvas.height}});
    isRunning=true;document.getElementById('startBtn').disabled=true;document.getElementById('stopBtn').disabled=false;render();
}
function stop(){if(worker){worker.terminate();worker=null;}isRunning=false;document.getElementById('startBtn').disabled=false;document.getElementById('stopBtn').disabled=true;}
function render(){
    if(!isRunning)return;
    ctx.fillStyle='#1a1a2e';ctx.fillRect(0,0,canvas.width,canvas.height);
    for(const b of boids){
        ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.angle);
        ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(-5,4);ctx.lineTo(-5,-4);ctx.closePath();
        ctx.fillStyle='#4a9eff';ctx.fill();ctx.restore();
    }
    requestAnimationFrame(render);
}
