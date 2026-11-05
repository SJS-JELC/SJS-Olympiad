"""Derive LOCKED from the default vector master, preserving its frame geometry."""
from pathlib import Path

folder = Path(__file__).resolve().parent.parent / 'src/assets/selector'
art = (folder / 'lock-in-hazard.svg').read_text(encoding='utf-8')
art = art.replace('<title id="title">Lock in</title>', '<title id="title">Locked</title>')
art = art.replace('M4 13V7C4-19 40-19 40 7V27H30V7C30-6 14-6 14 7V13Z',
                  'M4 27V17C4-9 40-9 40 17V27H30V17C30 4 14 4 14 17V27Z')
for original, replacement in {
    '#505a72': '#ffd177', '#363e54': '#ff9c2b', '#262e43': '#dc650e',
    '#ffffff': '#555b65', '#e6e8f0': '#343a44',
    '#6d7894': '#ffc250', '#9ba5ba': '#fff0b8',
    '#202035': '#30333c', '#1b1630': '#30333c',
}.items():
    art = art.replace(original, replacement)
art = art.replace('<path d="M218 0H230V54H218Z"/>',
                  '<path d="M205 0H243V12H217V21H239V32H217V42H243V54H205Z"/>')
art = art.replace('<path d="M241 0H253L274 32V0H286V54H274L253 22V54H241Z"/>',
                  '<path fill-rule="evenodd" d="M252 0H279L294 14V40L279 54H252ZM264 12V42H275L282 35V19L275 12Z"/>')
art = art.replace('<!-- Recessed graphite face. -->', '''<!-- Warm illuminated face; frame geometry remains unchanged. -->
<path d="M122 55H598L624 80V151L598 178H122L96 151V80Z" fill="none" stroke="#ffb52b" stroke-width="10" filter="url(#amber)"/>''')
(folder / 'lock-in-hazard-locked.svg').write_text(art, encoding='utf-8')
