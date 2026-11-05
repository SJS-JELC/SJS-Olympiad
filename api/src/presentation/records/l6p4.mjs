import { fixedAsset } from '../record.mjs';
export const l6p4Presentation = {
 kind:'question',id:'L6P4',schemaVersion:1,version:'2',
 presentation:{
  "renderer": "L6P4",
  "title": "Superposition",
  "paragraphs": [
    "π bonds form by overlap of p orbitals. In-phase overlap gives a bonding interaction; out-of-phase overlap gives an antibonding interaction.",
    "More bonding interactions mean lower orbital energy.",
    "Buta-1,3-diene has four p orbitals (one electron each), forming four molecular orbitals. The lowest has three bonding interactions; the highest has none.",
    "Click on the orbitals below to show the molecular orbitals of hexa-1,3,5-triene."
  ],
  "briefLabel": "Question and worked molecular orbital example",
  "exampleDescription": "Buta-1,3-diene molecular orbital example, from lowest to highest energy",
  "exampleAsset": "example",
  "choiceAssets": {
    "empty": "empty",
    "1": "phase1",
    "2": "phase2"
  },
  "valueLabel": "phase ",
  "unselectedLabel": "not selected",
  "changeLabel": ". Change phase.",
  "panels": [
    {
      "id": "HOMO",
      "groupLabel": "HOMO phases",
      "assetId": "reference1",
      "description": "HOMO hexa-1,3,5-triene skeleton",
      "viewWidth": 448,
      "viewHeight": 169,
      "positions": [
        [
          19,
          50,
          46
        ],
        [
          96,
          25,
          41
        ],
        [
          168,
          50,
          45
        ],
        [
          243,
          25,
          46
        ],
        [
          317,
          50,
          46
        ],
        [
          392,
          25,
          46
        ]
      ]
    },
    {
      "id": "LUMO",
      "groupLabel": "LUMO phases",
      "assetId": "reference2",
      "description": "LUMO hexa-1,3,5-triene skeleton",
      "viewWidth": 448,
      "viewHeight": 169,
      "positions": [
        [
          20,
          50,
          46
        ],
        [
          97,
          25,
          41
        ],
        [
          170,
          50,
          45
        ],
        [
          243,
          25,
          46
        ],
        [
          317,
          50,
          46
        ],
        [
          392,
          25,
          46
        ]
      ]
    }
  ],
  "parts": [
    {
      "id": "HOMO",
      "label": "HOMO",
      "fields": [
        {
          "id": "HOMO1",
          "label": "HOMO orbital 1"
        },
        {
          "id": "HOMO2",
          "label": "HOMO orbital 2"
        },
        {
          "id": "HOMO3",
          "label": "HOMO orbital 3"
        },
        {
          "id": "HOMO4",
          "label": "HOMO orbital 4"
        },
        {
          "id": "HOMO5",
          "label": "HOMO orbital 5"
        },
        {
          "id": "HOMO6",
          "label": "HOMO orbital 6"
        }
      ]
    },
    {
      "id": "LUMO",
      "label": "LUMO",
      "fields": [
        {
          "id": "LUMO1",
          "label": "LUMO orbital 1"
        },
        {
          "id": "LUMO2",
          "label": "LUMO orbital 2"
        },
        {
          "id": "LUMO3",
          "label": "LUMO orbital 3"
        },
        {
          "id": "LUMO4",
          "label": "LUMO orbital 4"
        },
        {
          "id": "LUMO5",
          "label": "LUMO orbital 5"
        },
        {
          "id": "LUMO6",
          "label": "LUMO orbital 6"
        }
      ]
    }
  ]
},
 validate(content,assets) {
 const fail=()=>{throw new Error('Invalid L6P4 presentation.');};
 const strings=(value,count)=>Array.isArray(value) && value.length===count && value.every(item=>typeof item==='string' && item.length>0);
 if(assets.size!==6)fail();
 if(!strings(content.paragraphs,4))fail();
 if(['briefLabel','exampleDescription','valueLabel','unselectedLabel','changeLabel'].some(key=>typeof content[key]!=='string' || !content[key]) || !assets.has(content.exampleAsset) || ['empty','1','2'].some(key=>!assets.has(content.choiceAssets?.[key])) || content.panels?.length!==2 || content.parts?.length!==2 || content.parts.some(part=>part.fields?.length!==6) || content.panels.some((orbital,index)=>orbital.id!==content.parts[index].id || !assets.has(orbital.assetId) || typeof orbital.groupLabel!=='string' || typeof orbital.description!=='string' || !Number.isFinite(orbital.viewWidth) || orbital.viewWidth<=0 || !Number.isFinite(orbital.viewHeight) || orbital.viewHeight<=0 || orbital.positions?.length!==6 || orbital.positions.some(position=>position.length!==3 || position.some(value=>!Number.isFinite(value)))))fail();
 },
 assets:[fixedAsset('example','image/svg+xml',new URL('../assets/l6p4/mo-example.svg',import.meta.url)),fixedAsset('reference1','image/svg+xml',new URL('../assets/l6p4/mo-question-homo.svg',import.meta.url)),fixedAsset('reference2','image/svg+xml',new URL('../assets/l6p4/mo-question-lumo.svg',import.meta.url)),fixedAsset('empty','image/svg+xml',new URL('../assets/l6p4/porbitalempty.svg',import.meta.url)),fixedAsset('phase1','image/svg+xml',new URL('../assets/l6p4/porbitalphase1.svg',import.meta.url)),fixedAsset('phase2','image/svg+xml',new URL('../assets/l6p4/porbitalphase2.svg',import.meta.url))]
};
