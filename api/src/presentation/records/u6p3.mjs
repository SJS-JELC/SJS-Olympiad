import { fixedAsset } from '../record.mjs';
export const u6p3Presentation={kind:'question',id:'U6P3',schemaVersion:1,version:'1',
 presentation:{
  "renderer": "U6P3",
  "title": "SPYRO",
  "parts": [
    {
      "id": "answer",
      "label": "Answer",
      "fields": [
        {
          "id": "answer",
          "label": "Molecule name"
        }
      ]
    }
  ],
  "text": [
    "Question",
    "3 members of a molecular family are shown below. The names of two are:",
    "6,8-dimethylspiro[3.5]nonane and",
    "4-chloro-7-fluoro-5,6-dimethylspiro[2.4]heptane.",
    "What is the other called?",
    "Three spiro molecules, including the two named examples and the molecule to name.",
    "Molecule name"
  ]
},
 validate(p,assetIds){
  if(!Array.isArray(p.text)||p.text.length!==7||p.text.some(v=>typeof v!=='string'||!v.length))throw new Error('Invalid U6P3 text.');
  if(!Array.isArray(p.parts)||JSON.stringify(p.parts.map(part=>[part.id,part.fields?.map(field=>field.id)]))!==JSON.stringify([["answer", ["answer"]]]))throw new Error('Invalid U6P3 fields.');
  if(assetIds.size!==1||["diagram0"].some(id=>!assetIds.has(id)))throw new Error('Invalid U6P3 assets.');
 },
 assets:[fixedAsset('diagram0','image/svg+xml',new URL('../assets/u6p3/spiros.svg',import.meta.url))]
};
