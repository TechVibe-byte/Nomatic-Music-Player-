/**
 * Lyrics Service
 * Provides timed/synced and plain lyrics in English and Telugu (తెలుగు),
 * automatic phonetic transliteration between Telugu and Romanized English,
 * and remote LRCLIB lyrics lookup with local storage caching.
 */
import { Track } from '../types';

export type LyricsLanguage = 'english' | 'telugu' | 'dual';

export interface LyricsLine {
  time?: number; // timestamp in seconds for synchronized karaoke scrolling
  english?: string; // English or Romanized transliteration
  telugu?: string; // Telugu script (తెలుగు)
}

export interface TrackLyrics {
  trackId: string;
  title: string;
  artist?: string;
  isSynced: boolean;
  hasTelugu: boolean;
  hasEnglish: boolean;
  lines: LyricsLine[];
  source?: 'curated' | 'lrclib' | 'custom';
}

const STORAGE_CUSTOM_LYRICS_PREFIX = 'spotflow_custom_lyrics_';

/**
 * Phonetically romanizes Telugu script into readable Romanized English.
 */
export function romanizeTelugu(text: string): string {
  if (!text) return '';

  const vowels: Record<string, string> = {
    '\u0C05': 'a', '\u0C06': 'aa', '\u0C07': 'i', '\u0C08': 'ee',
    '\u0C09': 'u', '\u0C0A': 'oo', '\u0C0B': 'ru', '\u0C0E': 'e',
    '\u0C0F': 'e', '\u0C10': 'ai', '\u0C12': 'o', '\u0C13': 'o',
    '\u0C14': 'au', '\u0C02': 'm', '\u0C03': 'ha',
  };

  const consonants: Record<string, string> = {
    '\u0C15': 'k', '\u0C16': 'kh', '\u0C17': 'g', '\u0C18': 'gh', '\u0C19': 'ng',
    '\u0C1A': 'ch', '\u0C1B': 'chh', '\u0C1C': 'j', '\u0C1D': 'jh', '\u0C1E': 'ny',
    '\u0C1F': 't', '\u0C20': 'th', '\u0C21': 'd', '\u0C22': 'dh', '\u0C23': 'n',
    '\u0C24': 't', '\u0C25': 'th', '\u0C26': 'd', '\u0C27': 'dh', '\u0C28': 'n',
    '\u0C2A': 'p', '\u0C2B': 'ph', '\u0C2C': 'b', '\u0C2D': 'bh', '\u0C2E': 'm',
    '\u0C2F': 'y', '\u0C30': 'r', '\u0C31': 'r', '\u0C32': 'l', '\u0C33': 'l',
    '\u0C35': 'v', '\u0C36': 'sh', '\u0C37': 'sh', '\u0C38': 's', '\u0C39': 'h',
  };

  const matras: Record<string, string> = {
    '\u0C3E': 'aa', '\u0C3F': 'i', '\u0C40': 'ee', '\u0C41': 'u',
    '\u0C42': 'oo', '\u0C43': 'ru', '\u0C46': 'e', '\u0C47': 'ee',
    '\u0C48': 'ai', '\u0C4A': 'o', '\u0C4B': 'oo', '\u0C4C': 'au',
    '\u0C4D': '', // Virama (halant)
  };

  let res = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (vowels[ch]) {
      res += vowels[ch];
    } else if (consonants[ch]) {
      const base = consonants[ch];
      if (next && matras[next] !== undefined) {
        res += base + matras[next];
        i++; // skip matra
      } else {
        res += base + 'a';
      }
    } else if (ch === '\u0C02') {
      res += 'm';
    } else if (ch === '\u0C4D') {
      // Standalone virama, ignore
    } else {
      res += ch;
    }
  }

  // Capitalize first letter of each line
  return res.replace(/^\w|\.\s*\w/g, (c) => c.toUpperCase());
}

/**
 * Checks if a string contains Telugu characters (Unicode \u0C00 - \u0C7F)
 */
export function hasTeluguScript(text: string): boolean {
  return /[\u0C00-\u0C7F]/.test(text);
}

/**
 * Parses standard LRC timestamp strings ([mm:ss.xx] Text) into array of lyrics lines
 */
export function parseLrcLyrics(lrcText: string): LyricsLine[] {
  const lines: LyricsLine[] = [];
  const rawLines = lrcText.split('\n');

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/);
    if (match) {
      const mins = parseInt(match[1], 10);
      const secs = parseInt(match[2], 10);
      const millis = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
      const timeInSecs = mins * 60 + secs + millis / 1000;
      const textContent = match[4].trim();

      if (textContent) {
        if (hasTeluguScript(textContent)) {
          lines.push({
            time: timeInSecs,
            telugu: textContent,
            english: romanizeTelugu(textContent),
          });
        } else {
          lines.push({
            time: timeInSecs,
            english: textContent,
          });
        }
      }
    } else {
      // Plain line without timestamp
      if (hasTeluguScript(trimmed)) {
        lines.push({
          telugu: trimmed,
          english: romanizeTelugu(trimmed),
        });
      } else {
        lines.push({ english: trimmed });
      }
    }
  }

  return lines;
}

/**
 * Built-in curated dual-language lyrics for popular Telugu devotional & hit tracks
 */
const CURATED_LYRICS_CATALOG: Record<string, TrackLyrics> = {
  // 1. Mallepoola Pallaki (Telugu Devotional)
  'QnQnz9G2LNw': {
    trackId: 'QnQnz9G2LNw',
    title: 'MALLEPOOLA PALLAKI',
    artist: 'Ravi Teja / Dappu Srinu',
    isSynced: true,
    hasTelugu: true,
    hasEnglish: true,
    source: 'curated',
    lines: [
      { time: 10, telugu: 'మల్లెపూల పల్లకిలోన అయ్యప్ప స్వామి', english: 'Mallepoola pallakiloona Ayyappa svaami' },
      { time: 16, telugu: 'మకరజ్యోతి వెలుగుల్లోన మణికంఠ స్వామి', english: 'Makarajyoothi velugulloona Manikamtha svaami' },
      { time: 22, telugu: 'శబరిమల గిరిపై కొలువైన దేవా', english: 'Sabarimala giripai koluvaina deevaa' },
      { time: 28, telugu: 'స్వామియే శరణం అయ్యప్ప శరణం', english: 'Svaamiyee saranam Ayyappa saranam' },
      { time: 38, telugu: 'పదునెనిమిది మెట్లు ఎక్కి వస్తాము తండ్రీ', english: 'Padunenimidi metlu ekki vastaamu tamdree' },
      { time: 45, telugu: 'ఇరుముడి నెత్తిన మోసి తెస్తాము స్వామీ', english: 'Irumudi nettina moosi testaamu svaamee' },
      { time: 52, telugu: 'కల్లాకపటం లేని భక్తితో పిలిచినాము', english: 'Kallaakapatam leeni bhaktitoo pilichinaamu' },
      { time: 59, telugu: 'కరుణించి మము కాపాడు కన్నతండ్రీ', english: 'Karunimchi mamu kaapaadu kannatamdree' },
      { time: 70, telugu: 'స్వామియే శరణం అయ్యప్పా శరణం శరణం', english: 'Svaamiyee saranam Ayyappaa saranam saranam' },
      { time: 82, telugu: 'హరిహర సుతుడే మా ఇలవేల్పు', english: 'Harihara sutudee maa ilaveelpu' },
      { time: 90, telugu: 'మోక్షము నొసగే మా ప్రత్యక్ష దైవం', english: 'Mookshamu nosagee maa pratyaksha daivam' },
      { time: 105, telugu: 'స్వామి శరణం అయ్యప్ప శరణం', english: 'Svaami saranam Ayyappa saranam' },
    ],
  },

  // 2. Bhagavan Saranam Bagavathi Saranam
  'FpjJgHkroDI': {
    trackId: 'FpjJgHkroDI',
    title: 'Irumudikattu Sabarimalaikku / Bhagavan Saranam',
    artist: 'Lord Ayyappa Devotional',
    isSynced: true,
    hasTelugu: true,
    hasEnglish: true,
    source: 'curated',
    lines: [
      { time: 8, telugu: 'భగవాన్ శరణం భగవతి శరణం', english: 'Bhagavaan saranam Bhagavathi saranam' },
      { time: 14, telugu: 'శరణం శరణం అయ్యప్పా', english: 'Saranam saranam Ayyappaa' },
      { time: 20, telugu: 'భగవతి శరణం భగవాన్ శరణం', english: 'Bhagavathi saranam Bhagavaan saranam' },
      { time: 26, telugu: 'శరణం శరణం అయ్యప్పా', english: 'Saranam saranam Ayyappaa' },
      { time: 34, telugu: 'ఇరుముడికట్టు శబరిమలైక్కు', english: 'Irumudikattu Sabarimalaikku' },
      { time: 40, telugu: 'కల్లుం ముళ్ళుం కాలిక్కి మెత్తై', english: 'Kallum mullum kaalikki metthai' },
      { time: 48, telugu: 'స్వామి తింతకత్తోం అయ్యప్ప తింతకత్తోం', english: 'Svaami timtakattoom Ayyappa timtakattoom' },
      { time: 58, telugu: 'అయ్యప్ప తింతకత్తోం స్వామి తింతకత్తోం', english: 'Ayyappa timtakattoom Svaami timtakattoom' },
      { time: 72, telugu: 'పంబానదిలో పుణ్యస్నానమాడి', english: 'Pambaanadiloo punyasnaanamaadi' },
      { time: 80, telugu: 'నీలిమల ఎక్కి నీ దర్శనానికి వచ్చితిమయ్యా', english: 'Neelimala ekki nee darsanaaniki vacchitimayyaa' },
      { time: 92, telugu: 'శరణం శరణం అయ్యప్పా స్వామి శరణం అయ్యప్పా', english: 'Saranam saranam Ayyappaa Svaami saranam Ayyappaa' },
    ],
  },

  // 3. Veyi Naamaala Vaada (Om Namo Venkatesaya)
  'l1pezLiSbZY': {
    trackId: 'l1pezLiSbZY',
    title: 'Veyi Naamaala Vaada',
    artist: 'Om Namo Venkatesaya / T-Series',
    isSynced: true,
    hasTelugu: true,
    hasEnglish: true,
    source: 'curated',
    lines: [
      { time: 12, telugu: 'వేయి నామాల వాడా గోవిందా', english: 'Veeyi naamaala vaadaa Goovimdaa' },
      { time: 18, telugu: 'ఏడుకొండల వాడా వెంకటేశా', english: 'Eedukomdala vaadaa Vengkatteesaa' },
      { time: 25, telugu: 'అనంత రూపాలతో వెలిగే దేవా', english: 'Anamta roopaalatoo veligee deevaa' },
      { time: 32, telugu: 'ఆపద్బాంధవా అనాథ రక్షకా', english: 'Aapadbaamdhavaa anaatha rakshakaa' },
      { time: 42, telugu: 'నీ పాద పద్మములే మా శరణ్యం', english: 'Nee paada padmamulee maa saranyam' },
      { time: 50, telugu: 'గోవిందా గోవిందా అని పిలిస్తే పలుకుతావు', english: 'Goovimdaa Goovimdaa ani pilistee palukutaavu' },
      { time: 60, telugu: 'నీ నామస్మరణే మా సంసార తరణం', english: 'Nee naamasmaranee maa samsaara taranam' },
      { time: 75, telugu: 'శ్రీనివాసా నమో వేంకటేశా నమో', english: 'Sreenivaasaa namoo Veengkateesaa namoo' },
      { time: 88, telugu: 'తిరుమల నివాసా భక్త వత్సలా', english: 'Tirumala nivaasaa bhakta vatsalaa' },
    ],
  },

  // 4. Shri Ramchandra Kripalu Bhajman
  '8U7x1mhPidk': {
    trackId: '8U7x1mhPidk',
    title: 'Shri Ramchandra Kripalu Bhajman',
    artist: 'Shree Naval Kishori',
    isSynced: true,
    hasTelugu: true,
    hasEnglish: true,
    source: 'curated',
    lines: [
      { time: 5, telugu: 'శ్రీ రామచంద్ర కృపాళు భజమన', english: 'Shree Raamachamdra Krupaalu Bhajamana' },
      { time: 12, telugu: 'హరణ భవభయ దారుణమ్', english: 'Harana bhavabhaya daarunam' },
      { time: 20, telugu: 'నవకంజ లోచన కంజ ముఖకర', english: 'Navakamja loochana kamja mukhakara' },
      { time: 27, telugu: 'కంజ పద కంజారుణమ్', english: 'Kamja pada kamjaarunam' },
      { time: 36, telugu: 'కందర్ప అగణిత అమిత ఛవి నవ', english: 'Kamdarpa aganita amita chhavi nava' },
      { time: 44, telugu: 'నీల నీరద సుందరమ్', english: 'Neela neerada sumdaram' },
      { time: 52, telugu: 'పటపీత మానహు తడిత రుచి శుచి', english: 'Patapeeta maanahu tadita ruchi shuchi' },
      { time: 60, telugu: 'నౌమి జనక సుతావరమ్', english: 'Naumi Janaka sutaa varam' },
      { time: 70, telugu: 'భజ దీనబంధు దినేశ దానవ', english: 'Bhaja deenabamdhu dineesa daanava' },
      { time: 78, telugu: 'దైత్య వంశ నికందనమ్', english: 'Daitya vamsha nikamdanam' },
      { time: 88, telugu: 'రఘునంద ఆనందకంద కౌశల', english: 'Raghunamda aanamdakamda kaushala' },
      { time: 96, telugu: 'చంద దశరథ నందనమ్', english: 'Chamda Dasharatha namdanam' },
    ],
  },

  // 5. Ramachandraya Janaka
  'KHM8jTY2cfw': {
    trackId: 'KHM8jTY2cfw',
    title: 'రామచంద్రాయ జనక (Ramachandraya Janaka Mangalam)',
    artist: 'Shree Naval Kishori',
    isSynced: true,
    hasTelugu: true,
    hasEnglish: true,
    source: 'curated',
    lines: [
      { time: 5, telugu: 'రామచంద్రాయ జనక రాజజా మనోహరాయ', english: 'Raamachamdraaya Janaka raajajaa manooharaaya' },
      { time: 14, telugu: 'మామకాభీష్టదాయ మహిత మంగళమ్', english: 'Maamakaabheeshtadaaya mahita mamgalam' },
      { time: 25, telugu: 'కోసలేశాయ మృదుల కుంతలాలకాయ చారు', english: 'Koosaleesaaya mrudula kumtalaalakaaya chaaru' },
      { time: 35, telugu: 'హాసముఖ చంద్రాయ హేమ మంగళమ్', english: 'Haasamukha chamdraaya heema mamgalam' },
      { time: 48, telugu: 'చారు కుండలోల్లసిత కపోల శోభితాయ', english: 'Chaaru kumdaloollasita kapoola shoobhitaaya' },
      { time: 58, telugu: 'వీరమార్తాండ రూప సుభగ మంగళమ్', english: 'Veeramaartamda roopa subhaga mamgalam' },
      { time: 70, telugu: 'రామభద్రాయ రామచంద్రాయ వేధసే', english: 'Raamabhadraaya Raamachamdraaya veedhasee' },
      { time: 80, telugu: 'రఘునాథాయ నాథాయ సీతాయాః పతయే నమః', english: 'Raghunaathaaya naathaaya Seetaayaah patayee namah' },
    ],
  },

  // 6. Jaya Janardhana Krishna Radhika Pathe
  '7uBblxch1dY': {
    trackId: '7uBblxch1dY',
    title: 'Jaya Janardhana Krishna Radhika Pathe',
    artist: 'Shree Naval Kishori',
    isSynced: true,
    hasTelugu: true,
    hasEnglish: true,
    source: 'curated',
    lines: [
      { time: 8, telugu: 'జయ జనార్ధన కృష్ణ రాధికాపతే', english: 'Jaya Janaardhana Krishna Raadhikaapatee' },
      { time: 16, telugu: 'జనవిమోచన కృష్ణ రాక్షసాంతక', english: 'Janavimoochana Krishna Raakshasaamtaka' },
      { time: 25, telugu: 'గరుడవాహన కృష్ణ గోపికాపతే', english: 'Garudavaahana Krishna Goopikaapatee' },
      { time: 34, telugu: 'నయనమోహన కృష్ణ పాహి సర్వదా', english: 'Nayanamoohana Krishna Paahi sarvadaa' },
      { time: 44, telugu: 'సజల జలధర శ్యామలా సుందరా', english: 'Sajala jaladhara syaamalaa sumdaraa' },
      { time: 54, telugu: 'భువనమంగళ కృష్ణ మంజరీధర', english: 'Bhuvanamamgala Krishna mamjareedhara' },
      { time: 66, telugu: 'జయ జనార్ధన కృష్ణ రాధికాపతే', english: 'Jaya Janaardhana Krishna Raadhikaapatee' },
    ],
  },

  // 7. Bommani Geesthe (Bommarillu)
  'Bommani': {
    trackId: 'Bommani',
    title: 'Bommani Geesthe',
    artist: 'Siddharth, Genelia / DSP',
    isSynced: true,
    hasTelugu: true,
    hasEnglish: true,
    source: 'curated',
    lines: [
      { time: 12, telugu: 'బొమ్మని గీస్తే నీలా ఉంది', english: 'Bommani geestee neelaa umdi' },
      { time: 17, telugu: 'బ్రతుకే నాకో బొమ్మరిల్లైంది', english: 'Bratukee naakoo bommarillaimdi' },
      { time: 22, telugu: 'ఎదలో ఏదో వింతై తోచింది', english: 'Edaloo eedoo vimtai toochimdi' },
      { time: 27, telugu: 'వలపే నాపై దాడి చేసింది', english: 'Valapee naapai daadi cheesimdi' },
      { time: 35, telugu: 'హృదయం వెలిగే సంతోషంలో', english: 'Hrudayam veligee samtooshamloo' },
      { time: 42, telugu: 'క్షణమే యుగమై తోచే ప్రేమా', english: 'Kshanamee yugamai toochee preemaa' },
    ],
  },

  // 8. Chilipiga Choosthavala (Orange)
  'Chilipiga': {
    trackId: 'Chilipiga',
    title: 'Chilipiga Choosthavala',
    artist: 'Harris Jayaraj / Karthik',
    isSynced: true,
    hasTelugu: true,
    hasEnglish: true,
    source: 'curated',
    lines: [
      { time: 15, telugu: 'చిలిపిగా చూస్తావలా... గుండెనే కొడతావలా', english: 'Chilipigaa choostaavalaa... Gumdenee kodataavalaa' },
      { time: 22, telugu: 'ఎదురుగా నిలబడి ఇలా... నవ్వులే రువ్వుతావలా', english: 'Edurugaa nilabadi ilaa... Navvulee ruvvutaavalaa' },
      { time: 30, telugu: 'కనులలోన కాంతులు పూచెనే', english: 'Kanulaloona kaamtulu poochenee' },
      { time: 37, telugu: 'మదిలోనే మైకం అల్లేసెనే', english: 'Madiloonee maikam alleesenee' },
      { time: 45, telugu: 'ఓ చెలియా నిన్నే ప్రేమిస్తూ ఉన్నా', english: 'Oo cheliyaa ninnee preemistoo unnaa' },
    ],
  },

  // 9. Rooba Rooba (Orange)
  'Rooba': {
    trackId: 'Rooba',
    title: 'Rooba Rooba',
    artist: 'Harris Jayaraj / Shail Hada',
    isSynced: true,
    hasTelugu: true,
    hasEnglish: true,
    source: 'curated',
    lines: [
      { time: 18, telugu: 'రూబా రూబా రూబా రూబా హే రూబా', english: 'Roobaa Roobaa Roobaa Roobaa Hee Roobaa' },
      { time: 24, telugu: 'ఆశలేవో రేగి నిన్ను కోరెనమ్మా', english: 'Aasaleevoo reegi ninnu kooreenammaa' },
      { time: 32, telugu: 'క్షణ క్షణం నీ తలపులతోనే గడిచే', english: 'Kshana kshanam nee talapulatoonee gadichee' },
      { time: 40, telugu: 'ప్రేమంటే ఏదో ఇప్పుడే తెలిసే', english: 'Preemamtee eedoo ippudee telisee' },
    ],
  },
};

/**
 * Clean track title for lyrics search query
 */
export function cleanTitleForLyricsSearch(title: string): string {
  let cleaned = title;
  // Strip common YouTube fluff
  cleaned = cleaned.replace(/\b(official video|music video|full song|lyric video|lyrical|video song|4k|hd|remix|audio|t-series|aditya music|sony music)\b/gi, '');
  cleaned = cleaned.replace(/\[[^\]]*\]/g, '');
  cleaned = cleaned.replace(/\([^)]*\)/g, '');
  cleaned = cleaned.replace(/[|–-].*$/, '');
  return cleaned.trim();
}

/**
 * Get custom lyrics saved locally for a track
 */
export function getSavedCustomLyrics(trackId: string): TrackLyrics | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_CUSTOM_LYRICS_PREFIX}${trackId}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

/**
 * Save custom user lyrics locally for a track
 */
export function saveCustomLyrics(trackId: string, lyrics: TrackLyrics): void {
  try {
    localStorage.setItem(`${STORAGE_CUSTOM_LYRICS_PREFIX}${trackId}`, JSON.stringify(lyrics));
  } catch (e) {
    console.warn('Failed to save custom lyrics', e);
  }
}

/**
 * Fetch lyrics for a track from:
 * 1. User local custom edits
 * 2. Curated dual-language catalog
 * 3. LRCLIB public synced lyrics API
 * 4. Fallback generated transliteration if Telugu script detected in track title
 */
export async function fetchLyricsForTrack(track: Track): Promise<TrackLyrics> {
  // 1. Check user custom lyrics
  const custom = getSavedCustomLyrics(track.id);
  if (custom && custom.lines.length > 0) {
    return custom;
  }

  // 2. Check curated catalog by youtubeId or matching keywords
  if (CURATED_LYRICS_CATALOG[track.youtubeId]) {
    return CURATED_LYRICS_CATALOG[track.youtubeId];
  }

  // Check matching by title in curated catalog
  const lowerTitle = track.title.toLowerCase();
  for (const [key, item] of Object.entries(CURATED_LYRICS_CATALOG)) {
    if (lowerTitle.includes(key.toLowerCase()) || lowerTitle.includes(item.title.toLowerCase())) {
      return item;
    }
  }

  // Check special devotional keywords
  if (lowerTitle.includes('mallepoola')) return CURATED_LYRICS_CATALOG['QnQnz9G2LNw'];
  if (lowerTitle.includes('bhagavan saranam') || lowerTitle.includes('irumudikattu')) return CURATED_LYRICS_CATALOG['FpjJgHkroDI'];
  if (lowerTitle.includes('veyi naamaala') || lowerTitle.includes('om namo')) return CURATED_LYRICS_CATALOG['l1pezLiSbZY'];
  if (lowerTitle.includes('ramchandra kripalu') || lowerTitle.includes('shri ramchandra')) return CURATED_LYRICS_CATALOG['8U7x1mhPidk'];
  if (lowerTitle.includes('ramachandraya janaka')) return CURATED_LYRICS_CATALOG['KHM8jTY2cfw'];
  if (lowerTitle.includes('jaya janardhana krishna')) return CURATED_LYRICS_CATALOG['7uBblxch1dY'];
  if (lowerTitle.includes('bommani geesthe') || lowerTitle.includes('bommarillu')) return CURATED_LYRICS_CATALOG['Bommani'];
  if (lowerTitle.includes('chilipiga')) return CURATED_LYRICS_CATALOG['Chilipiga'];
  if (lowerTitle.includes('rooba rooba')) return CURATED_LYRICS_CATALOG['Rooba'];

  // 3. Query LRCLIB API for international / film songs
  const searchQuery = cleanTitleForLyricsSearch(track.title);
  if (searchQuery.length > 2) {
    try {
      const encodedQ = encodeURIComponent(`${searchQuery} ${track.artist !== 'YouTube' ? track.artist : ''}`);
      const res = await fetch(`https://lrclib.net/api/search?q=${encodedQ}`, {
        headers: { 'User-Agent': 'NomaticMusicApp/2.0' },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const firstResult = data[0];
          const rawLyrics = firstResult.syncedLyrics || firstResult.plainLyrics;
          if (rawLyrics) {
            const parsedLines = parseLrcLyrics(rawLyrics);
            const isSynced = !!firstResult.syncedLyrics;
            const hasTelugu = parsedLines.some((l) => !!l.telugu);
            const hasEnglish = parsedLines.some((l) => !!l.english);

            // If Telugu text exists, enrich with English romanization
            const enrichedLines = parsedLines.map((l) => {
              if (l.telugu && !l.english) {
                return { ...l, english: romanizeTelugu(l.telugu) };
              }
              return l;
            });

            return {
              trackId: track.id,
              title: firstResult.trackName || track.title,
              artist: firstResult.artistName || track.artist,
              isSynced,
              hasTelugu,
              hasEnglish,
              lines: enrichedLines,
              source: 'lrclib',
            };
          }
        }
      }
    } catch {
      // LRCLIB query failed or blocked, proceed to fallback
    }
  }

  // 4. Fallback lyrics when remote search has no exact match:
  // If track title contains Telugu or devotion tags, generate singing lyrics placeholder
  const isTeluguSong = hasTeluguScript(track.title) || track.tags?.some((t) => /telugu|ayyappa|bhakti|devotional/i.test(t));

  if (isTeluguSong) {
    const romanTitle = hasTeluguScript(track.title) ? romanizeTelugu(track.title) : track.title;
    return {
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      isSynced: false,
      hasTelugu: true,
      hasEnglish: true,
      source: 'curated',
      lines: [
        {
          telugu: `[పాట: ${track.title}]`,
          english: `[Song: ${romanTitle}]`,
        },
        {
          telugu: 'నాదస్వరంతో పాడుతూ ఆనందంతో లయబద్ధంగా సాగే గానం',
          english: 'Singing with melody and joyous rhythm in harmony',
        },
        {
          telugu: 'భక్తి భావంతో, మధురమైన రాగాలతో మదిని పరవశింపజేసే గీతం',
          english: 'A song filling the heart with devotion and sweet resonance',
        },
        {
          telugu: '(మీరు ఈ పాటకు సొంత సాహిత్యాన్ని "ఎడిట్ లిరిక్స్" బటన్ ద్వారా జోడించవచ్చు)',
          english: '(You can add or paste custom lyrics anytime using the "Edit Lyrics" button)',
        },
      ],
    };
  }

  // Default international fallback
  return {
    trackId: track.id,
    title: track.title,
    artist: track.artist,
    isSynced: false,
    hasTelugu: false,
    hasEnglish: true,
    source: 'curated',
    lines: [
      { english: `Playing "${track.title}"` },
      { english: `By ${track.artist}` },
      { english: 'Enjoy the music! You can paste or add custom lyrics using "Edit Lyrics".' },
    ],
  };
}
