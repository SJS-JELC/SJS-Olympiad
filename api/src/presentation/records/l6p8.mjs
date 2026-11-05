export const l6p8Presentation = {
 kind:'question',id:'L6P8',schemaVersion:1,version:'1',
 presentation:{
  "renderer": "L6P8",
  "title": "Looks Pretty Simple",
  "parts": [
    {
      "id": "answer",
      "label": "Equilibrium concentration of B",
      "fields": [
        {
          "id": "answer",
          "label": "Equilibrium concentration of B"
        }
      ]
    }
  ],
  "paragraphs": [
    "A ⇌ B + C    (Kc = 3.4)\nB + C ⇌ D    (Kc = 1.6)\n\nA closed system initially has [A] = 0.8 M.\nFind [B] at equilibrium.\n\nGive your answer to 3 significant figures."
  ]
},
 validate(content,assets) {
 const fail=()=>{throw new Error('Invalid L6P8 presentation.');};
 const strings=(value,count)=>Array.isArray(value) && value.length===count && value.every(item=>typeof item==='string' && item.length>0);
 if(assets.size!==0)fail();
 if(!strings(content.paragraphs,1))fail();
 if(content.parts?.length!==1 || content.parts[0].fields?.length!==1)fail();
 },
 assets:[]
};
