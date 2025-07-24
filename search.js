// Cache DOM elements and create lookup indexes
const elements = {
  searchBox: document.getElementById("search-box"),
  results: document.getElementById("results")
};

// Create optimized lookup indexes
const kanjiIndex = new Map(); // kanji -> data
const idIndex = new Map();    // id -> kanji
const meaningIndex = new Map(); // normalized meaning -> Set of kanji

// Build indexes once
function buildIndexes() {
  for (const kanji in database) {
    const data = database[kanji];
    
    // Index by kanji
    kanjiIndex.set(kanji, data);
    
    // Index by ID
    idIndex.set(parseInt(data.id), kanji);
    
    // Index by meanings - split by ・ (Japanese middle dot)
    const meanings = data.meaning.split('・');
    for (const meaning of meanings) {
      const normalized = meaning.trim().toLowerCase();
      if (normalized) { // Skip empty meanings
        if (!meaningIndex.has(normalized)) {
          meaningIndex.set(normalized, new Set());
        }
        meaningIndex.get(normalized).add(kanji);
      }
    }
  }
}

// Call once on initialization
buildIndexes();

// Substring search within meanings
function substringSearchMeanings(searchTerm) {
  const searchLower = searchTerm.toLowerCase();
  const foundKanji = new Set();
  
  // Search through all meanings for substring matches
  for (const [meaning, kanjiSet] of meaningIndex) {
    if (meaning.includes(searchLower)) {
      for (const kanji of kanjiSet) {
        foundKanji.add(kanji);
      }
    }
  }
  
  return [...foundKanji];
}

// Optimized debounced function
const getPageNumber = _.debounce(function() {
  const kanjiList = elements.searchBox.value;
  
  if (kanjiList == null) { 
    elements.results.innerHTML = "";
    return;
  }  

  elements.results.innerHTML = ""; // Clear previous results
  
  const trimmed = kanjiList.trim();
  if (!trimmed) return;
  
  // Check for substring search (starts with ~)
  if (trimmed.startsWith('~')) {
    const searchTerm = trimmed.slice(1).trim(); // Remove ~ and trim
    if (searchTerm) {
      substringSearchByMeaning(searchTerm);
    }
    return;
  }
  
  // Check if it's a range (e.g., "1-100")
  if (trimmed.includes('-') && isValidRange(trimmed)) {
    searchByIDRange(trimmed);
  }
  // Check if it's a number (ID search)
  else if (!isNaN(parseInt(trimmed, 10))) {
    searchByID(trimmed);
  }
  // Check if first character is a letter (meaning search)
  else if (isLetter(trimmed[0])) {
    searchByMeaning(trimmed);
  }
  // Otherwise it's kanji search
  else {
    searchByKanji(trimmed);
  }   
}, 50);

function isLetter(c) {
  return Boolean(c) && c.toLowerCase() !== c.toUpperCase();
}

function isValidRange(str) {
  const parts = str.split('-');
  if (parts.length !== 2) return false;
  
  const start = parseInt(parts[0].trim(), 10);
  const end = parseInt(parts[1].trim(), 10);
  
  return !isNaN(start) && !isNaN(end) && start <= end;
}

// Optimized batch rendering
function printResults(kanjiArray) {
  if (!kanjiArray.length) return;
  
  const fragments = [];
  
  for (const kanji of kanjiArray) {
    const data = kanjiIndex.get(kanji);
    if (!data) continue;
    
    const kanjiBlock = `<div id='kanji-block'><h2>${data.page}</h2>` +
      `<div id='character'>${kanji}</div>` +
      `<div><span id='id'>${data.id}</span></div>` +
      `<div id='meaning'>${data.meaning.replace(/(・)/g, '<span class="sep">$1</span>')}</div>` +
      `<div><a href='http://jisho.org/search/${kanji}%23kanji' target='_blank'>Jisho</a></div></div>`;
    
    fragments.push(kanjiBlock);
  }
  
  // Single DOM update
  elements.results.innerHTML = fragments.join('');
}

function searchByIDRange(rangeStr) {
  const parts = rangeStr.split('-');
  const startID = parseInt(parts[0].trim(), 10);
  const endID = parseInt(parts[1].trim(), 10);
  
  const foundKanji = [];
  
  for (let id = startID; id <= endID; id++) {
    const kanji = idIndex.get(id);
    if (kanji) {
      foundKanji.push(kanji);
    }
  }
  
  printResults(foundKanji);
}

function searchByID(kanjiList) {
  const desiredKanjiIDs = kanjiList.split(" ")
    .map(id => parseInt(id.trim(), 10))
    .filter(id => !isNaN(id))
    .sort((a, b) => a - b);
  
  const foundKanji = [];
  
  for (const id of desiredKanjiIDs) {
    const kanji = idIndex.get(id);
    if (kanji) {
      foundKanji.push(kanji);
    }
  }
  
  printResults(foundKanji);
}

function searchByKanji(kanjiList) {
  const foundKanji = [];
  
  for (let i = 0; i < kanjiList.length; i++) {
    const kanji = kanjiList[i];
    if (kanjiIndex.has(kanji)) {
      foundKanji.push(kanji);
    }
  }
  
  printResults(foundKanji);
}

function searchByMeaning(searchTerm) {
  const searchLower = searchTerm.trim().toLowerCase();
  
  // Check if search contains slashes for OR search
  if (searchLower.includes('/')) {
    searchByMeaningOR(searchLower);
    return;
  }
  
  const foundKanji = new Set();
  
  // Search for exact meaning matches only
  if (meaningIndex.has(searchLower)) {
    const kanjiSet = meaningIndex.get(searchLower);
    for (const kanji of kanjiSet) {
      foundKanji.add(kanji);
    }
  }
  
  printResults([...foundKanji]);
}

function searchByMeaningOR(searchTerm) {
  const foundKanji = new Set();
  
  // Split by slash and trim each term
  const searchTerms = searchTerm.split('/')
    .map(term => term.trim().toLowerCase())
    .filter(term => term.length > 0); // Remove empty terms
  
  // For each search term, find matching kanji and add to set
  for (const term of searchTerms) {
    if (meaningIndex.has(term)) {
      const kanjiSet = meaningIndex.get(term);
      for (const kanji of kanjiSet) {
        foundKanji.add(kanji);
      }
    }
  }
  
  printResults([...foundKanji]);
}

function substringSearchByMeaning(searchTerm) {
  const foundKanji = substringSearchMeanings(searchTerm);
  printResults(foundKanji);
}