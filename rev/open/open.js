// @ts-check
// The bounce page behind "Open in rev": GitHub strips non-http links from PR bodies, so the PR block links
// here and this script hands the PR to the app. The PR travels in the URL fragment, which browsers never
// send to the server; the page holds no data.

const NAME = /^[A-Za-z0-9_.-]+$/;

/**
 * Reads a fragment of the form `#github.com/<owner>/<name>/pull/<n>`.
 * @param {string} hash
 * @returns {{ owner: string; name: string; number: number } | null}
 */
export function parseHash(hash) {
  const m = /^#?github\.com\/([^/]+)\/([^/]+)\/pull\/(\d{1,9})\/?$/.exec(hash);
  if (!m) return null;
  const owner = m[1] ?? "";
  const name = m[2] ?? "";
  const number = Number(m[3]);
  if (!NAME.test(owner) || !NAME.test(name) || /^\.+$/.test(owner) || /^\.+$/.test(name) || number === 0) return null;
  return { owner, name, number };
}

/** @param {{ owner: string; name: string; number: number }} pr */
export function deepLinkFor(pr) {
  return `redocly-rev://open?repo=${pr.owner}/${pr.name}&pr=${pr.number}`;
}

/** @param {{ owner: string; name: string; number: number }} pr */
export function cliCommandFor(pr) {
  return `rev open https://github.com/${pr.owner}/${pr.name}/pull/${pr.number}`;
}

/**
 * Fills the page and navigates to the deep link.
 * @param {Document} doc
 * @param {string} hash
 * @param {(url: string) => void} navigate
 */
export function run(doc, hash, navigate) {
  const pr = parseHash(hash);
  const set = (/** @type {string} */ id, /** @type {string} */ text) => {
    const el = doc.getElementById(id);
    if (el) el.textContent = text;
  };
  const hide = (/** @type {string} */ id) => {
    const el = doc.getElementById(id);
    if (el instanceof HTMLElement) el.hidden = true;
  };
  if (!pr) {
    set("title", "This link does not name a pull request");
    set("status", "Open rev links from the rev block in a pull request description.");
    // Nothing to open or copy: hide the now-empty command, the Copy button and the inert "#" link.
    hide("command");
    hide("copy");
    hide("open-link");
    return;
  }
  const link = deepLinkFor(pr);
  const command = cliCommandFor(pr);
  set("title", `Opening ${pr.owner}/${pr.name}#${pr.number} in rev…`);
  set("command", command);
  const open = doc.getElementById("open-link");
  if (open) open.setAttribute("href", link);
  const copy = doc.getElementById("copy");
  if (copy) {
    copy.addEventListener("click", () => {
      void doc.defaultView?.navigator.clipboard?.writeText(command)?.catch(() => {
        copy.textContent = "Copy failed";
      });
    });
  }
  navigate(link);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  run(document, window.location.hash, (url) => window.location.assign(url));
}
