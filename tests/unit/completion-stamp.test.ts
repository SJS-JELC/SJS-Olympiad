import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {CompletionStamp,completionTime} from '../../src/components/CompletionStamp';

describe('authoritative completion stamp presentation',()=>{
 it.each([
  ['2026-12-09T17:31:42Z','17:31:42'],
  ['2026-07-15T12:03:04Z','13:03:04'],
  ['2026-10-25T00:30:05Z','01:30:05'],
  ['2026-10-25T01:30:05Z','01:30:05'],
 ])('formats %s in Europe/London independently of viewing time',(instant,expected)=>expect(completionTime(Date.parse(instant))).toBe(expected));
 it('has no interactive controls and labels teacher completion as unscored',()=>{
  const solvedAt=Date.parse('2026-12-09T17:31:42Z'),markup=renderToStaticMarkup(createElement(CompletionStamp,{solvedAt,preview:true}));
  expect(markup).toContain('Complete at 17:31:42 Europe/London');expect(markup).toContain('teacher preview (unscored)');expect(markup).toContain('data-animated="false"');expect(markup).toContain(String(solvedAt));expect(markup).not.toMatch(/<(button|input|a|mask|pattern)\b/);expect(markup).not.toContain('feGaussianBlur');expect(markup).toContain('fill="#ef202b"');expect(markup).toContain('fill="none"');
 });
});
