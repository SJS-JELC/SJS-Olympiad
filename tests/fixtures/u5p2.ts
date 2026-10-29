// Existing N2O fixtures extracted unchanged from tests/unit/u5p2.test.ts.
export function fixture(double=false,flip=false) {
 const atoms=[{id:'left',element:'N',x:200,y:200},{id:'mid',element:'N',x:300,y:200},{id:'right',element:'O',x:400,y:200}];
 const electrons:any[]=[];
 const add=(anchor:any,dots:number,crosses:number)=>{for(let i=0;i<dots+crosses;i++) electrons.push({id:'e'+electrons.length,symbol:(i<dots)!==flip?'dot':'cross',anchor:{...anchor,slot:i}});};
 add({kind:'atom',atomId:'left'},double?4:2,0);add({kind:'atom',atomId:'right'},double?4:6,0);
 add({kind:'bond',a:'left',b:'mid'},double?1:3,3);add({kind:'bond',a:'mid',b:'right'},double?2:0,2);
 return {kind:'dot-and-cross',atoms,electrons,groups:[]};
}
export function pair(firstDouble=false, secondDouble=true, flip=false) {
 const a=fixture(firstDouble), b=fixture(secondDouble,flip);
 b.atoms.forEach(atom=>{atom.id+='2';atom.y+=200});
 b.electrons.forEach(e=>{e.id+='b'; if(e.anchor.kind==='atom')e.anchor.atomId+='2';else {e.anchor.a+='2';e.anchor.b+='2'}});
 return {...a,atoms:[...a.atoms,...b.atoms],electrons:[...a.electrons,...b.electrons]};
}
