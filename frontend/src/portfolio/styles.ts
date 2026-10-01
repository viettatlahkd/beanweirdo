/**
 * CSS for every Portfolio component, scoped under the `.pf` root.
 *
 * The root is a container: fluid sizes are measured against its width (`cqw`),
 * so the preview sitting in half of the admin screen renders exactly like the
 * full-width public page. The CSS variables are set on the root by `cssVars`
 * (tokens.ts).
 */
export const PF_CSS = `
.pf{container-type:inline-size;background:var(--paper);color:var(--ink);font:var(--t-body);-webkit-font-smoothing:antialiased;min-height:100%}
.pf *{box-sizing:border-box;margin:0;padding:0}
.pf a{color:inherit;text-decoration:none}
.pf button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;text-align:left}
.pf .mk{background:linear-gradient(transparent 55%,var(--mark) 55%) no-repeat 0 0/0 100%;transition:background-size .28s ease;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.pf a:hover .mk,.pf button:hover .mk{background-size:100% 100%}

.pf .d1{font:var(--t-d1);letter-spacing:var(--tr-d1)}
.pf .d2{font:var(--t-d2);letter-spacing:var(--tr-d2)}
.pf .head{font:var(--t-head);letter-spacing:var(--tr-head)}
.pf .title{font:var(--t-title);letter-spacing:var(--tr-title);max-width:30ch}
.pf .body{font:var(--t-body);max-width:52ch}
.pf .read{font:var(--t-read);max-width:62ch}
.pf .lbl{font:var(--t-label);letter-spacing:var(--tr-label)}
.pf .meta{font:var(--t-meta);letter-spacing:var(--tr-meta);color:var(--ink-3)}
.pf .tag{display:inline-block;font:var(--t-label);border:1px solid var(--acc-700);color:var(--acc-700);padding:3px 10px 4px;border-radius:var(--r-1)}

.pf .ph{position:relative;background:var(--ph);width:100%;border-radius:var(--r-2);overflow:hidden}
.pf .ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}

.pf .rg{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,3fr);column-gap:var(--col-gap);padding:0 var(--gut)}
.pf .rg>.rail{grid-column:1}.pf .rg>.main{grid-column:2}
.pf .rail .lbl{color:var(--acc-700)}
.pf .sec{padding-bottom:var(--s-6)}

.pf .topbar{display:grid;grid-template-columns:1fr auto;align-items:center;gap:var(--s-4);padding:var(--s-3) var(--gut);font:var(--t-label)}
.pf .topbar .brand{font:400 21px/1 var(--f-display)}
.pf .topbar .r{text-align:right;color:var(--ink-2)}
.pf .footer{display:flex;justify-content:space-between;padding:var(--s-5) var(--gut) var(--s-3);font:var(--t-label);color:var(--ink-2)}

.pf .hero{padding-top:var(--s-7);padding-bottom:var(--s-6);align-items:end}
.pf .hero .body{margin-top:var(--s-4);color:var(--ink-2)}

.pf .card{display:flex;flex-direction:column;gap:var(--s-2);text-align:left}
.pf .card .ph{aspect-ratio:1.618}
.pf .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--s-5) var(--card-gap)}
.pf .cards.two{grid-template-columns:repeat(2,1fr)}
.pf .row-head{display:flex;justify-content:space-between;align-items:end;margin-bottom:var(--s-4)}
.pf .slider{display:flex;gap:var(--card-gap);overflow-x:auto;scroll-snap-type:x mandatory;padding-left:var(--gut);scrollbar-width:none}
.pf .slider::-webkit-scrollbar{display:none}
.pf .slider>*{flex:0 0 clamp(220px,24cqw,340px);scroll-snap-align:start}
.pf .slider>*:last-child{margin-right:var(--gut)}
.pf .arrow{width:34px;height:34px;border:1px solid var(--ink);font-size:15px;border-radius:var(--r-1);text-align:center}
.pf .arrow:hover{background:var(--mark)}
.pf .marquee{overflow:hidden;padding-left:var(--gut)}
.pf .marquee .track{display:flex;gap:var(--card-gap);width:max-content;animation:pf-mq 70s linear infinite}
.pf .marquee.rev .track{animation-direction:reverse}
.pf .marquee:hover .track{animation-play-state:paused}
.pf .marquee .track>*{flex:0 0 clamp(220px,24cqw,340px)}
@keyframes pf-mq{from{transform:translateX(0)}to{transform:translateX(calc(-50% - var(--card-gap)/2))}}
@media(prefers-reduced-motion:reduce){.pf .marquee{overflow-x:auto}.pf .marquee .track{animation:none}}

.pf .series{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,8fr);gap:var(--s-5);align-items:start}
.pf .series .tag,.pf .story .tag{margin-bottom:var(--s-4)}
.pf .series ol{list-style:none;display:flex;flex-direction:column;gap:var(--s-3)}
.pf .series ol li>*{display:grid;grid-template-columns:34px 1fr;width:100%}
.pf .series ol .n{font:var(--t-meta);color:var(--ink-3);padding-top:6px}
.pf .series ol .body{display:block;color:var(--ink-2);margin-top:2px}
.pf .fib{display:grid;grid-template-columns:repeat(13,minmax(0,1fr));grid-template-rows:repeat(8,minmax(0,1fr));aspect-ratio:13/8;width:100%}
.pf .fib.tall{grid-template-columns:repeat(8,minmax(0,1fr));grid-template-rows:repeat(13,minmax(0,1fr));aspect-ratio:8/13}
.pf .fib>*{position:relative;min-width:0;min-height:0}
.pf .fib .ph{position:absolute;inset:4px;width:auto}
.pf .fib>*:hover .ph{outline:2px solid var(--mark);outline-offset:3px}

.pf .story{display:grid;grid-template-columns:minmax(0,8fr) minmax(0,5fr);gap:var(--s-5);align-items:start}
.pf .story.flip{grid-template-columns:minmax(0,5fr) minmax(0,8fr)}
.pf .story.flip>.fib-wrap{order:-1}
.pf .story .head{max-width:22ch}
.pf .story .read{margin-top:var(--s-4);color:var(--ink-2)}
.pf .story .read p+p{margin-top:1em}
.pf .story .go{display:flex;align-items:baseline;gap:var(--s-3);margin-top:var(--s-5);font:var(--t-label)}

.pf .links{display:flex;flex-wrap:wrap;gap:var(--s-4) var(--s-5)}
.pf .links .lbl{display:block;color:var(--acc-700);margin-bottom:var(--s-2)}
.pf .links ul{list-style:none;font:300 var(--sz-read,15px)/1.65 var(--f-display)}
.pf .about-block{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,8fr);gap:var(--s-5);align-items:end}
.pf .about-block .intro>.lbl{display:block;margin-bottom:var(--s-3);color:var(--acc-700)}
.pf .about-block .head{max-width:24ch}
.pf .about-block .body{margin-top:var(--s-3);color:var(--ink-2)}
.pf .about-block .links{margin-top:var(--s-5)}
.pf .about-block>.ph{aspect-ratio:1;width:calc(100% * 8 / 13 - 8px);margin:4px;justify-self:end}

.pf .over{position:absolute;inset:var(--s-4) var(--s-4) auto;display:flex;flex-direction:column;pointer-events:none;color:#fefdfb;text-shadow:0 1px 12px rgba(0,0,0,.3)}
.pf .over p{font:300 clamp(18px,2.2cqw,26px)/1.45 var(--f-display);max-width:30ch}
.pf .scrim .ph::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(29,29,27,.42),rgba(29,29,27,0) 55%);pointer-events:none}

.pf .open-ab{--big:calc((100cqw - var(--gut) - var(--col-gap)*2) * 24 / 52);display:grid;grid-template-columns:minmax(0,13fr) minmax(0,24fr) minmax(0,15fr);grid-template-rows:repeat(8,calc(var(--big) / 8)) auto;column-gap:var(--col-gap);padding-right:var(--gut)}
.pf .open-ab>.d{position:relative;min-height:0}
.pf .open-ab>.d>*,.pf .open-ab>.d .ph{display:block;height:100%}
.pf .open-ab .d-rail{grid-column:1;grid-row:1/6}
.pf .open-ab .d-rail .ph{border-top-left-radius:0;border-bottom-left-radius:0}
.pf .open-ab .d-big{grid-column:2;grid-row:1/9}
.pf .open-ab .d-last{grid-column:3;grid-row:1/9}
.pf .open-ab.fibh .d-last{grid-row:6/9}
.pf .open-ab figcaption,.pf .open-c figcaption{font:300 var(--t-title-size,21px)/1.2 var(--f-display);padding-top:var(--s-2)}
.pf .open-ab figcaption .meta,.pf .open-c figcaption .meta{display:block;margin-top:4px}
.pf .open-ab .c-rail{grid-column:1;grid-row:6;padding-left:var(--gut)}
.pf .open-ab .c-big{grid-column:2;grid-row:9}
.pf .open-ab .c-last{grid-column:3;grid-row:9}
.pf .open-c{--big:calc((100cqw - var(--gut) - var(--col-gap)*2) * 24 / 52);display:grid;grid-template-columns:1fr 1fr;gap:var(--col-gap);padding-right:var(--gut)}
.pf .open-c figure{position:relative;display:flex;flex-direction:column;min-width:0}
.pf .open-c .ph{height:var(--big)}
.pf .open-c figure:first-child .ph{border-top-left-radius:0;border-bottom-left-radius:0}
.pf .open-c figure:first-child figcaption{padding-left:var(--gut)}
.pf .open-c figure:first-child .over{left:var(--gut)}

.pf-pop{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;background:rgba(29,29,27,.35);padding:13px}
.pf-pop .summary{position:relative;width:min(760px,100%);background:var(--paper);border:1px solid var(--line);border-radius:var(--r-2);display:grid;grid-template-columns:minmax(0,5fr) minmax(0,8fr);gap:var(--s-5);padding:var(--s-5);color:var(--ink);font:var(--t-body)}
.pf-pop .summary>.ph{aspect-ratio:5/8}
.pf-pop .txt{display:flex;flex-direction:column;gap:var(--s-3);min-width:0}
.pf-pop .txt>.lbl{color:var(--acc-700)}
.pf-pop .read{color:var(--ink-2)}
.pf-pop .foot{display:flex;justify-content:flex-end;margin-top:auto;padding-top:var(--s-3)}
.pf-pop .close{position:absolute;right:var(--s-2);top:2px;color:var(--ink-3);font-size:18px}

@container (max-width:760px){
  .pf .rg{grid-template-columns:1fr}.pf .rg>.rail,.pf .rg>.main{grid-column:1}.pf .rg>.rail{margin-bottom:var(--s-3)}
  .pf .cards,.pf .cards.two{grid-template-columns:repeat(2,1fr)}
  .pf .series,.pf .story,.pf .story.flip,.pf .about-block{grid-template-columns:1fr}
  .pf .story>.fib-wrap{order:-1;max-width:62%}
  .pf .about-block>.ph{width:100%;aspect-ratio:1.618}
  .pf .open-ab{--big:calc((100cqw - var(--gut) - var(--col-gap)) * 3 / 5);grid-template-columns:minmax(0,2fr) minmax(0,3fr)}
  .pf .open-ab .d-last,.pf .open-ab .c-last,.pf .open-ab .c-rail{display:none}
  .pf .open-c{--big:calc((100cqw - var(--gut) - var(--col-gap)) / 2)}
  .pf .over p{display:none}
}
`
