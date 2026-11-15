// Development only: phone hero design lab. Home.tsx shows <HeroLab n="…" /> over the hero video when the page is opened
// with ?mlab=<n> in development (npm run dev); it is left out of the production build. Used to record the options
// for the client (hero-designs/recorder). Each design is CSS + light elements over the video, no masks.
// Built from hero-designs/HeroLab.src.tsx by hero-designs/build_lab.py (which puts the "minto" Pacifico outline in).
import { useEffect } from 'react';
import { BrandName, LOGO_DARK } from './Shell';

const PACIFICO = { box: [12.5, -218.2, 616.0, 1.2], d: 'M12.5 -40.8Q12.5 -73.2 21.8 -102.5Q24 -109.8 29.1 -113.1Q34.2 -116.5 43.5 -116.5Q48.5 -116.5 50.5 -115.2Q52.5 -114 52.5 -110.5Q52.5 -106.5 48.8 -92.5Q46.2 -82.5 44.8 -75.1Q43.2 -67.8 42.2 -56.8Q49 -76.2 58.4 -89.8Q67.8 -103.2 77.6 -109.9Q87.5 -116.5 96.2 -116.5Q105 -116.5 108.6 -112.5Q112.2 -108.5 112.2 -100.2Q112.2 -92.2 107.5 -71.2Q105.5 -62.2 104.8 -57.8Q117.2 -88.5 132.5 -102.5Q147.8 -116.5 161 -116.5Q177.2 -116.5 177.2 -100.2Q177.2 -90.5 171.8 -65Q167 -43.2 167 -36.2Q167 -26.2 174.2 -26.2Q179.2 -26.2 186.1 -32.4Q193 -38.5 204.5 -52.2Q207.5 -55.8 211.2 -55.8Q214.5 -55.8 216.4 -52.8Q218.2 -49.8 218.2 -44.5Q218.2 -34.5 213.5 -29Q202.8 -15.8 190.4 -7.2Q178 1.2 162.2 1.2Q149.5 1.2 143 -6.1Q136.5 -13.5 136.5 -27.5Q136.5 -34.5 140 -52.5Q143.2 -68.2 143.2 -74.2Q143.2 -78.2 140.5 -78.2Q137.2 -78.2 131.2 -69.9Q125.2 -61.5 119.2 -47.8Q113.2 -34 109.5 -18.8Q106.8 -6.8 103.1 -2.8Q99.5 1.2 91.5 1.2Q83.2 1.2 79.1 -6.6Q75 -14.5 75 -25.8Q75 -35.2 77.5 -53.2Q79.5 -69.2 79.5 -74.2Q79.5 -78.2 76.8 -78.2Q73 -78.2 67.2 -69.2Q61.5 -60.2 56.1 -46.2Q50.8 -32.2 47.5 -18.8Q44.8 -7 41.1 -2.9Q37.5 1.2 29.8 1.2Q20.2 1.2 16.4 -8.8Q12.5 -18.8 12.5 -40.8Z M209.8 -151.5Q209.8 -160.2 216.6 -166.1Q223.5 -172 233.8 -172Q243 -172 248.8 -167.5Q254.5 -163 254.5 -154.8Q254.5 -144.8 248 -138.9Q241.5 -133 230.8 -133Q220.2 -133 215 -137.9Q209.8 -142.8 209.8 -151.5ZM197.8 -40.8Q197.8 -52 200.6 -69.6Q203.5 -87.2 208 -102.5Q210.2 -110.5 214 -113.5Q217.8 -116.5 226 -116.5Q238.8 -116.5 238.8 -108Q238.8 -101.8 234 -79Q228 -51.5 228 -41.8Q228 -34.2 230 -30.2Q232 -26.2 236.8 -26.2Q241.2 -26.2 248 -32.5Q254.8 -38.8 266 -52.2Q269 -55.8 272.8 -55.8Q276 -55.8 277.9 -52.8Q279.8 -49.8 279.8 -44.5Q279.8 -34.5 275 -29Q250.2 1.2 228.8 1.2Q212.5 1.2 205.1 -10.2Q197.8 -21.8 197.8 -40.8Z M260 -40.8Q260 -73.2 269.2 -102.5Q271.5 -109.8 276.6 -113.1Q281.8 -116.5 291 -116.5Q296 -116.5 298 -115.2Q300 -114 300 -110.5Q300 -106.5 296.2 -92.5Q293.8 -82.5 292.2 -75Q290.8 -67.5 289.8 -56.5Q298 -78 308.2 -91.5Q318.5 -105 328.4 -110.8Q338.2 -116.5 346.5 -116.5Q362.8 -116.5 362.8 -100.2Q362.8 -90.5 357.2 -65Q352.5 -43.2 352.5 -36.2Q352.5 -26.2 359.8 -26.2Q364.8 -26.2 371.6 -32.4Q378.5 -38.5 390 -52.2Q393 -55.8 396.8 -55.8Q400 -55.8 401.9 -52.8Q403.8 -49.8 403.8 -44.5Q403.8 -34.5 399 -29Q388.2 -15.8 375.9 -7.2Q363.5 1.2 347.8 1.2Q335 1.2 328.5 -6.1Q322 -13.5 322 -27.5Q322 -34.5 325.5 -52.5Q328.8 -68.2 328.8 -74.2Q328.8 -78.2 326 -78.2Q322.8 -78.2 316.9 -69.9Q311 -61.5 304.9 -47.8Q298.8 -34 295 -18.8Q292.2 -7 288.6 -2.9Q285 1.2 277.2 1.2Q267.8 1.2 263.9 -8.8Q260 -18.8 260 -40.8Z M502 -44.5Q502 -34.5 497.2 -29Q486.5 -15.8 473.8 -7.2Q461 1.2 444.5 1.2Q393.5 1.2 393.5 -70.5Q393.5 -81.5 394.2 -92.8H384.5Q377 -92.8 374.4 -95.5Q371.8 -98.2 371.8 -104.2Q371.8 -118.2 383 -118.2H397.2Q401.5 -145.8 410.2 -168.5Q419 -191.2 431.4 -204.8Q443.8 -218.2 458 -218.2Q468.5 -218.2 474.5 -209Q480.5 -199.8 480.5 -185.8Q480.5 -147 448 -118.2H476Q480 -118.2 481.8 -116.5Q483.5 -114.8 483.5 -110Q483.5 -92.8 455.2 -92.8H424.8Q424.2 -80.2 424.2 -73.2Q424.2 -47.2 430.4 -36.8Q436.5 -26.2 449.8 -26.2Q460.5 -26.2 468.8 -32.8Q477 -39.2 488.2 -52.2Q491.2 -55.8 495 -55.8Q498.2 -55.8 500.1 -52.8Q502 -49.8 502 -44.5ZM427.2 -122Q442 -134.8 449.4 -150.6Q456.8 -166.5 456.8 -179.5Q456.8 -194.2 451.2 -194.2Q447.5 -194.2 442.9 -184.9Q438.2 -175.5 434.1 -158.9Q430 -142.2 427.2 -122Z M616 -65.2Q616 -53.2 608.8 -51Q593.8 -45.8 575.8 -45Q571 -24 557 -11.4Q543 1.2 525.2 1.2Q510.2 1.2 499.6 -6Q489 -13.2 483.5 -25.2Q478 -37.2 478 -51.2Q478 -70.2 485.2 -85.1Q492.5 -100 505.2 -108.4Q518 -116.8 533.5 -116.8Q552.5 -116.8 564.1 -103.6Q575.8 -90.5 577.8 -71.2Q589.5 -72 605.8 -76.2Q607.8 -76.8 609.2 -76.8Q612.5 -76.8 614.2 -73.5Q616 -70.2 616 -65.2ZM549 -50.5Q541.2 -55.8 537.1 -64.2Q533 -72.8 533 -82.2Q533 -86.2 533.8 -90.2H532.5Q522.5 -90.2 515.9 -80.6Q509.2 -71 509.2 -53.5Q509.2 -39.8 514.6 -32.5Q520 -25.2 527.2 -25.2Q535.2 -25.2 541.1 -31.8Q547 -38.2 549 -50.5Z' };
const OR = '#F68B1F', NAVY = '#0E1B33';

export const LAB_NAMES: Record<string, string> = {
  '1': 'Stacked letters', '2': 'Headline + logo', '3': 'Moving bands', '4': 'Written minto', '5': 'Camera frame',
  '6': 'Spinning badge', '7': 'Orange curtain', '8': 'Video pill grows', '9': 'Big words', '10': 'Word rotator',
  '11': 'Wordmark at the bottom', '12': 'Dropping letters', '13': 'Circle reveal', '14': 'Crossing tickers',
  '15': 'Offset letters', '16': 'Side text + headline', '17': 'Zoom in', '18': 'Tiles reveal', '19': 'Glowing minto',
  '20': 'Numbers',
};

const CSS = `
.mm-hero.lab .mm-hero-vid{object-fit:cover}
.mm-hero.lab .mm-hero-fill{display:none}
.lab-ov{position:absolute;inset:0;z-index:2;overflow:hidden;pointer-events:none;font-family:'Minto Head','Minto Sans',sans-serif;color:#fff}
.lab-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(14,27,51,.15) 0%,rgba(14,27,51,0) 35%,rgba(14,27,51,.75) 100%)}
.lab-logo{position:absolute;display:flex;align-items:center;gap:10px;filter:drop-shadow(0 2px 8px rgba(0,0,0,.4))}
.lab-logo img{width:38px;height:40px;object-fit:contain}
@keyframes lab-up{from{transform:translateY(110%)}to{transform:none}}
@keyframes lab-fade{from{opacity:0}to{opacity:1}}
@keyframes lab-left{from{transform:translateX(-110%)}to{transform:none}}
@keyframes lab-spin{to{transform:rotate(360deg)}}
@keyframes lab-marq{to{transform:translateX(-50%)}}
@keyframes lab-marqR{from{transform:translateX(-50%)}to{transform:none}}
@keyframes lab-blink{50%{opacity:0}}
/* 1 stacked letters */
.lab-1 .st{position:absolute;left:18px;top:8px;line-height:.86;font-size:150px;font-weight:800}
.lab-1 .st span{display:block;color:transparent;-webkit-text-stroke:2px ${OR};animation:lab-left .8s cubic-bezier(.2,.9,.2,1) both}
.lab-1 .st span:nth-child(3){color:${OR};-webkit-text-stroke:0}
/* 2 headline + logo */
.lab-2 .hl{position:absolute;left:22px;right:22px;bottom:60px;font-size:54px;line-height:1;font-weight:800}
.lab-2 .hl .w{display:block;overflow:hidden}.lab-2 .hl .w>span{display:block;animation:lab-up .8s cubic-bezier(.2,.9,.2,1) both}
.lab-2 .hl .o{color:${OR}}
/* 3 moving bands */
.lab-3 .band{position:absolute;left:0;white-space:nowrap;font-size:96px;font-weight:800;line-height:1}
.lab-3 .band>div{display:inline-block;animation:lab-marq 9s linear infinite}
.lab-3 .b1{top:30%;color:transparent;-webkit-text-stroke:2px ${OR}}
.lab-3 .b2{top:48%;color:${OR}}.lab-3 .b2>div{animation-name:lab-marqR}
/* 4 written minto */
.lab-4 svg{position:absolute;left:6%;width:88%;top:38%;overflow:visible}
.lab-4 .word{animation:lab-wipe 1.6s cubic-bezier(.45,0,.35,1) .3s both}
@keyframes lab-wipe{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
.lab-4 .ln{position:absolute;height:3px;background:${OR};top:calc(38% + 33.5vw);transform-origin:left}
.lab-4 .l1{left:0;width:7%;animation:lab-grow .3s linear both}.lab-4 .l2{right:0;width:7%;animation:lab-grow .3s linear 1.9s both}
@keyframes lab-grow{from{transform:scaleX(0)}to{transform:none}}
/* 5 camera frame */
.lab-5 .c{position:absolute;width:46px;height:46px;border:3px solid ${OR};animation:lab-fade .5s both}
.lab-5 .tl{top:20px;left:20px;border-right:0;border-bottom:0}.lab-5 .tr{top:20px;right:20px;border-left:0;border-bottom:0}
.lab-5 .bl{bottom:20px;left:20px;border-right:0;border-top:0}.lab-5 .br{bottom:20px;right:20px;border-left:0;border-top:0}
.lab-5 .rec{position:absolute;top:32px;left:80px;font:700 15px/1 'Minto Sans',sans-serif;letter-spacing:.12em}
.lab-5 .rec i{display:inline-block;width:11px;height:11px;border-radius:50%;background:#ff3b30;margin-right:8px;animation:lab-blink 1s steps(1) infinite}
.lab-5 .tc{position:absolute;bottom:34px;left:80px;font:700 15px/1 'Minto Sans',sans-serif;letter-spacing:.12em}
.lab-5 .mid{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);text-align:center}
.lab-5 .cross{width:30px;height:30px;margin:0 auto 18px;position:relative}
.lab-5 .cross:before,.lab-5 .cross:after{content:"";position:absolute;background:#fff}
.lab-5 .tagl{font:800 13px 'Minto Sans',sans-serif;letter-spacing:.3em}
.lab-7 .ctag{font-size:48px;line-height:1.05;font-weight:800;color:${NAVY};text-align:center}
.lab-7 .ctag span{color:#fff}
.lab-5 .cross:before{left:14px;top:0;width:2px;height:30px}.lab-5 .cross:after{top:14px;left:0;height:2px;width:30px}
/* 6 spinning badge */
.lab-6 .bd{position:absolute;left:50%;top:46%;width:230px;height:230px;margin:-115px 0 0 -115px;border-radius:50%;background:rgba(14,27,51,.55);animation:lab-fade .6s both}
.lab-6 .bd svg{position:absolute;inset:0;animation:lab-spin 14s linear infinite}
.lab-6 .bd text{font:800 15px 'Minto Head',sans-serif;letter-spacing:.14em;fill:#fff}
.lab-6 .bd img{position:absolute;left:50%;top:50%;width:84px;height:88px;margin:-44px 0 0 -42px;object-fit:contain}
/* 7 orange curtain */
.lab-7 .cur{position:absolute;inset:0;background:${OR};display:flex;align-items:center;justify-content:center;animation:lab-curtain 1s cubic-bezier(.7,0,.2,1) 1.2s both}
@keyframes lab-curtain{to{transform:translateY(-100%)}}
.lab-7 .cur svg{width:78%;color:${NAVY}}
.lab-7 .after{position:absolute;left:22px;bottom:40px;animation:lab-fade .6s 2s both}
/* 8 video pill grows */
.mm-hero.lab-8{background:${OR}}
.mm-hero.lab-8 .mm-hero-vid{animation:lab-pill 1.4s cubic-bezier(.7,0,.2,1) .8s both}
@keyframes lab-pill{from{clip-path:inset(42% 22% 42% 22% round 999px)}to{clip-path:inset(0 0 0 0 round 0)}}
.lab-8 .txt{position:absolute;left:0;right:0;top:calc(42% - 110px);text-align:center;font-size:64px;font-weight:800;color:${NAVY};animation:lab-gone .4s .8s both}
@keyframes lab-gone{to{opacity:0;transform:translateY(-30px)}}
.lab-8 .lab-logo{top:22px;left:22px;animation:lab-fade .5s 2.2s both}
/* 9 big words */
.lab-9 .wd{position:absolute;left:18px;bottom:30px;font-size:78px;line-height:.92;font-weight:800}
.lab-9 .wd span{display:block;color:transparent;-webkit-text-stroke:2px #fff;animation:lab-fill 4s steps(1) infinite}
.lab-9 .wd span:nth-child(2){animation-delay:1s}.lab-9 .wd span:nth-child(3){animation-delay:2s}.lab-9 .wd span:nth-child(4){animation-delay:3s}
@keyframes lab-fill{0%{color:${OR};-webkit-text-stroke-color:${OR}}25%,100%{color:transparent;-webkit-text-stroke-color:#fff}}
/* 10 word rotator */
.lab-10 .rot{position:absolute;left:22px;right:22px;top:50%;transform:translateY(-50%);font-size:58px;font-weight:800;line-height:1.05}
.lab-10 .pill{display:inline-grid;height:1.12em;overflow:hidden;background:${OR};color:${NAVY};border-radius:22px;padding:0 .2em;margin-top:8px}
.lab-10 .pill>div{animation:lab-rot 6s cubic-bezier(.7,0,.2,1) infinite}
.lab-10 .pill span{display:block;height:1.12em;line-height:1.12em}
@keyframes lab-rot{0%,20%{transform:none}25%,45%{transform:translateY(-1.12em)}50%,70%{transform:translateY(-2.24em)}75%,95%{transform:translateY(-3.36em)}100%{transform:translateY(-4.48em)}}
/* 11 wordmark at the bottom */
.lab-11 .wm{position:absolute;left:18px;right:18px;bottom:44px;animation:lab-up 1s cubic-bezier(.2,.9,.2,1) .3s both}
.lab-11 .wm svg{width:100%;height:auto;color:#fff}
.lab-11 .sym{position:absolute;top:22px;right:22px;width:52px;animation:lab-fade .6s 1s both}
.lab-11 .tag{position:absolute;left:20px;bottom:24px;font:700 12px 'Minto Sans',sans-serif;letter-spacing:.2em;color:${OR};animation:lab-fade .6s 1.2s both}
/* 12 dropping letters */
.lab-12 .dl{position:absolute;left:12px;right:12px;bottom:70px;display:flex;justify-content:space-between;font-size:104px;font-weight:800;color:${OR}}
.lab-12 .dl span{animation:lab-drop .9s cubic-bezier(.3,1.6,.5,1) both}
@keyframes lab-drop{from{transform:translateY(-130vh)}to{transform:none}}
/* 13 circle reveal */
.mm-hero.lab-13{background:${NAVY}}
.mm-hero.lab-13 .mm-hero-vid{animation:lab-circ 1.6s cubic-bezier(.6,0,.2,1) .3s both}
@keyframes lab-circ{from{clip-path:circle(0% at 50% 50%)}to{clip-path:circle(80% at 50% 50%)}}
.lab-13 .cw{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;font-size:92px;font-weight:800;letter-spacing:.02em;animation:lab-fade .8s 1.5s both}
/* 14 crossing tickers */
.lab-14 .tk{position:absolute;left:-20%;width:140%;white-space:nowrap;font-size:34px;font-weight:800;padding:10px 0;letter-spacing:.06em}
.lab-14 .tk>div{display:inline-block;animation:lab-marq 10s linear infinite}
.lab-14 .t1{top:40%;background:${OR};color:${NAVY};transform:rotate(-9deg)}
.lab-14 .t2{top:48%;background:${NAVY};color:#fff;transform:rotate(7deg)}.lab-14 .t2>div{animation-name:lab-marqR}
/* 15 offset letters */
.lab-15 .of{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;font-size:110px;font-weight:800}
.lab-15 .of span{display:block;line-height:1}
.lab-15 .of .a{position:absolute;inset:0;color:transparent;-webkit-text-stroke:2px ${OR};animation:lab-float 3s ease-in-out infinite alternate}
@keyframes lab-float{from{transform:translate(-8px,-8px)}to{transform:translate(8px,8px)}}
/* 16 side text + headline */
.lab-16 .side{position:absolute;left:14px;top:20px;bottom:20px;writing-mode:vertical-rl;transform:rotate(180deg);font-size:62px;font-weight:800;color:transparent;-webkit-text-stroke:1.5px ${OR};text-align:right;animation:lab-fade 1s both}
.lab-16 .hd{position:absolute;left:96px;right:20px;bottom:46px;font-size:44px;line-height:1.05;font-weight:800}
.lab-16 .hd span{display:block;animation:lab-up .8s cubic-bezier(.2,.9,.2,1) both}
.lab-16 .hd b{color:${OR};font-weight:800}
/* 17 zoom in */
.mm-hero.lab-17 .mm-hero-vid{animation:lab-zoomv 2.4s cubic-bezier(.2,.8,.2,1) both}
@keyframes lab-zoomv{from{transform:scale(1.35)}to{transform:none}}
.lab-17 .zw{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;font-size:96px;font-weight:800;animation:lab-zoomt 2.4s cubic-bezier(.2,.8,.2,1) both}
@keyframes lab-zoomt{from{transform:translateY(-50%) scale(3.2);letter-spacing:.4em;opacity:0}to{transform:translateY(-50%);letter-spacing:.02em;opacity:1}}
.lab-17 .zs{position:absolute;left:0;right:0;top:calc(50% + 70px);text-align:center;font:700 13px 'Minto Sans',sans-serif;letter-spacing:.3em;color:${OR};animation:lab-fade .6s 2.2s both}
/* 18 tiles reveal */
.lab-18 .tiles{position:absolute;inset:0;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(8,1fr)}
.lab-18 .tiles i{background:${OR};animation:lab-tile .5s ease both;border:1px solid rgba(14,27,51,.15)}
@keyframes lab-tile{to{opacity:0;transform:scale(.6)}}
.lab-18 .tw{position:absolute;left:22px;bottom:40px;animation:lab-fade .6s 1.8s both}
/* 19 glowing minto */
.lab-19 svg{position:absolute;left:8%;width:84%;top:40%;overflow:visible}
.lab-19 path{fill:none;stroke:${OR};stroke-width:5;filter:drop-shadow(0 0 6px ${OR}) drop-shadow(0 0 14px ${OR});stroke-dasharray:1 1;stroke-dashoffset:1;animation:lab-draw 2.2s ease .2s both,lab-pulse 2s ease-in-out 2.4s infinite alternate}
@keyframes lab-draw{to{stroke-dashoffset:0}}
@keyframes lab-pulse{to{opacity:.65}}
/* 20 numbers */
.lab-20 .nums{position:absolute;left:20px;right:20px;bottom:44px;display:grid;gap:12px}
.lab-20 .n{display:flex;align-items:baseline;gap:12px;background:rgba(14,27,51,.6);border:1px solid rgba(255,255,255,.18);border-radius:18px;padding:14px 18px;animation:lab-up .7s cubic-bezier(.2,.9,.2,1) both;backdrop-filter:none}
.lab-20 .n b{font-size:40px;color:${OR}}.lab-20 .n span{font:700 14px 'Minto Sans',sans-serif;letter-spacing:.08em;text-transform:uppercase}
.lab-20 .lab-logo{top:22px;left:20px}

/* ---------- computers ---------- */
@media (min-width:761px){
  .lab-1 .st{left:4%;right:4%;top:50%;transform:translateY(-50%);display:flex;justify-content:space-between;font-size:min(30vw,560px);line-height:1}
  .lab-1 .st span{display:inline-block;-webkit-text-stroke-width:3px}
  .lab-2 .hl{left:6%;right:auto;bottom:9%;font-size:clamp(70px,8.5vw,150px);max-width:70%}
  .lab-3 .band{font-size:clamp(120px,13vw,230px)}
  .lab-3 .b1{top:22%}.lab-3 .b2{top:52%}
  .lab-3 .band.b1{-webkit-text-stroke-width:3px}
  .lab-5 .c{width:90px;height:90px;border-width:4px}
  .lab-5 .tl,.lab-5 .tr{top:36px}.lab-5 .bl,.lab-5 .br{bottom:36px}
  .lab-5 .tl,.lab-5 .bl{left:40px}.lab-5 .tr,.lab-5 .br{right:40px}
  .lab-5 .rec{top:62px;left:150px;font-size:20px}.lab-5 .tc{bottom:64px;left:150px;font-size:20px}
  .lab-5 .cross{width:48px;height:48px;margin-bottom:26px}
  .lab-5 .cross:before{left:23px;height:48px}.lab-5 .cross:after{top:23px;width:48px}
  .lab-5 .tagl{font-size:22px}
  .lab-6 .bd{width:380px;height:380px;margin:-190px 0 0 -190px;top:50%}
  .lab-6 .bd svg{transform-origin:center}
  .lab-6 .bd img{width:140px;height:146px;margin:-73px 0 0 -70px}
  .lab-7 .ctag{font-size:clamp(70px,8vw,140px)}
  .lab-9 .wd{left:6%;bottom:8%;font-size:clamp(70px,8.6vw,150px)}
  .lab-9 .wd span{display:inline-block;margin-right:.25em;-webkit-text-stroke-width:3px}
  .lab-9 .wd span:nth-child(2){}
  .lab-18 .tiles{grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(4,1fr)}
  .lab-20 .nums{left:6%;right:6%;bottom:9%;grid-template-columns:repeat(3,1fr);gap:24px}
  .lab-20 .n{padding:26px 30px;border-radius:24px}
  .lab-20 .n b{font-size:64px}.lab-20 .n span{font-size:16px}
}
`;

const Logo = ({ style }: { style?: React.CSSProperties }) => (
  <div className="lab-logo" style={style}><img src={LOGO_DARK} alt="" /><BrandName height={18} style={{ color: '#fff' }} /></div>
);
const d = (s: number) => ({ animationDelay: `${s}s` });
const MINTO_PACIFICO = (cls: string) => {
  const [x0, y0, x1, y1] = PACIFICO.box;
  return (
    <svg className={cls} viewBox={`${x0} ${y0} ${x1 - x0} ${y1 - y0}`} aria-hidden="true">
      <path d={PACIFICO.d} pathLength={1} fill={cls === 'word' ? OR : undefined} />
    </svg>
  );
};

function Design({ n }: { n: string }) {
  switch (n) {
    case '1': return <div className="st">{'MINTO'.split('').map((c, i) => <span key={i} style={d(0.15 + i * 0.12)}>{c}</span>)}</div>;
    case '2': return (<>
      <div className="lab-shade" />
      <div className="hl">{['We support', 'your'].map((w, i) => <span key={i} className="w"><span style={d(0.2 + i * 0.15)}>{w}</span></span>)}
        <span className="w"><span className="o" style={d(0.5)}>success.</span></span></div>
    </>);
    case '3': return (<>
      <div className="band b1"><div>MINTO MEDIA • MINTO MEDIA • MINTO MEDIA • MINTO MEDIA • </div></div>
      <div className="band b2"><div>WE SUPPORT YOUR SUCCESS • WE SUPPORT YOUR SUCCESS • </div></div>
    </>);
    case '4': return (<><div className="lab-shade" /><span className="ln l1" />{MINTO_PACIFICO('word')}<span className="ln l2" /></>);
    case '5': return (<>
      <i className="c tl" /><i className="c tr" /><i className="c bl" /><i className="c br" />
      <div className="rec"><i />REC</div><div className="tc">00:00:24:12</div>
      <div className="mid"><div className="cross" /><div className="tagl">WE SUPPORT YOUR SUCCESS</div></div>
    </>);
    case '6': return (
      <div className="bd">
        <svg viewBox="0 0 230 230"><defs><path id="lab-c" d="M115 115m-92 0a92 92 0 1 1 184 0a92 92 0 1 1-184 0" /></defs>
          <text><textPath href="#lab-c" textLength="570">MINTO MEDIA • WE SUPPORT YOUR SUCCESS • </textPath></text></svg>
        <img src={LOGO_DARK} alt="" />
      </div>);
    case '7': return (<>
      <div className="cur"><div className="ctag">WE SUPPORT<br />YOUR <span>SUCCESS</span></div></div>
    </>);
    case '8': return (<><div className="txt">minto</div><Logo /></>);
    case '9': return (<><div className="lab-shade" /><div className="wd"><span>WE</span><span>SUPPORT</span><span>YOUR</span><span>SUCCESS</span></div></>);
    case '10': return (<>
      <div className="lab-shade" /><Logo style={{ top: 22, left: 22 }} />
      <div className="rot">We create<br /><span className="pill"><div><span>brands</span><span>content</span><span>ads</span><span>growth</span><span>brands</span></div></span></div>
    </>);
    case '11': return (<>
      <div className="lab-shade" /><img className="sym" src={LOGO_DARK} alt="" />
      <div className="wm"><BrandName height={80} style={{ color: '#fff', width: '100%', height: 'auto' }} /></div>
      <div className="tag">WE SUPPORT YOUR SUCCESS</div>
    </>);
    case '12': return (<><div className="lab-shade" /><div className="dl">{'MINTO'.split('').map((c, i) => <span key={i} style={d(0.2 + i * 0.13)}>{c}</span>)}</div></>);
    case '13': return <div className="cw">minto</div>;
    case '14': return (<>
      <div className="tk t1"><div>MINTO MEDIA ✦ MINTO MEDIA ✦ MINTO MEDIA ✦ MINTO MEDIA ✦ MINTO MEDIA ✦ MINTO MEDIA ✦ </div></div>
      <div className="tk t2"><div>WE SUPPORT YOUR SUCCESS ✦ WE SUPPORT YOUR SUCCESS ✦ WE SUPPORT YOUR SUCCESS ✦ </div></div>
    </>);
    case '15': return <div className="of"><span>MIN</span><span>TO</span><div className="a"><span>MIN</span><span>TO</span></div></div>;
    case '16': return (<>
      <div className="lab-shade" /><div className="side">MINTO MEDIA</div>
      <div className="hd"><span style={d(0.2)}>We make</span><span style={d(0.35)}>brands</span><span style={d(0.5)}><b>move.</b></span></div>
    </>);
    case '17': return (<><div className="zw">minto</div><div className="zs">MEDIA AGENCY</div></>);
    case '18': {
      const order = Array.from({ length: 32 }, (_, i) => ((i * 13) % 32) * 0.04);
      return <div className="tiles">{order.map((t, i) => <i key={i} style={d(0.3 + t)} />)}</div>;
    }
    case '19': return (<><div className="lab-shade" />{MINTO_PACIFICO('glow')}</>);
    case '20': return (<>
      <div className="lab-shade" />
      <div className="nums">{[['+120', 'brands we grew'], ['+40M', 'views delivered'], ['+300', 'campaigns']].map(([b, s], i) =>
        <div key={i} className="n" style={d(0.3 + i * 0.15)}><b>{b}</b><span>{s}</span></div>)}</div>
    </>);
    default: return null;
  }
}

export default function HeroLab({ n }: { n: string }) {
  // a class on the hero section, for the designs that change the video itself (8, 13, 17)
  useEffect(() => {
    const h = document.querySelector('.mm-hero');
    if (!h) return;
    h.classList.add('lab', 'lab-' + n);
    return () => h.classList.remove('lab', 'lab-' + n);
  }, [n]);
  return (
    <>
      <style>{CSS}</style>
      <div className={'lab-ov lab-' + n}><Design n={n} /></div>
    </>
  );
}
