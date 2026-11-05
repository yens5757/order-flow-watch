// The worked example under "What “above the fair price” means": one trade drawn on the site's neutral scale (DESIGN.md,
// The Price Scale) in place of brokers: the best price to sell and to buy at the ends, the fair price as the tick halfway,
// your buy as the ink dot, and the stretch from the fair price to the dot drawn darker, as the part you paid. The figures
// are an illustration, not data. Drawn in CSS (method.css); the caption says the same in words for screen readers.

export function Spread() {
  return (
    <figure className="mx-sp">
      <div aria-hidden="true">
        <div className="mx-sp-rail">
          <span className="mx-sp-track" />
          <span className="mx-sp-paid" />
          <span className="mx-sp-end" />
          <span className="mx-sp-end r" />
          <span className="mx-sp-fair" />
          <b className="mx-sp-you-l">You buy at $100.01</b>
          <span className="mx-sp-you" />
        </div>
        <div className="mx-sp-mid"><span className="mx-sp-fair-l">Fair price <b>$100.00</b></span></div>
        <div className="mx-sp-ends">
          <p className="mx-sp-lab"><small>Best price to sell</small>$99.97</p>
          <p className="mx-sp-lab r"><small>Best price to buy</small>$100.03</p>
        </div>
      </div>
      <figcaption className="sr-only">
        An example: the best price to sell is $99.97 and the best price to buy is $100.03, so the fair price is $100.00. You
        buy at $100.01, one cent above it.
      </figcaption>
    </figure>
  );
}
