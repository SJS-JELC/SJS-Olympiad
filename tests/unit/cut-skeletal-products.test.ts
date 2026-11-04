import { describe, expect, it } from 'vitest';
import { productGraphs } from '../../src/questions/u5p7/productGraphs';
import source from '../../src/questions/u5p7/assets/ozonolysis-products.source.json';
import { core } from '../../src/chemistry/molecule/engine';
import { labelFor } from '../../src/chemistry/molecule/depiction';

describe('Cut and Shut skeletal products', () => {
  it('preserves every original atom and bond, deriving the same two molecular formulae', () => {
    expect(productGraphs).toHaveLength(2);
    productGraphs.forEach((graph,index)=>{
      expect(graph.atoms.map(({id,element})=>({id,element}))).toEqual(source.products[index].atoms);
      expect(graph.bonds).toEqual(source.products[index].bonds);
      const carbons=graph.atoms.filter(atom=>atom.element==='C').length;
      const oxygens=graph.atoms.filter(atom=>atom.element==='O').length;
      const hydrogens=graph.atoms.reduce((sum,atom)=>sum+core.hydrogens(graph,atom),0);
      expect([carbons,hydrogens,oxygens]).toEqual(index===0?[1,2,1]:[9,14,3]);
      expect(graph.atoms.every(atom=>Number.isFinite(atom.x)&&Number.isFinite(atom.y))).toBe(true);
      expect(new Set(graph.atoms.map(atom=>`${atom.x},${atom.y}`)).size).toBe(graph.atoms.length);
    });
  });
  it('omits carbon labels in the larger skeleton while retaining every oxygen label',()=>{
    for (const graph of productGraphs) for(const atom of graph.atoms) {
      const label=labelFor(atom,graph,'skeletal',text=>text.length*12);
      if(atom.element==='C')expect(label).toBeNull();
      else expect(label?.chunks.map(chunk=>chunk.text).join('')).toBe('O');
    }
  });
});
