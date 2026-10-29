import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Match unit exponents, not scientific powers of ten or ionic negative charges.
const negativeUnitIndex = /\b(?:mol|dm|cm|mm|kg|mg|g|s)\s*(?:⁻[¹²³]|[−-][123]|\^\s*[-−][123]|<sup>\s*[-−][123])/u;
const root = path.resolve('src/questions');
const folders = readdirSync(root).filter(name => /^(?:l5|u5)p\d+$/.test(name));
function textFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? textFiles(file) : /\.(?:ts|tsx|svg|json)$/.test(entry.name) ? [file] : [];
  });
}

describe('L5 and U5 displayed units', () => {
  it.each(folders)('%s content and vector assets avoid negative unit indices', folder => {
    for (const file of textFiles(path.join(root, folder))) {
      expect(readFileSync(file, 'utf8'), path.relative(root, file)).not.toMatch(negativeUnitIndex);
    }
  });
  it('keeps the audit specific to units', () => {
    expect('mol⁻¹').toMatch(negativeUnitIndex);
    expect('mol dm−3').toMatch(negativeUnitIndex);
    expect('g mol^-1').toMatch(negativeUnitIndex);
    expect('mol/dm³, mol/s, g/mol, OH⁻, SO₄²⁻, 10⁻⁵').not.toMatch(negativeUnitIndex);
  });
});
