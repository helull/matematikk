
'use strict';

// GitHub Pages: https://helull.github.io/<eventuell undermappe>/
const OWNER = 'helull';
const REPO = 'helull.github.io';
const BRANCH = ''; // Tom = bruk repositoryets standardgren.

const cards = document.querySelector('#cards');
const status = document.querySelector('#status');
const error = document.querySelector('#error');
const heading = document.querySelector('#heading');
const refresh = document.querySelector('#refresh');

function currentFolder() {
  const path = decodeURIComponent(location.pathname);
  const segments = path.split('/').filter(Boolean);
  if (segments.at(-1)?.toLowerCase() === 'index.html') {
    segments.pop();
  }
  return segments.join('/');
}

function displayName(name) {
  return name.replace(/\.html?$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\p{L}/u, x => x.toLocaleUpperCase('nb-NO'));
}

function pageUrl(fileName) {
  const base = new URL(location.href);
  if (!base.pathname.endsWith('/')) {
    base.pathname = base.pathname.slice(
      0, base.pathname.lastIndexOf('/') + 1
    );
  }
  return new URL(encodeURIComponent(fileName), base).href;
}

function addCard(file) {
  const link = document.createElement('a');
  link.className = 'card';
  link.href = pageUrl(file.name);

  const preview = document.createElement('div');
  preview.className = 'preview';

  const frame = document.createElement('iframe');
  frame.title = `Forhåndsvisning av ${displayName(file.name)}`;
  frame.loading = 'lazy';
  frame.tabIndex = -1;

  // Den faktiske HTML-siden lastes i miniatyr.
  frame.src = link.href;
  preview.append(frame);

  const body = document.createElement('div');
  body.className = 'card-body';

  const title = document.createElement('div');
  title.className = 'card-title';
  title.textContent = displayName(file.name);

  const meta = document.createElement('div');
  meta.className = 'card-meta';
  meta.textContent = 'Åpne programmet →';

  body.append(title, meta);
  link.append(preview, body);
  cards.append(link);

  // Skaler forhåndsvisningen til kortets bredde.
  const resize = new ResizeObserver(entries => {
    for (const entry of entries) {
      preview.style.setProperty(
        '--scale',
        entry.contentRect.width / 1200
      );
    }
  });
  resize.observe(preview);
}

async function load() {
  cards.replaceChildren();
  error.hidden = true;
  refresh.disabled = true;
  status.textContent = 'Henter programmer …';

  const folder = currentFolder();
  const folderName = folder.split('/').filter(Boolean).at(-1) || REPO;

  heading.textContent = displayName(folderName);
  document.title = `${heading.textContent} – Programoversikt`;

  try {
    const path = folder.split('/')
      .filter(Boolean)
      .map(encodeURIComponent)
      .join('/');

    const endpoint =
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;

    const url = new URL(endpoint);
    if (BRANCH) url.searchParams.set('ref', BRANCH);

    const response = await fetch(url, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(
        response.status === 404
          ? 'Mappen ble ikke funnet i det offentlige GitHub-repositoryet.'
          : `GitHub API svarte med HTTP ${response.status}.`
      );
    }

    const entries = await response.json();

    if (!Array.isArray(entries)) {
      throw new Error('GitHub returnerte ikke en mappeliste.');
    }

    const files = entries
      .filter(f =>
        f.type === 'file' &&
        /\.html?$/i.test(f.name) &&
        !/^index\.html?$/i.test(f.name)
      )
      .sort((a, b) =>
        a.name.localeCompare(b.name, 'nb', { numeric: true })
      );

    files.forEach(addCard);

    status.textContent =
      `${files.length} program${files.length === 1 ? '' : 'mer'}`;

    if (!files.length) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent =
        'Ingen andre HTML-filer funnet i denne mappen.';
      cards.append(empty);
    }

  } catch (e) {
    status.textContent = 'Kunne ikke hente programmene';
    error.textContent =
      `${e.message} Kontroller at repositoryet er offentlig, ` +
      `at OWNER/REPO stemmer og at GitHub API ikke har nådd ` +
      `forespørselsgrensen.`;
    error.hidden = false;

  } finally {
    refresh.disabled = false;
  }
}

refresh.addEventListener('click', load);
load();
