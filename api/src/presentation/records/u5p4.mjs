import { fixedAsset } from '../record.mjs';
export const u5p4Presentation = {
 kind:"question",id:"U5P4",schemaVersion:1,version:"1",
 presentation:{
  "renderer": "U5P4",
  "title": "Rings of Power",
  "parts": [
    {
      "id": "answer",
      "label": "Name of the sixth molecule",
      "fields": [
        {
          "id": "answer",
          "label": "Name of the sixth molecule"
        }
      ]
    }
  ],
  "paragraphs": [
    "Organic molecules are often shown using skeletal formulae. In these diagrams:",
    "The names of five of the molecules below are:",
    "1,2-diazepine, 1,3-oxazole, 1,3-diazole, 1,2-oxazine and 1,3-diazine.",
    "Use these names to work out the pattern, then name the sixth molecule."
  ],
  "bullets": [
    "each line represents a covalent bond",
    "each corner or end of a line represents a carbon atom, unless another atom is shown",
    "hydrogen atoms attached to carbon are not shown, but are implied"
  ],
  "diagramLabel": "Six skeletal ring structures, traced around each ring; single lines are single bonds and equals signs are double bonds. Top left: O–C=N–C=C (closed to O). Top middle: O–C=C–N=C–C=C (closed to O). Top right: N=C–C=C–N=C (closed to N). Bottom left: O–N=C–C=C–C (closed to O). Bottom middle: NH–C=N–C=C (closed to NH). Bottom right: NH–N=C–C=C–C=C (closed to NH).",
  "answerLabel": "Name of the sixth molecule"
},
 validate(content,assets){
  const string=value=>typeof value==='string' && value.length>0;
  const strings=(values,count)=>Array.isArray(values) && (count===undefined || values.length===count) && values.every(string);
  const finite=value=>typeof value==='number' && Number.isFinite(value);
  const positive=value=>finite(value) && value>0;
  const graph=value=>value && Array.isArray(value.atoms) && value.atoms.length>0 && Array.isArray(value.bonds) && new Set(value.atoms.map(atom=>atom.id)).size===value.atoms.length && value.atoms.every(atom=>Number.isInteger(atom.id) && string(atom.element) && finite(atom.x) && finite(atom.y)) && value.bonds.every(bond=>value.atoms.some(atom=>atom.id===bond.a) && value.atoms.some(atom=>atom.id===bond.b) && [1,2,3].includes(bond.order));
  if(content.renderer!=='U5P4' || !(assets.size===1 && assets.has('molecules')) || !(strings(content.paragraphs,4) && strings(content.bullets,3) && string(content.diagramLabel) && string(content.answerLabel)))throw new Error('Invalid U5P4 presentation.');
 },
 assets:[fixedAsset('molecules','image/png',new URL('../assets/u5p4/heterocyclic-naming-original.png',import.meta.url))]
};
