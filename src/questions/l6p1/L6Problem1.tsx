import type { QuestionViewProps } from '../catalog';
import { GroupingQuestion } from '../l5p9/GroupingQuestion';
import { l6p1, l6p1Items } from './definition';
import ta from './assets/Ta.svg';
import s from './assets/S.svg';
import as from './assets/As.svg';
import cu from './assets/Cu.svg';
import v from './assets/V.svg';
import zr from './assets/Zr.svg';
import f from './assets/F.svg';
import th from './assets/Th.svg';
import na from './assets/Na.svg';

const media = [ta, s, as, cu, v, zr, f, th, na];
const labels = ["Ta","S","As","Cu","V","Zr","F","Th","Na"];
const items = l6p1Items.map((id, index) => ({ id, label: labels[index], image: media[index], presentation: 'element' as const }));

export function L6Problem1(props: QuestionViewProps) {
  return <GroupingQuestion {...props} definition={l6p1} items={items}
    wording="The following elements can be sorted into three groups of three. Find the groups." />;
}
