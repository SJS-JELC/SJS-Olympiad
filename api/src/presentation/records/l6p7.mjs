import { fixedAsset } from '../record.mjs';
export const l6p7Presentation = {
 kind:'question',id:'L6P7',schemaVersion:1,version:'1',
 presentation:{
  "renderer": "L6P7",
  "title": "Rings of Power",
  "parts": [
    {
      "id": "answer",
      "label": "Name of the other molecule",
      "fields": [
        {
          "id": "answer",
          "label": "Name of the other molecule"
        }
      ]
    }
  ],
  "paragraphs": [
    "A crucial tool in forming rings is the Diels-Alder reaction between a diene and an alkene. \nFor example cyclohexene can be made from ethene and 1,3-butadiene.\n",
    "The target molecule given can be made from the reaction of (1E,3E)-penta-1,3-dien-1-ol and one other molecule.\nName the other molecule."
  ],
  "diagrams": [
    {
      "assetId": "diagram0",
      "description": "Diels-Alder example: ethene and 1,3-butadiene form cyclohexene"
    },
    {
      "assetId": "diagram1",
      "description": "Diels-Alder target molecule"
    }
  ]
},
 validate(content,assets) {
 const fail=()=>{throw new Error('Invalid L6P7 presentation.');};
 const strings=(value,count)=>Array.isArray(value) && value.length===count && value.every(item=>typeof item==='string' && item.length>0);
 if(assets.size!==2)fail();
 if(!strings(content.paragraphs,2))fail();
 if(content.diagrams?.length!==2 || content.diagrams.some(diagram=>!assets.has(diagram.assetId) || typeof diagram.description!=='string' || !diagram.description))fail();
 if(content.parts?.length!==1 || content.parts[0].fields?.length!==1)fail();
 },
 assets:[fixedAsset('diagram0','image/svg+xml',new URL('../assets/l6p7/diels-alder-example.svg',import.meta.url)),fixedAsset('diagram1','image/svg+xml',new URL('../assets/l6p7/diels-alder-target.svg',import.meta.url))]
};
