import { fixedAsset } from '../record.mjs';
export const l5p6Presentation = {
 kind:'question',id:'L5P6',schemaVersion:1,version:'1',
 presentation:{
  "renderer": "L5P6",
  "title": "Fire in the Hole!",
  "parts": [
    {
      "id": "mass47",
      "label": "Mᵣ 47.1",
      "fields": [
        {
          "id": "mass47",
          "label": "Mᵣ 47.1"
        }
      ]
    },
    {
      "id": "mass74",
      "label": "Mᵣ 74",
      "fields": [
        {
          "id": "mass74",
          "label": "Mᵣ 74"
        }
      ]
    },
    {
      "id": "mass45",
      "label": "Mᵣ 45",
      "fields": [
        {
          "id": "mass45",
          "label": "Mᵣ 45"
        }
      ]
    }
  ],
  "paragraphs": [
    "One method chemists use to study molecules is to break them into smaller fragments and measure the mass of each fragment.",
    "When the molecule shown is fragmented, ions with masses 47.1, 74 and 45 are detected.",
    "Deduce the formula of the fragment that could produce each mass."
  ],
  "descriptions": [
    "Methionine structural formula"
  ],
  "accessibleLabels": [
    "Question and molecule"
  ]
},
 validate(content,assets) {
  const strings=(value,count)=>Array.isArray(value) && value.length===count && value.every(item=>typeof item==='string' && item.length>0);
  if(content.renderer!=='L5P6' || !strings(content.paragraphs,3) || !strings(content.descriptions,1) || !strings(content.accessibleLabels,1) || content.parts?.length!==3)throw new Error('Invalid L5P6 presentation.');
  if(assets.size!==1 || !assets.has('diagram1'))throw new Error('Invalid L5P6 asset references.');
 },
 assets:[fixedAsset('diagram1','image/svg+xml',new URL('../assets/l5p6/methionine.svg',import.meta.url))]
};
