import {createElement,useId,type ReactNode} from 'react';
export type DiagramNode={tag:string;attributes:Record<string,string|Record<string,string>>;children:(DiagramNode|string)[]};
const tags=new Set(['svg','defs','clipPath','path','linearGradient','stop','marker','g','text','circle','rect']);
/** Draw only the fixed, validated presentation tree. No executable markup is accepted. */
function Diagram({node}:{node:DiagramNode}){
 const id=useId();
 const render=(item:DiagramNode|string,key:number):ReactNode=>{
  if(typeof item==='string')return item;
  if(!tags.has(item.tag))throw new Error('Invalid diagram element.');
  const attributes=Object.fromEntries(Object.entries(item.attributes).map(([key,value])=>[key,typeof value==='string'?value.replaceAll('__id__',id):value]));
  return createElement(item.tag,{...attributes,key},...item.children.map(render));
 };
 return render(node,0);
}
export function BottleDiagram({node}:{node:DiagramNode}){return <Diagram node={node}/>;}
