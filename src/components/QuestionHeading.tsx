import './QuestionHeading.css';

/** Shared body-family title treatment for question screens. */
export function QuestionHeading({ title, number, year }: { title: string; number?: number; year?: string }) {
  return <h1 className="olympiad-question-heading type-heading">
    {number !== undefined && <span className="olympiad-question-heading__number type-label">{year && year + ' · '}Problem {number}</span>}
    <span className="olympiad-question-heading__title">{title.toLocaleUpperCase('en-GB')}</span>
  </h1>;
}
