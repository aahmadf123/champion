/**
 * Single source of truth for every image on the page.
 *
 * Each asset has a logical id. The build resolves that id differently per target:
 *
 *   pages   -> optimized local derivatives in assets/img/, with srcset
 *   sidearm -> an absolute URL on Sidearm's own CloudFront, single src
 *
 * The two naming schemes are NOT mechanically convertible. Sidearm rewrites
 * uploads into a dated folder and appends a random suffix, so the map below is
 * hand-verified against the CloudFront URLs used by the previous Sidearm build
 * (recover it with: git show 3ef9ad6^:champion.html).
 *
 * `sidearm: null` means the asset has never been uploaded to Sidearm's media
 * library. The build degrades those gracefully rather than emitting a 404, and
 * prints an upload checklist. See README.md.
 */

export const CDN_BASE =
  'https://dbukjj6eu5tsf.cloudfront.net/sidearm.sites/supportutrockets.sidearmsports.com/images';

/** Derivative widths per asset kind. */
export const WIDTHS = {
  rendering: [640, 1024, 1600, 2000],
  portrait: [240, 480, 720],
  logo: [120, 240],
};

export const ASSETS = {
  // ---- Architectural renderings (masters are 3840x2160) --------------------
  exteriorEast: {
    kind: 'rendering',
    local: 'Exterior__East_Perspective_MSA.jpg',
    sidearm: '2026/2/27/Exterior_-_East_Perspective.MSA.jpg',
    alt: 'Architectural rendering of the Champions Complex seen from the east',
    sheet: 'A-101',
    label: 'East Perspective',
    caption:
      'The exterior view from the east, showing the modern facade that will anchor the athletic campus.',
  },
  exteriorEntry: {
    kind: 'rendering',
    local: 'Exterior__Main_Entry_MSA.jpg',
    sidearm: '2026/2/27/Exterior_-_Main_Entry.MSA.jpg',
    alt: 'Architectural rendering of the Champions Complex main entry',
    sheet: 'A-102',
    label: 'Main Entry',
    caption:
      'The main entry, designed to make a first impression on recruits, student-athletes, and visitors.',
  },
  indoorTurf: {
    kind: 'rendering',
    local: 'Indoor_Turf__Interior_Facing_MSA.jpg',
    sidearm: '2026/3/2/Indoor_Turf_-_Interior_Facing.MSA_Hr1H0.jpg',
    alt: 'Architectural rendering of the indoor turf training facility',
    sheet: 'A-201',
    label: 'Indoor Turf',
    caption:
      'A dedicated indoor training surface for year-round practice, whatever the Toledo weather is doing.',
  },
  trainingTable: {
    kind: 'rendering',
    local: 'Training_Table_MSA.jpg',
    sidearm: '2026/3/2/Training_Table.MSA_CUT8L.jpg',
    alt: 'Architectural rendering of the training table dining area',
    sheet: 'A-202',
    label: 'Training Table',
    caption:
      'A dining hall built for performance nutrition, and for the team culture that forms over a shared meal.',
  },
  academicLounge: {
    kind: 'rendering',
    local: 'AcademicsLounge_MSA.jpg',
    sidearm: '2026/2/27/Academics-Lounge.MSA.jpg',
    alt: 'Architectural rendering of the academic lounge',
    sheet: 'A-203',
    label: 'Academic Center',
    caption:
      'Lounge and study space with tutoring and advising support, steps from the practice field.',
  },
  championsEntry: {
    kind: 'rendering',
    local: 'Champions_Entry_MSA.jpg',
    sidearm: '2026/3/2/Champions_Entry.MSA_kdgSE.jpg',
    alt: 'Architectural rendering of the Champions entry hall',
    sheet: 'A-103',
    label: 'Champions Entry',
    caption:
      "An entry hall that celebrates Toledo's athletic history on the way to everything else in the building.",
  },
  baseballSuite: {
    kind: 'rendering',
    local: 'Baseball_Locker_RoomLounge_MSA.jpg',
    sidearm: '2026/3/2/Baseball_Locker_Room-Lounge.MSA_X17vr.jpg',
    alt: 'Architectural rendering of the baseball locker room and lounge',
    sheet: 'A-301',
    label: 'Baseball Team Suite',
    caption:
      'Locker room, meeting space, and lounge that bring Rocket baseball back to the main campus.',
  },
  softballSuite: {
    kind: 'rendering',
    local: 'Softball_Locker_RoomLounge_MSA.jpg',
    sidearm: '2026/3/2/Softball_Locker_Room-Lounge.MSA_XuGwA.jpg',
    alt: 'Architectural rendering of the softball locker room and lounge',
    sheet: 'A-302',
    label: 'Softball Team Suite',
    caption:
      'A dedicated home on campus for Rocket softball, with its own locker room and player lounge.',
  },
  championsCorridor: {
    kind: 'rendering',
    local: 'Champions_Corridor_MSA.jpg',
    sidearm: '2026/3/2/Champions_Corridor.MSA_M3Ow2.jpg',
    alt: 'Architectural rendering of the Champions corridor',
    sheet: 'A-104',
    label: 'Champions Corridor',
    caption:
      'The spine of the building. Every space connects to it, and every athlete walks it daily.',
  },

  // ---- Portraits ----------------------------------------------------------
  // The three testimonial photos exist locally but have NEVER been uploaded to
  // Sidearm. The build renders a monogram in their place on that target.
  johnRichter: {
    kind: 'portrait',
    local: 'JAR.png',
    sidearm: null,
    alt: 'John Alan Richter',
  },
  robReinstetle: {
    kind: 'portrait',
    local: 'Rob Reinstetle.png',
    sidearm: null,
    alt: 'Rob Reinstetle',
  },
  jessicaBracamonte: {
    kind: 'portrait',
    local: 'Jessica Bracamonte.png',
    sidearm: null,
    alt: 'Jessica Bracamonte',
  },
  connorWhelan: {
    kind: 'portrait',
    local: 'Connor_Whelan_-_2025.png',
    sidearm: '2025/7/8/Connor_Whelan_-_2025.PNG',
    alt: 'Connor Whelan',
  },
  joshDittman: {
    kind: 'portrait',
    local: 'Josh_Dittman_8sP4L.jpeg',
    sidearm: '2024/5/31/Josh_Dittman_8sP4L.jpeg',
    alt: 'Josh Dittman',
  },
  ryleighGordon: {
    kind: 'portrait',
    local: 'Ryleigh_Gordon_lZHnC.jpeg',
    sidearm: '2024/5/31/Ryleigh_Gordon_lZHnC.jpeg',
    alt: 'Ryleigh Gordon',
  },
  dillonHorter: {
    kind: 'portrait',
    local: 'Dillon_Horter_evaYx.jpeg',
    sidearm: '2024/5/31/Dillon_Horter_evaYx.jpeg',
    alt: 'Dillon Horter',
  },

  // ---- Marks -------------------------------------------------------------
  // Sidearm only hosts the light-background lockup, which would be invisible on
  // the dark footer. The Sidearm build therefore leans on Sidearm's own footer
  // branding instead of repeating the mark. See README.md.
  logoOnDark: {
    kind: 'logo',
    local: 'UT_Athletics_Primary_Logo_for_Dark_Background.png',
    sidearm: null,
    alt: 'University of Toledo Athletics',
  },
};

/**
 * Renderings that exist on Sidearm's CDN but have no local master, so they
 * cannot be optimized. Listed for completeness; not used by the build.
 * Download and drop into images/ to bring it into the set.
 */
export const CDN_ONLY = {
  academicStudy: {
    sidearm: '2026/2/27/Academics-Study.MSA.jpg',
    alt: 'Academic study rooms',
  },
};

/** Ordered ids for the drawing set / feature grid. */
export const DRAWING_SET = [
  'exteriorEast',
  'exteriorEntry',
  'championsEntry',
  'championsCorridor',
  'indoorTurf',
  'trainingTable',
  'academicLounge',
  'baseballSuite',
  'softballSuite',
];

export const missingOnSidearm = () =>
  Object.entries(ASSETS)
    .filter(([, a]) => a.sidearm === null)
    .map(([id, a]) => ({ id, local: a.local }));
