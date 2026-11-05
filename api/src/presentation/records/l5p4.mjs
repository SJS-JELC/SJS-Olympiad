export const l5p4Presentation = {
 kind:'question',id:'L5P4',schemaVersion:1,version:'1',
 presentation:{
  "renderer": "L5P4",
  "title": "GOBLINS",
  "parts": [
    {
      "id": "answer",
      "label": "Answer",
      "fields": [
        {
          "id": "answer",
          "label": "Symbol of the mystery element"
        }
      ]
    }
  ],
  "paragraphs": [
    "Give the symbol of the mystery element?",
    "- It is named after the German word for goblin as miners blamed goblins when its ores released poisonous arsenic fumes when heated.",
    "- It is one of the few elements that will be strongly attracted to a magnet at room temperature.",
    "- Its compounds produce a deep blue colour in glass and ceramics.",
    "- It is found in the important biological molecule vitamin B₁₂."
  ],
  "fieldLabels": [
    "Symbol of the mystery element"
  ]
},
 validate(content,assets) {
  const strings=(value,count)=>Array.isArray(value) && value.length===count && value.every(item=>typeof item==='string' && item.length>0);
  if(content.renderer!=='L5P4' || !strings(content.paragraphs,5) || !strings(content.fieldLabels,1) || content.parts?.length!==1)throw new Error('Invalid L5P4 presentation.');
  if(assets.size!==0)throw new Error('Invalid L5P4 asset references.');
 },
 assets:[]
};
