export type Vec3 = readonly [number, number, number];
// Ideal cube and radial C-H bonds, in pm, using the lengths stated in the question.
export const carbonPositions: Vec3[] = [-1,1].flatMap(x=>[-1,1].flatMap(y=>[-1,1].map(z=>[77*x,77*y,77*z] as const)));
export const atoms = carbonPositions.flatMap((p,i)=>[
 {id:'C'+i,element:'C',position:p},
 {id:'H'+i,element:'H',position:p.map(v=>v*(1+109/(77*Math.sqrt(3)))) as unknown as Vec3}
]);
export const bonds: readonly [number,number][] = [
 ...carbonPositions.flatMap((p,i)=>carbonPositions.flatMap((v,j)=>j>i && p.filter((n,k)=>n!==v[k]).length===1 ? [[i*2,j*2] as [number,number]] : [])),
 ...carbonPositions.map((_,i)=>[i*2,i*2+1] as [number,number])
];
export function rotate([x,y,z]:Vec3,yaw:number,pitch:number):Vec3 {
 const a=x*Math.cos(yaw)+z*Math.sin(yaw), b=-x*Math.sin(yaw)+z*Math.cos(yaw);
 return [a,y*Math.cos(pitch)-b*Math.sin(pitch),y*Math.sin(pitch)+b*Math.cos(pitch)];
}
