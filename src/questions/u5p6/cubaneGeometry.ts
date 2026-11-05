export type Vec3 = readonly [number, number, number];
export function rotate([x,y,z]:Vec3,yaw:number,pitch:number):Vec3 {
 const a=x*Math.cos(yaw)+z*Math.sin(yaw), b=-x*Math.sin(yaw)+z*Math.cos(yaw);
 return [a,y*Math.cos(pitch)-b*Math.sin(pitch),y*Math.sin(pitch)+b*Math.cos(pitch)];
}
