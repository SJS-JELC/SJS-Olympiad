import { fixedAsset } from '../record.mjs';
export const l6p9Presentation = {
 kind:'question',id:'L6P9',schemaVersion:1,version:'1',
 presentation:{
  "renderer": "L6P9",
  "title": "Flatland",
  "parts": [
    {
      "id": "answer",
      "label": "Distance between a and b in pm",
      "fields": [
        {
          "id": "answer",
          "label": "Distance between a and b in pm"
        }
      ]
    }
  ],
  "paragraphs": [
    "Molecules are terrible at staying on the page. When we first draw cyclohexane, it is tempting to imagine it as a neat, flat hexagon. In the first diagram, cyclohexane has been forced to live in this flat 2D world.\n\nReal cyclohexane refuses to behave. Instead, it folds up into the 3D geometry shown in the second diagram. Assuming all the C–C bond lengths stay the same, what is the straight-line distance through space between a and b in the 3D chair structure?\nGive your answer to the nearest pm."
  ],
  "diagrams": [
    {
      "assetId": "diagram0",
      "description": "Flat cyclohexane structure with supplied dimensions"
    },
    {
      "assetId": "diagram1",
      "description": "Chair cyclohexane structure with points a and b"
    }
  ]
},
 validate(content,assets) {
 const fail=()=>{throw new Error('Invalid L6P9 presentation.');};
 const strings=(value,count)=>Array.isArray(value) && value.length===count && value.every(item=>typeof item==='string' && item.length>0);
 if(assets.size!==2)fail();
 if(!strings(content.paragraphs,1))fail();
 if(content.diagrams?.length!==2 || content.diagrams.some(diagram=>!assets.has(diagram.assetId) || typeof diagram.description!=='string' || !diagram.description))fail();
 if(content.parts?.length!==1 || content.parts[0].fields?.length!==1)fail();
 },
 assets:[fixedAsset('diagram0','image/svg+xml',new URL('../assets/l6p9/flat-cyclohexane.svg',import.meta.url)),fixedAsset('diagram1','image/svg+xml',new URL('../assets/l6p9/chair-cyclohexane.svg',import.meta.url))]
};
