export const l5Presentation = {
 kind:'practical',id:'L5',schemaVersion:1,version:'1',
 presentation:{
  "renderer": "L5",
  "title": "FLOATY",
  "protocol": "The 'bone' inside a cuttlefish is called the <b>cuttlebone</b>. Despite the name, it is not a bone at all. It is actually the cuttlefish’s internal shell, made mostly of calcium carbonate (CaCO₃) arranged in a very light, porous structure.\n\n<br><br>\n\nInside the cuttlebone are thousands of tiny chambers separated by thin walls. A cuttlefish can control how much liquid and gas are inside these chambers, allowing it to adjust its buoyancy. By changing the pressure inside the cuttlebone, the animal can rise or sink in the water without swimming, much like a submarine using ballast tanks.\n\n<br><br>\n\nYour job is to calculate the <b>density of a dry cuttlebone</b>.\n\n<br><br>\n<b>Instructions</b>\n<br><br>\n\n1) Using a 50 cm³ measuring cylinder and some distilled water, measure the volume of your cuttlebone. \n<br>Hint: work quickly, as the cuttlebone will begin to absorb water. You can hold it just below the water level with a stirring rod.\n\n<br><b>ENTER THE VOLUME BELOW</b>\n\n<br><br>\n\n2) Dry the cuttlebone with blue roll, then crush it using a pestle and mortar.\n\n<br><br>\n\n3) React it with 114 cm³ of 2 mol/dm³ HCl in a beaker. You will need to stir this well to ensure the acid reacts fully with the crushed cuttlebone.\n<br>Hint: it might be quite time efficient for one of you to skip ahead to step 5 to start getting the titration ready to go.\n<br><br>\n\n4) Transfer the reaction mixture to a 250 cm³ volumetric flask and fill to the line with distilled water.\n<br>Hint: make sure all of the mixture is transferred into the volumetric flask.\n\n<br><br>\n\n5) Fill the burette with 1 mol/dm³ NaOH. Take a 25 cm³ sample of the solution containing the cuttlebone reaction mixture and add a few drops of phenolphthalein.\n\n<br><br>\n\n6) Titrate the solution (if you have not done a titration before, ask the supervising teacher for help).\n\n<br><br>\n\n7) Repeat the titration until you obtain consistent results (or run out of time). Calculate the average titration result (the <b>mean titre</b>).\n\n<br><b>ENTER THE MEAN TITRE BELOW</b>\n\n<br><br>\n\n8) Calculate the moles of NaOH used in the titration.\n\n<br><br>\n\nNaOH reacts with HCl as follows:\n\n<br><b>NaOH(aq) + HCl(aq) → NaCl(aq) + H₂O(l)</b>\n\n<br><br>\n\n9) Calculate the moles of HCl in 25 cm³ of solution.\n\n<br><br>\n\n10) Calculate the moles of HCl in 250 cm³ of solution.\n\n<br><br>\n\n11) Calculate the moles of HCl that reacted with the cuttlebone.\n\n<br><b>ENTER THE MOLES OF HCl BELOW</b>\n\n<br><br>\n\nCalcium carbonate reacts as follows:\n\n<br><b>CaCO₃(s) + 2HCl(aq) → CaCl₂(aq) + CO₂(g) + H₂O(l)</b>\n\n<br><br>\n\n12) Calculate the moles of CaCO₃ in the cuttlebone.\n\n<br><br>\n\n13) Calculate the mass of CaCO₃ in the cuttlebone.\n\n<br><br>\n\n14) Calculate the density of the cuttlebone.\n\n<br><b>ENTER THE DENSITY BELOW</b>",
  "html": true,
  "fields": [
    {
      "key": "numPracticalResponse1",
      "label": "Volume of cuttlebone",
      "unit": "cm³"
    },
    {
      "key": "numPracticalResponse2",
      "label": "Average titre",
      "unit": "cm³"
    },
    {
      "key": "numPracticalResponse3",
      "label": "Moles of HCl reacted with cuttlebone",
      "unit": "mol"
    },
    {
      "key": "numPracticalResponse4",
      "label": "Density of cuttlebone",
      "unit": "g/cm³"
    }
  ]
},
 validate(content,assets) {
  if(typeof content.protocol!=='string' || !content.protocol.length || typeof content.html!=='boolean' || !Array.isArray(content.fields) || content.fields.length!==4 || content.fields.some(field=>!/^numPracticalResponse[1-4]$/.test(field.key) || typeof field.label!=='string' || !field.label.length || typeof field.unit!=='string') || new Set(content.fields.map(field=>field.key)).size!==content.fields.length)throw new Error('Invalid practical presentation.');
  if(content.image ? assets.size!==1 || !assets.has(content.image.assetId) || typeof content.image.alt!=='string' : assets.size!==0)throw new Error('Invalid practical image.');
 },
 assets:[]
};
