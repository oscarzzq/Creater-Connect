// Curated Unsplash photos used as creator portraits, campaign images and content thumbnails.
// Every id was verified to exist. Content shots are people- and logo-free.

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

  // Technical / B2B content (people- and logo-free)
  "t-dashboard": "1460925895917-afdab827c52f",
  "t-code-dark": "1461749280684-dccba630e2f6",
  "t-mic": "1478737270239-2f02b77fc618",
  "t-laptop-code": "1484417894907-623942c8ee29",
  "t-code-screen": "1488590528505-98d2b5aba04b",
  "t-desk-code": "1498050108023-c5249f4df085",
  "t-analytics": "1504868584819-f8e8b4b6d7e3",
  "t-python": "1515879218367-8466d910aaa4",
  "t-keyboard-red": "1517433456452-f9633a875f6f",
  "t-laptop-plant": "1517694712202-14dd9538aa97",
  "t-circuit": "1518770660439-4636190af475",
  "t-laptop-glow": "1525547719571-a2d4ac8945e2",
  "t-matrix": "1526374965328-7f61d4dc18c5",
  "t-laptop-dark": "1531297484001-80022131f5a1",
  "t-html": "1542831371-29b0f74f9713",
  "t-network": "1544197150-b99a580bb7a8",
  "t-security": "1550751827-4bd374c3f58b",
  "t-charts": "1551288049-bebda4e38f71",
  "t-editor": "1555066931-4365d14bab8c",
  "t-servers": "1558494949-ef010cbdcc31",
  "t-ide": "1587620962725-abab7fe55159",
  "t-studio": "1589903308904-1010c2294adc",
  "t-trading": "1590283603385-17ffb3a7f29f",
  "t-workspace": "1593642632559-0c6d3fc62b89",
  "t-drive": "1597852074816-d933c7d2b988",
  "t-code-blue": "1607799279861-4dd421887fb3",
  "t-candles": "1611974789855-9c2a0a7236a3",
  "t-lock": "1614064641938-3bbee52942c7",
  "t-robot": "1620712943543-bcc4688e7485",
  "t-terminal": "1629654297299-c8506221ca97",
  "t-blocks": "1639322537228-f710d846310a",
  "t-ai": "1677442136019-21780ecad995",
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
