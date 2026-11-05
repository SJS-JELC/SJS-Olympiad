export const u5p6Presentation = {
 kind:"question",id:"U5P6",schemaVersion:1,version:"1",
 presentation:{
  "renderer": "U5P6",
  "title": "Cubone",
  "parts": [
    {
      "id": "answer",
      "label": "Greatest hydrogen separation in pm",
      "fields": [
        {
          "id": "answer",
          "label": "Greatest hydrogen separation in pm",
          "unit": "pm"
        }
      ]
    }
  ],
  "paragraphs": [
    "The molecule shown, C₈H₈, is called cubane, for fairly obvious reasons.",
    "C–C bonds are 154 pm long and C–H bonds are 109 pm.",
    "Calculate the greatest possible distance between any two hydrogen atoms in a molecule of cubane.",
    "Give your answer to the nearest pm."
  ],
  "atoms": [
    {
      "id": "C0",
      "element": "C",
      "position": [
        -77,
        -77,
        -77
      ]
    },
    {
      "id": "H0",
      "element": "H",
      "position": [
        -139.9311793416692,
        -139.9311793416692,
        -139.9311793416692
      ]
    },
    {
      "id": "C1",
      "element": "C",
      "position": [
        -77,
        -77,
        77
      ]
    },
    {
      "id": "H1",
      "element": "H",
      "position": [
        -139.9311793416692,
        -139.9311793416692,
        139.9311793416692
      ]
    },
    {
      "id": "C2",
      "element": "C",
      "position": [
        -77,
        77,
        -77
      ]
    },
    {
      "id": "H2",
      "element": "H",
      "position": [
        -139.9311793416692,
        139.9311793416692,
        -139.9311793416692
      ]
    },
    {
      "id": "C3",
      "element": "C",
      "position": [
        -77,
        77,
        77
      ]
    },
    {
      "id": "H3",
      "element": "H",
      "position": [
        -139.9311793416692,
        139.9311793416692,
        139.9311793416692
      ]
    },
    {
      "id": "C4",
      "element": "C",
      "position": [
        77,
        -77,
        -77
      ]
    },
    {
      "id": "H4",
      "element": "H",
      "position": [
        139.9311793416692,
        -139.9311793416692,
        -139.9311793416692
      ]
    },
    {
      "id": "C5",
      "element": "C",
      "position": [
        77,
        -77,
        77
      ]
    },
    {
      "id": "H5",
      "element": "H",
      "position": [
        139.9311793416692,
        -139.9311793416692,
        139.9311793416692
      ]
    },
    {
      "id": "C6",
      "element": "C",
      "position": [
        77,
        77,
        -77
      ]
    },
    {
      "id": "H6",
      "element": "H",
      "position": [
        139.9311793416692,
        139.9311793416692,
        -139.9311793416692
      ]
    },
    {
      "id": "C7",
      "element": "C",
      "position": [
        77,
        77,
        77
      ]
    },
    {
      "id": "H7",
      "element": "H",
      "position": [
        139.9311793416692,
        139.9311793416692,
        139.9311793416692
      ]
    }
  ],
  "bonds": [
    [
      0,
      2
    ],
    [
      0,
      4
    ],
    [
      0,
      8
    ],
    [
      2,
      6
    ],
    [
      2,
      10
    ],
    [
      4,
      6
    ],
    [
      4,
      12
    ],
    [
      6,
      14
    ],
    [
      8,
      10
    ],
    [
      8,
      12
    ],
    [
      10,
      14
    ],
    [
      12,
      14
    ],
    [
      0,
      1
    ],
    [
      2,
      3
    ],
    [
      4,
      5
    ],
    [
      6,
      7
    ],
    [
      8,
      9
    ],
    [
      10,
      11
    ],
    [
      12,
      13
    ],
    [
      14,
      15
    ]
  ],
  "modelLabel": "Cubane molecule. Drag to rotate, or use the arrow keys. Home resets the view.",
  "modelTitle": "Cubane: eight carbon atoms on a cube with eight outward hydrogen atoms",
  "answerLabel": "Greatest hydrogen separation in pm",
  "unit": "pm",
  "dragHint": "Drag to rotate",
  "initialAngles": {
    "yaw": 0.55,
    "pitch": -0.35
  }
},
 validate(content,assets){
  const string=value=>typeof value==='string' && value.length>0;
  const strings=(values,count)=>Array.isArray(values) && (count===undefined || values.length===count) && values.every(string);
  const finite=value=>typeof value==='number' && Number.isFinite(value);
  const positive=value=>finite(value) && value>0;
  const graph=value=>value && Array.isArray(value.atoms) && value.atoms.length>0 && Array.isArray(value.bonds) && new Set(value.atoms.map(atom=>atom.id)).size===value.atoms.length && value.atoms.every(atom=>Number.isInteger(atom.id) && string(atom.element) && finite(atom.x) && finite(atom.y)) && value.bonds.every(bond=>value.atoms.some(atom=>atom.id===bond.a) && value.atoms.some(atom=>atom.id===bond.b) && [1,2,3].includes(bond.order));
  if(content.renderer!=='U5P6' || !(assets.size===0) || !(content.initialAngles && finite(content.initialAngles.yaw) && finite(content.initialAngles.pitch) && strings(content.paragraphs,4) && Array.isArray(content.atoms) && content.atoms.length===16 && new Set(content.atoms.map(atom=>atom.id)).size===16 && content.atoms.every(atom=>string(atom.id) && string(atom.element) && Array.isArray(atom.position) && atom.position.length===3 && atom.position.every(finite)) && Array.isArray(content.bonds) && content.bonds.length===20 && content.bonds.every(bond=>Array.isArray(bond) && bond.length===2 && bond.every(index=>Number.isInteger(index) && index>=0 && index<content.atoms.length)) && ['modelLabel','modelTitle','answerLabel','unit','dragHint'].every(key=>string(content[key]))))throw new Error('Invalid U5P6 presentation.');
 },
 assets:[]
};
