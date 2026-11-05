export function SkeletalHelp() {
  return <details className="pilot-instructions">
    <summary className="type-body"><span>What on earth is a skeletal formula?</span><svg className="pilot-help-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2"/></svg></summary>
    <div className="pilot-skeletal-help type-body">
      <p>A skeletal formula shows the bonds as lines. Each unlabelled line end or corner is a carbon atom. We leave out the C labels and the hydrogens attached to carbon: imagine enough hydrogens to give each carbon four bonds. Double and triple bonds count as two and three bonds. Other atoms, such as O or N, are still labelled.</p>
      <div className="pilot-skeletal-examples">
        <figure><figcaption>Butane · C₄H₁₀</figcaption><p>CH₃–CH₂–CH₂–CH₃</p>
          <svg viewBox="0 0 160 64" role="img" aria-label="Butane skeletal formula: a three-bond zigzag with four carbon atoms, one at each end and corner."><path d="M20 46 60 22 100 46 140 22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <p>Three lines, four carbons. The end carbons each have three hydrogens; the two middle carbons each have two.</p>
        </figure>
        <figure><figcaption>Cyclohexane · C₆H₁₂</figcaption><p>A ring of six CH₂ groups</p>
          <svg viewBox="0 0 160 64" role="img" aria-label="Cyclohexane skeletal formula: a hexagon with a carbon at each of its six corners."><path d="M80 5 103.4 18.5 103.4 45.5 80 59 56.6 45.5 56.6 18.5Z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/></svg>
          <p>Six corners, six carbons. Each carbon has two bonds to neighbouring carbons, so it also has two hydrogens.</p>
        </figure>
      </div>
      <p>Why use them? Leaving out repeated C and H labels makes rings, branches and bonds easier to see. Instead of drawing every atom, a few lines show the structure clearly—especially useful for larger, more complicated molecules.</p>
    </div>
  </details>;
}
