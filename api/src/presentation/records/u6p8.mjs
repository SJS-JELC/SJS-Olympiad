import { fixedAsset } from '../record.mjs';
export const u6p8Presentation={kind:'question',id:'U6P8',schemaVersion:1,version:'2',
 presentation:{
  "renderer": "U6P8",
  "annotation":{"viewBox":"0 0 1453.52 324.93","x":405,"y":235},
  "title": "SPEEDY",
  "parts": [
    {
      "id": "answer",
      "label": "Answer",
      "fields": [
        {
          "id": "sn1",
          "label": "SN1 (%)"
        },
        {
          "id": "sn2",
          "label": "SN2 (%)"
        }
      ]
    }
  ],
  "text": [
    "Question",
    "The reaction below can take place via an SN1 or an SN2 mechanism.",
    "Given the initial rate data, calculate, to 3 significant figures, the percentage of the bromoethane that proceeds via each mechanism in experiment 1.",
    "Initial rate data",
    "Experiment",
    "[CH₃CH₂Br] / mol dm",
    "−3",
    "[OH",
    "−",
    "] / mol dm",
    "−3",
    "Rate / mol dm",
    "−3",
    " s",
    "−1",
    "1",
    "0.1",
    "0.3",
    "3.20 × 10",
    "−5",
    "2",
    "0.2",
    "0.3",
    "6.40 × 10",
    "−5",
    "3",
    "0.2",
    "0.6",
    "8.94 × 10",
    "−5",
    "SN 1 Mechanism",
    "SN1 mechanism for bromoethane reacting with hydroxide. The first ionisation step is labelled SLOW.",
    "SLOW",
    "SN 2 Mechanism",
    "SN2 mechanism for bromoethane reacting with hydroxide.",
    "SN1 (%)",
    "SN1 (%)",
    "%",
    "SN2 (%)",
    "SN2 (%)",
    "%"
  ]
},
 validate(p,assetIds){
  if(!p.annotation||typeof p.annotation.viewBox!=="string"||!Number.isFinite(p.annotation.x)||!Number.isFinite(p.annotation.y))throw new Error("Invalid U6P8 label geometry.");
  if(!Array.isArray(p.text)||p.text.length!==41||p.text.some(v=>typeof v!=='string'||!v.length))throw new Error('Invalid U6P8 text.');
  if(!Array.isArray(p.parts)||JSON.stringify(p.parts.map(part=>[part.id,part.fields?.map(field=>field.id)]))!==JSON.stringify([["answer", ["sn1", "sn2"]]]))throw new Error('Invalid U6P8 fields.');
  if(assetIds.size!==2||["diagram0","diagram1"].some(id=>!assetIds.has(id)))throw new Error('Invalid U6P8 assets.');
 },
 assets:[fixedAsset('diagram0','image/svg+xml',new URL('../assets/u6p8/sn1-mechanism.svg',import.meta.url)),fixedAsset('diagram1','image/svg+xml',new URL('../assets/u6p8/sn2-mechanism.svg',import.meta.url))]
};
