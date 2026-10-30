export type ServerAttempt = {answers: Readonly<Record<string,string>>; feedback: Readonly<Record<string,boolean>>; retryAt:number; solvedAt:number|null; interaction?:unknown};
export type PreviousQuestion = {state:ServerAttempt; privateState:unknown};
export function questionInfo(id:string): {id:string;year:string;points:number;cooldownMs:number}|null;
export function questionData(id:string,state:ServerAttempt):unknown;
export function validateAnswers(id:string,answers:unknown):Record<string,string>;
export function reduceQuestion(id:string,previous:PreviousQuestion|null,action:unknown,now:number):{state:ServerAttempt;privateState:unknown;award:boolean}|null;
