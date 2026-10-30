"""Reproduce the fixed U5P7 product illustration. No student answer key is an input.

Run from any directory with Python 3.13 and the already-installed rdkit==2025.9.1:
    python scripts/generate-u5p7-products.py
Use --check to compare checked-in outputs without writing them.
RDKit is BSD-3-Clause: https://github.com/rdkit/rdkit/blob/master/license.txt
"""

import argparse
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

from rdkit import Chem, rdBase
from rdkit.Chem import rdDepictor, rdMolDescriptors
from rdkit.Chem.Draw import rdMolDraw2D


EXPECTED_VERSION = "2025.09.1"
ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "src/questions/u5p7/assets"
SOURCE = ASSETS / "ozonolysis-products.source.json"
SVG_NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG_NS)
WIDTH, HEIGHT = 1500, 330
PANELS = [(0, 340), (360, 1140)]


def text_json(value):
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def outputs():
    if rdBase.rdkitVersion != EXPECTED_VERSION:
        raise RuntimeError(f"Expected RDKit {EXPECTED_VERSION}; found {rdBase.rdkitVersion}. No outputs written.")
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    svg = ET.Element(f"{{{SVG_NS}}}svg", {"viewBox": f"0 0 {WIDTH} {HEIGHT}", "width": str(WIDTH), "height": str(HEIGHT)})
    labels, details = [], []
    for product, (offset, width) in zip(source["products"], PANELS, strict=True):
        builder, ids = Chem.RWMol(), {}
        for atom in product["atoms"]:
            ids[atom["id"]] = builder.AddAtom(Chem.Atom(atom["element"]))
        for bond in product["bonds"]:
            builder.AddBond(ids[bond["a"]], ids[bond["b"]], Chem.BondType.SINGLE if bond["order"] == 1 else Chem.BondType.DOUBLE)
        molecule = builder.GetMol()
        Chem.SanitizeMol(molecule)
        formula = rdMolDescriptors.CalcMolFormula(molecule)
        if formula != product["formula"]:
            raise RuntimeError(f"Product formula changed: {formula} != {product['formula']}")
        # Hydrogens are added only to this fixed public product illustration.
        # The interactive editor/cleanup never receives these generated atoms.
        molecule = Chem.AddHs(molecule)
        rdDepictor.Compute2DCoords(molecule, canonOrient=True, clearConfs=True)
        drawer = rdMolDraw2D.MolDraw2DSVG(width, HEIGHT)
        options = drawer.drawOptions()
        options.fixedFontSize = 40
        options.fixedBondLength = 66
        options.bondLineWidth = 2.5
        options.padding = 0.07
        options.clearBackground = False
        options.useBWAtomPalette()
        for atom in molecule.GetAtoms():
            options.atomLabels[atom.GetIdx()] = atom.GetSymbol()
        drawer.DrawMolecule(molecule)
        drawer.FinishDrawing()
        panel = ET.fromstring(drawer.GetDrawingText())
        geometry = ET.SubElement(svg, f"{{{SVG_NS}}}g", {"transform": f"translate({offset} 0)"})
        for child in panel:
            # RDKit's bond paths already stop at its label boxes. Keep that geometry
            # and replace outlined atom glyphs with the app's live typography.
            if re.fullmatch(r"atom-\d+", child.attrib.get("class", "")):
                continue
            geometry.append(child)
        for atom in molecule.GetAtoms():
            point = drawer.GetDrawCoords(atom.GetIdx())
            labels.append({"text": atom.GetSymbol(), "x": round(point.x + offset, 3), "y": round(point.y, 3), "role": "atom"})
        details.append({"name": product["name"], "formula": formula,
                        "canonicalSmiles": Chem.MolToSmiles(Chem.RemoveHs(molecule), isomericSmiles=False),
                        "atomCount": molecule.GetNumAtoms(), "bondCount": molecule.GetNumBonds(),
                        "sourceIdToRdkitIndex": ids})
    geometry_text = ET.tostring(svg, encoding="unicode") + "\n"
    label_text = text_json({"viewBox": f"0 0 {WIDTH} {HEIGHT}", "labels": labels})
    provenance = {
        "generator": "scripts/generate-u5p7-products.py",
        "source": SOURCE.relative_to(ROOT).as_posix(),
        "sourceSha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        "rdkitVersion": rdBase.rdkitVersion,
        "rdkitDistributionVersion": "2025.9.1",
        "license": "BSD-3-Clause",
        "licenseUrl": "https://github.com/rdkit/rdkit/blob/master/license.txt",
        "options": {"fixedFontSize": 40, "fixedBondLength": 66, "bondLineWidth": 2.5,
                    "padding": 0.07, "explicitHydrogens": True, "allAtomLabels": True,
                    "canonOrient": True, "monochrome": True},
        "presentation": "RDKit bond geometry with live C/H/O labels through ScientificDiagram; fixed public products only.",
        "products": details,
        "geometrySha256": hashlib.sha256(geometry_text.encode("utf-8")).hexdigest(),
        "labelsSha256": hashlib.sha256(label_text.encode("utf-8")).hexdigest(),
    }
    return {"ozonolysis-products.svg": geometry_text, "ozonolysis-products.labels.json": label_text,
            "ozonolysis-products.provenance.json": text_json(provenance)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    for name, content in outputs().items():
        path = ASSETS / name
        if args.check:
            if not path.exists() or path.read_text(encoding="utf-8") != content:
                raise SystemExit(f"Generated product asset is out of date: {path.relative_to(ROOT)}")
        else:
            path.write_text(content, encoding="utf-8", newline="\n")
    print(f"U5P7 fixed product assets {'verified' if args.check else 'generated'} with RDKit {rdBase.rdkitVersion}.")


if __name__ == "__main__":
    main()
