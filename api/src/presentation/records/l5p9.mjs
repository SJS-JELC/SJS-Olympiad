import { fixedAsset } from '../record.mjs';
export const l5p9Presentation = {
 kind:'question',id:'L5P9',schemaVersion:1,version:'1',
 presentation:{
  "renderer": "L5P9",
  "title": "Thinking Oxide the Box",
  "parts": [
    {
      "id": "groups",
      "label": "Three groups of three",
      "fields": []
    }
  ],
  "wording": "These oxides can be sorted into three groups of three. Find the groups.",
  "items": [
    {
      "id": "ZnO2",
      "label": "ZnO₂",
      "assetId": "tile1"
    },
    {
      "id": "TiO2",
      "label": "TiO₂",
      "assetId": "tile2"
    },
    {
      "id": "Fe3O4",
      "label": "Fe₃O₄",
      "assetId": "tile3"
    },
    {
      "id": "MgO2",
      "label": "MgO₂",
      "assetId": "tile4"
    },
    {
      "id": "Al2O3",
      "label": "Al₂O₃",
      "assetId": "tile5"
    },
    {
      "id": "V6O13",
      "label": "V₆O₁₃",
      "assetId": "tile6"
    },
    {
      "id": "Na2O2",
      "label": "Na₂O₂",
      "assetId": "tile7"
    },
    {
      "id": "MgO",
      "label": "MgO",
      "assetId": "tile8"
    },
    {
      "id": "Ti4O7",
      "label": "Ti₄O₇",
      "assetId": "tile9"
    }
  ]
},
 validate(content,assets) {
  if(content.renderer!=='L5P9' || typeof content.wording!=='string' || !content.wording || !Array.isArray(content.items) || content.items.length!==9 || content.parts?.length!==1 || assets.size!==9)throw new Error('Invalid L5P9 presentation.');
  const ids=new Set();
  for(const item of content.items){if(typeof item.id!=='string' || !item.id || ids.has(item.id) || typeof item.label!=='string' || !item.label || !assets.has(item.assetId))throw new Error('Invalid L5P9 item.');ids.add(item.id);}
 },
 assets:[fixedAsset('tile1','image/svg+xml',new URL('../assets/l5p9/ZnO2.svg',import.meta.url)),fixedAsset('tile2','image/svg+xml',new URL('../assets/l5p9/TiO2.svg',import.meta.url)),fixedAsset('tile3','image/svg+xml',new URL('../assets/l5p9/Fe3O4.svg',import.meta.url)),fixedAsset('tile4','image/svg+xml',new URL('../assets/l5p9/MgO2.svg',import.meta.url)),fixedAsset('tile5','image/svg+xml',new URL('../assets/l5p9/Al2O3.svg',import.meta.url)),fixedAsset('tile6','image/svg+xml',new URL('../assets/l5p9/V6O13.svg',import.meta.url)),fixedAsset('tile7','image/svg+xml',new URL('../assets/l5p9/Na2O2.svg',import.meta.url)),fixedAsset('tile8','image/svg+xml',new URL('../assets/l5p9/MgO.svg',import.meta.url)),fixedAsset('tile9','image/svg+xml',new URL('../assets/l5p9/Ti4O7.svg',import.meta.url))]
};
