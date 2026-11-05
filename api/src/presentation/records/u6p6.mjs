import { fixedAsset } from '../record.mjs';
export const u6p6Presentation={kind:'question',id:'U6P6',schemaVersion:1,version:'1',
 presentation:{
  "renderer": "U6P6",
  "title": "JUMBO MASS SPECTROMETRY",
  "parts": [
    {
      "id": "answer",
      "label": "Answer",
      "fields": [
        {
          "id": "answer",
          "label": "Molecular mass"
        }
      ]
    }
  ],
  "text": [
    "Question",
    "Electrospray ionisation is used to carry out mass spectrometry on a large protein and the protein becomes positively charged by gaining H",
    "+",
    " ions.",
    "Peaks for two consecutive ions (i.e. with a charge difference of 1 e.g. 4",
    "+",
    ", 5",
    "+",
    ") are seen at m/z values of 1297 & 1243.",
    "Work out the molecular mass of the original protein.",
    "Molecular mass"
  ]
},
 validate(p,assetIds){
  if(!Array.isArray(p.text)||p.text.length!==11||p.text.some(v=>typeof v!=='string'||!v.length))throw new Error('Invalid U6P6 text.');
  if(!Array.isArray(p.parts)||JSON.stringify(p.parts.map(part=>[part.id,part.fields?.map(field=>field.id)]))!==JSON.stringify([["answer", ["answer"]]]))throw new Error('Invalid U6P6 fields.');
  if(assetIds.size!==0||[].some(id=>!assetIds.has(id)))throw new Error('Invalid U6P6 assets.');
 },
 assets:[]
};
