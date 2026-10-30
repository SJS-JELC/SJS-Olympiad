// Private L6P8 key; numeric semantics match the original frontend definition.
export function mark(answer) {
  const text = answer.trim();
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text) && Number(text) === 0.437;
}
