import { fixedAsset } from '../record.mjs';
export const l5p1Presentation = {
 kind:'question',id:'L5P1',schemaVersion:1,version:'1',
 presentation:{
  "renderer": "L5P1",
  "title": "CAN'T TAKE THE HEAT?",
  "parts": [
    {
      "id": "answer",
      "label": "Name of the metal, M",
      "fields": [
        {
          "id": "answer",
          "label": "Name of the metal, M"
        }
      ]
    }
  ],
  "paragraphs": [
    "A metal carbonate, M₂(CO₃)₃, loses 46.8% of its mass when heated.",
    "Give the name of the metal, M?"
  ],
  "accessibleLabels": [
    "Name of the metal, M"
  ]
},
 validate(content,assets) {
  const strings=(value,count)=>Array.isArray(value) && value.length===count && value.every(item=>typeof item==='string' && item.length>0);
  if(content.renderer!=='L5P1' || !strings(content.paragraphs,2) || !strings(content.accessibleLabels,1) || content.parts?.length!==1)throw new Error('Invalid L5P1 presentation.');
  if(assets.size!==2 || !assets.has('equipment9') || !assets.has('equipment4'))throw new Error('Invalid L5P1 asset references.');
 },
 assets:[fixedAsset('equipment9','image/png',new URL('../assets/l5p1/equipment-9.png',import.meta.url)),fixedAsset('equipment4','image/png',new URL('../assets/l5p1/equipment-4.png',import.meta.url))]
};
