export const u5p9Presentation = {
 kind:"question",id:"U5P9",schemaVersion:1,version:"1",
 presentation:{
  "renderer": "U5P9",
  "title": "Cut and Shut",
  "parts": [
    {
      "id": "structures",
      "label": "Structures",
      "fields": [
        {
          "id": "drawings",
          "label": "Molecular drawings"
        }
      ]
    }
  ],
  "paragraphs": [
    "Ozonolysis cuts a C=C bond and replaces it with two C=O bonds. The attached groups stay in place; cutting a double bond in a ring can open the ring.",
    "X has formula C₁₀H₁₆, two C=C bonds and no triple bonds. Cutting both double bonds gives one molecule of each product shown.",
    "In skeletal formulae, each unlabelled corner or line end is a carbon atom. Hydrogens on carbon are implied to give each carbon four bonds; other atoms are labelled.",
    "Draw all possible structures of X using skeletal formulae."
  ],
  "graphs": [
    {
      "atoms": [
        {
          "id": 9,
          "element": "C",
          "x": 110,
          "y": 145
        },
        {
          "id": 13,
          "element": "O",
          "x": 170,
          "y": 145
        }
      ],
      "bonds": [
        {
          "a": 9,
          "b": 13,
          "order": 2
        }
      ]
    },
    {
      "atoms": [
        {
          "id": 0,
          "element": "C",
          "x": 300,
          "y": 150
        },
        {
          "id": 1,
          "element": "C",
          "x": 352,
          "y": 120
        },
        {
          "id": 2,
          "element": "C",
          "x": 404,
          "y": 150
        },
        {
          "id": 3,
          "element": "C",
          "x": 456,
          "y": 120
        },
        {
          "id": 4,
          "element": "C",
          "x": 508,
          "y": 150
        },
        {
          "id": 5,
          "element": "C",
          "x": 560,
          "y": 120
        },
        {
          "id": 6,
          "element": "C",
          "x": 612,
          "y": 150
        },
        {
          "id": 7,
          "element": "C",
          "x": 404,
          "y": 210
        },
        {
          "id": 8,
          "element": "C",
          "x": 456,
          "y": 240
        },
        {
          "id": 10,
          "element": "O",
          "x": 248,
          "y": 120
        },
        {
          "id": 11,
          "element": "O",
          "x": 352,
          "y": 240
        },
        {
          "id": 12,
          "element": "O",
          "x": 560,
          "y": 60
        }
      ],
      "bonds": [
        {
          "a": 0,
          "b": 1,
          "order": 1
        },
        {
          "a": 1,
          "b": 2,
          "order": 1
        },
        {
          "a": 2,
          "b": 3,
          "order": 1
        },
        {
          "a": 3,
          "b": 4,
          "order": 1
        },
        {
          "a": 4,
          "b": 5,
          "order": 1
        },
        {
          "a": 5,
          "b": 6,
          "order": 1
        },
        {
          "a": 2,
          "b": 7,
          "order": 1
        },
        {
          "a": 7,
          "b": 8,
          "order": 1
        },
        {
          "a": 0,
          "b": 10,
          "order": 2
        },
        {
          "a": 7,
          "b": 11,
          "order": 2
        },
        {
          "a": 5,
          "b": 12,
          "order": 2
        }
      ]
    }
  ],
  "diagramLabel": "Ozonolysis products: one methanal molecule, H2C=O, and the skeletal structure OHC-CH2-CH[C(=O)CH3]-CH2-CH2-C(=O)-CH3. Unlabelled corners and line ends are carbon atoms; hydrogens bonded to carbon are implied.",
  "editorLabel": "Structures of X",
  "elements": [
    "C",
    "H",
    "O"
  ],
  "viewBox": "0 25 670 250",
  "representations": [
    "skeletal"
  ]
},
 validate(content,assets){
  const string=value=>typeof value==='string' && value.length>0;
  const strings=(values,count)=>Array.isArray(values) && (count===undefined || values.length===count) && values.every(string);
  const finite=value=>typeof value==='number' && Number.isFinite(value);
  const positive=value=>finite(value) && value>0;
  const graph=value=>value && Array.isArray(value.atoms) && value.atoms.length>0 && Array.isArray(value.bonds) && new Set(value.atoms.map(atom=>atom.id)).size===value.atoms.length && value.atoms.every(atom=>Number.isInteger(atom.id) && string(atom.element) && finite(atom.x) && finite(atom.y)) && value.bonds.every(bond=>value.atoms.some(atom=>atom.id===bond.a) && value.atoms.some(atom=>atom.id===bond.b) && [1,2,3].includes(bond.order));
  if(content.renderer!=='U5P9' || !(assets.size===0) || !(string(content.viewBox) && content.viewBox.split(' ').length===4 && strings(content.representations,1) && content.representations.every(mode=>['displayed','skeletal'].includes(mode)) && strings(content.paragraphs,4) && Array.isArray(content.graphs) && content.graphs.length===2 && content.graphs.every(graph) && string(content.diagramLabel) && string(content.editorLabel) && strings(content.elements,3)))throw new Error('Invalid U5P9 presentation.');
 },
 assets:[]
};
