export type Atom={id:number;x:number;y:number};
export type Bond={a:number;b:number;order:1|2};
export type Graph={atoms:Atom[];bonds:Bond[]};
export type Drawing={graphs:Graph[];selected:number};
export const blank=():Drawing=>({graphs:[{atoms:[],bonds:[]}],selected:0});
export function valid(g:Graph):boolean {
 return !!g && Array.isArray(g.atoms)&&Array.isArray(g.bonds)&&g.atoms.length<=30&&g.bonds.length<=60&&new Set(g.atoms.map(a=>a.id)).size===g.atoms.length&&g.atoms.every(a=>Number.isInteger(a.id)&&Number.isFinite(a.x)&&Number.isFinite(a.y))&&g.bonds.every(b=>[1,2].includes(b.order)&&b.a!==b.b&&g.atoms.some(a=>a.id===b.a)&&g.atoms.some(a=>a.id===b.b))&&new Set(g.bonds.map(b=>[b.a,b.b].sort((a,b)=>a-b).join(':'))).size===g.bonds.length&&g.atoms.every(a=>valence(g,a.id)<=4);
}
export const valence=(g:Graph,id:number)=>g.bonds.filter(b=>b.a===id||b.b===id).reduce((n,b)=>n+b.order,0);
export function read(value?:string):Drawing {try{const d=JSON.parse(value??'');if(Array.isArray(d.graphs)&&d.graphs.length>0&&d.graphs.length<=20&&d.graphs.every(valid)&&Number.isInteger(d.selected)&&d.selected>=0&&d.selected<d.graphs.length)return d;}catch{}return blank();}
const base:Bond[]=[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[2,7],[7,8]].map(([a,b])=>({a,b,order:1}));
export const solutions:Graph[]=[[0,7,5],[7,0,5],[5,0,7]].map(([d,a,b])=>({atoms:Array.from({length:10},(_,id)=>({id,x:id*30,y:100})),bonds:[...base,{a:9,b:d,order:2},{a,b,order:2}]}));
export function equivalent(a:Graph,b:Graph):boolean {
 if(!valid(a)||!valid(b)||a.atoms.length!==b.atoms.length||a.bonds.length!==b.bonds.length)return false;
 const edge=(g:Graph,x:number,y:number)=>g.bonds.find(b=>(b.a===x&&b.b===y)||(b.a===y&&b.b===x))?.order??0;
 const mapping=new Map<number,number>();const used=new Set<number>();
 const search=(i:number):boolean=>{if(i===a.atoms.length)return true;const x=a.atoms[i].id;for(const atom of b.atoms){const y=atom.id;if(used.has(y)||valence(a,x)!==valence(b,y)||[...mapping].some(([u,v])=>edge(a,x,u)!==edge(b,y,v)))continue;mapping.set(x,y);used.add(y);if(search(i+1))return true;mapping.delete(x);used.delete(y);}return false;};return search(0);
}
export function correct(value?:string):boolean {try{const raw=JSON.parse(value??'');if(!raw.graphs.every(valid))return false;const graphs:Graph[]=raw.graphs.filter((g:Graph)=>g.atoms.length);return graphs.length===3&&solutions.every(s=>graphs.filter(g=>equivalent(g,s)).length===1);}catch{return false;}}
