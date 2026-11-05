export const u6Presentation = {
 kind:'practical',id:'U6',schemaVersion:1,version:'1',
 presentation:{
  "renderer": "U6",
  "title": "CLIPPY",
  "protocol": "You are trying to work out what percentage of a paperclip is manganese, Mn. Follow the instructions below.\n\nYou may only use the equipment provided at your experimental station.\n\nYou may ask for experimental help at any time in the practical.\n\n\n\n1. Accurately weigh about 0.2 g of paperclip, you can cut pieces up to get this approximate mass.\n RECORD THIS BELOW\n\n2. Add the paperclip to 70 cm³ of 2 M nitric acid and take it to the fume cupboard. Gently warm.\n(the teacher may add some extra acid to help the paperclip dissolve).\n\n3. Use a pipette to add 10 cm³ of 85% H₃PO₄ and 10 cm³ of 0.217M KIO₄ (potassium periodate(VII)) and boil for 10 minutes. (This will oxidise the Mn in the paperclip into MnO₄⁻ via a series of pretty colours.)\n\n4. While this is reacting you will need to make a calibration curve by determining the absorbance of different concentration solutions of MnO₄⁻. To do this, first make a 0.0005 mol dm⁻³ solution of KMnO₄ mol dm⁻³ by dissolving solid KMnO₄ in 1M H₂SO₄(you may wish to make a more concentrated solution and then dilute it using the volumetric flasks provided.)\n\n5. You need to dilute this solution further to make a range of differing concentrations. \n\n6. Once you have at least 5 solutions with a range of concentrations (with 0.0005 mol dm⁻³  being the highest) you need to use the colorimeter to record the absorbance of these solutions. \n\n7. To use the colorimeter turn it on, then using the RGB button set the light to green, using the A/T button set the colorimeter to absorbance (A). Then add a cuvette of water and press CAL, the reading on the screen should be .000\n\n8. You are now ready to add your samples, which also need to be transferred to cuvettes, no buttons need to be pressed, just add the sample, close the lid and record the absorbance. \n\n9. You will need to plot a graph of absorbance against concentration, this is a calibration curve that will be used to find the concentration of your unknown solution made from the paperclip. \n\n10. Take your cooled beaker from the fume cupboard, transfer all of the solution to a 100 cm³ volumetric flask and make it up to the mark with distilled water. \n\n11. Invert to ensure a homogeneous solution and then add a sample to the cuvette, recording the absorbance.\nRECORD THIS BELOW\n\n12. Using your calibration curve find the concentration of your solution of MnO₄⁻\nRECORD THIS BELOW\n\n13. Finally, find the mass of Mn in the paperclip and the percentage by mass that is Mn.\nRECORD THIS BELOW\n",
  "html": false,
  "fields": [
    {
      "key": "numPracticalResponse1",
      "label": "Mass of paperclip",
      "unit": "g"
    },
    {
      "key": "numPracticalResponse2",
      "label": "Absorbance of MnO₄⁻ from paperclip",
      "unit": ""
    },
    {
      "key": "numPracticalResponse3",
      "label": "Concentration of MnO₄⁻",
      "unit": "mol dm⁻³"
    },
    {
      "key": "numPracticalResponse4",
      "label": "Percentage of paperclip's mass that is Mn",
      "unit": "%"
    }
  ]
},
 validate(content,assets) {
  if(typeof content.protocol!=='string' || !content.protocol.length || typeof content.html!=='boolean' || !Array.isArray(content.fields) || content.fields.length!==4 || content.fields.some(field=>!/^numPracticalResponse[1-4]$/.test(field.key) || typeof field.label!=='string' || !field.label.length || typeof field.unit!=='string') || new Set(content.fields.map(field=>field.key)).size!==content.fields.length)throw new Error('Invalid practical presentation.');
  if(content.image ? assets.size!==1 || !assets.has(content.image.assetId) || typeof content.image.alt!=='string' : assets.size!==0)throw new Error('Invalid practical image.');
 },
 assets:[]
};
