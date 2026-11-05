import { presentationCatalogue, presentationRecord } from './registry.mjs';
import { validateRecord } from './record.mjs';
for(const kind of ['question','practical'])for(const item of presentationCatalogue(kind))validateRecord(presentationRecord(kind,item.id));
console.log('Protected presentation registry validated.');
