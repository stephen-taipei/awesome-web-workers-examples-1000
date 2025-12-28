let worker=null,canvas,ctx,isRunning=false,agentData=null,target={x:400,y:250},behavior='seek';
document.addEventListener('DOMContentLoaded',()=>{
    canvas=document.getElementById('gameCanvas');ctx=canvas.getContext('2d');
    document.getElementById('startBtn').addEventListener('click',start);
    document.getElementById('stopBtn').addEventListener('click',stop);
    document.querySelectorAll('.behavior-btn').forEach(b=>b.addEventListener('click',()=>{
        document.querySelectorAll('.behavior-btn').forEach(x=>x.style.background='');
        b.style.background='#4a9eff';behavior=b.dataset.behavior;
        if(worker)worker.postMessage({type:'BEHAVIOR',payload:behavior});
    }));
    canvas.addEventListener('click',e=>{
        const rect=canvas.getBoundingClientRect();
        target={x:(e.clientX-rect.left)*(canvas.width/rect.width),y:(e.clientY-rect.top)*(canvas.height/rect.height)};
        if(worker)worker.postMessage({type:'TARGET',payload:target});
    });
});
function start(){
    if(worker)worker.terminate();
    worker=new Worker('worker.js');
    worker.onmessage=e=>{if(e.data.type==='STATE')agentData=e.data.payload;};
    worker.postMessage({type:'START',payload:{width:canvas.width,height:canvas.height,target,behavior}});
    isRunning=true;document.getElementById('startBtn').disabled=true;document.getElementById('stopBtn').disabled=false;render();
}
function stop(){if(worker){worker.terminate();worker=null;}isRunning=false;document.getElementById('startBtn').disabled=false;document.getElementById('stopBtn').disabled=true;}
function render(){
    if(!isRunning)return;
    ctx.fillStyle='#1a1a2e';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.beginPath();ctx.arc(target.x,target.y,10,0,Math.PI*2);ctx.fillStyle='#ffc107';ctx.fill();
    if(agentData){
        ctx.save();ctx.translate(agentData.x,agentData.y);ctx.rotate(agentData.angle);
        ctx.beginPath();ctx.moveTo(20,0);ctx.lineTo(-15,12);ctx.lineTo(-15,-12);ctx.closePath();
        ctx.fillStyle='#4a9eff';ctx.fill();ctx.restore();
    }
    requestAnimationFrame(render);
}
