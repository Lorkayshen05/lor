/**
 * Placeholder dish illustrations (inline SVG data URIs) used until real food
 * photography is supplied. Replace `MenuItem.image` with a photo URL and this
 * file can be deleted.
 */
export function dishArt(contents: string, rim = '#f4ead7', steam = false): string {
  const steamPaths = steam
    ? `<g stroke="#b9a98a" stroke-width="3" fill="none" stroke-linecap="round" opacity=".55">
         <path d="M150 62c-9 12 9 18 0 32"/><path d="M200 54c-9 12 9 18 0 32"/><path d="M250 62c-9 12 9 18 0 32"/>
       </g>`
    : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="#efe4cf"/>
  <ellipse cx="200" cy="250" rx="130" ry="14" fill="#000" opacity=".08"/>
  ${steamPaths}
  <path d="M82 150h236c0 62-46 100-118 100S82 212 82 150z" fill="${rim}" stroke="#c9a24a" stroke-width="3"/>
  <ellipse cx="200" cy="150" rx="118" ry="26" fill="${contents}" stroke="${rim}" stroke-width="6"/>
  <ellipse cx="170" cy="144" rx="38" ry="7" fill="#fff" opacity=".18"/>
  <path d="M150 250h100" stroke="#c9a24a" stroke-width="5" stroke-linecap="round"/>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
