import type { QuestionDefinition } from '../attempts';
import flippedEagle from '../../assets/powerapp/flipped-eagle.svg';
export const u6p9: QuestionDefinition = {
 headerArtwork:{src:flippedEagle,alt:''},id:'U6P9',year:'U6',number:9,title:'Question 9',protectedContent:true,points:3,cooldownMs:30000,
 configure:(definition,payload)=>{const {options}=payload as {options:readonly string[]};return {...definition,parts:definition.parts.map(part=>({...part,fields:part.fields.map(field=>({...field,acceptsEdit:(value:string)=>value===''||options.includes(value)}))}))};},
 lockCorrectParts:false,allowIncompleteSubmission:true,
 parts:['field1','field2','field3'].map((id,index)=>({id,label:'Part '+(index+1),fields:[{id,label:'Answer',acceptsEdit:(value:string)=>value.length<=100}]})),
};
