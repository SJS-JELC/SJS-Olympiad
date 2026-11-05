import { fixedAsset } from '../record.mjs';
export const u6p5Presentation={kind:'question',id:'U6P5',schemaVersion:1,version:'1',
 presentation:{
  "renderer": "U6P5",
  "labelCenters":[11.7278,38.3597,65.7937,88.1758],
  "diagramAspect":2.9913093738,
  "title": "HOW HARD CAN ISOMERISM BE?",
  "parts": [
    {
      "id": "answer",
      "label": "Answer",
      "fields": [
        {
          "id": "first",
          "label": "First enantiomer"
        },
        {
          "id": "second",
          "label": "Second enantiomer"
        }
      ]
    }
  ],
  "text": [
    "Question",
    "Stereoisomerism makes your head hurt when there is more than 1 chiral centre.",
    "3,4,5-trimethylheptane has 2 (or maybe 3) chiral centres but only 4 stereoisomers.",
    "Of these stereoisomers there is only 1 pair of enantiomers. Find the pair.",
    "Four stereoisomers of 3,4,5-trimethylheptane, labelled A to D from left to right.",
    "A",
    "B",
    "C",
    "D",
    "First enantiomer",
    "+",
    "Second enantiomer"
  ]
},
 validate(p,assetIds){
  if(!Number.isFinite(p.diagramAspect)||p.diagramAspect<=0||!Array.isArray(p.labelCenters)||p.labelCenters.length!==4||p.labelCenters.some(v=>!Number.isFinite(v)||v<0||v>100))throw new Error('Invalid U6P5 label geometry.');
  if(!Array.isArray(p.text)||p.text.length!==12||p.text.some(v=>typeof v!=='string'||!v.length))throw new Error('Invalid U6P5 text.');
  if(!Array.isArray(p.parts)||JSON.stringify(p.parts.map(part=>[part.id,part.fields?.map(field=>field.id)]))!==JSON.stringify([["answer", ["first", "second"]]]))throw new Error('Invalid U6P5 fields.');
  if(assetIds.size!==1||["diagram0"].some(id=>!assetIds.has(id)))throw new Error('Invalid U6P5 assets.');
 },
 assets:[fixedAsset('diagram0','image/svg+xml',new URL('../assets/u6p5/stereoisomers.svg',import.meta.url))]
};
