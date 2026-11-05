import { fixedAsset } from '../record.mjs';
export const l6p1Presentation = {
 kind:'question',id:'L6P1',schemaVersion:1,version:'1',
 presentation:{
  "renderer": "L6P1",
  "title": "Singles Night",
  "wording": "The following elements can be sorted into three groups of three. Find the groups.",
  "items": [
    {
      "id": "Ta",
      "label": "Ta",
      "assetId": "tile0",
      "presentation": "element"
    },
    {
      "id": "S",
      "label": "S",
      "assetId": "tile1",
      "presentation": "element"
    },
    {
      "id": "As",
      "label": "As",
      "assetId": "tile2",
      "presentation": "element"
    },
    {
      "id": "Cu",
      "label": "Cu",
      "assetId": "tile3",
      "presentation": "element"
    },
    {
      "id": "V",
      "label": "V",
      "assetId": "tile4",
      "presentation": "element"
    },
    {
      "id": "Zr",
      "label": "Zr",
      "assetId": "tile5",
      "presentation": "element"
    },
    {
      "id": "F",
      "label": "F",
      "assetId": "tile6",
      "presentation": "element"
    },
    {
      "id": "Th",
      "label": "Th",
      "assetId": "tile7",
      "presentation": "element"
    },
    {
      "id": "Na",
      "label": "Na",
      "assetId": "tile8",
      "presentation": "element"
    }
  ],
  "parts": [
    {
      "id": "groups",
      "label": "Three groups of three",
      "fields": []
    }
  ]
},
 validate(content,assets) {
 const fail=()=>{throw new Error('Invalid L6P1 presentation.');};
 const strings=(value,count)=>Array.isArray(value) && value.length===count && value.every(item=>typeof item==='string' && item.length>0);
 if(assets.size!==9)fail();
 if(content.parts?.length!==1 || content.parts[0].fields?.length!==0 || typeof content.wording!=='string' || content.items?.length!==9 || new Set(content.items.map(item=>item.id)).size!==9 || content.items.some(item=>typeof item.id!=='string' || typeof item.label!=='string' || item.presentation!=='element' || !assets.has(item.assetId)))fail();
 },
 assets:[fixedAsset('tile0','image/svg+xml',new URL('../assets/l6p1/Ta.svg',import.meta.url)),fixedAsset('tile1','image/svg+xml',new URL('../assets/l6p1/S.svg',import.meta.url)),fixedAsset('tile2','image/svg+xml',new URL('../assets/l6p1/As.svg',import.meta.url)),fixedAsset('tile3','image/svg+xml',new URL('../assets/l6p1/Cu.svg',import.meta.url)),fixedAsset('tile4','image/svg+xml',new URL('../assets/l6p1/V.svg',import.meta.url)),fixedAsset('tile5','image/svg+xml',new URL('../assets/l6p1/Zr.svg',import.meta.url)),fixedAsset('tile6','image/svg+xml',new URL('../assets/l6p1/F.svg',import.meta.url)),fixedAsset('tile7','image/svg+xml',new URL('../assets/l6p1/Th.svg',import.meta.url)),fixedAsset('tile8','image/svg+xml',new URL('../assets/l6p1/Na.svg',import.meta.url))]
};
