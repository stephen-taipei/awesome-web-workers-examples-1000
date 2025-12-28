let agent={x:100,y:100,vx:0,vy:0,maxSpeed:4,maxForce:0.1},target={x:400,y:250},behavior='seek',width=800,height=500,wanderAngle=0,interval;
self.onmessage=e=>{
    const{type,payload}=e.data;
    if(type==='START'){width=payload.width;height=payload.height;target=payload.target;behavior=payload.behavior;agent={x:100,y:100,vx:0,vy:0,maxSpeed:4,maxForce:0.1};if(interval)clearInterval(interval);interval=setInterval(update,1000/60);}
    if(type==='TARGET')target=payload;
    if(type==='BEHAVIOR')behavior=payload;
};
function update(){
    let steering={x:0,y:0};
    if(behavior==='seek')steering=seek(target);
    else if(behavior==='flee')steering=flee(target);
    else if(behavior==='arrive')steering=arrive(target);
    else if(behavior==='wander')steering=wander();
    agent.vx+=steering.x;agent.vy+=steering.y;
    const speed=Math.hypot(agent.vx,agent.vy);
    if(speed>agent.maxSpeed){agent.vx=(agent.vx/speed)*agent.maxSpeed;agent.vy=(agent.vy/speed)*agent.maxSpeed;}
    agent.x+=agent.vx;agent.y+=agent.vy;
    if(agent.x<0)agent.x=width;if(agent.x>width)agent.x=0;if(agent.y<0)agent.y=height;if(agent.y>height)agent.y=0;
    self.postMessage({type:'STATE',payload:{x:agent.x,y:agent.y,angle:Math.atan2(agent.vy,agent.vx)}});
}
function seek(t){const dx=t.x-agent.x,dy=t.y-agent.y,d=Math.hypot(dx,dy)||1;return limit({x:(dx/d)*agent.maxSpeed-agent.vx,y:(dy/d)*agent.maxSpeed-agent.vy},agent.maxForce);}
function flee(t){const s=seek(t);return{x:-s.x,y:-s.y};}
function arrive(t){const dx=t.x-agent.x,dy=t.y-agent.y,d=Math.hypot(dx,dy);const speed=d<100?agent.maxSpeed*(d/100):agent.maxSpeed;return limit({x:(dx/(d||1))*speed-agent.vx,y:(dy/(d||1))*speed-agent.vy},agent.maxForce);}
function wander(){wanderAngle+=Math.random()*0.5-0.25;const cx=agent.x+Math.cos(Math.atan2(agent.vy,agent.vx))*50,cy=agent.y+Math.sin(Math.atan2(agent.vy,agent.vx))*50;return seek({x:cx+Math.cos(wanderAngle)*30,y:cy+Math.sin(wanderAngle)*30});}
function limit(v,max){const m=Math.hypot(v.x,v.y);return m>max?{x:(v.x/m)*max,y:(v.y/m)*max}:v;}
