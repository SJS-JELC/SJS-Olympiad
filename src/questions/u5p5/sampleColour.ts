/** Mix an authorized sample colour with the neutral dilution colour. */
export function sampleColour(channels:readonly number[], concentration=100):string {
 const fraction=Math.max(0,Math.min(100,concentration))/100;
 return 'rgb('+channels.map(channel=>Math.round(255+(channel-255)*fraction)).join(', ')+')';
}
