import { fixedAsset } from '../record.mjs';
export const u6p4Presentation={kind:'question',id:'U6P4',schemaVersion:1,version:'1',
 presentation:{
  "renderer": "U6P4",
  "answerCenters":[9,36.5,77.5],
  "title": "CHARGE HOPPER",
  "parts": [
    {
      "id": "answer",
      "label": "Delocalised atoms",
      "fields": [
        {
          "id": "a",
          "label": "Molecule A"
        },
        {
          "id": "b",
          "label": "Molecule B"
        },
        {
          "id": "c",
          "label": "Molecule C"
        }
      ]
    }
  ],
  "text": [
    "Question",
    "Ion stability depends on charge delocalisation. In the example below, the negative charge is delocalised over four atoms, shown in each of the 4 resonance structures. For each of the three molecules below, state how many atoms the charge can be delocalised over.",
    "Four resonance structures in the worked example, followed by molecules A, B and C."
  ],
  "diagramAspect": [
    1934.58,
    992.12
  ]
},
 validate(p,assetIds){
  if(!Array.isArray(p.answerCenters)||p.answerCenters.length!==3||p.answerCenters.some(v=>!Number.isFinite(v)||v<0||v>100))throw new Error('Invalid U6P4 answer geometry.');
  if(!Array.isArray(p.text)||p.text.length!==3||p.text.some(v=>typeof v!=='string'||!v.length))throw new Error('Invalid U6P4 text.');
  if(!Array.isArray(p.parts)||JSON.stringify(p.parts.map(part=>[part.id,part.fields?.map(field=>field.id)]))!==JSON.stringify([["answer", ["a", "b", "c"]]]))throw new Error('Invalid U6P4 fields.');
  if(assetIds.size!==1||["diagram0"].some(id=>!assetIds.has(id)))throw new Error('Invalid U6P4 assets.');
  if(!Array.isArray(p.diagramAspect)||p.diagramAspect.length!==2||p.diagramAspect.some(v=>!Number.isFinite(v)||v<=0))throw new Error('Invalid U6P4 geometry.');
 },
 assets:[fixedAsset('diagram0','image/svg+xml',new URL('../assets/u6p4/resonance.svg',import.meta.url))]
};
