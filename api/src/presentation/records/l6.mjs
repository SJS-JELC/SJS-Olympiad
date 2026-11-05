import { fixedAsset } from '../record.mjs';
export const l6Presentation = {
 kind:'practical',id:'L6',schemaVersion:1,version:'1',
 presentation:{
  "renderer": "L6",
  "title": "MOHR CRISPS",
  "protocol": "You are trying to work out just how salty your crisps are.\nLuckily there's a cunning titration for that, invented by this guy →\n\nYou may only use the equipment provided at your experimental station.\n\nYou may ask for experimental help at any time in the practical.\n\n1. Open your bag of crisps and transfer to your big beaker.\n(Try not to crush them as the crisp dust will cause all sorts of headaches down the line...)\n\n2. Using distilled water, dissolve all the salt.\n(Do not use more than 80 cm³ of water, and be aware crisps go pretty soggy if left soaking...)\n\n3. Add solution to a volumetric flask (filter on the way in to remove any excess crisp debris)\n\n4. Fill your burette with 0.1 mol dm⁻³ AgNO₃.\n\n5. Fill the volumetric flask up to the mark with distilled water.\n\n6. To a 250 cm³ conical flask add 40 cm³ of water, 20 cm³ of your salt solution and 2 cm³ of potassium chromate.\n\n7. Upon titration Ag⁺ will form a white precipitate with the chloride ions present. You’ll gradually see this. When all of the Cl⁻ has been used up, it will react with the CrO₄²⁻ to form silver chromate, which is a distinctive red-brown colour.\n\n8. Repeat for concordant titres.\nRECORD YOUR AVERAGE TITRE BELOW\n\n9. Find the mass of salt in a bag of crisps.\nRECORD THIS MASS BELOW",
  "html": false,
  "fields": [
    {
      "key": "numPracticalResponse3",
      "label": "Average titre",
      "unit": "cm³"
    },
    {
      "key": "numPracticalResponse4",
      "label": "Mass of salt in bag of crisps",
      "unit": "g"
    }
  ],
  "image": {
    "assetId": "protocol-image",
    "alt": "Mohr Crisps",
    "width": 154.24,
    "height": 166.05
  }
},
 validate(content,assets) {
  if(typeof content.protocol!=='string' || !content.protocol.length || typeof content.html!=='boolean' || !Array.isArray(content.fields) || content.fields.length!==2 || content.fields.some(field=>!/^numPracticalResponse[1-4]$/.test(field.key) || typeof field.label!=='string' || !field.label.length || typeof field.unit!=='string') || new Set(content.fields.map(field=>field.key)).size!==content.fields.length)throw new Error('Invalid practical presentation.');
  if(content.image ? assets.size!==1 || !assets.has(content.image.assetId) || typeof content.image.alt!=='string' || !Number.isFinite(content.image.width) || !Number.isFinite(content.image.height) || content.image.width<=0 || content.image.height<=0 : assets.size!==0)throw new Error('Invalid practical image.');
 },
 assets:[fixedAsset('protocol-image','image/png',new URL('../assets/l6/mohr-crisps.png',import.meta.url))]
};
