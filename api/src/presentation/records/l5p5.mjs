import { fixedAsset } from '../record.mjs';
export const l5p5Presentation = {
 kind:'question',id:'L5P5',schemaVersion:1,version:'1',
 presentation:{
  "renderer": "L5P5",
  "title": "HAVEN'T I SEEN YOU BEFORE?",
  "parts": [
    {
      "id": "answer",
      "label": "Answer",
      "fields": [
        {
          "id": "c2h4o",
          "label": "C₂H₄O"
        },
        {
          "id": "c4h8",
          "label": "C₄H₈"
        },
        {
          "id": "c3h9n",
          "label": "C₃H₉N"
        }
      ]
    }
  ],
  "paragraphs": [
    "How many isomers do molecules with the following molecular formulae have?"
  ],
  "descriptions": [
    "C₂H₄O",
    "C₄H₈",
    "C₃H₉N"
  ],
  "fieldLabels": [
    "C₂H₄O",
    "C₄H₈",
    "C₃H₉N"
  ]
},
 validate(content,assets) {
  const strings=(value,count)=>Array.isArray(value) && value.length===count && value.every(item=>typeof item==='string' && item.length>0);
  if(content.renderer!=='L5P5' || !strings(content.paragraphs,1) || !strings(content.descriptions,3) || !strings(content.fieldLabels,3) || content.parts?.length!==1)throw new Error('Invalid L5P5 presentation.');
  if(assets.size!==3 || !assets.has('diagram1') || !assets.has('diagram2') || !assets.has('diagram3'))throw new Error('Invalid L5P5 asset references.');
 },
 assets:[fixedAsset('diagram1','image/svg+xml',new URL('../assets/l5p5/c2h4o.svg',import.meta.url)),fixedAsset('diagram2','image/svg+xml',new URL('../assets/l5p5/c4h8.svg',import.meta.url)),fixedAsset('diagram3','image/svg+xml',new URL('../assets/l5p5/c3h9n.svg',import.meta.url))]
};
