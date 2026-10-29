import type {DotCrossState} from './contracts';
import type {BankRecord,CheckResult} from './types';
export function check(state:Omit<DotCrossState,'kind'>,question:BankRecord):CheckResult;
export function validateReference(question:BankRecord):string[];
export function validateState(state:unknown):string[];
export function reference(question:BankRecord):Omit<DotCrossState,'kind'>;
export function clone<T>(value:T):T;
export function formulaCounts(formula:string):Record<string,number>|null;
