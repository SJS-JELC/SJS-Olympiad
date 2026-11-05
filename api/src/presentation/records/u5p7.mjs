export const u5p7Presentation = {
 kind:"question",id:"U5P7",schemaVersion:1,version:"1",
 presentation:{
  "renderer": "U5P7",
  "title": "Double Trouble",
  "parts": [
    {
      "id": "groups",
      "label": "Three groups of three",
      "fields": []
    }
  ],
  "items": [
    {
      "id": "C4H8",
      "label": "C₄H₈"
    },
    {
      "id": "C3H4O",
      "label": "C₃H₄O"
    },
    {
      "id": "C10H22O",
      "label": "C₁₀H₂₂O"
    },
    {
      "id": "C2H2O",
      "label": "C₂H₂O"
    },
    {
      "id": "C4H11N",
      "label": "C₄H₁₁N"
    },
    {
      "id": "C2H6",
      "label": "C₂H₆"
    },
    {
      "id": "C5H10",
      "label": "C₅H₁₀"
    },
    {
      "id": "C2H5N",
      "label": "C₂H₅N"
    },
    {
      "id": "C50H98",
      "label": "C₅₀H₉₈"
    }
  ],
  "wording": "These organic molecules can be sorted into three groups of three. Find the groups."
},
 validate(content,assets){
  const string=value=>typeof value==='string' && value.length>0;
  const strings=(values,count)=>Array.isArray(values) && (count===undefined || values.length===count) && values.every(string);
  const finite=value=>typeof value==='number' && Number.isFinite(value);
  const positive=value=>finite(value) && value>0;
  const graph=value=>value && Array.isArray(value.atoms) && value.atoms.length>0 && Array.isArray(value.bonds) && new Set(value.atoms.map(atom=>atom.id)).size===value.atoms.length && value.atoms.every(atom=>Number.isInteger(atom.id) && string(atom.element) && finite(atom.x) && finite(atom.y)) && value.bonds.every(bond=>value.atoms.some(atom=>atom.id===bond.a) && value.atoms.some(atom=>atom.id===bond.b) && [1,2,3].includes(bond.order));
  if(content.renderer!=='U5P7' || !(assets.size===0) || !(Array.isArray(content.items) && content.items.length===9 && content.items.every(item=>string(item.id) && string(item.label)) && new Set(content.items.map(item=>item.id)).size===9 && string(content.wording)))throw new Error('Invalid U5P7 presentation.');
 },
 assets:[]
};
