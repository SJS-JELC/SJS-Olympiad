export const l6p6Presentation = {
 kind:'question',id:'L6P6',schemaVersion:1,version:'1',
 presentation:{
  "renderer": "L6P6",
  "title": "Radical Mess",
  "parts": [
    {
      "id": "answer",
      "label": "Number of organic molecules",
      "fields": [
        {
          "id": "answer",
          "label": "Number of organic molecules"
        }
      ]
    }
  ],
  "paragraphs": [
    "Radical reactions are pretty messy. Sometimes a molecule gets substituted lots of times, and sometimes it does not react at all.\n\nA sample of propane is mixed with chlorine and left in UV light.\n\nHow many different organic molecules containing 3 carbon atoms could the mixture contain?\n\nAssume that the only organic reactions taking place are halogen substitution reactions."
  ]
},
 validate(content,assets) {
 const fail=()=>{throw new Error('Invalid L6P6 presentation.');};
 const strings=(value,count)=>Array.isArray(value) && value.length===count && value.every(item=>typeof item==='string' && item.length>0);
 if(assets.size!==0)fail();
 if(!strings(content.paragraphs,1))fail();
 if(content.parts?.length!==1 || content.parts[0].fields?.length!==1)fail();
 },
 assets:[]
};
