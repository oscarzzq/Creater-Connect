// Curated Unsplash photos used as creator portraits and content thumbnails.
// Every id was verified to exist; keys describe what the photo shows.

export const IMAGES = {
  // Portraits
  "p-maya": "1534528741775-53994a69daeb",
  "p-mia": "1494790108377-be9c29b29330",
  "p-zoe": "1438761681033-6461ffad8d80",
  "p-rachel": "1517841905240-472988babdf9",
  "p-nora": "1524504388940-b1c1722653e1",
  "p-amara": "1531123897727-8f129e1688ce",
  "p-sofia": "1544005313-94ddf0286df2",
  "p-chloe": "1580489944761-15a19d654956",
  "p-hannah": "1573496359142-b8d87734a5a2",
  "p-priya": "1488426862026-3ee34a7d66df",
  "p-jess": "1529626455594-4ff0802cfb7e",
  "p-lena": "1502823403499-6ccfcf4fb453",
  "p-tasha": "1508214751196-bcfd4ca60f91",
  "p-ava": "1487412720507-e7ab37603c6f",
  "p-ella": "1489424731084-a5d8b219a5bb",
  "p-jordan": "1507003211169-0a1dd7228f2d",
  "p-liam": "1506794778202-cad84cf45f1d",
  "p-kai": "1599566150163-29194dcaad36",
  "p-dev": "1492562080023-ab3db95bfbce",
  "p-marcus": "1531427186611-ecfd6d936c79",
  "p-isla": "1485875437342-9b39470b3d95",
  "p-bree": "1483985988355-763728e1935b",
  "p-nina": "1529139574466-a303027c1d8b",
  "p-theo": "1500648767791-00dcc994a43e",
  "p-coco": "1515886657613-9f3515b0c78f",
  "p-skylar": "1594381898411-846e7d193883",

  // Beauty / skincare content
  "c-serum-hands": "1515377905703-c4788e51af15",
  "c-serum-roller": "1600428877878-1a0fd85beda8",
  "c-serum-shadow": "1608571423902-eed4a5ad8108",
  "c-serum-eucalyptus": "1617897903246-719242758050",
  "c-serum-white": "1576426863848-c21f53c60b19",
  "c-serum-stones": "1612817288484-6f916006741a",
  "c-serum-blue": "1540555700478-4be289fbecef",
  "c-tube": "1620916566398-39f1143ab7be",
  "c-flatlay": "1598440947619-2c35fc9aa908",
  "c-brushes": "1596462502278-27bfdc403348",
  "c-facial": "1570172619644-dfd03ed5d881",
  "c-mask": "1616394584738-fc6e612e71b9",
  "c-treatment": "1552693673-1bf958298935",
  "c-bottles": "1631729371254-42c2892f0e6e",
  "c-jars": "1611930022073-b7a4ba5fcccd",
  "c-pump": "1540555700478-4be289fbecef",
  "c-amber": "1528740561666-dc2479dc08ab",
  "c-soaps": "1607006344380-b6775a0824a7",

  // Food / fitness / lifestyle content
  "c-protein-bars": "1622484212850-eb596d769edc",
  "c-bowl": "1490645935967-10de6ba17061",
  "c-steak-salad": "1504674900247-0877df9cc836",
  "c-salad": "1512621776951-a57141f2eefd",
  "c-avocado-toast": "1541519227354-08fa5d50c44d",
  "c-coffee": "1495474472287-4d71bcdd2085",
  "c-deadlift": "1517836357463-d25dfeac3438",
  "c-crunches": "1571019613454-1cb2f99b2d8b",
  "c-gym": "1534438327276-14e5300c3a48",
  "c-workout": "1594381898411-846e7d193883",
  "c-tracksuit": "1515886657613-9f3515b0c78f",
  "c-beach": "1507525428034-b723cf961d3e",
  "c-mountains": "1469474968028-56623f02e42e",
  "c-desk": "1499951360447-b19be8fe80f5",
  "c-workspace": "1519389950473-47ba0277781c",
  "c-phone": "1526045612212-70caf35c14df",
  "c-earbuds": "1610438235354-a6ae5528385c",
} as const;

export type ImageKey = keyof typeof IMAGES;

export function imageUrl(key: string, width: number, height?: number, faces = false) {
  const id = IMAGES[key as ImageKey] ?? key;
  const params = new URLSearchParams({
    w: String(width),
    fit: "crop",
    auto: "format",
    q: "72",
  });
  if (height) params.set("h", String(height));
  if (faces) params.set("crop", "faces");
  return `https://images.unsplash.com/photo-${id}?${params}`;
}
