import type { QuestionViewProps } from '../catalog';
import { GroupingQuestion } from '../l5p9/GroupingQuestion';
import { l5p9, l5p9Items } from './definition';
import zno2 from './assets/ZnO2.svg';
import tio2 from './assets/TiO2.svg';
import fe3o4 from './assets/Fe3O4.svg';
import mgo2 from './assets/MgO2.svg';
import al2o3 from './assets/Al2O3.svg';
import v6o13 from './assets/V6O13.svg';
import na2o2 from './assets/Na2O2.svg';
import mgo from './assets/MgO.svg';
import ti4o7 from './assets/Ti4O7.svg';

const media = [zno2, tio2, fe3o4, mgo2, al2o3, v6o13, na2o2, mgo, ti4o7];
const labels = ["ZnO₂","TiO₂","Fe₃O₄","MgO₂","Al₂O₃","V₆O₁₃","Na₂O₂","MgO","Ti₄O₇"];
const items = l5p9Items.map((id, index) => ({ id, label: labels[index], image: media[index] }));

export function L5Problem9(props: QuestionViewProps) {
  return <GroupingQuestion {...props} definition={l5p9} items={items}
    wording="These oxides can be sorted into three groups of three. Find the groups." />;
}
