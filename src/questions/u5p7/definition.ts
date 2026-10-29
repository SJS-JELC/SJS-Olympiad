import type {QuestionDefinition} from '../attempts';
import {correct} from './model';
export const u5p7:QuestionDefinition={id:'U5P7',number:7,year:'U5',title:'Cut and Shut',points:2,cooldownMs:20000,lockCorrectParts:false,allowIncompleteSubmission:true,parts:[{id:'structures',label:'Structures',fields:[{id:'drawings',label:'Molecular drawings'},{id:'history',label:'Drawing history'}]}],evaluate:answers=>({structures:correct(answers.drawings)})};
