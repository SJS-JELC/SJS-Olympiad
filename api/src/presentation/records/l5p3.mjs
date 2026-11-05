import { fixedAsset } from '../record.mjs';
export const l5p3Presentation = {
 kind:'question',id:'L5P3',schemaVersion:1,version:'1',
 presentation:{
  "renderer": "L5P3",
  "title": "TAKING THE STABILISERS OFF",
  "parts": [
    {
      "id": "answer",
      "label": "Answer",
      "fields": [
        {
          "id": "answer",
          "label": "Name of the other molecule"
        }
      ]
    }
  ],
  "paragraphs": [
    "It is easier to display organic molecules as skeletal formula. Skeletal formulae follow these rules:",
    "Each line represents a bond between two carbon atoms | Each corner or end of a line represents a carbon atom | Hydrogen atoms attached to carbon are not shown but are implied.",
    "The names of 3 of the molecules below are bicyclo[2.2.1]heptane, bicyclo[2.2.2]octane, bicyclo[3.2.1]octane.",
    "Deduce the name of the other molecule."
  ],
  "descriptions": [
    "Four bicyclic skeletal structures to compare"
  ],
  "fieldLabels": [
    "Name of the other molecule"
  ]
},
 validate(content,assets) {
  const strings=(value,count)=>Array.isArray(value) && value.length===count && value.every(item=>typeof item==='string' && item.length>0);
  if(content.renderer!=='L5P3' || !strings(content.paragraphs,4) || !strings(content.descriptions,1) || !strings(content.fieldLabels,1) || content.parts?.length!==1)throw new Error('Invalid L5P3 presentation.');
  if(assets.size!==1 || !assets.has('diagram1'))throw new Error('Invalid L5P3 asset references.');
 },
 assets:[fixedAsset('diagram1','image/svg+xml',new URL('../assets/l5p3/bicyclo.svg',import.meta.url))]
};
