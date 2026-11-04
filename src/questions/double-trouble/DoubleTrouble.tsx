import type { QuestionViewProps } from '../catalog';
import { GroupingQuestion } from '../l5p9/GroupingQuestion';
import { doubleTrouble, doubleTroubleItems } from './definition';

const subscripts = '₀₁₂₃₄₅₆₇₈₉';
const items = doubleTroubleItems.map(id => ({ id, label: id.replace(/\d/g, digit => subscripts[Number(digit)]) }));
export function DoubleTrouble(props: QuestionViewProps) {
  return <GroupingQuestion {...props} definition={doubleTrouble} items={items}
    wording="These organic molecules can be sorted into three groups of three. Find the groups." />;
}
