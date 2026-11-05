import { fixedAsset } from '../record.mjs';
export const u6p7Presentation={kind:'question',id:'U6P7',schemaVersion:1,version:'1',
 presentation:{
  "renderer": "U6P7",
  "title": "PROPANE'S CLOSEST ENCOUNTER",
  "parts": [
    {
      "id": "answer",
      "label": "Answer",
      "fields": [
        {
          "id": "answer",
          "label": "Distance (pm)"
        }
      ]
    }
  ],
  "text": [
    "Question",
    "I am propane, C",
    "3",
    "H",
    "8",
    ".",
    "Three carbon atoms stand in a chain, each arranged with ideal tetrahedral geometry.",
    "One hydrogen is attached to the first carbon.",
    "Another is attached to the third.",
    "Through space, how close can these two hydrogens come?",
    "C-C bond length = 154 pm",
    "C-H bond length = 109 pm",
    "Give your answer in picometres (pm), correct to 3 significant figures.",
    "Distance (pm)",
    "pm"
  ]
},
 validate(p,assetIds){
  if(!Array.isArray(p.text)||p.text.length!==15||p.text.some(v=>typeof v!=='string'||!v.length))throw new Error('Invalid U6P7 text.');
  if(!Array.isArray(p.parts)||JSON.stringify(p.parts.map(part=>[part.id,part.fields?.map(field=>field.id)]))!==JSON.stringify([["answer", ["answer"]]]))throw new Error('Invalid U6P7 fields.');
  if(assetIds.size!==0||[].some(id=>!assetIds.has(id)))throw new Error('Invalid U6P7 assets.');
 },
 assets:[]
};
