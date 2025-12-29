let boids=[],width=800,height=500,separation=1.5,interval;
self.onmessage=e=>{
    if(e.data.type==='START'){
        const{count,separation:sep,width:w,height:h}=e.data.payload;
        width=w;height=h;separation=sep;
        boids=Array.from({length:count},()=>({x:Math.random()*width,y:Math.random()*height,vx:(Math.random()-0.5)*4,vy:(Math.random()-0.5)*4}));
        if(interval)clearInterval(interval);interval=setInterval(update,1000/60);
    }
};
function update(){
    for(const b of boids){
        let sep={x:0,y:0},ali={x:0,y:0},coh={x:0,y:0},count=0;
        for(const o of boids){
            if(o===b)continue;
            const d=Math.hypot(o.x-b.x,o.y-b.y);
            if(d<50){sep.x-=(o.x-b.x)/d;sep.y-=(o.y-b.y)/d;}
            if(d<100){ali.x+=o.vx;ali.y+=o.vy;coh.x+=o.x;coh.y+=o.y;count++;}
        }
        if(count>0){ali.x/=count;ali.y/=count;coh.x=coh.x/count-b.x;coh.y=coh.y/count-b.y;}
        b.vx+=sep.x*separation*0.05+ali.x*0.05+coh.x*0.01;
        b.vy+=sep.y*separation*0.05+ali.y*0.05+coh.y*0.01;
        const speed=Math.hypot(b.vx,b.vy);if(speed>3){b.vx=(b.vx/speed)*3;b.vy=(b.vy/speed)*3;}
        b.x+=b.vx;b.y+=b.vy;
        if(b.x<0)b.x=width;if(b.x>width)b.x=0;if(b.y<0)b.y=height;if(b.y>height)b.y=0;
    }
    self.postMessage({type:'STATE',payload:boids.map(b=>({x:b.x,y:b.y,angle:Math.atan2(b.vy,b.vx)}))});
}
