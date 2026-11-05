import { fixedAsset } from '../record.mjs';
export const l5p7Presentation = {
 kind:'question',id:'L5P7',schemaVersion:1,version:'1',
 presentation:{
  "renderer": "L5P7",
  "title": "CRYSTAL CLEAR",
  "parts": [
    {
      "id": "answer",
      "label": "Answer",
      "fields": [
        {
          "id": "perovskite",
          "label": "Perovskite"
        },
        {
          "id": "gan",
          "label": "Gallium Nitride"
        }
      ]
    }
  ],
  "paragraphs": [
    "The structure of giant lattices have a huge impact on their properties.",
    "We represent repeating crystal structures using a unit cell. A unit cell is the smallest repeating 3-dimensional block that can be stacked to recreate the entire crystal.",
    "Below are 2 materials that have or are likely to revolutionise our world. Count the total number of atoms within each unit cell (n.b. only fractions of some atoms may sit within the unit cell.)"
  ],
  "descriptions": [
    "Perovskite unit cell",
    "Gallium nitride unit cell"
  ],
  "fieldLabels": [
    "Perovskite",
    "Gallium Nitride"
  ],
  "captions": [
    [
      "Perovskite",
      "(Used in next gen solar cells)"
    ],
    [
      "Gallium Nitride",
      "(Used in LEDs and lasers)"
    ]
  ]
},
 validate(content,assets) {
  const strings=(value,count)=>Array.isArray(value) && value.length===count && value.every(item=>typeof item==='string' && item.length>0);
  if(content.renderer!=='L5P7' || !strings(content.paragraphs,3) || !strings(content.descriptions,2) || !strings(content.fieldLabels,2) || !Array.isArray(content.captions) || content.captions.length!==2 || content.captions.some(value=>!strings(value,2)) || content.parts?.length!==1)throw new Error('Invalid L5P7 presentation.');
  if(assets.size!==2 || !assets.has('diagram1') || !assets.has('diagram2'))throw new Error('Invalid L5P7 asset references.');
 },
 assets:[fixedAsset('diagram1','image/svg+xml',new URL('../assets/l5p7/perovskite.svg',import.meta.url)),fixedAsset('diagram2','image/png',new URL('../assets/l5p7/gan.png',import.meta.url))]
};
