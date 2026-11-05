export const l5p8Presentation = {
 kind:'question',id:'L5P8',schemaVersion:1,version:'1',
 presentation:{
  "renderer": "L5P8",
  "title": "ALKANE ISOTOPES",
  "parts": [
    {
      "id": "answer",
      "label": "Answer",
      "fields": [
        {
          "id": "answer",
          "label": "n ="
        }
      ]
    }
  ],
  "paragraphs": [
    "Alkanes have the general formula CₙH₂ₙ₊₂.",
    "Carbon exists naturally as a mixture of isotopes: 98.9% ¹²C and 1.1% ¹³C.",
    "For larger alkanes, molecules with Mᵣ + 1 arise when exactly one carbon atom is ¹³C and the remaining carbons are ¹²C.",
    "Assume they contain only H. For what value of n will the abundance at Mᵣ equal the abundance at Mᵣ + 1?"
  ],
  "fieldLabels": [
    "n ="
  ]
},
 validate(content,assets) {
  const strings=(value,count)=>Array.isArray(value) && value.length===count && value.every(item=>typeof item==='string' && item.length>0);
  if(content.renderer!=='L5P8' || !strings(content.paragraphs,4) || !strings(content.fieldLabels,1) || content.parts?.length!==1)throw new Error('Invalid L5P8 presentation.');
  if(assets.size!==0)throw new Error('Invalid L5P8 asset references.');
 },
 assets:[]
};
