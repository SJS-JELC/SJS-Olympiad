/* Checked pure pair layout extracted from source renderer; no DOM drawing or global question state. */
export function createLayout(questionId = '') {
  const angles = [-100, -80, -10, 10, 80, 100, 170, 190],
    EPSILON = 1e-7,
    PAIR_HALF_ANGLE = (9 * Math.PI) / 180;
  function shellRadius(atom) {
    const element = typeof atom === 'string' ? atom : atom.element;
    return (questionId === 'phosphorus-pentachloride' && element === 'P') ||
      (questionId === 'sulfur-hexafluoride' && element === 'S')
      ? 100
      : element === 'H'
        ? 40
        : 54;
  }
  function bondDistance(a, b) {
    return shellRadius(a) + shellRadius(b) - 24;
  }
  function atomById(state, id) {
    return state.atoms.find((a) => a.id === id) || null;
  }
  function pairIds(a, b) {
    return [a, b].sort();
  }
  function pairKey(a, b) {
    return pairIds(a, b).join(':');
  }
  function angleDifference(a, b) {
    return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  }
  function vectorAngle(a, b) {
    return Math.atan2(b.y - a.y, b.x - a.x);
  }
  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function key(a) {
    return a.kind === 'atom'
      ? `a:${a.atomId}:${a.slot}`
      : `b:${pairIds(a.a, a.b).join(':')}:${a.slot}`;
  }
  function regionKey(a) {
    if (!a) return '';
    return a.kind === 'atom' ? `a:${a.atomId}` : `b:${pairKey(a.a, a.b)}`;
  }
  function regionData(anchor) {
    return anchor.kind === 'atom'
      ? { kind: 'atom', atomId: anchor.atomId }
      : { kind: 'bond', a: pairIds(anchor.a, anchor.b)[0], b: pairIds(anchor.a, anchor.b)[1] };
  }

  function bondPairs(state) {
    const pairs = new Map();
    state.electrons
      .filter((e) => e.anchor && e.anchor.kind === 'bond')
      .forEach((e) => {
        const ids = pairIds(e.anchor.a, e.anchor.b);
        pairs.set(ids.join(':'), ids);
      });
    return [...pairs.values()];
  }

  function nearbyPairs(state) {
    const pairs = bondPairs(state);
    const known = new Set(pairs.map((p) => pairKey(p[0], p[1])));
    state.atoms.forEach((a, i) =>
      state.atoms.slice(i + 1).forEach((b) => {
        const d = distance(a, b);
        const k = pairKey(a.id, b.id);
        if (d > EPSILON && d <= shellRadius(a) + shellRadius(b) + EPSILON && !known.has(k)) {
          known.add(k);
          pairs.push(pairIds(a.id, b.id));
        }
      }),
    );
    return pairs;
  }

  function occupiedKeys(state, excludeElectron) {
    return new Set(
      state.electrons.filter((e) => e.id !== excludeElectron && e.anchor).map((e) => key(e.anchor)),
    );
  }

  function firstFreeAnchor(kind, ids, occupied) {
    const max = kind === 'atom' ? 8 : 6;
    for (let slot = 0; slot < max; slot++) {
      const anchor =
        kind === 'atom'
          ? { kind: 'atom', atomId: ids[0], slot }
          : { kind: 'bond', a: ids[0], b: ids[1], slot };
      if (!occupied.has(key(anchor))) return anchor;
    }
    return null;
  }

  function inOverlap(p, a, b) {
    return distance(p, a) <= shellRadius(a) + EPSILON && distance(p, b) <= shellRadius(b) + EPSILON;
  }

  function freeAnchor(state, region, excludeElectron) {
    const ids = region.kind === 'atom' ? [region.atomId] : [region.a, region.b];
    const anchor = firstFreeAnchor(region.kind, ids, occupiedKeys(state, excludeElectron));
    if (!anchor || anchor.kind !== 'atom') return anchor;
    const proposed = {
      ...state,
      electrons: state.electrons.filter((e) => e.id !== excludeElectron),
    };
    proposed.electrons.push({ id: '__candidate__', symbol: 'dot', anchor });
    return atomPoint(proposed, anchor) ? anchor : null;
  }

  /*
   * Resolve a pointer position to a region and then to its first free slot.
   * The lens between two atom shells has priority over either atom. This is
   * deliberately geometry-based, so a caller does not need to know about
   * visual slot markers or the current insertion order.
   */
  function regionAt(state, p, excludeElectron) {
    if (!state || !p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
    const occupied = occupiedKeys(state, excludeElectron);
    const shared = nearbyPairs(state)
      .map((ids) => {
        const a = atomById(state, ids[0]),
          b = atomById(state, ids[1]);
        return a && b && inOverlap(p, a, b)
          ? { ids, d: distance(p, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }) }
          : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.d - b.d);
    for (const candidate of shared) {
      const anchor = firstFreeAnchor('bond', candidate.ids, occupied);
      if (anchor) return anchor;
      // An occupied shared region must not silently become a lone-electron
      // insertion target while the pointer is still in the lens.
      return null;
    }

    const atoms = state.atoms
      .map((a) => ({
        a,
        d: Math.hypot(p.x - a.x, p.y - a.y),
      }))
      .filter((item) => item.d <= shellRadius(item.a) + 12 + EPSILON)
      .sort((x, y) => x.d - y.d);
    for (const item of atoms) {
      // Stay on the targeted atom; a full shell must not redirect to a neighbour.
      return freeAnchor(state, { kind: 'atom', atomId: item.a.id }, excludeElectron);
    }
    return null;
  }

  /* Twelve 30-degree bonding directions, plus their gap midpoints. Reserve
   * both marks of each pair, with enough clearance for the electron glyph. */
  function atomSectorAngles(state, atom) {
    const neighbours = state.atoms.filter((other) => other.id !== atom.id);
    const radius = shellRadius(atom),
      clearance = 6;
    return Array.from({ length: 24 }, (_, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI) / 12;
      const marks = [-PAIR_HALF_ANGLE, PAIR_HALF_ANGLE].map((offset) => ({
        x: atom.x + radius * Math.cos(angle + offset),
        y: atom.y + radius * Math.sin(angle + offset),
      }));
      const space = Math.min(
        ...marks.flatMap((p) => neighbours.map((other) => distance(p, other) - shellRadius(other))),
      );
      return { angle, index, space };
    }).filter((candidate) => candidate.space >= clearance - EPSILON);
  }

  // Terminal octets use a 2D drawing convention: the bond axis occupies one
  // direction, including when two shared pairs form a double bond.
  function terminalPairSectors(state, atom, count) {
    const bonds = bondPairs(state).filter((ids) => ids.includes(atom.id));
    if (bonds.length !== 1) return null;
    const ids = bonds[0],
      other = atomById(
        state,
        ids.find((id) => id !== atom.id),
      );
    if (!other || distance(atom, other) < EPSILON) return null;
    const slots = state.electrons
      .filter(
        (e) => e.anchor?.kind === 'bond' && pairKey(e.anchor.a, e.anchor.b) === pairKey(...ids),
      )
      .map((e) => e.anchor.slot)
      .sort((a, b) => a - b);
    const complete = (n) => slots.length === n && slots.every((slot, i) => slot === i);
    const offsets =
      count === 3 && complete(2) ? [90, 180, 270] : count === 2 && complete(4) ? [120, 240] : null;
    if (!offsets) return null;
    const radius = shellRadius(atom),
      neighbours = state.atoms.filter((a) => a.id !== atom.id);
    const sectors = offsets.map((degrees) => ({
      angle: vectorAngle(atom, other) + (degrees * Math.PI) / 180,
    }));
    return sectors.every((sector) =>
      [-PAIR_HALF_ANGLE, PAIR_HALF_ANGLE].every((offset) => {
        const p = {
          x: atom.x + radius * Math.cos(sector.angle + offset),
          y: atom.y + radius * Math.sin(sector.angle + offset),
        };
        return neighbours.every(
          (neighbour) => distance(p, neighbour) - shellRadius(neighbour) >= 6 - EPSILON,
        );
      }),
    )
      ? sectors
      : null;
  }

  function atomSectorForSlot(state, atom, slot) {
    const candidates = atomSectorAngles(state, atom);
    const group = Math.floor(slot / 2);
    const occupiedGroups = new Set(
      state.electrons
        .filter((e) => e.anchor && e.anchor.kind === 'atom' && e.anchor.atomId === atom.id)
        .map((e) => Math.floor(e.anchor.slot / 2)),
    );
    occupiedGroups.add(group);
    const ordered = [...occupiedGroups].sort((a, b) => a - b);
    const preferred = terminalPairSectors(state, atom, ordered.length);
    if (preferred) return preferred[ordered.indexOf(group)];
    // Search combinations rather than greedily consuming a gap another pair needs.
    function fit(chosen) {
      if (chosen.length === ordered.length) return chosen;
      const available = candidates.filter((c) =>
        chosen.every((p) => angleDifference(c.angle, p.angle) >= (40 * Math.PI) / 180 - EPSILON),
      );
      available.sort((a, b) => {
        const separation = (c) => Math.min(...chosen.map((p) => angleDifference(c.angle, p.angle)));
        return (
          (chosen.length ? separation(b) - separation(a) : 0) ||
          (Number.isFinite(a.space) && Number.isFinite(b.space) ? b.space - a.space : 0) ||
          a.index - b.index
        );
      });
      for (const candidate of available) {
        const result = fit([...chosen, candidate]);
        if (result) return result;
      }
      return null;
    }
    return fit([])?.[ordered.indexOf(group)] || null;
  }

  function atomPoint(state, anchor) {
    const atom = atomById(state, anchor.atomId);
    if (!atom) return null;
    const sector = atomSectorForSlot(state, atom, anchor.slot);
    if (!sector) return null;
    const theta = sector.angle + (anchor.slot % 2 ? PAIR_HALF_ANGLE : -PAIR_HALF_ANGLE);
    const radius = shellRadius(atom);
    return {
      x: atom.x + radius * Math.cos(theta),
      y: atom.y + radius * Math.sin(theta),
    };
  }

  function overlapCenter(state, aId, bId) {
    const a = typeof aId === 'object' ? aId : atomById(state, aId);
    const b = typeof bId === 'object' ? bId : atomById(state, bId);
    if (!a || !b) return null;
    const d = distance(a, b);
    if (d < EPSILON) return { x: a.x, y: a.y };
    const t = (d + shellRadius(a) - shellRadius(b)) / 2;
    return { x: a.x + ((b.x - a.x) * t) / d, y: a.y + ((b.y - a.y) * t) / d };
  }

  function bondPoint(state, anchor) {
    const ids = pairIds(anchor.a, anchor.b);
    const a = atomById(state, ids[0]),
      b = atomById(state, ids[1]);
    if (!a || !b) return null;
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const ra = shellRadius(a),
      rb = shellRadius(b);
    const ux = (b.x - a.x) / d,
      uy = (b.y - a.y) / d;
    const center = overlapCenter(state, a, b);
    const t = (d + ra - rb) / 2;
    const roomA = Math.sqrt(Math.max(0, ra * ra - t * t));
    const roomB = Math.sqrt(Math.max(0, rb * rb - (d - t) * (d - t)));
    const room = Math.min(roomA, roomB);
    // Shared pairs stack across the bond through the actual overlap centre.
    // The stack is kept within 75% of the narrower lens height for legibility.
    const electrons = state.electrons.filter(
      (e) =>
        e.anchor &&
        e.anchor.kind === 'bond' &&
        pairKey(e.anchor.a, e.anchor.b) === pairKey(anchor.a, anchor.b),
    );
    const maxSlot = Math.max(anchor.slot, ...electrons.map((e) => e.anchor.slot));
    const pairCount = Math.max(1, Math.ceil((maxSlot + 1) / 2));
    const extent = (pairCount - 1) * 11 + 5;
    const scale = d < ra + rb && extent ? Math.min(1, (room * 0.75) / extent) : 1;
    const across =
      ((Math.floor(anchor.slot / 2) - (pairCount - 1) / 2) * 22 + (anchor.slot % 2 ? 5 : -5)) *
      scale;
    return { x: center.x - uy * across, y: center.y + ux * across };
  }

  function point(state, anchor) {
    if (!anchor) return null;
    return anchor.kind === 'atom' ? atomPoint(state, anchor) : bondPoint(state, anchor);
  }

  function targets(state, selected = [], pair = [], excludeElectron) {
    const occupied = occupiedKeys(state, excludeElectron),
      anchors = [];
    const atoms =
      selected.length === 1 ? state.atoms.filter((a) => selected.includes(a.id)) : state.atoms;
    atoms.forEach((a) => {
      for (let slot = 0; slot < 8; slot++) anchors.push({ kind: 'atom', atomId: a.id, slot });
    });
    const pairs = nearbyPairs(state);
    const chosen = pair?.length === 2 ? pair : selected.length === 2 ? selected : null;
    if (chosen && !pairs.some((p) => p.includes(chosen[0]) && p.includes(chosen[1])))
      pairs.push(pairIds(chosen[0], chosen[1]));
    pairs.forEach((ids) => {
      for (let slot = 0; slot < 6; slot++)
        anchors.push({ kind: 'bond', a: ids[0], b: ids[1], slot });
    });
    return anchors
      .filter((anchor) => !occupied.has(key(anchor)))
      .map((anchor) => ({ ...point(state, anchor), anchor }))
      .filter((item) => item.x != null && item.y != null);
  }

  function chargeText(n) {
    return n === 0 ? '' : `${Math.abs(n) === 1 ? '' : Math.abs(n)}${n > 0 ? '+' : '\u2212'}`;
  }

  function groupBounds(state, atomIds) {
    const atoms = state.atoms.filter((a) => atomIds.includes(a.id));
    if (!atoms.length) return null;
    return {
      x: Math.min(...atoms.map((a) => a.x - shellRadius(a) - 11)),
      y: Math.min(...atoms.map((a) => a.y - shellRadius(a) - 11)),
      right: Math.max(...atoms.map((a) => a.x + shellRadius(a) + 11)),
      bottom: Math.max(...atoms.map((a) => a.y + shellRadius(a) + 11)),
    };
  }

  // Original renderer.js lensPath: transparent shared-region hit geometry.
  function lensPath(a, b) {
    const d = distance(a, b),
      ra = shellRadius(a),
      rb = shellRadius(b);
    if (d > ra + rb + EPSILON) return '';
    if (d < EPSILON || d <= Math.abs(ra - rb) + EPSILON) {
      const center = ra <= rb ? a : b,
        radius = Math.min(ra, rb);
      return `M${center.x - radius} ${center.y}A${radius} ${radius} 0 1 0 ${center.x + radius} ${center.y}A${radius} ${radius} 0 1 0 ${center.x - radius} ${center.y}Z`;
    }
    const ux = (b.x - a.x) / d,
      uy = (b.y - a.y) / d;
    const t = (d * d + ra * ra - rb * rb) / (2 * d),
      h = Math.sqrt(Math.max(0, ra * ra - t * t));
    const base = { x: a.x + ux * t, y: a.y + uy * t };
    const p1 = { x: base.x - uy * h, y: base.y + ux * h },
      p2 = { x: base.x + uy * h, y: base.y - ux * h };
    return `M${p1.x} ${p1.y}A${ra} ${ra} 0 ${t < 0 ? 1 : 0} 0 ${p2.x} ${p2.y}A${rb} ${rb} 0 ${d - t < 0 ? 1 : 0} 0 ${p1.x} ${p1.y}Z`;
  }

  return {
    point,
    targets,
    key,
    bondPairs,
    nearbyPairs,
    chargeText,
    angles,
    regionAt,
    freeAnchor,
    overlapCenter,
    shellRadius,
    bondDistance,
    groupBounds,
    lensPath,
    regionData,
    regionKey,
  };
}
