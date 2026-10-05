// ラビッドパ SVG リグ（正面固定）。pose を渡すと SVG 文字列を返す。
export const PALETTE = { main:'#F7A8C4', shade:'#EC89AE', light:'#FDE1EB', line:'#7A2E55', cheek:'#F0607F', nose:'#E8603C' };
export const BASE_POSE = {
  expression:'normal',            // normal | happy | shout | miss
  ears:{ l:{rot:0, len:1}, r:{rot:0, len:1} },   // 角度(度) / 伸び倍率
  arms:{ l:null, r:null },        // null=おなかを抱える / {ang:度(上が+), len:px, bend:px}
  legs:{ l:0, r:0 },              // 足の伸び(px)
  squash:1,                       // 1未満でつぶれ、1超で縦伸び
  tilt:0,                         // 体の傾き(度)
};
const P = PALETTE;
function eyes(kind){
  const one=(x)=>{ const y=262;
    if(kind==='happy') return `<path d="M${x-26},${y+6} Q${x},${y-26} ${x+26},${y+6}" fill="none" stroke="${P.line}" stroke-width="9" stroke-linecap="round"/>`;
    if(kind==='miss'){ const d=x<200?1:-1; return `<path d="M${x-20*d},${y-18} L${x+18*d},${y} L${x-20*d},${y+18}" fill="none" stroke="${P.line}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`; }
    if(kind==='shout') return `<circle cx="${x}" cy="${y}" r="38" fill="#FFF6DA" stroke="${P.line}" stroke-width="7"/><path transform="translate(${x},${y+2}) scale(1.25)" d="M0,-20 L6,-7 L20,-6 L9,4 L12,18 L0,11 L-12,18 L-9,4 L-20,-6 L-6,-7Z" fill="${P.line}"/>`;
    return `<circle cx="${x}" cy="${y}" r="38" fill="#FFF6DA" stroke="${P.line}" stroke-width="7"/><circle cx="${x+3}" cy="${y+3}" r="27" fill="${P.line}"/><circle cx="${x-7}" cy="${y-8}" r="9" fill="#fff"/><circle cx="${x+14}" cy="${y+14}" r="4.5" fill="#fff"/>`;
  };
  return one(142)+one(258);
}
function mouth(kind){
  if(kind==='happy') return `<path d="M184,300 Q200,330 216,300 Z" fill="${P.cheek}" stroke="${P.line}" stroke-width="5" stroke-linejoin="round"/>`;
  if(kind==='shout') return `<ellipse cx="200" cy="314" rx="17" ry="22" fill="#8A2340" stroke="${P.line}" stroke-width="5"/><ellipse cx="200" cy="325" rx="10" ry="6" fill="${P.cheek}"/>`;
  if(kind==='miss')  return `<path d="M181,307 q6.5,-8 13,0 t13,0 t13,0" fill="none" stroke="${P.line}" stroke-width="5" stroke-linecap="round"/>`;
  return `<path d="M185,300 Q200,316 215,300" fill="none" stroke="${P.nose}" stroke-width="6" stroke-linecap="round"/>`;
}
// 伸びる腕：肩から手までのチューブ＋手
function limbArm(side, a){
  const s = side==='l' ? {x:96,y:322} : {x:304,y:322};
  const dir = side==='l' ? -1 : 1, rad=a.ang*Math.PI/180;
  const hx = s.x + dir*Math.cos(rad)*a.len, hy = s.y - Math.sin(rad)*a.len;
  const mx=(s.x+hx)/2, my=(s.y+hy)/2, L=Math.hypot(hx-s.x,hy-s.y)||1;
  const cx = mx + (-(hy-s.y)/L)*(a.bend||0)*dir, cy = my + ((hx-s.x)/L)*(a.bend||0)*dir;
  const d=`M${s.x},${s.y} Q${cx.toFixed(1)},${cy.toFixed(1)} ${hx.toFixed(1)},${hy.toFixed(1)}`;
  return `<path d="${d}" fill="none" stroke="${P.line}" stroke-width="34" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="${P.main}" stroke-width="20" stroke-linecap="round"/>
    <circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="19" fill="${P.main}" stroke="${P.line}" stroke-width="7"/>`;
}
const hugArm = { l:`<path d="M128,330 Q112,364 146,378 Q166,384 164,362" fill="none" stroke="${P.line}" stroke-width="7" stroke-linecap="round"/>`,
                 r:`<path d="M272,330 Q288,364 254,378 Q234,384 236,362" fill="none" stroke="${P.line}" stroke-width="7" stroke-linecap="round"/>` };
let uid=0;
export function renderRabidopa(pose={}){
  const p={...BASE_POSE,...pose, ears:{...BASE_POSE.ears,...pose.ears}, arms:{...BASE_POSE.arms,...pose.arms}, legs:{...BASE_POSE.legs,...pose.legs}};
  const id='rb'+(uid++);
  const lift=Math.max(p.legs.l,p.legs.r);
  const body="M66,250 A134,118 0 0 1 334,250 V340 Q334,398 276,398 H124 Q66,398 66,340 Z";
  const leg=(x,len)=>{ const footTop=372-(lift-len), hip=390-lift;
    const tube = len>2 ? `<path d="M${x},${hip} L${x},${footTop+10}" stroke="${P.line}" stroke-width="40" stroke-linecap="round"/><path d="M${x},${hip} L${x},${footTop+10}" stroke="${P.main}" stroke-width="26" stroke-linecap="round"/>` : '';
    return tube+`<rect x="${x-29}" y="${footTop}" width="58" height="56" rx="26" fill="${P.main}" stroke="${P.line}" stroke-width="7"/>`; };
  const ear=(side,e)=>{
    if(side==='l') return `<g transform="rotate(${-20+e.rot} 160 178) translate(160 178) scale(1 ${e.len}) translate(-160 -178)">
      <ellipse cx="150" cy="86" rx="38" ry="80" fill="${P.main}" stroke="${P.line}" stroke-width="7" vector-effect="non-scaling-stroke"/>
      <ellipse cx="146" cy="90" rx="15" ry="50" fill="${P.light}"/></g>`;
    return `<g transform="rotate(${e.rot} 254 160) translate(254 160) scale(1 ${e.len}) translate(-254 -160)">
      <path d="M236,150 Q242,64 290,40 Q330,24 348,60 Q362,92 336,108 Q312,120 296,98 Q276,110 272,150 Z" fill="${P.main}" stroke="${P.line}" stroke-width="7" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
      <path d="M256,140 Q260,90 286,64" fill="none" stroke="${P.light}" stroke-width="16" stroke-linecap="round"/>
      <path d="M296,52 Q318,74 298,100" fill="none" stroke="${P.line}" stroke-width="6" stroke-linecap="round" vector-effect="non-scaling-stroke"/></g>`; };
  const by=398; // 体の底（つぶし・傾きの支点）
  return `<svg viewBox="-160 -260 720 700" xmlns="http://www.w3.org/2000/svg" overflow="visible">
  <defs><clipPath id="${id}"><path d="${body}"/></clipPath></defs>
  ${leg(161,p.legs.l)}${leg(239,p.legs.r)}
  <g transform="translate(0 ${-lift}) rotate(${p.tilt} 200 ${by}) translate(200 ${by}) scale(${(1/Math.sqrt(p.squash)).toFixed(3)} ${p.squash}) translate(-200 ${-by})">
    ${ear('l',p.ears.l)}${ear('r',p.ears.r)}
    ${p.arms.l?limbArm('l',p.arms.l):''}${p.arms.r?limbArm('r',p.arms.r):''}
    <path d="${body}" fill="${P.shade}"/>
    <g clip-path="url(#${id})"><ellipse cx="200" cy="262" rx="126" ry="150" fill="${P.main}"/><ellipse cx="200" cy="396" rx="84" ry="62" fill="${P.light}"/></g>
    <path d="${body}" fill="none" stroke="${P.line}" stroke-width="7"/>
    <path d="M120,206 Q134,198 148,204" fill="none" stroke="${P.line}" stroke-width="6" stroke-linecap="round"/>
    <path d="M252,204 Q266,198 280,206" fill="none" stroke="${P.line}" stroke-width="6" stroke-linecap="round"/>
    <ellipse cx="200" cy="296" rx="36" ry="24" fill="${P.light}"/>
    ${eyes(p.expression)}
    <ellipse cx="102" cy="312" rx="24" ry="14" fill="${P.cheek}" opacity=".75"/><ellipse cx="298" cy="312" rx="24" ry="14" fill="${P.cheek}" opacity=".75"/>
    <path d="M190,283 Q200,279 210,283 Q207,294 200,295 Q193,294 190,283Z" fill="${P.nose}"/>
    ${mouth(p.expression)}
    ${p.arms.l?'':hugArm.l}${p.arms.r?'':hugArm.r}
  </g></svg>`;
}
// ---- アニメーション（t: 秒 → pose）----
const S=Math.sin, C=Math.cos, PI=Math.PI;
export const ANIMS = {
  idle:  { label:'待機',            dur:2.4, f:t=>{ const a=t/1.2*PI; return { squash:1+0.03*S(a), ears:{l:{rot:4*S(a),len:1},r:{rot:-5*S(a+1),len:1}} }; } },
  type:  { label:'正打鍵（ノリノリ）', dur:0.6, f:t=>{ const k=S(t/0.6*PI); return { expression:'happy', squash:1-0.12*k, legs:{l:20*k,r:20*k},
            ears:{l:{rot:-10*k,len:1+0.25*k},r:{rot:12*k,len:1+0.25*k}}, arms:{l:{ang:60,len:70+50*k,bend:10},r:{ang:60,len:70+50*k,bend:10}} }; } },
  shout: { label:'コンボ（さけぶ）',   dur:0.8, f:t=>{ const k=(S(t/0.8*2*PI)+1)/2; return { expression:'shout', squash:1.1,
            ears:{l:{rot:20,len:1.5+0.15*k},r:{rot:-25,len:1.5+0.15*k}}, legs:{l:30,r:30}, arms:{l:{ang:35+30*k,len:170,bend:-30+60*k},r:{ang:35+30*k,len:170,bend:30-60*k}} }; } },
  fever: { label:'FEVER ダンス',       dur:0.8, f:t=>{ const a=t/0.8*2*PI; return { expression:'happy', tilt:10*S(a),
            legs:{l:60*Math.max(0,S(a)),r:60*Math.max(0,-S(a))}, ears:{l:{rot:30*S(a),len:1.3},r:{rot:30*S(a),len:1.3}},
            arms:{l:{ang:20+60*(S(a)+1)/2,len:130+50*C(a),bend:50*S(a*2)},r:{ang:80-60*(S(a)+1)/2,len:130-50*C(a),bend:-50*S(a*2)}} }; } },
  clear: { label:'単語クリア（ジャンプ）', dur:1.2, f:t=>{ const k=S(Math.min(t/0.9,1)*PI); return { expression:'happy', squash:1+0.15*k,
            legs:{l:150*k,r:150*k}, ears:{l:{rot:-15*k,len:1+0.4*k},r:{rot:15*k,len:1+0.4*k}}, arms:{l:{ang:75,len:60+120*k},r:{ang:75,len:60+120*k}} }; } },
  miss:  { label:'ミス（ずっこけ）',    dur:1.2,   f:t=>{ const k=Math.min(t/0.3,1); const w=S(t*30)*(1-Math.min(t,1)); return { expression:'miss', tilt:-22*k, squash:1-0.1*k,
            legs:{l:0,r:70*k}, ears:{l:{rot:-50*k,len:0.85},r:{rot:-40*k+10*w,len:0.85}},
            arms:{l:{ang:-20+40*w,len:110,bend:40*w},r:{ang:50+30*w,len:120,bend:-40*w}} }; } },
};
