// Persist original Power Apps response identifiers; presentation/units live in the UI.
const fields = Object.freeze({
  L5: ['numPracticalResponse1', 'numPracticalResponse2', 'numPracticalResponse3', 'numPracticalResponse4'],
  L6: ['numPracticalResponse3', 'numPracticalResponse4'],
  U6: ['numPracticalResponse1', 'numPracticalResponse2', 'numPracticalResponse3', 'numPracticalResponse4'],
});
export const practicalFields = year => fields[year] ?? null;
export const emptyPractical = year => ({year, revision:0, responses:Object.fromEntries(fields[year].map(key => [key,null])), finalField:'numPracticalResponse4', updatedAt:null});
export function practicalChanges(year, changes) {
  const allowed=fields[year];
  if(!allowed || !changes || typeof changes!=='object' || Array.isArray(changes) || !Object.keys(changes).length || Object.keys(changes).some(key=>!allowed.includes(key)))throw new TypeError('Invalid practical response fields.');
  const result={};
  for(const [key,text] of Object.entries(changes)) {
    if(text===null) {result[key]=null;continue;}
    if(typeof text!=='string' || text.length>80 || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text.trim()))throw new TypeError('Enter a finite decimal or scientific number, or clear the response.');
    const value=Number(text.trim());
    if(!Number.isFinite(value) || Math.abs(value)>1e100 || value===0 && /[1-9]/.test(text.trim().split(/[eE]/)[0]))throw new TypeError('Practical response is outside the supported numeric range.');
    result[key]={text,value};
  }
  return result;
}
