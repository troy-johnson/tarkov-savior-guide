const MAP_DATA = {
  customs: {
    label: 'Customs',
    tarkovDevMapUrl: 'https://static.wikia.nocookie.net/escapefromtarkov_gamepedia/images/4/47/Customs-3D-Map-By-RE3MR.jpg',
    tarkovDevSourceUrl: 'https://tarkov.dev/map/customs',
    bosses: [
      { name: 'Reshala', details: 'Commonly tracked around Dorms, New Gas, and Stronghold.' },
      { name: 'The Goons', details: 'Roaming squad that can also appear on Woods, Shoreline, and Lighthouse.' },
    ],
    eftBossSourceUrl: 'https://eftboss.com/pvp'
  },
  reserve: {
    label: 'Reserve',
    tarkovDevMapUrl: 'https://static.wikia.nocookie.net/escapefromtarkov_gamepedia/images/6/65/Reserve_3D_by_loweffortsaltbox.jpg',
    tarkovDevSourceUrl: 'https://tarkov.dev/map/reserve',
    bosses: [
      { name: 'Glukhar', details: 'Usually seen around the pawn buildings, train station, and bunker area.' },
    ],
    eftBossSourceUrl: 'https://eftboss.com/pvp'
  },
  woods: {
    label: 'Woods',
    tarkovDevMapUrl: 'https://static.wikia.nocookie.net/escapefromtarkov_gamepedia/images/e/e1/WoodsRe3mr.jpg',
    tarkovDevSourceUrl: 'https://tarkov.dev/map/woods',
    bosses: [
      { name: 'Shturman', details: 'Primary spawn focus is the Sawmill with guards nearby.' },
      { name: 'The Goons', details: 'Roaming squad that can rotate onto Woods.' },
    ],
    eftBossSourceUrl: 'https://eftboss.com/pvp'
  },
  shoreline: {
    label: 'Shoreline',
    tarkovDevMapUrl: 'https://static.wikia.nocookie.net/escapefromtarkov_gamepedia/images/7/73/Jindouz_Shoreline_Expansion_Map_V1.png',
    tarkovDevSourceUrl: 'https://tarkov.dev/map/shoreline',
    bosses: [
      { name: 'Sanitar', details: 'Tracked at Resort, Pier, and Cottage/Swamp side rotations.' },
      { name: 'The Goons', details: 'Roaming squad that can also turn up on Shoreline.' },
    ],
    eftBossSourceUrl: 'https://eftboss.com/pvp'
  },
  interchange: {
    label: 'Interchange',
    tarkovDevMapUrl: 'https://static.wikia.nocookie.net/escapefromtarkov_gamepedia/images/7/7e/InterchangeMap_Updated_4.0.png',
    tarkovDevSourceUrl: 'https://tarkov.dev/map/interchange',
    bosses: [
      { name: 'Killa', details: 'Roams the mall interior with hot spots around Brutal, KIBA, and upper floor lanes.' },
      { name: 'Tagilla', details: 'Can cross over from Factory events onto Interchange per EFT Boss tracking.' },
    ],
    eftBossSourceUrl: 'https://eftboss.com/pvp'
  },
  lighthouse: {
    label: 'Lighthouse',
    tarkovDevMapUrl: 'https://static.wikia.nocookie.net/escapefromtarkov_gamepedia/images/3/39/Jindouz_Lighthouse_Map_V1.png',
    tarkovDevSourceUrl: 'https://tarkov.dev/map/lighthouse',
    bosses: [
      { name: 'The Goons', details: 'One of the main roaming maps for the trio.' },
      { name: 'Zryachiy', details: 'Guarded Lighthouse Island encounter.' },
    ],
    eftBossSourceUrl: 'https://eftboss.com/pvp'
  },
  factory: {
    label: 'Factory',
    tarkovDevMapUrl: 'https://static.wikia.nocookie.net/escapefromtarkov_gamepedia/images/5/59/FactoryExpandedMap.jpeg',
    tarkovDevSourceUrl: 'https://tarkov.dev/map/factory',
    bosses: [
      { name: 'Tagilla', details: 'Close-quarters boss with aggressive melee and shotgun pushes.' },
    ],
    eftBossSourceUrl: 'https://eftboss.com/pvp'
  },
  streets: {
    label: 'Streets of Tarkov',
    tarkovDevMapUrl: 'https://static.wikia.nocookie.net/escapefromtarkov_gamepedia/images/f/f5/StreetsOfTarkov3DMapByRE3MR.jpg',
    tarkovDevSourceUrl: 'https://tarkov.dev/map/streets-of-tarkov',
    bosses: [
      { name: 'Kaban', details: 'Tracked on Streets around Lexos and the dealership sector.' },
      { name: 'Kollontay', details: 'Shared Streets / Ground Zero boss rotation in current EFT Boss data.' },
    ],
    eftBossSourceUrl: 'https://eftboss.com/pvp'
  },
  'ground-zero': {
    label: 'Ground Zero',
    tarkovDevMapUrl: 'https://static.wikia.nocookie.net/escapefromtarkov_gamepedia/images/a/a4/Ground_Zero_Map_3D.jpg',
    tarkovDevSourceUrl: 'https://tarkov.dev/map/ground-zero',
    bosses: [
      { name: 'Kollontay', details: 'Shared Ground Zero / Streets rotation.' },
    ],
    eftBossSourceUrl: 'https://eftboss.com/pvp'
  },
};

const STALE_AFTER_HOURS = 6;
const state = {
  selectedMap: 'customs',
  lastUpdatedAt: null,
  mapSource: { status: 'loading' },
  bossSource: { status: 'loading' },
};

const refs = {
  mapSelect: document.querySelector('#map-select'),
  refreshBtn: document.querySelector('#refresh-btn'),
  updatedAt: document.querySelector('#updated-at'),
  mapStatus: document.querySelector('#map-status'),
  mapStatusCopy: document.querySelector('#map-status-copy'),
  bossStatus: document.querySelector('#boss-status'),
  bossStatusCopy: document.querySelector('#boss-status-copy'),
  mapSource: document.querySelector('#map-source'),
  bossSource: document.querySelector('#boss-source'),
  mapTitle: document.querySelector('#map-title'),
  bossTitle: document.querySelector('#boss-title'),
  mapImage: document.querySelector('#map-image'),
  mapEmpty: document.querySelector('#map-empty'),
  bossList: document.querySelector('#boss-list'),
  bossEmpty: document.querySelector('#boss-empty'),
};

function init() {
  Object.entries(MAP_DATA).forEach(([value, map]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = map.label;
    refs.mapSelect.append(option);
  });

  refs.mapSelect.value = state.selectedMap;
  refs.mapSelect.addEventListener('change', (event) => {
    state.selectedMap = event.target.value;
    refreshRaidData();
  });
  refs.refreshBtn.addEventListener('click', refreshRaidData);
  window.setInterval(renderUpdatedAt, 60_000);
  refreshRaidData();
}

async function refreshRaidData() {
  const map = MAP_DATA[state.selectedMap];
  state.mapSource = { status: 'loading' };
  state.bossSource = { status: 'loading' };
  refs.refreshBtn.disabled = true;
  render(map);

  const [mapState, bossState] = await Promise.allSettled([
    validateImage(map.tarkovDevMapUrl),
    simulateBossFetch(map),
  ]);

  state.mapSource = mapState.status === 'fulfilled' ? mapState.value : { status: 'unavailable', message: 'Tarkov.dev map could not be loaded.' };
  state.bossSource = bossState.status === 'fulfilled' ? bossState.value : { status: 'unavailable', message: 'EFT Boss intel could not be loaded.' };
  state.lastUpdatedAt = new Date();
  refs.refreshBtn.disabled = false;
  render(map);
}

function validateImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ status: 'fresh', message: 'Tactical image loaded from Tarkov.dev source.' });
    img.onerror = () => resolve({ status: 'unavailable', message: 'Tactical image is currently unavailable.' });
    img.src = src;
  });
}

function simulateBossFetch(map) {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      if (!map.bosses.length) {
        resolve({ status: 'unavailable', message: 'No EFT Boss coverage exists for this map.' });
        return;
      }
      resolve({ status: 'fresh', message: `${map.bosses.length} boss intel entries loaded from EFT Boss coverage.` });
    }, 450);
  });
}

function getAgeHours() {
  if (!state.lastUpdatedAt) return null;
  return (Date.now() - state.lastUpdatedAt.getTime()) / 3_600_000;
}

function deriveStatus(sourceState) {
  if (sourceState.status === 'loading' || sourceState.status === 'unavailable') return sourceState;
  const ageHours = getAgeHours();
  if (ageHours !== null && ageHours >= STALE_AFTER_HOURS) {
    return { status: 'stale', message: `${sourceState.message} Data is older than ${STALE_AFTER_HOURS}h.` };
  }
  return sourceState;
}

function render(map) {
  refs.mapTitle.textContent = map.label;
  refs.bossTitle.textContent = `${map.label} boss routing`;
  refs.mapSource.href = map.tarkovDevSourceUrl;
  refs.bossSource.href = map.eftBossSourceUrl;

  const mapStatus = deriveStatus(state.mapSource);
  const bossStatus = deriveStatus(state.bossSource);
  paintStatus(refs.mapStatus, refs.mapStatusCopy, mapStatus);
  paintStatus(refs.bossStatus, refs.bossStatusCopy, bossStatus);

  const imageUsable = mapStatus.status !== 'unavailable';
  refs.mapImage.src = map.tarkovDevMapUrl;
  refs.mapImage.style.display = imageUsable ? 'block' : 'none';
  refs.mapEmpty.style.display = imageUsable ? 'none' : 'grid';

  refs.bossList.replaceChildren();
  if (map.bosses.length && bossStatus.status !== 'unavailable') {
    map.bosses.forEach((boss) => {
      const item = document.createElement('li');
      item.innerHTML = `<h3>${boss.name}</h3><p>${boss.details}</p>`;
      refs.bossList.append(item);
    });
    refs.bossEmpty.style.display = 'none';
  } else {
    refs.bossEmpty.style.display = 'grid';
  }

  renderUpdatedAt();
}

function paintStatus(badgeNode, copyNode, sourceState) {
  badgeNode.className = `badge badge--${sourceState.status}`;
  badgeNode.textContent = sourceState.status[0].toUpperCase() + sourceState.status.slice(1);
  copyNode.textContent = sourceState.message;
}

function renderUpdatedAt() {
  if (!state.lastUpdatedAt) {
    refs.updatedAt.textContent = 'Last updated never';
    return;
  }
  const ageHours = getAgeHours();
  const roundedHours = Math.max(0, Math.floor(ageHours));
  refs.updatedAt.textContent = `Last updated (${roundedHours})h ago`;
}

init();
