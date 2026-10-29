import onePoint from '../assets/animated/1pt-button-vector.svg?raw';
import twoPoints from '../assets/animated/2pt-button-vector.svg?raw';
import threePoints from '../assets/animated/3pt-button-vector.svg?raw';

// Derive image URLs only from trusted local assets. Each image keeps its own SVG
// document, so repeated gradient/filter IDs cannot collide across question buttons.
const unsolvedStyle = `<style>
  [data-part="diamond"], [data-part$="-diamond"] { filter: grayscale(1); }
  [data-part="ground-shadows"] ellipse[fill*="diamond-shadow"] { display: none; }
</style>`;

export const theoryButtonArtwork = [onePoint, twoPoints, threePoints].map(svg => ({
  solved: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
  unsolved: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('</svg>', unsolvedStyle + '</svg>')),
}));
