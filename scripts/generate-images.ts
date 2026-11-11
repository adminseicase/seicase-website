/**
 * Generates on-brand placeholder artwork for the sample catalogue:
 * product photos (front / angle / detail per colour), a 24-frame 360° spin,
 * hero slides, banners, journal covers, charms and the Open Graph image.
 *
 *   npm run images:generate
 *
 * Every image is drawn as SVG (leather bags on beige plinths with soft
 * botanical shadows) and rendered to WebP with sharp. Replace them with real
 * photography from the admin panel whenever you're ready.
 */
import sharp from "sharp";
import { mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { COLOURS, SPIN_FRAMES, colourSlug, productSlug, seedCharms, seedProducts, type BagShape } from "../lib/demo/seed-data.ts";

const PUBLIC = join(import.meta.dirname, "..", "public");
const FORCE = process.argv.includes("--force");
const GOLD = "#C9A86A";

/* ------------------------------ colour utils ------------------------------ */
function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(hex: string, target: string, amount: number) {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * amount));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
const lighten = (h: string, a: number) => mix(h, "#ffffff", a);
const darken = (h: string, a: number) => mix(h, "#000000", a);

/* ---------------------------- shared SVG parts ---------------------------- */
function defs(c: string, uid: string) {
  const isLight = hexToRgb(c).reduce((s, v) => s + v, 0) > 560;
  return `
  <linearGradient id="body${uid}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${lighten(c, isLight ? 0.25 : 0.22)}"/>
    <stop offset="0.45" stop-color="${c}"/>
    <stop offset="1" stop-color="${darken(c, isLight ? 0.18 : 0.35)}"/>
  </linearGradient>
  <linearGradient id="flap${uid}" x1="0" y1="0" x2="0.6" y2="1">
    <stop offset="0" stop-color="${lighten(c, 0.28)}"/>
    <stop offset="1" stop-color="${darken(c, 0.12)}"/>
  </linearGradient>
  <linearGradient id="gold${uid}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#E8D3A1"/><stop offset="0.5" stop-color="${GOLD}"/><stop offset="1" stop-color="#8F7442"/>
  </linearGradient>
  <filter id="leather${uid}" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="noise"/>
    <feColorMatrix in="noise" type="saturate" values="0" result="mono"/>
    <feComponentTransfer in="mono" result="soft"><feFuncA type="table" tableValues="0 0.13"/></feComponentTransfer>
    <feComposite in="soft" in2="SourceGraphic" operator="in" result="grain"/>
    <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="grain"/></feMerge>
  </filter>
  <pattern id="weave${uid}" width="56" height="56" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="56" height="56" fill="${darken(c, 0.2)}"/>
    <rect x="2" y="2" width="24" height="52" rx="5" fill="${lighten(c, 0.12)}"/>
    <rect x="30" y="2" width="24" height="24" rx="5" fill="${c}"/>
    <rect x="30" y="30" width="24" height="24" rx="5" fill="${darken(c, 0.05)}"/>
  </pattern>`;
}

const stitch = (d: string, c: string, w = 2.4) =>
  `<path d="${d}" fill="none" stroke="${lighten(c, 0.5)}" stroke-width="${w}" stroke-dasharray="9 7" stroke-linecap="round" opacity="0.75"/>`;

/** Each shape is drawn in a 1000×1250 space with its base resting at y≈990. */
function shapeSvg(shape: BagShape, c: string, uid: string, opts: { back?: boolean } = {}): string {
  const B = `url(#body${uid})`;
  const F = `url(#flap${uid})`;
  const G = `url(#gold${uid})`;
  const D = darken(c, 0.3);
  const logo = opts.back
    ? ""
    : `<text x="500" y="0" font-family="Georgia, serif" font-size="22" fill="${darken(c, 0.45)}" opacity="0.55" text-anchor="middle" letter-spacing="2">seicase</text>`;
  const place = (y: number) => logo.replace('y="0"', `y="${y}"`);
  switch (shape) {
    case "tote":
      return `
      <path d="M 395 520 C 395 300, 605 300, 605 520" fill="none" stroke="${D}" stroke-width="26" stroke-linecap="round"/>
      <path d="M 300 500 L 700 500 Q 712 500 714 512 L 760 960 Q 762 990 732 990 L 268 990 Q 238 990 240 960 L 286 512 Q 288 500 300 500 Z" fill="${B}"/>
      ${stitch("M 300 520 L 700 520", c)}${stitch("M 292 528 L 256 966", c)}${stitch("M 708 528 L 744 966", c)}
      <path d="M 380 545 C 372 262, 628 262, 620 545" fill="none" stroke="${c}" stroke-width="30" stroke-linecap="round"/>
      <path d="M 384 540 C 378 280, 622 280, 616 540" fill="none" stroke="${lighten(c, 0.25)}" stroke-width="5" opacity="0.6"/>
      <rect x="360" y="512" width="42" height="78" rx="9" fill="${darken(c, 0.12)}"/><rect x="598" y="512" width="42" height="78" rx="9" fill="${darken(c, 0.12)}"/>
      ${stitch("M 368 522 L 368 580 L 394 580 L 394 522", c, 2)}${stitch("M 606 522 L 606 580 L 632 580 L 632 522", c, 2)}
      ${place(640)}`;
    case "crescent":
      return `
      <path d="M 285 610 C 300 250, 700 250, 715 610" fill="none" stroke="${D}" stroke-width="18" stroke-linecap="round"/>
      <path d="M 240 600 Q 500 560 760 600 Q 772 612 760 645 Q 690 965 500 978 Q 310 965 240 645 Q 228 612 240 600 Z" fill="${B}"/>
      <path d="M 262 614 Q 500 580 738 614" fill="none" stroke="${G}" stroke-width="5" stroke-dasharray="3 3"/>
      ${stitch("M 266 660 Q 335 932 500 950 Q 665 932 734 660", c)}
      <rect x="718" y="606" width="14" height="34" rx="4" fill="${G}"/>
      <path d="M 725 640 L 725 690" stroke="${D}" stroke-width="8" stroke-linecap="round"/>
      ${place(760)}`;
    case "crossbody":
      return `
      <path d="M 330 640 C 290 110, 710 110, 670 640" fill="none" stroke="${D}" stroke-width="12" stroke-linecap="round"/>
      <circle cx="318" cy="648" r="14" fill="none" stroke="${G}" stroke-width="6"/><circle cx="682" cy="648" r="14" fill="none" stroke="${G}" stroke-width="6"/>
      <rect x="300" y="600" width="400" height="388" rx="48" fill="${B}"/>
      <path d="M 300 650 Q 300 600 350 600 L 650 600 Q 700 600 700 650 L 700 770 Q 500 870 300 770 Z" fill="${F}"/>
      ${stitch("M 318 652 Q 318 618 352 618 L 648 618 Q 682 618 682 652 L 682 760 Q 500 850 318 760 Z", c)}
      <rect x="478" y="796" width="44" height="30" rx="8" fill="${G}"/><circle cx="500" cy="811" r="7" fill="${darken(GOLD, 0.25)}"/>
      ${place(720)}`;
    case "satchel":
      return `
      <path d="M 405 565 C 405 395, 595 395, 595 565" fill="none" stroke="${c}" stroke-width="32" stroke-linecap="round"/>
      <path d="M 408 560 C 408 410, 592 410, 592 560" fill="none" stroke="${lighten(c, 0.3)}" stroke-width="5" opacity="0.55"/>
      <rect x="388" y="540" width="38" height="60" rx="8" fill="${darken(c, 0.15)}"/><rect x="574" y="540" width="38" height="60" rx="8" fill="${darken(c, 0.15)}"/>
      <path d="M 290 570 Q 500 528 710 570 L 750 952 Q 752 990 712 990 L 288 990 Q 248 990 250 952 Z" fill="${B}"/>
      ${stitch("M 300 590 Q 500 550 700 590", c)}
      <rect x="300" y="760" width="180" height="200" rx="18" fill="${darken(c, 0.08)}"/><rect x="520" y="760" width="180" height="200" rx="18" fill="${darken(c, 0.08)}"/>
      <path d="M 300 778 Q 300 760 318 760 L 462 760 Q 480 760 480 778 L 480 830 Q 390 860 300 830 Z" fill="${F}"/>
      <path d="M 520 778 Q 520 760 538 760 L 682 760 Q 700 760 700 778 L 700 830 Q 610 860 520 830 Z" fill="${F}"/>
      <rect x="378" y="800" width="24" height="90" rx="6" fill="${darken(c, 0.2)}"/><rect x="598" y="800" width="24" height="90" rx="6" fill="${darken(c, 0.2)}"/>
      <rect x="370" y="838" width="40" height="28" rx="4" fill="none" stroke="${G}" stroke-width="6"/><rect x="590" y="838" width="40" height="28" rx="4" fill="none" stroke="${G}" stroke-width="6"/>
      <circle cx="290" cy="985" r="9" fill="${G}"/><circle cx="710" cy="985" r="9" fill="${G}"/>
      ${place(680)}`;
    case "weave":
      return `
      <path d="M 300 690 C 190 700, 190 850, 300 860" fill="none" stroke="${c}" stroke-width="16" stroke-linecap="round"/>
      <rect x="290" y="640" width="420" height="345" rx="34" fill="url(#weave${uid})"/>
      <rect x="290" y="640" width="420" height="345" rx="34" fill="${B}" opacity="0.35"/>
      <rect x="290" y="640" width="420" height="44" rx="20" fill="${darken(c, 0.1)}"/>
      <path d="M 310 662 L 690 662" stroke="${G}" stroke-width="5" stroke-dasharray="3 3"/>
      <rect x="672" y="652" width="16" height="44" rx="5" fill="${G}"/>`;
    case "wallet":
      return `
      <rect x="290" y="700" width="420" height="285" rx="24" fill="${B}"/>
      <path d="M 290 724 Q 290 700 314 700 L 686 700 Q 710 700 710 724 L 710 815 Q 710 835 690 835 L 310 835 Q 290 835 290 815 Z" fill="${F}"/>
      ${stitch("M 306 724 Q 306 716 314 716 L 686 716 Q 694 716 694 724 L 694 812 Q 694 820 686 820 L 314 820 Q 306 820 306 812 Z", c)}
      ${stitch("M 306 850 L 306 960 Q 306 970 316 970 L 684 970 Q 694 970 694 960 L 694 850", c)}
      <circle cx="500" cy="812" r="17" fill="${G}"/><circle cx="500" cy="812" r="7" fill="${darken(GOLD, 0.25)}"/>
      ${place(910)}`;
    case "coin":
      return `
      <path d="M 330 985 Q 300 985 300 945 L 300 785 Q 300 645 500 645 Q 700 645 700 785 L 700 945 Q 700 985 670 985 Z" fill="${B}"/>
      ${stitch("M 322 960 L 322 790 Q 322 668 500 668 Q 678 668 678 790 L 678 960", c)}
      <path d="M 312 708 Q 500 612 688 708" fill="none" stroke="${G}" stroke-width="12" stroke-linecap="round"/>
      <circle cx="483" cy="633" r="15" fill="${G}"/><circle cx="517" cy="633" r="15" fill="${G}"/>
      ${place(870)}`;
    case "clutch":
      return `
      <rect x="250" y="705" width="500" height="280" rx="20" fill="${B}"/>
      <path d="M 250 722 Q 250 705 268 705 L 732 705 Q 750 705 750 722 L 750 765 Q 690 865 625 822 Q 560 905 500 852 Q 440 905 375 822 Q 310 865 250 765 Z" fill="${F}"/>
      ${stitch("M 268 730 L 732 730", c)}
      <circle cx="500" cy="852" r="16" fill="${G}"/>`;
    case "bucket":
      return `
      <path d="M 365 600 C 360 355, 640 355, 635 600" fill="none" stroke="${c}" stroke-width="22" stroke-linecap="round"/>
      <path d="M 318 600 L 682 600 L 662 958 Q 658 990 626 990 L 374 990 Q 342 990 338 958 Z" fill="${B}"/>
      <ellipse cx="500" cy="600" rx="182" ry="34" fill="${darken(c, 0.45)}"/>
      <path d="M 320 640 Q 500 676 680 640" fill="none" stroke="${lighten(c, 0.15)}" stroke-width="9"/>
      <path d="M 470 668 L 452 790 M 530 668 L 548 790" stroke="${lighten(c, 0.15)}" stroke-width="8" stroke-linecap="round"/>
      <path d="M 446 790 l -10 40 l 20 0 z M 554 790 l -10 40 l 20 0 z" fill="${darken(c, 0.1)}"/>
      ${stitch("M 336 640 L 352 966", c)}${stitch("M 664 640 L 648 966", c)}`;
    case "cardholder":
      return `
      <rect x="320" y="700" width="360" height="285" rx="22" fill="${B}"/>
      <path d="M 320 770 Q 500 800 680 770" fill="none" stroke="${darken(c, 0.3)}" stroke-width="4"/>
      <path d="M 320 830 Q 500 860 680 830" fill="none" stroke="${darken(c, 0.3)}" stroke-width="4"/>
      <path d="M 430 700 Q 500 742 570 700" fill="none" stroke="${darken(c, 0.35)}" stroke-width="5"/>
      ${stitch("M 336 716 L 336 969 L 664 969 L 664 716", c)}
      ${place(925)}`;
    case "bifold":
      return `
      <rect x="350" y="672" width="190" height="60" rx="6" fill="#EDE4D6"/>
      <rect x="300" y="700" width="400" height="285" rx="20" fill="${B}"/>
      <rect x="300" y="700" width="34" height="285" rx="14" fill="${darken(c, 0.15)}"/>
      ${stitch("M 348 716 L 684 716 L 684 969 L 348 969", c)}
      ${place(860)}`;
    case "messenger":
      return `
      <path d="M 252 560 C 225 95, 775 95, 748 560" fill="none" stroke="${D}" stroke-width="24" stroke-linecap="round"/>
      <rect x="220" y="520" width="560" height="468" rx="30" fill="${B}"/>
      <path d="M 220 556 Q 220 520 256 520 L 744 520 Q 780 520 780 556 L 780 826 Q 780 856 750 856 L 250 856 Q 220 856 220 826 Z" fill="${F}"/>
      ${stitch("M 238 556 Q 238 538 256 538 L 744 538 Q 762 538 762 556 L 762 822 Q 762 838 746 838 L 254 838 Q 238 838 238 822 Z", c)}
      <rect x="352" y="700" width="40" height="200" rx="8" fill="${darken(c, 0.2)}"/><rect x="608" y="700" width="40" height="200" rx="8" fill="${darken(c, 0.2)}"/>
      <rect x="342" y="826" width="60" height="40" rx="5" fill="none" stroke="${G}" stroke-width="7"/><rect x="598" y="826" width="60" height="40" rx="5" fill="none" stroke="${G}" stroke-width="7"/>
      ${place(640)}`;
    case "keyfob":
      return `
      <circle cx="500" cy="470" r="72" fill="none" stroke="${G}" stroke-width="13"/>
      <rect x="470" y="525" width="60" height="70" rx="12" fill="${darken(c, 0.1)}"/>
      <path d="M 500 560 C 400 660, 400 915, 500 985 C 600 915, 600 660, 500 560 Z" fill="${B}"/>
      ${stitch("M 500 600 C 430 690, 430 900, 500 955 C 570 900, 570 690, 500 600 Z", c)}`;
    case "folio":
      return `
      <rect x="230" y="600" width="540" height="385" rx="28" fill="${B}"/>
      <rect x="250" y="620" width="500" height="345" rx="18" fill="none" stroke="${G}" stroke-width="5" stroke-dasharray="3 3"/>
      <rect x="440" y="638" width="120" height="34" rx="17" fill="#E2D4C4"/>
      <path d="M 270 760 L 730 760" stroke="${darken(c, 0.25)}" stroke-width="3"/>
      ${place(880)}`;
    case "charm-flower": {
      const petals = Array.from({ length: 6 }, (_, i) => {
        const a = i * 60;
        return `<ellipse cx="500" cy="680" rx="62" ry="120" fill="${B}" stroke="${darken(c, 0.25)}" stroke-width="3" transform="rotate(${a} 500 790)"/>`;
      }).join("");
      return `
      <circle cx="500" cy="420" r="30" fill="none" stroke="${G}" stroke-width="10"/>
      <path d="M 500 450 L 500 590" stroke="${G}" stroke-width="8"/>
      ${petals}
      <circle cx="500" cy="790" r="56" fill="${G}"/>
      <circle cx="500" cy="790" r="34" fill="${darken(GOLD, 0.2)}" opacity="0.5"/>`;
    }
    case "zip-pouch":
      return `
      <rect x="300" y="700" width="400" height="285" rx="44" fill="${B}"/>
      <path d="M 330 735 L 670 735" stroke="${G}" stroke-width="7" stroke-dasharray="4 4"/>
      <rect x="652" y="722" width="18" height="28" rx="4" fill="${G}"/>
      <path d="M 661 750 L 661 815" stroke="${darken(c, 0.15)}" stroke-width="14" stroke-linecap="round"/>
      ${stitch("M 318 770 L 318 940 Q 318 968 346 968 L 654 968 Q 682 968 682 940 L 682 770", c)}
      ${place(880)}`;
  }
}

function background(
  w: number,
  h: number,
  uid: string,
  opts: { plinth?: { cx: number; top: number; rx: number }; leaves?: "right" | "left" | "none"; tone?: number } = {},
) {
  const tone = opts.tone ?? 0;
  const wallTop = mix("#EBDCCB", "#F3E7DA", tone);
  const leaves =
    opts.leaves === "none"
      ? ""
      : Array.from({ length: 9 }, (_, i) => {
          const side = opts.leaves === "left" ? 0.12 : 0.84;
          const x = w * side + Math.cos(i * 1.7) * w * 0.12;
          const y = h * 0.12 + i * h * 0.045;
          const rot = -40 + i * 23;
          return `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${(w * 0.05).toFixed(0)}" ry="${(w * 0.016).toFixed(0)}" transform="rotate(${rot} ${x.toFixed(0)} ${y.toFixed(0)})"/>`;
        }).join("") +
        `<path d="M ${w * (opts.leaves === "left" ? 0.02 : 0.98)} 0 Q ${w * (opts.leaves === "left" ? 0.15 : 0.85)} ${h * 0.25} ${w * (opts.leaves === "left" ? 0.2 : 0.8)} ${h * 0.55}" stroke-width="${w * 0.006}" fill="none" stroke="#6b4d3a"/>`;
  const plinth = opts.plinth
    ? `<rect x="${opts.plinth.cx - opts.plinth.rx}" y="${opts.plinth.top}" width="${opts.plinth.rx * 2}" height="${h - opts.plinth.top}" fill="url(#plinth${uid})"/>
       <ellipse cx="${opts.plinth.cx}" cy="${opts.plinth.top}" rx="${opts.plinth.rx}" ry="${opts.plinth.rx * 0.16}" fill="#EEE4D8"/>
       <ellipse cx="${opts.plinth.cx}" cy="${opts.plinth.top}" rx="${opts.plinth.rx}" ry="${opts.plinth.rx * 0.16}" fill="none" stroke="#D8C8B6" stroke-width="2"/>`
    : "";
  return `
  <defs>
    <linearGradient id="wall${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${wallTop}"/><stop offset="1" stop-color="#F6EEE7"/></linearGradient>
    <radialGradient id="light${uid}" cx="0.3" cy="0.3" r="0.75"><stop offset="0" stop-color="#FFF9F2" stop-opacity="0.95"/><stop offset="1" stop-color="#FFF9F2" stop-opacity="0"/></radialGradient>
    <linearGradient id="plinth${uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#DCCDBC"/><stop offset="0.35" stop-color="#E9DED1"/><stop offset="1" stop-color="#D3C2AF"/></linearGradient>
    <filter id="soft${uid}"><feGaussianBlur stdDeviation="${Math.round(w / 90)}"/></filter>
    <filter id="shadow${uid}"><feGaussianBlur stdDeviation="16"/></filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#wall${uid})"/>
  <rect width="${w}" height="${h}" fill="url(#light${uid})"/>
  <g filter="url(#soft${uid})" fill="#6b4d3a" stroke="#6b4d3a" opacity="0.10">${leaves}</g>
  ${plinth}`;
}

function bagShadow(cx: number, y: number, rx: number, uid: string) {
  return `<ellipse cx="${cx}" cy="${y}" rx="${rx}" ry="${rx * 0.08}" fill="#3a2a20" opacity="0.28" filter="url(#shadow${uid})"/>`;
}

/* ------------------------------ compositions ------------------------------ */
let uidCounter = 0;
const nextUid = () => `u${++uidCounter}`;

const ZOOM: Partial<Record<BagShape, number>> = {
  tote: 1.12,
  crescent: 1.15,
  crossbody: 1.12,
  satchel: 1.25,
  messenger: 1.08,
  bucket: 1.15,
  weave: 1.4,
  wallet: 1.5,
  coin: 1.45,
  clutch: 1.45,
  cardholder: 1.5,
  bifold: 1.5,
  keyfob: 1.25,
  folio: 1.35,
  "charm-flower": 1.2,
  "zip-pouch": 1.5,
};

function productSvg(shape: BagShape, colour: string, view: "front" | "angle" | "detail") {
  const uid = nextUid();
  const bag = shapeSvg(shape, colour, uid);
  let bagGroup = `<g filter="url(#leather${uid})">${bag}</g>`;
  if (view === "angle") {
    const side = shapeSvg(shape, darken(colour, 0.35), uid + "s", { back: true });
    bagGroup = `
      <g transform="translate(70 0) scale(0.86 1) translate(${(500 * 0.14) / 0.86} 0)" opacity="0.95">${side}</g>
      <g filter="url(#leather${uid})" transform="translate(-30 0) scale(0.9 1) translate(${(500 * 0.1) / 0.9} 0)">${bag}</g>`;
  }
  const scene = `
    ${background(1000, 1250, uid, { plinth: { cx: 500, top: 985, rx: 420 }, leaves: view === "angle" ? "left" : "right" })}
    <defs>${defs(colour, uid)}${view === "angle" ? defs(darken(colour, 0.35), uid + "s") : ""}</defs>
    ${bagShadow(500, 990, 300, uid)}
    ${bagGroup}`;
  // Frame each shape tightly: small goods get a closer "camera".
  const z = view === "detail" ? 2.1 : (ZOOM[shape] ?? 1.2);
  const vw = 1000 / z;
  const vh = 1250 / z;
  const vx = 500 - vw / 2;
  const vy = view === "detail" ? 560 - vh / 2 : 985 - vh * 0.82;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1250" viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}">${scene}</svg>`;
}

function spinSvg(shape: BagShape, colour: string, frame: number) {
  const uid = nextUid();
  const theta = (frame / SPIN_FRAMES) * Math.PI * 2;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const sx = Math.max(0.12, Math.abs(cos));
  const sideW = 150 * Math.abs(sin);
  const dir = sin >= 0 ? 1 : -1;
  // The side panel follows the tote's trapezoid (half-width 214 at the top, 260 at the base).
  const shift = (-dir * sideW) / 2;
  const cx = 500 + shift;
  const topX = cx + dir * 214 * sx;
  const baseX = cx + dir * 260 * sx;
  const bag = shapeSvg(shape, colour, uid, { back: cos < 0 });
  const side = `<path d="M ${topX} 502 L ${topX + dir * sideW * 0.85} 494 L ${baseX + dir * sideW} 984 L ${baseX} 990 Z" fill="${darken(colour, 0.38)}"/>
    <path d="M ${topX + (dir * sideW * 0.85) / 2} 498 L ${baseX + (dir * sideW) / 2} 987" stroke="${darken(colour, 0.5)}" stroke-width="3" opacity="${Math.abs(sin).toFixed(2)}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 125 1000 1000">
    ${background(1000, 1250, uid, { plinth: { cx: 500, top: 985, rx: 420 }, leaves: "none" })}
    <defs>${defs(colour, uid)}</defs>
    ${bagShadow(500, 990, 300, uid)}
    ${side}
    <g filter="url(#leather${uid})" transform="translate(${cx} 0) scale(${sx * (cos < 0 ? -1 : 1)} 1) translate(-500 0)">${bag}</g>
    <ellipse cx="500" cy="1050" rx="330" ry="38" fill="none" stroke="#B9A592" stroke-width="2" opacity="0.6"/>
  </svg>`;
}

function heroSvg(w: number, h: number, shape: BagShape, colour: string, variant: 1 | 2 | 3, mobile: boolean) {
  const uid = nextUid();
  const s = mobile ? 0.82 : 1.2;
  const cx = mobile ? w * 0.5 : w * 0.7;
  const top = mobile ? h * 0.93 : h * 0.9;
  const extra =
    variant === 2
      ? // dried flowers in a vase
        `<g opacity="0.85">
          <path d="M ${cx - 470 * s} ${top} q -20 -170 30 -260 q 50 -90 0 -180" stroke="#8b6a4e" stroke-width="5" fill="none"/>
          <path d="M ${cx - 470 * s} ${top} q 40 -200 120 -330" stroke="#8b6a4e" stroke-width="4" fill="none"/>
          ${Array.from({ length: 10 }, (_, i) => `<circle cx="${cx - 470 * s + 30 + Math.sin(i) * 90}" cy="${top - 300 - i * 22}" r="${10 + (i % 3) * 4}" fill="#D9C2A2"/>`).join("")}
          <path d="M ${cx - 540 * s} ${top} q -10 -150 70 -150 q 80 0 70 150 z" fill="#E5D7C6" stroke="#CDBBA6" stroke-width="3"/>
        </g>`
      : variant === 3
        ? `<g fill="#5F5D3B" opacity="0.55">${Array.from({ length: 14 }, (_, i) => {
            const x = w * 0.95 - Math.sin(i * 0.9) * 90;
            const y = h * 0.08 + i * h * 0.05;
            return `<ellipse cx="${x}" cy="${y}" rx="${w * 0.035}" ry="${w * 0.012}" transform="rotate(${-30 + i * 27} ${x} ${y})"/>`;
          }).join(
            "",
          )}<path d="M ${w * 0.97} 0 Q ${w * 0.88} ${h * 0.4} ${w * 0.93} ${h * 0.8}" stroke="#5F5D3B" stroke-width="6" fill="none"/></g>`
        : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${background(w, h, uid, { plinth: { cx, top, rx: mobile ? w * 0.42 : w * 0.24 }, leaves: "right", tone: variant / 4 })}
    <defs>${defs(colour, uid)}</defs>
    ${extra}
    <g transform="translate(${cx - 500 * s} ${top - 990 * s}) scale(${s})">
      ${bagShadow(500, 990, 300, uid)}
      <g filter="url(#leather${uid})">${shapeSvg(shape, colour, uid)}</g>
    </g>
  </svg>`;
}

function weaveBanner(w: number, h: number, colour: string) {
  const uid = nextUid();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>${defs(colour, uid)}
      <pattern id="bigweave${uid}" width="140" height="140" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
        <rect width="140" height="140" fill="${darken(colour, 0.45)}"/>
        <rect x="4" y="4" width="62" height="132" rx="14" fill="${lighten(colour, 0.08)}"/>
        <rect x="74" y="4" width="62" height="62" rx="14" fill="${colour}"/>
        <rect x="74" y="74" width="62" height="62" rx="14" fill="${darken(colour, 0.12)}"/>
      </pattern>
      <radialGradient id="glow${uid}" cx="0.25" cy="0.3" r="0.9"><stop offset="0" stop-color="#fff3e2" stop-opacity="0.35"/><stop offset="1" stop-color="#000" stop-opacity="0.35"/></radialGradient>
    </defs>
    <g filter="url(#leather${uid})"><rect width="${w}" height="${h}" fill="url(#bigweave${uid})"/></g>
    <rect width="${w}" height="${h}" fill="url(#glow${uid})"/>
  </svg>`;
}

function processPoster(w: number, h: number) {
  const uid = nextUid();
  const c = "#5a3220";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>${defs(c, uid)}
      <radialGradient id="pg${uid}" cx="0.55" cy="0.45" r="0.8"><stop offset="0" stop-color="#8a5636"/><stop offset="1" stop-color="#2a1810"/></radialGradient>
    </defs>
    <g filter="url(#leather${uid})"><rect width="${w}" height="${h}" fill="url(#pg${uid})"/></g>
    <path d="M -50 ${h * 0.78} Q ${w * 0.45} ${h * 0.45} ${w + 50} ${h * 0.2}" fill="none" stroke="#E8D3A1" stroke-width="5" stroke-dasharray="16 12" opacity="0.85"/>
    <path d="M -50 ${h * 0.86} Q ${w * 0.45} ${h * 0.53} ${w + 50} ${h * 0.28}" fill="none" stroke="#1b0f09" stroke-width="2" opacity="0.5"/>
    <rect x="${w * 0.6}" y="${h * 0.05}" width="22" height="${h * 0.42}" rx="10" fill="#c9c3b9" transform="rotate(18 ${w * 0.6} ${h * 0.25})"/>
    <rect x="${w * 0.56}" y="${h * 0.02}" width="120" height="70" rx="12" fill="#3b3631" transform="rotate(18 ${w * 0.6} ${h * 0.25})" opacity="0.9"/>
  </svg>`;
}

function lifestyleSvg(w: number, h: number) {
  const uid = nextUid();
  const s = 0.95;
  const cx = w * 0.68;
  const top = h * 0.97;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${background(w, h, uid, { leaves: "left", tone: 0.6 })}
    <defs>${defs(COLOURS.Burgundy, uid)}</defs>
    <g opacity="0.9">
      ${Array.from({ length: 18 }, (_, i) => `<circle cx="${w * 0.88 + Math.sin(i * 1.3) * 120}" cy="${h * 0.15 + i * 28}" r="${8 + (i % 4) * 3}" fill="#F3EBDD" stroke="#DCCBB4"/>`).join("")}
      <path d="M ${w * 0.88} ${h} Q ${w * 0.86} ${h * 0.6} ${w * 0.9} ${h * 0.15}" stroke="#7d6a50" stroke-width="5" fill="none"/>
    </g>
    <rect x="${w * 0.42}" y="0" width="${w * 0.1}" height="${h}" fill="#EBDDCB" opacity="0.6"/>
    <g transform="translate(${cx - 500 * s} ${top - 990 * s}) scale(${s})">
      <g filter="url(#leather${uid})">${shapeSvg("crescent", COLOURS.Burgundy, uid)}</g>
    </g>
  </svg>`;
}

function journalSvg(kind: "patina" | "studio" | "what-fits") {
  const uid = nextUid();
  const w = 1200;
  const h = 800;
  if (kind === "studio") {
    const swatches = Object.values(COLOURS)
      .map(
        (c, i) =>
          `<rect x="${150 + i * 115}" y="${300 + (i % 2) * 40}" width="100" height="260" rx="14" fill="${c}" transform="rotate(${-8 + i * 3} ${200 + i * 115} 430)"/>`,
      )
      .join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      ${background(w, h, uid, { leaves: "right" })}<defs>${defs(COLOURS.Tan, uid)}</defs>
      <g filter="url(#leather${uid})">${swatches}</g>
      <circle cx="980" cy="640" r="60" fill="#E8D3A1"/><circle cx="980" cy="640" r="24" fill="#8F7442"/>
      <circle cx="860" cy="680" r="44" fill="#6E3B22"/><circle cx="860" cy="680" r="16" fill="#3F2618"/>
    </svg>`;
  }
  const colour = kind === "patina" ? COLOURS.Cognac : COLOURS.Tan;
  const s = kind === "patina" ? 1.4 : 0.75;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${background(w, h, uid, { plinth: { cx: 600, top: 760, rx: 420 }, leaves: "right", tone: 0.4 })}
    <defs>${defs(colour, uid)}</defs>
    <g transform="translate(${600 - 500 * s} ${(kind === "patina" ? 1150 : 760) - 990 * s}) scale(${s})">
      ${bagShadow(500, 990, 300, uid)}
      <g filter="url(#leather${uid})">${shapeSvg("tote", colour, uid)}</g>
    </g>
    ${kind === "what-fits" ? `<rect x="180" y="560" width="230" height="160" rx="10" fill="#cfd2d4"/><rect x="190" y="570" width="210" height="140" rx="6" fill="#7b8389"/><rect x="860" y="600" width="70" height="160" rx="30" fill="#5F5D3B"/>` : ""}
  </svg>`;
}

function charmSvg(shape: string, colour: string) {
  const uid = nextUid();
  const B = `url(#body${uid})`;
  const G = `url(#gold${uid})`;
  let body = "";
  if (shape === "flower") {
    body =
      Array.from(
        { length: 6 },
        (_, i) =>
          `<ellipse cx="400" cy="330" rx="62" ry="115" fill="${B}" stroke="${darken(colour, 0.2)}" stroke-width="3" transform="rotate(${i * 60} 400 440)"/>`,
      ).join("") + `<circle cx="400" cy="440" r="52" fill="${G}"/>`;
  } else if (shape === "leaf") {
    body = `<path d="M 400 260 C 250 380, 280 600, 400 680 C 520 600, 550 380, 400 260 Z" fill="${B}"/><path d="M 400 280 L 400 670 M 400 400 L 340 360 M 400 470 L 330 430 M 400 540 L 345 505 M 400 400 L 460 360 M 400 470 L 470 430 M 400 540 L 455 505" stroke="${lighten(colour, 0.35)}" stroke-width="4" fill="none"/>`;
  } else if (shape === "tassel") {
    body =
      `<rect x="360" y="270" width="80" height="90" rx="20" fill="${darken(colour, 0.1)}"/>` +
      Array.from(
        { length: 15 },
        (_, i) =>
          `<path d="M ${364 + i * 5} 360 L ${330 + i * 10} 690" stroke="${i % 2 ? colour : lighten(colour, 0.15)}" stroke-width="9" stroke-linecap="round"/>`,
      ).join("");
  } else {
    body = `<path d="M 400 680 C 230 560, 230 330, 330 330 C 370 330, 395 360, 400 390 C 405 360, 430 330, 470 330 C 570 330, 570 560, 400 680 Z" fill="url(#weave${uid})"/><path d="M 400 680 C 230 560, 230 330, 330 330 C 370 330, 395 360, 400 390 C 405 360, 430 330, 470 330 C 570 330, 570 560, 400 680 Z" fill="${B}" opacity="0.35"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
    ${background(800, 800, uid, { leaves: "none" })}
    <defs>${defs(colour, uid)}</defs>
    <circle cx="400" cy="150" r="34" fill="none" stroke="${G}" stroke-width="12"/>
    <path d="M 400 184 L 400 270" stroke="${G}" stroke-width="10"/>
    <g filter="url(#leather${uid})">${body}</g>
  </svg>`;
}

function ogSvg() {
  const uid = nextUid();
  const s = 0.55;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    ${background(1200, 630, uid, { plinth: { cx: 900, top: 600, rx: 260 }, leaves: "right" })}
    <defs>${defs(COLOURS.Tan, uid)}</defs>
    <g transform="translate(${900 - 500 * s} ${600 - 990 * s}) scale(${s})"><g filter="url(#leather${uid})">${shapeSvg("tote", COLOURS.Tan, uid)}</g></g>
    <text x="90" y="290" font-family="Georgia, 'Times New Roman', serif" font-size="110" fill="#1F1A17">seicase</text>
    <text x="94" y="360" font-family="Georgia, serif" font-size="34" fill="#7D6E64">Carry What You Love.</text>
    <text x="94" y="405" font-family="Georgia, serif" font-size="26" fill="#9C5A33">Timeless leather. Thoughtful design.</text>
  </svg>`;
}

/* --------------------------------- output -------------------------------- */
let written = 0;
async function out(rel: string, svg: string, quality = 80) {
  const file = join(PUBLIC, rel);
  if (!FORCE && existsSync(file)) return;
  mkdirSync(dirname(file), { recursive: true });
  const ext = rel.split(".").pop();
  const img = sharp(Buffer.from(svg));
  if (ext === "jpg") await img.jpeg({ quality, mozjpeg: true }).toFile(file);
  else await img.webp({ quality, effort: 5 }).toFile(file);
  written++;
}

async function main() {
  console.time("images");
  for (const p of seedProducts) {
    const slug = productSlug(p.name);
    for (const [ci, c] of p.colours.entries()) {
      const hex = COLOURS[c.name];
      const views = ci === 0 ? (["front", "angle", "detail"] as const) : (["front", "angle"] as const);
      for (const v of views) await out(`images/products/${slug}/${colourSlug(c.name)}-${v}.webp`, productSvg(p.shape, hex, v));
    }
    if (p.spin) {
      const hex = COLOURS[p.colours[0].name];
      for (let f = 0; f < SPIN_FRAMES; f++) {
        await out(`images/products/${slug}/spin/${String(f).padStart(2, "0")}.webp`, spinSvg(p.shape, hex, f), 72);
      }
    }
  }
  for (const c of seedCharms) await out(`images/charms/${c.slug}.webp`, charmSvg(c.shape, c.colour));

  const heroes: [BagShape, string][] = [
    ["tote", COLOURS.Tan],
    ["crescent", COLOURS.Burgundy],
    ["crossbody", COLOURS.Olive],
  ];
  for (const [i, [shape, colour]] of heroes.entries()) {
    const n = (i + 1) as 1 | 2 | 3;
    await out(`images/hero/hero-${n}.webp`, heroSvg(1920, 1080, shape, colour, n, false), 78);
    await out(`images/hero/hero-${n}-mobile.webp`, heroSvg(900, 1200, shape, colour, n, true), 76);
  }
  await out("images/banners/crafted.webp", weaveBanner(1200, 800, COLOURS.Cognac));
  await out("images/banners/process-poster.webp", processPoster(1200, 800));
  await out("images/banners/lifestyle.webp", lifestyleSvg(1600, 1000));
  await out("images/journal/patina.webp", journalSvg("patina"));
  await out("images/journal/studio.webp", journalSvg("studio"));
  await out("images/journal/what-fits.webp", journalSvg("what-fits"));
  await out("images/placeholder.webp", productSvg("tote", "#D9C8B4", "front"));
  await out("og-image.jpg", ogSvg(), 84);
  console.timeEnd("images");
  console.log(`Wrote ${written} images to /public`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
