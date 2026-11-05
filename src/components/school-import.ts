import type {SchoolRecord,TeamRecord} from '../cloud/api';
export type SchoolImportRow={name:string;targetCount:number;colours:string[];school?:SchoolRecord;addCount:number};
export const schoolImportName=(value:string)=>value.normalize('NFKC').trim().replace(/\s+/gu,' ').replace(/[\u2019\u2018]/gu,"'").toLocaleLowerCase('en-GB');
export function parseSchoolImport(text:string,schools:SchoolRecord[],teams:TeamRecord[]):SchoolImportRow[]{
 if(text.length>50000)throw Error('Paste at most 100 school rows.');
 const lines=text.trim().split(/\r?\n/).filter(line=>line.trim());
 if(lines[0]?.split('\t')[0].trim().toLowerCase()==='school')lines.shift();
 if(!lines.length || lines.length>100)throw Error('Paste between 1 and 100 school rows.');
 const seen=new Set<string>();
 return lines.map((line,index)=>{
  const cells=line.split('\t').map(value=>value.trim().replace(/^"(.*)"$/,'$1').replace(/""/g,'"'));
  const [name,count,first,second]=cells,key=schoolImportName(name || '');
  if(cells.length<3 || cells.length>4 || !key || name.length>70)throw Error('Row '+(index+1)+': use School, Team count, Colour 1 and optional Colour 2.');
  if(seen.has(key))throw Error('Row '+(index+1)+': duplicate school name.');seen.add(key);
  const targetCount=Number(count);if(!/^\d+$/.test(count) || !Number.isInteger(targetCount) || targetCount<1 || targetCount>50)throw Error('Row '+(index+1)+': team count must be 1 to 50.');
  const colours=[first,...(second?[second]:[])];if(colours.some(value=>!/^#[0-9a-f]{6}$/i.test(value)))throw Error('Row '+(index+1)+': use six-digit hex colours such as #024633.');
  const school=schools.find(s=>schoolImportName(s.name)===key);
  const current=teams.filter(team=>team.schoolId===school?.id && !!team.schoolId).length;
  return {name:school?.name ?? name,targetCount,colours:colours.map(c=>c.toUpperCase()),school,addCount:Math.max(0,targetCount-current)};
 });
}
