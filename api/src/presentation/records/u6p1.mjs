import { fixedAsset } from '../record.mjs';
export const u6p1Presentation={kind:'question',id:'U6P1',schemaVersion:1,version:'2',
 presentation:{
  "renderer": "U6P1",
  "title": "NICE, SIMPLE NMR",
  "parts": [
    {
      "id": "answer",
      "label": "Answer",
      "fields": [
        {
          "id": "answer",
          "label": "Molecule name"
        }
      ]
    }
  ],
  "text": [
    "Question",
    "Molecular formula C₆H₁₀O₂. ¹H NMR spectrum below.",
    "The integration values (relative proton ratios) are shown in red.",
    "Name the molecule.",
    "Molecule name"
  ],
  "detail": {
    "width": 321.8,
    "height": 150.97,
    "detailWidth": 40,
    "initialCenter": 248,
    "labels": [
      "Full spectrum",
      "Selected detail · 8× horizontal magnification",
      "NMR detail region. Use left and right arrows to move, Home and End for the boundaries.",
      "Original NMR spectrum detail with horizontal magnification and unchanged vertical scale."
    ]
  }
},
 validate(p,assetIds){
  if(!Array.isArray(p.text)||p.text.length!==5||p.text.some(v=>typeof v!=='string'||!v.length))throw new Error('Invalid U6P1 text.');
  if(!Array.isArray(p.parts)||JSON.stringify(p.parts.map(part=>[part.id,part.fields?.map(field=>field.id)]))!==JSON.stringify([["answer", ["answer"]]]))throw new Error('Invalid U6P1 fields.');
  if(assetIds.size!==1||["spectrum"].some(id=>!assetIds.has(id)))throw new Error('Invalid U6P1 assets.');
  if(!p.detail||['width','height','detailWidth','initialCenter'].some(k=>!Number.isFinite(p.detail[k])||p.detail[k]<=0)||p.detail.detailWidth>p.detail.width||p.detail.initialCenter<p.detail.detailWidth/2||p.detail.initialCenter>p.detail.width-p.detail.detailWidth/2||!Array.isArray(p.detail.labels)||p.detail.labels.length!==4||p.detail.labels.some(v=>typeof v!=='string'||!v))throw new Error('Invalid U6P1 explorer.');
 },
 assets:[fixedAsset('spectrum','image/svg+xml',new URL('../assets/u6p1/nmr.svg',import.meta.url))]
};
