import plain from '../assets/selector/team-default.svg?raw';
import selected from '../assets/selector/team-selected.svg?raw';
import unavailable from '../assets/selector/team-unavailable.svg';

export const unavailableArtwork=unavailable;
export function selectorName(name:string){
 return name.replace(/The Sixth Form College Farnborough/gi,'Farnborough Sixth Form').replace(/\bSchool\b/gi,'').replace(/\s+/g,' ').trim();
}
export function safeColours(colours?:string[]):string[]{
 return colours && colours.length>=1 && colours.length<=2 && colours.every(c=>/^#[\da-f]{6}$/i.test(c)) ? colours : ['#9224DB'];
}
function mix(colour:string,amount:number){return '#'+[1,3,5].map(i=>Math.round(parseInt(colour.slice(i,i+2),16)+(255-parseInt(colour.slice(i,i+2),16))*amount).toString(16).padStart(2,'0')).join('');}
function tint(base:string,colour:string){
 const shades:Record<string,string>={'#9224db':colour,'#dc8fff':mix(colour,.5),'#420c93':'#'+[1,3,5].map(i=>Math.round(parseInt(colour.slice(i,i+2),16)*.52).toString(16).padStart(2,'0')).join(''),'#bd35ff':mix(colour,.22),'#f6ddff':mix(colour,.83)};
 return base.replace(/#9224db|#dc8fff|#420c93|#bd35ff|#f6ddff/g,value=>shades[value]);
}
const cache=new Map<string,{plain:string;selected:string}>();
/** Only trusted vector masters and validated hex values enter this data URL. */
export function selectorArtwork(values?:string[]){
 const colours=safeColours(values),left=colours[0],right=colours[1] ?? left,key=left+right;
 const existing=cache.get(key);if(existing)return existing;
 function render(base:string,lit:boolean){
  let art=tint(base,left);
  if(left!==right){
   let top='';
   if(lit){
    base=base.replace(/<g id="top-light">.*?<\/g>/,'').replace('<rect x="30" y="4" width="120" height="8" rx="3"/>','');
    const gradients=([['halo',.22],['rim',.5],['core',.72]] as const).map(([name,amount])=>`<linearGradient id="top-blend-${name}" x1="31" y1="0" x2="149" y2="0" gradientUnits="userSpaceOnUse"><stop stop-color="${mix(left,amount)}"/><stop offset="1" stop-color="${mix(right,amount)}"/></linearGradient>`).join('');
    top=`<defs>${gradients}</defs><g><rect x="30" y="4" width="120" height="8" rx="3" fill="url(#top-blend-halo)" filter="url(#left-halo)"/><rect x="31" y="5" width="118" height="5" rx="1" fill="url(#top-blend-rim)"/><rect x="32" y="5" width="116" height="5" rx="2" fill="url(#top-blend-core)" filter="url(#left-glow)"/><rect x="32" y="6" width="116" height="3" rx="1" fill="url(#top-blend-core)"/></g>`;
   }
   const halves=([['left',left],['right',right]] as const).map(([side,colour])=>{
    let body=tint(base,colour).slice(base.indexOf('>')+1).replace(/<\/svg>\s*$/,'');
    body=body.replace(/id="([^"]+)"/g,(_,id)=>`id="${side}-${id}"`).replace(/url\(#([^)]+)\)/g,(_,id)=>`url(#${side}-${id})`);
    return `<g clip-path="url(#${side}-half)">${body}</g>`;
   }).join('');
   art=base.slice(0,base.indexOf('>')+1)+'<defs><clipPath id="left-half"><rect width="91" height="76"/></clipPath><clipPath id="right-half"><rect x="90" width="90" height="76"/></clipPath></defs>'+halves+top+'</svg>';
  }
  return `url("data:image/svg+xml,${encodeURIComponent(art)}")`;
 }
 const result={plain:render(plain,false),selected:render(selected,true)};
 if(cache.size>=128)cache.delete(cache.keys().next().value!);
 cache.set(key,result);return result;
}
