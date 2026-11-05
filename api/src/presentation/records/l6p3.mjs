export const l6p3Presentation = {
 kind:'question',id:'L6P3',schemaVersion:1,version:'1',
 presentation:{
  "renderer": "L6P3",
  "title": "Who Ate All the Names?",
  "parts": [
    {
      "id": "answer",
      "label": "Oxyanion name",
      "fields": [
        {
          "id": "answer",
          "label": "Oxyanion name"
        }
      ]
    }
  ],
  "instructions": [
    "You need to name 5 oxyanions.",
    "Clock's ticking."
  ],
  "goLabel": "GO: start oxyanion challenge",
  "revealPrefix": "Unlucky. The answer was ",
  "timerLabel": "Elapsed challenge time",
  "progressTotal": 5,
  "progressSuffix": " correct",
  "progressJoin": " of ",
  "answerLabel": "Oxyanion name",
  "submitLabel": "Submit oxyanion name"
},
 validate(content,assets) {
 const fail=()=>{throw new Error('Invalid L6P3 presentation.');};
 const strings=(value,count)=>Array.isArray(value) && value.length===count && value.every(item=>typeof item==='string' && item.length>0);
 if(assets.size!==0)fail();
 if(!strings(content.instructions,2) || content.progressTotal!==5 || ['goLabel','revealPrefix','timerLabel','progressSuffix','progressJoin','answerLabel','submitLabel'].some(key=>typeof content[key]!=='string' || !content[key]))fail();
 if(content.parts?.length!==1 || content.parts[0].fields?.length!==1)fail();
 },
 assets:[]
};
