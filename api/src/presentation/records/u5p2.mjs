export const u5p2Presentation = {
 kind:"question",id:"U5P2",schemaVersion:1,version:'2',
 presentation:{
  "renderer": "U5P2",
  "title": "Cross Your Fingers",
  "parts": [
    {
      "id": "diagram",
      "label": "N₂O diagram",
      "fields": [
        {
          "id": "diagram",
          "label": "N₂O diagram"
        }
      ]
    }
  ],
  "paragraphs": [
    "One molecular formula doesn’t always tell the whole story, even outside organic chemistry! The formula N₂O allows several formal dot-and-cross arrangements, although not all describe the bonding in nitrous oxide.",
    "Draw three different arrangements on the same canvas: two with nitrogen in the middle and one with oxygen in the middle. Show all outer-shell electrons and give every atom a full outer shell. Alternate dots and crosses between neighbouring atoms to show where the electrons come from."
  ],
  "markingPolicyId": "igcse-dot-cross:n2o",
  "editor": {
    "organisation": "igcse",
    "elements": [
      "N",
      "O"
    ],
    "initialElement": "N",
    "layout": {},
    "symbols": [
      "dot",
      "cross"
    ]
  }
},
 validate(content,assets){
  const string=value=>typeof value==='string' && value.length>0;
  const strings=(values,count)=>Array.isArray(values) && (count===undefined || values.length===count) && values.every(string);
  const finite=value=>typeof value==='number' && Number.isFinite(value);
  const positive=value=>finite(value) && value>0;
  const graph=value=>value && Array.isArray(value.atoms) && value.atoms.length>0 && Array.isArray(value.bonds) && new Set(value.atoms.map(atom=>atom.id)).size===value.atoms.length && value.atoms.every(atom=>Number.isInteger(atom.id) && string(atom.element) && finite(atom.x) && finite(atom.y)) && value.bonds.every(bond=>value.atoms.some(atom=>atom.id===bond.a) && value.atoms.some(atom=>atom.id===bond.b) && [1,2,3].includes(bond.order));
  if(content.renderer!=='U5P2' || !(assets.size===0) || !(strings(content.paragraphs,2) && string(content.markingPolicyId) && content.editor && strings(content.editor.elements,2) && content.editor.elements.includes(content.editor.initialElement) && content.editor.layout && typeof content.editor.layout==='object' && strings(content.editor.symbols,2)))throw new Error('Invalid U5P2 presentation.');
 },
 assets:[]
};
