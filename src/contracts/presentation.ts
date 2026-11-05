/** Data-free presentation contract. Scientific payloads originate only on the server. */
import type { QuestionDefinition, Part } from '../questions/attempts';
export type ContentKind = 'question' | 'practical';
export type PresentationPart = {id:string;label:string;fields:readonly {id:string;label:string;unit?:string;ariaLabel?:string}[]};
export type PresentationPayload = {renderer:string;title:string;parts?:readonly PresentationPart[]};
export type ContentRecord<T extends PresentationPayload = PresentationPayload> = {
 kind:ContentKind;id:string;schemaVersion:1;version:string;serverNow:number;
 presentation:T;assets:readonly {id:string;mimeType:string;bytes:number}[];
};
export type LoadedPresentation<T extends PresentationPayload = PresentationPayload> = {record:ContentRecord<T>;assets:Readonly<Record<string,string>>};
export function requirePresentation<T extends PresentationPayload>(value:LoadedPresentation | undefined, renderer:T['renderer']):LoadedPresentation<T> {
 if(!value || value.record.schemaVersion!==1 || value.record.presentation.renderer!==renderer)throw new Error('Question content is unavailable.');
 return value as LoadedPresentation<T>;
}
/** Resolve authorized IDs and labels by shape while retaining generic edit validators. */
export function presentedDefinition(definition:QuestionDefinition,payload:PresentationPayload):QuestionDefinition {
 const parts:readonly Part[]=payload.parts?.map((part,partIndex)=>({...part,fields:part.fields.map((field,fieldIndex)=>({...definition.parts[partIndex]?.fields[fieldIndex],...field}))})) ?? definition.parts;
 const effective={...definition,title:payload.title,parts};
 return definition.configure?.(effective,payload) ?? effective;
}
