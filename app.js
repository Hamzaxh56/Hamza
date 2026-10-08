const TF = [
  ["15s",15],["30s",30],["1m",60],["2m",120],["3m",180],
  ["5m",300],["15m",900],["30m",1800],["1h",3600],["4h",14400]
];
let selected=300, market="EUR/USD", candles=[], lastSignal=null;
const TF_INTERVAL={60:"1min",120:"2min",180:"3min",300:"5min",900:"15min",1800:"30min",3600:"1h",14400:"4h"};
const $=id=>document.getElementById(id);

TF.forEach(([name,sec])=>{
  const b=document.createElement("button"); b.textContent=name;
  b.onclick=()=>{selected=sec; document.querySelectorAll(".timeframes button").forEach(x=>x.classList.remove("active"));b.classList.add("active");run()};
  if(sec===300)b.classList.add("active"); $("timeframes").appendChild(b);
});
$("market").onchange=e=>{market=e.target.value;run()};
$("refresh").onclick=run;
$("confirm").onclick=()=>{
  if(!lastSignal)return;
  const h=JSON.parse(localStorage.getItem("signals")||"[]");
  h.unshift({...lastSignal,time:new Date().toLocaleTimeString(),result:"MANUAL"});
  localStorage.setItem("signals",JSON.stringify(h.slice(0,100)));renderHistory();
};

async function loadRealData(){
  const interval=TF_INTERVAL[selected] || "5min";
  const r=await fetch(`/api/candles?symbol=${encodeURIComponent(market)}&interval=${encodeURIComponent(interval)}&outputsize=120`);
  const d=await r.json();
  if(!r.ok) throw new Error(d.error||"Market data unavailable");
  candles=d.values||[];
  if(candles.length<30) throw new Error("Not enough real candles returned");
}
function analyze(){
  const close=candles.map(x=>x.c), fast=ema(close,9), slow=ema(close,21);
  const R=rsi(close), mom=close.at(-1)-close.at(-6), diff=fast.at(-1)-slow.at(-1);
  let score=0;
  if(diff>0)score+=35; else score-=35;
  if(R>55)score+=25; else if(R<45)score-=25;
  if(mom>0)score+=25; else if(mom<0)score-=25;
  const vol=Math.abs(close.at(-1)-close.at(-2));
  const confidence=Math.min(95,Math.max(50,50+Math.abs(score)*.65));
  let signal=Math.abs(score)<20?"WAIT":score>0?"CALL":"PUT";
  return {fast,slow,R,mom,signal,confidence,score,vol};
}
async function run(){
  market=$("market").value;
  try{
    $("status").textContent="● Connecting to real market data…";
    await loadRealData();
    const a=analyze();
    lastSignal={market,tf:TF.find(x=>x[1]===selected)?.[0],signal:a.signal,confidence:Math.round(a.confidence)};
    $("marketName").textContent=market; $("tfName").textContent=lastSignal.tf;
    $("signal").textContent=a.signal; $("signal").className="signal "+a.signal.toLowerCase();
    $("confidence").textContent=Math.round(a.confidence)+"%"; $("meter").style.width=Math.round(a.confidence)+"%";
    $("rsi").textContent=a.R.toFixed(1); $("trend").textContent=a.fast.at(-1)>a.slow.at(-1)?"BULLISH":"BEARISH";
    $("momentum").textContent=a.mom>=0?"UP":"DOWN";
    $("price").textContent=candles.at(-1).c.toFixed(5);
    $("reason").textContent=`Real ${lastSignal.tf} candles • EMA + RSI + momentum. Verify the broker price before acting.`;
    $("status").textContent="● Real market data";
    draw(a); renderHistory();
  }catch(e){
    candles=[];
    $("status").textContent="● No real data";
    $("signal").textContent="WAIT"; $("signal").className="signal wait";
    $("confidence").textContent="0%"; $("meter").style.width="0%";
    $("price").textContent="--"; $("reason").textContent=e.message;
    $("rsi").textContent="--"; $("trend").textContent="--"; $("momentum").textContent="--";
    const c=$("chart"),x=c.getContext("2d");x.clearRect(0,0,c.width,c.height);
  }
}
function draw(a){
  const c=$("chart"),d=devicePixelRatio||1,r=c.getBoundingClientRect();c.width=r.width*d;c.height=r.height*d;
  const x=c.getContext("2d");x.scale(d,d);const w=r.width,h=r.height;
  x.clearRect(0,0,w,h);x.strokeStyle="#233149";x.lineWidth=1;
  for(let i=1;i<6;i++){let y=h*i/6;x.beginPath();x.moveTo(0,y);x.lineTo(w,y);x.stroke()}
  const vals=candles.flatMap(z=>[z.h,z.l]), min=Math.min(...vals),max=Math.max(...vals), range=max-min||1;
  const px=i=>i*(w/(candles.length-1)), py=v=>h-((v-min)/range)*(h-20)-10;
  candles.forEach((z,i)=>{x.strokeStyle=z.c>=z.o?"#28d17c":"#ff5d6c";x.beginPath();x.moveTo(px(i),py(z.h));x.lineTo(px(i),py(z.l));x.stroke()});
  const line=(arr,stroke)=>{x.strokeStyle=stroke;x.lineWidth=2;x.beginPath();arr.forEach((v,i)=>{if(i)x.lineTo(px(i),py(v));else x.moveTo(px(i),py(v))});x.stroke()};
  line(candles.map(z=>z.c),"#e9f1ff");line(a.fast,"#5da9ff");line(a.slow,"#f6c453");
}
function renderHistory(){
  const h=JSON.parse(localStorage.getItem("signals")||"[]");
  $("history").innerHTML=h.slice(0,20).map(x=>`<tr><td>${x.time}</td><td>${x.market}</td><td>${x.tf}</td><td>${x.signal}</td><td>${x.confidence}%</td><td>${x.result}</td></tr>`).join("")||`<tr><td colspan="6">No manual confirmations yet.</td></tr>`;
}
function tick(){
  const now=Math.floor(Date.now()/1000), remain=selected-(now%selected);
  $("countdown").textContent=`${String(Math.floor(remain/60)).padStart(2,"0")}:${String(remain%60).padStart(2,"0")}`;
}
setInterval(tick,1000);setInterval(run,30000);run();tick();
