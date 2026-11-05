export const l5p2Presentation = {
 kind:'question',id:'L5P2',schemaVersion:1,version:'1',
 presentation:{
  "renderer": "L5P2",
  "title": "THE DESTROYER OF WORLDS",
  "parts": [
    {
      "id": "answer",
      "label": "Answer",
      "fields": [
        {
          "id": "answer",
          "label": "Relative atomic mass"
        }
      ]
    }
  ],
  "paragraphs": [
    "Nuclear fusion is easiest to achieve using ²H (deuterium) and ³H (tritium).",
    "Deuterium is quite easy to obtain from natural sources, but tritium must be made by adding a neutron to a ⁶Li atom. To obtain this we enrich naturally occurring lithium until, by mass, 50% of it is ⁶Li.",
    "What is the relative atomic mass of this enriched lithium? Give your answer to 3 significant figures.",
    "For interest:",
    "²H + ³H → ⁴He + ¹n",
    "⁶Li + ¹n → ⁴He + ³H"
  ],
  "fieldLabels": [
    "Relative atomic mass"
  ]
},
 validate(content,assets) {
  const strings=(value,count)=>Array.isArray(value) && value.length===count && value.every(item=>typeof item==='string' && item.length>0);
  if(content.renderer!=='L5P2' || !strings(content.paragraphs,6) || !strings(content.fieldLabels,1) || content.parts?.length!==1)throw new Error('Invalid L5P2 presentation.');
  if(assets.size!==0)throw new Error('Invalid L5P2 asset references.');
 },
 assets:[]
};
