"""Reproduce the fixed U5P7 product illustration. No student answer key is an input.

Default regeneration uses the retained, source-hashed RDKit geometry with Python standard library only:
    python scripts/generate-u5p7-products.py
Use --check to compare checked-in outputs without writing them.
Use --refresh-rdkit-base only with pinned rdkit==2025.9.1 to regenerate the retained base.
RDKit is BSD-3-Clause: https://github.com/rdkit/rdkit/blob/master/license.txt
"""

import argparse
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET



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


def rdkit_base_outputs():
    from rdkit import Chem, rdBase
    from rdkit.Chem import rdDepictor, rdMolDescriptors
    from rdkit.Chem.Draw import rdMolDraw2D
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


BASE = ROOT / "scripts/u5p7-rdkit-base"
HEAVY_BOND_FACTOR = 1.45


def outputs():
    """Extend C-C/C-O vectors in the original acyclic products, leaving C-H
    vectors and every atom/bond unchanged. No chemistry engine or answer key is
    involved in this deterministic presentation-only pass.
    """
    provenance = json.loads((BASE / "ozonolysis-products.provenance.json").read_text(encoding="utf-8"))
    if hashlib.sha256(SOURCE.read_bytes()).hexdigest() != provenance["sourceSha256"]:
        raise RuntimeError("Product source changed: regenerate the pinned RDKit base first.")
    geometry_bytes = (BASE / "ozonolysis-products.svg").read_bytes()
    label_bytes = (BASE / "ozonolysis-products.labels.json").read_bytes()
    if hashlib.sha256(geometry_bytes).hexdigest() != provenance["geometrySha256"] or hashlib.sha256(label_bytes).hexdigest() != provenance["labelsSha256"]:
        raise RuntimeError("Retained RDKit inputs failed their provenance hashes.")
    original = ET.fromstring(geometry_bytes)
    source_labels = json.loads(label_bytes)["labels"]
    svg = ET.Element(f"{{{SVG_NS}}}svg")
    labels, cursor, label_offset, total_height, panels = [], 35.0, 0, 0.0, []
    for group, product, (offset, _) in zip(original, provenance["products"], PANELS, strict=True):
        count = product["atomCount"]
        atom_labels = source_labels[label_offset:label_offset+count]
        label_offset += count
        points = [(row["x"]-offset, row["y"]) for row in atom_labels]
        edges, adjacency = {}, [[] for _ in points]
        for path in group:
            match = re.fullmatch(r"bond-(\d+) atom-(\d+) atom-(\d+)", path.get("class", ""))
            if not match:
                raise RuntimeError("Unexpected RDKit primitive; inspect rather than altering it silently.")
            bond, a, b = map(int, match.groups())
            if bond not in edges:
                edges[bond] = (a, b)
                adjacency[a].append(b); adjacency[b].append(a)
        if len(edges) != count-1:
            raise RuntimeError("Only the approved acyclic products may use this extension.")
        placed = {0: points[0]}
        pending = [0]
        while pending:
            a = pending.pop()
            for b in adjacency[a]:
                if b in placed:
                    continue
                factor = HEAVY_BOND_FACTOR if atom_labels[a]["text"] != "H" and atom_labels[b]["text"] != "H" else 1.0
                placed[b] = tuple(placed[a][axis] + factor*(points[b][axis]-points[a][axis]) for axis in (0,1))
                pending.append(b)
        left, top = min(p[0] for p in placed.values()), min(p[1] for p in placed.values())
        width = max(p[0] for p in placed.values())-left
        height = max(p[1] for p in placed.values())-top
        translation = (cursor-left, 35-top)
        target = ET.SubElement(svg, f"{{{SVG_NS}}}g")
        for path in group:
            _, a, b = map(int, re.fullmatch(r"bond-(\d+) atom-(\d+) atom-(\d+)", path.get("class")).groups())
            delta = tuple(points[b][axis]-points[a][axis] for axis in (0,1))
            norm = sum(d*d for d in delta)
            shifts = [tuple(placed[index][axis]-points[index][axis] for axis in (0,1)) for index in (a,b)]
            def move(match):
                xy = tuple(map(float,match.groups()))
                t = max(0,min(1,sum((xy[axis]-points[a][axis])*delta[axis] for axis in (0,1))/norm))
                return ",".join(f"{xy[axis]+(1-t)*shifts[0][axis]+t*shifts[1][axis]+translation[axis]:.3f}" for axis in (0,1))
            path.set("d",re.sub(r"(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)",move,path.get("d")))
            target.append(path)
        labels.extend({**row,"x":round(placed[index][0]+translation[0],3),"y":round(placed[index][1]+translation[1],3)} for index,row in enumerate(atom_labels))
        panels.append((target,len(labels)-count,count,height))
        cursor += width+100
        total_height=max(total_height,height+70)
    # Centre both fixed products on a shared visual baseline after fitting each
    # acyclic graph; the methanal should not float at the top of the larger one.
    for group, start, count, panel_height in panels:
        shift=(total_height-panel_height-70)/2
        group.set("transform",f"translate(0 {shift:.3f})")
        for row in labels[start:start+count]:
            row["y"]=round(row["y"]+shift,3)
    width, height = round(cursor-65,3), round(total_height,3)
    viewbox = f"0 0 {width} {height}"
    svg.attrib.update({"viewBox":viewbox,"width":str(width),"height":str(height)})
    geometry_text = ET.tostring(svg,encoding="unicode")+"\n"
    label_text = text_json({"viewBox":viewbox,"labels":labels})
    provenance.update({"generator":"scripts/generate-u5p7-products.py",
        "presentation":"Deterministic extension of retained RDKit geometry; C-C and C-O vectors x1.45, C-H vectors unchanged. No new RDKit execution is claimed.",
        "baseInputs":"scripts/u5p7-rdkit-base/","baseGeometrySha256":hashlib.sha256(geometry_bytes).hexdigest(),
        "baseLabelsSha256":hashlib.sha256(label_bytes).hexdigest(),"heavyBondFactor":HEAVY_BOND_FACTOR,
        "geometrySha256":hashlib.sha256(geometry_text.encode()).hexdigest(),"labelsSha256":hashlib.sha256(label_text.encode()).hexdigest()})
    return {"ozonolysis-products.svg":geometry_text,"ozonolysis-products.labels.json":label_text,"ozonolysis-products.provenance.json":text_json(provenance)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--refresh-rdkit-base", action="store_true", help="Requires pinned RDKit; intentionally replace retained base inputs.")
    args = parser.parse_args()
    if args.refresh_rdkit_base:
        if args.check: parser.error("--check cannot replace the base")
        for name, content in rdkit_base_outputs().items():
            (BASE / name).write_text(content,encoding="utf-8",newline="\n")
    for name, content in outputs().items():
        path = ASSETS / name
        if args.check:
            if not path.exists() or path.read_text(encoding="utf-8") != content:
                raise SystemExit(f"Generated product asset is out of date: {path.relative_to(ROOT)}")
        else:
            path.write_text(content, encoding="utf-8", newline="\n")
    print(f"U5P7 fixed product assets {'verified' if args.check else 'generated'} from retained RDKit {EXPECTED_VERSION} geometry (C-C/C-O x{HEAVY_BOND_FACTOR}, C-H unchanged).")


if __name__ == "__main__":
    main()
