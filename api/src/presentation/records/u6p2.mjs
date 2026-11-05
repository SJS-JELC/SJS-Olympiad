import { fixedAsset } from '../record.mjs';
export const u6p2Presentation={kind:'question',id:'U6P2',schemaVersion:1,version:'1',
 presentation:{
  "renderer": "U6P2",
  "title": "HOT STUFF",
  "parts": [
    {
      "id": "answer",
      "label": "Answer",
      "fields": [
        {
          "id": "answer",
          "label": "Final temperature (°C)"
        }
      ]
    }
  ],
  "text": [
    "Question",
    "A 75 g block of copper at 150 °C is dropped into 100 g of water at 20 °C in a perfectly insulated container.",
    "After a while, the copper and the water reach a constant temperature T.",
    "The specific heat capacity of copper is 0.39 J g⁻¹ °C⁻¹.",
    "The specific heat capacity of water is 4.18 J g⁻¹ °C⁻¹.",
    "Calculate the final temperature in °C, to 3 significant figures, assuming no heat is lost to the surroundings.",
    "Final temperature (°C)",
    "°C"
  ]
},
 validate(p,assetIds){
  if(!Array.isArray(p.text)||p.text.length!==8||p.text.some(v=>typeof v!=='string'||!v.length))throw new Error('Invalid U6P2 text.');
  if(!Array.isArray(p.parts)||JSON.stringify(p.parts.map(part=>[part.id,part.fields?.map(field=>field.id)]))!==JSON.stringify([["answer", ["answer"]]]))throw new Error('Invalid U6P2 fields.');
  if(assetIds.size!==0||[].some(id=>!assetIds.has(id)))throw new Error('Invalid U6P2 assets.');
 },
 assets:[]
};
