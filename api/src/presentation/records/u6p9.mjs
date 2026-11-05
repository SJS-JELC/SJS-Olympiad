import { fixedAsset } from '../record.mjs';
export const u6p9Presentation={kind:'question',id:'U6P9',schemaVersion:1,version:'1',
 presentation:{
  "renderer": "U6P9",
  "title": "Spinning & Flipping",
  "parts": [
    {
      "id": "HClO",
      "label": "HClO",
      "fields": [
        {
          "id": "HClO",
          "label": "HClO"
        }
      ]
    },
    {
      "id": "SF4",
      "label": "SF₄",
      "fields": [
        {
          "id": "SF4",
          "label": "SF₄"
        }
      ]
    },
    {
      "id": "PCl5",
      "label": "PCl₅",
      "fields": [
        {
          "id": "PCl5",
          "label": "PCl₅"
        }
      ]
    }
  ],
  "text": [
    "Question and symmetry operations",
    "The symmetry of molecules is especially important to spectroscopy. Different molecules can be classified by how symmetrical they are. Molecules that share the same symmetry operations can be grouped into groups called point groups. Choose the right point group for each molecule below.",
    "Symmetry Operations",
    "(a molecule has this symmetry operation if it is unchanged after this is applied to it)",
    "Select a point group"
  ],
  "operations": [
    [
      "E",
      "Identity – do nothing."
    ],
    [
      "C₂",
      "Rotate the molecule 180° about a particular line."
    ],
    [
      "C₃",
      "Rotate the molecule 120° and 240° about a particular axis."
    ],
    [
      "σᵥ",
      "A mirror plane that contains the highest-order rotation axis."
    ],
    [
      "σₕ",
      "A mirror plane perpendicular to the highest-order rotation axis."
    ],
    [
      "i",
      "Inversion – from a central point, every atom has an identical partner the same distance away in the opposite direction."
    ]
  ],
  "options": [
    "C₁ – E",
    "Cₛ – E, σ",
    "Cᵢ – E, i",
    "C₂ – E, C₂",
    "C₂ᵥ – E, C₂, 2 × σᵥ",
    "C₂ₕ – E, C₂, σₕ, i",
    "D₂ – E, 3 × C₂",
    "D₂ₕ – E, 3 × C₂, i, 3 × σ",
    "C₃ – E, C₃",
    "C₃ᵥ – E, C₃, 3 × σᵥ",
    "D₃ – E, C₃, 3 × C₂",
    "D₃ₕ – E, C₃, 3 × C₂, σₕ, 3 × σᵥ"
  ]
},
 validate(p,assetIds){
  if(!Array.isArray(p.text)||p.text.length!==5||p.text.some(v=>typeof v!=='string'||!v.length))throw new Error('Invalid U6P9 text.');
  if(!Array.isArray(p.parts)||JSON.stringify(p.parts.map(part=>[part.id,part.fields?.map(field=>field.id)]))!==JSON.stringify([["HClO", ["HClO"]], ["SF4", ["SF4"]], ["PCl5", ["PCl5"]]]))throw new Error('Invalid U6P9 fields.');
  if(assetIds.size!==0||[].some(id=>!assetIds.has(id)))throw new Error('Invalid U6P9 assets.');
  if(!Array.isArray(p.operations)||p.operations.length!==6||p.operations.some(row=>!Array.isArray(row)||row.length!==2||row.some(v=>typeof v!=='string'||!v))||!Array.isArray(p.options)||p.options.length!==12||p.options.some(v=>typeof v!=='string'||!v))throw new Error('Invalid U6P9 options.');
 },
 assets:[]
};
