export const l6p2Presentation = {
 kind:'question',id:'L6P2',schemaVersion:1,version:'1',
 presentation:{
  "renderer": "L6P2",
  "title": "Chariots Pulled by Cats",
  "parts": [
    {
      "id": "answer",
      "label": "Element symbol",
      "fields": [
        {
          "id": "answer",
          "label": "Element symbol"
        }
      ]
    }
  ],
  "paragraphs": [
    "Give the symbol of the mystery element.\nIt is named after a Norse goddess associated with beauty, reflecting the wide range of colours shown by its compounds.\nIt can exist in several different oxidation states, each often producing a distinctly coloured solution.\nIts compounds are used as catalysts in the manufacture of sulfuric acid in the Contact Process.\nIt is found in some steels, where it increases strength and resistance to corrosion."
  ]
},
 validate(content,assets) {
 const fail=()=>{throw new Error('Invalid L6P2 presentation.');};
 const strings=(value,count)=>Array.isArray(value) && value.length===count && value.every(item=>typeof item==='string' && item.length>0);
 if(assets.size!==0)fail();
 if(!strings(content.paragraphs,1))fail();
 if(content.parts?.length!==1 || content.parts[0].fields?.length!==1)fail();
 },
 assets:[]
};
