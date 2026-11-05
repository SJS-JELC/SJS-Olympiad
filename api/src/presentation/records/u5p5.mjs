// Static apparatus geometry belongs to the authorized scientific presentation.
const column=(()=>{let path='H226 Q242 123 242 107 V76';for(let turn=0;turn<12;turn++){const nextX=274+turn*32,upper=turn%2===0;path+=` A16 16 0 0 ${upper?1:0} ${nextX} ${upper?76:154}`;if(turn<11)path+=upper?' V154':' V76';}return path+' V139 Q626 123 642 123 H780';})();
const graphic={viewBox:'-110 -20 1010 255',path1:'M-23 123 H105 '+column,path2:'M105 123 '+column,path3:'M-23 123 H105',path4:'M105 68 V123',path5:'M80 35 H130 M105 24 V41',path6:'M766 146 H778 L784 130 L790 154 L799 139 H822',shape1:{x:185,y:24,width:510,height:177,rx:22},shape2:{x:-78,y:86,width:55,height:74,rx:10},shape3:{cx:-50.5,cy:86,rx:27.5,ry:8},shape4:{x:92,y:41,width:26,height:27,rx:4},shape5:{x:750,y:79,width:88,height:87,rx:12},shape6:{cx:794,cy:111,r:15},labels:{label1:{x:440,y:222},label2:{x:-50.5,y:66},label3:{x:105,y:8},label4:{x:794,y:193}}};
export const u5p5Presentation = {
 kind:"question",id:"U5P5",schemaVersion:1,version:'4',
 presentation:{
  graphic,
  "renderer": "U5P5",
  "title": "Scents and Scentsibility",
  "parts": [
    {
      "id": "formulation",
      "label": "Perfume formulation",
      "fields": [
        {
          "id": "composition",
          "label": "Composition in half-percentage-point units"
        }
      ]
    }
  ],
  "paragraphs": [
    "You are Chief Chemist at Leatherhead's third-most prestigious perfume house. Your boss, Mr Sniffington has acquired a rival's bestselling fragrance. He wants a copy. Immediately.",
    "The mystery perfume contains Citrus, Floral and Woody scents dissolved in ethanol. Each scent is a blend of several substances.",
    "Use gas chromatography to investigate the ingredients and recreate the perfume's formulation."
  ],
  "concentrationLabels": {
    "citrus": "citrus concentration",
    "floral": "floral concentration",
    "woody": "woody concentration"
  },
  "sampleLabels": {
    "citrus": "Citrus scent",
    "floral": "Floral scent",
    "woody": "Woody scent",
    "mystery": "Mystery sample"
  },
  "names": [
    "Citrus",
    "Floral",
    "Woody",
    "Ethanol"
  ],
  "guideValues": [
    1.1,
    2.0,
    2.8,
    3.2,
    3.4,
    4.1,
    4.8
  ],
  "timeMax": 5.4,
  "maximum": 18000,
  "baseline": 7.5,
  "step": 0.002,
  "words": {
    "bottleLabel": "A suspiciously grand mystery perfume bottle",
    "mystery": "MYSTERY",
    "enter": "Enter Laboratory",
    "concentrationSuffix": " concentration",
    "scent": "% scent / ",
    "ethanol": "% ethanol",
    "add": "Add ",
    "addSuffix": " to injector",
    "addTitle": "Add to injector",
    "running": "Running",
    "run": "Run",
    "loadPrompt": "Select a sample above to add it to the injector.",
    "reportTitle": "GAS CHROMATOGRAPHY REPORT",
    "runPrefix": "RUN ",
    "area": "AREA UNDER PEAK",
    "label1": "Coiled separation column",
    "label2": "Carrier gas",
    "label3": "Injector",
    "label4": "Detector",
    "analysing": "Gas chromatograph analysing ",
    "graphicLabel": "Gas chromatograph: carrier gas flows through the injector, coiled column and detector",
    "blend": "Final perfume blend",
    "formulationLabel": "Four component formulation",
    "boundary": " boundary",
    "areaHint": "For a specific component, the area under the signal's peak is proportional to the amount of that substance in the sample. Drag across the graph to see the area underneath it.",
    "compareHint": "Compare the same peak in two reports: the ratio of the areas gives the ratio of that component's concentrations.",
    "chartDescription": " chromatogram. Retention time in minutes; detector response. Vertical scale zero to ",
    "response": "Response",
    "time": "Retention time / min",
    "integrationStart": "Integration start",
    "integrationEnd": "Integration end"
  },
  "sampleColours": {
    "citrus": [
      255,
      210,
      0
    ],
    "floral": [
      238,
      80,
      155
    ],
    "woody": [
      155,
      92,
      36
    ],
    "mystery": [
      153,
      76,
      210
    ]
  },
  "bottle": {
    "tag": "svg",
    "attributes": {
      "className": "gc-bottle",
      "viewBox": "0 0 220 210",
      "role": "img",
      "aria-label": "A suspiciously grand mystery perfume bottle"
    },
    "children": [
      {
        "tag": "path",
        "attributes": {
          "d": "M80 16h60v25H80z",
          "fill": "#263743",
          "stroke": "#152033",
          "strokeWidth": "4"
        },
        "children": []
      },
      {
        "tag": "path",
        "attributes": {
          "d": "M94 40h32v20H94z M77 60h66l24 28v100q0 10-10 10H63q-10 0-10-10V88z",
          "fill": "#994cd2",
          "stroke": "#243749",
          "strokeWidth": "4"
        },
        "children": []
      },
      {
        "tag": "path",
        "attributes": {
          "d": "M61 104h98v82q0 5-5 5H66q-5 0-5-5z",
          "fill": "#8651ac",
          "fillOpacity": ".7"
        },
        "children": []
      },
      {
        "tag": "path",
        "attributes": {
          "d": "M70 78v102",
          "stroke": "white",
          "strokeWidth": "6",
          "strokeLinecap": "round"
        },
        "children": []
      },
      {
        "tag": "rect",
        "attributes": {
          "x": "70",
          "y": "107",
          "width": "80",
          "height": "74",
          "rx": "4",
          "fill": "#fffaf0",
          "stroke": "#5b415b",
          "strokeWidth": "2"
        },
        "children": []
      },
      {
        "tag": "text",
        "attributes": {
          "x": "110",
          "y": "146",
          "textAnchor": "middle",
          "className": "type-heading",
          "fill": "#5b415b"
        },
        "children": [
          "?"
        ]
      },
      {
        "tag": "text",
        "attributes": {
          "x": "110",
          "y": "171",
          "textAnchor": "middle",
          "className": "type-caption",
          "fill": "#5b415b"
        },
        "children": [
          "MYSTERY"
        ]
      }
    ]
  },
  "tickValues": [
    0,
    1,
    2,
    3,
    4,
    5
  ],
  "unitsPerPercent": 2,
  "formulationColours": ["#f3c24a","#e79ab9","#af8959","#c7e3ee"],
  "initialComposition": [
    50,
    50,
    50,
    50
  ],
  "samples": [
    "mystery",
    "citrus",
    "floral",
    "woody"
  ],
  "dilutableSamples": [
    "citrus",
    "floral",
    "woody"
  ],
  "dilution": {
    "min": 0,
    "max": 100,
    "step": 0.5,
    "default": 100
  },
  "initialInterval": [
    0.5,
    0.7
  ]
},
 validate(content,assets){
  const string=value=>typeof value==='string' && value.length>0;
  const strings=(values,count)=>Array.isArray(values) && (count===undefined || values.length===count) && values.every(string);
  const finite=value=>typeof value==='number' && Number.isFinite(value);
  const positive=value=>finite(value) && value>0;
  const graph=value=>value && Array.isArray(value.atoms) && value.atoms.length>0 && Array.isArray(value.bonds) && new Set(value.atoms.map(atom=>atom.id)).size===value.atoms.length && value.atoms.every(atom=>Number.isInteger(atom.id) && string(atom.element) && finite(atom.x) && finite(atom.y)) && value.bonds.every(bond=>value.atoms.some(atom=>atom.id===bond.a) && value.atoms.some(atom=>atom.id===bond.b) && [1,2,3].includes(bond.order));
  const tags=new Set(['svg','path','rect','text']);
  const attributes=new Set(['className','viewBox','role','aria-label','d','fill','stroke','strokeWidth','fillOpacity','strokeLinecap','x','y','width','height','rx','textAnchor']);
  const diagram=node=>node && tags.has(node.tag) && node.attributes && Object.entries(node.attributes).every(([key,value])=>attributes.has(key) && typeof value==='string' && !/(?:href|src|javascript:|data:|https?:|url\()/i.test(value)) && Array.isArray(node.children) && node.children.every(child=>typeof child==='string' || diagram(child));
  if(!content.graphic || !['viewBox','path1','path2','path3','path4','path5','path6'].every(key=>string(content.graphic[key])) || !['shape1','shape2','shape3','shape4','shape5','shape6'].every(key=>content.graphic[key] && Object.entries(content.graphic[key]).every(([attribute,value])=>['x','y','width','height','rx','ry','cx','cy','r'].includes(attribute) && finite(value))) || !content.graphic.labels || !['label1','label2','label3','label4'].every(key=>finite(content.graphic.labels[key]?.x) && finite(content.graphic.labels[key]?.y)) || !positive(content.unitsPerPercent) || !strings(content.formulationColours,4) || content.renderer!=='U5P5' || !(assets.size===0) || !(Array.isArray(content.initialComposition) && content.initialComposition.length===4 && content.initialComposition.every(value=>Number.isInteger(value) && value>=0) && content.initialComposition.reduce((sum,value)=>sum+value,0)===200 && strings(content.samples,4) && new Set(content.samples).size===4 && strings(content.dilutableSamples,3) && content.dilutableSamples.every(sample=>content.samples.includes(sample)) && Array.isArray(content.initialInterval) && content.initialInterval.length===2 && content.initialInterval.every(finite) && content.dilution && ['min','max','step','default'].every(key=>finite(content.dilution[key])) && content.dilution.min<content.dilution.max && content.dilution.step>0 && diagram(content.bottle) && Array.isArray(content.tickValues) && content.tickValues.length>0 && content.tickValues.every(value=>finite(value) && value>=0 && value<=content.timeMax) && ['citrus','floral','woody','mystery'].every(key=>Array.isArray(content.sampleColours?.[key]) && content.sampleColours[key].length===3 && content.sampleColours[key].every(channel=>finite(channel) && channel>=0 && channel<=255)) && strings(content.paragraphs,3) && ['citrus','floral','woody','mystery'].every(key=>string(content.sampleLabels?.[key])) && ['citrus','floral','woody'].every(key=>string(content.concentrationLabels?.[key])) && strings(content.names,4) && Array.isArray(content.guideValues) && content.guideValues.length>0 && content.guideValues.every((time,index)=>positive(time) && time<content.timeMax && (!index || time>content.guideValues[index-1])) && positive(content.timeMax) && positive(content.maximum) && finite(content.baseline) && positive(content.step) && content.words && ['bottleLabel','mystery','enter','scent','ethanol','add','addSuffix','addTitle','running','run','loadPrompt','reportTitle','runPrefix','area','label1','label2','label3','label4','analysing','graphicLabel','blend','formulationLabel','boundary','areaHint','compareHint','chartDescription','response','time','integrationStart','integrationEnd'].every(key=>string(content.words[key]))))throw new Error('Invalid U5P5 presentation.');
 },
 assets:[]
};
