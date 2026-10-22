# mycorps.vercel.app સોશિયલ થંબનેલ (Open Graph & Twitter Preview) ફેરફાર અહેવાલ

આ દસ્તાવેજમાં તમારા દ્વારા અપલોડ કરાયેલા નવા લોગો/થંબનેલને `mycorps.vercel.app` અને તેના તમામ રૂટ્સ (routes) પર યોગ્ય રીતે દેખાડવા માટે કોડમાં કરેલા તમામ ફેરફારોની લાઇન-ટુ-લાઇન વિગતવાર ગુજરાતી સમજૂતી આપેલ છે.

---

## ૧. મુખ્ય ઉદ્દેશ અને સમસ્યાનું નિવારણ (Why this was needed)

### અગાઉ શું સમસ્યા હતી?
1. **`metadataBase` ગેરહાજર હતું**: Next.js માં જો `metadataBase` સેટ ન હોય, તો Vercel પર ડિપ્લોય થયા પછી સાપેક્ષ પાથ (relative URLs જેમ કે `/og-image.png`) પ્લેટફોર્મ્સ (WhatsApp, LinkedIn, Twitter) ઓળખી શકતા નથી, જેના કારણે થંબનેલ ફેચ થતી નહોતી.
2. **`openGraph` અને `twitter` ટેગ્સ નહોતા**: `layout.tsx` માં માત્ર સામાન્ય ટાઇટલ અને ડિસ્ક્રિપ્શન હતું, કોઈ વિશિષ્ટ Open Graph કાર્ડ કે Twitter Card ડેટા નહોતો.
3. **સોશિયલ પ્રિવ્યૂ ઈમેજ (1200x630 px) નહોતી**: WhatsApp અને Twitter હંમેશા ૧૨૦૦x૬૩૦ (1.91:1 aspect ratio) સાઈઝની ઈમેજ શોધે છે. સ્ક્વેર લોગો યોગ્ય બેકગ્રાઉન્ડ સાથે 1200x630 કેનવાસમાં ન હોવાથી ઈમેજ ક્રોપ થઈ જતી કે દેખાતી નહોતી.
4. **સોશિયલ બોટ્સની મંજૂરી (Robots.txt)**: WhatsApp, LinkedIn, Slack વગેરેના સ્ક્રૅપર્સ માટે સ્પષ્ટ પરમિશન જરૂરી હતી.

---

## ૨. ફાઈલવાર થયેલા ફેરફારોની વિગત (File-by-File Changes)

---

### ફાઈલ ૧: `src/app/layout.tsx`

આ પ્રોજેક્ટની મુખ્ય લેઆઉટ ફાઈલ છે જે તમામ પેજ અને રૂટ્સ માટે મેટાડેટા હેન્ડલ કરે છે.

#### ફેરફાર ૧: `Viewport` નું ઈમ્પોર્ટ ઉમેર્યું
* **લાઇન ક્રમાંક**: ૧
* **જૂનો કોડ**:
  ```tsx
  import type { Metadata } from "next";
  ```
* **નવો કોડ**:
  ```tsx
  import type { Metadata, Viewport } from "next";
  ```
* **શા માટે બદલ્યું (Reason)**: Next.js ના લેટેસ્ટ સ્ટાન્ડર્ડ મુજબ `themeColor` અને સ્ક્રીન સ્કેલિંગ મેટાડેટાને `Viewport` ઑબ્જેક્ટ દ્વારા એક્સપોર્ટ કરવું શ્રેષ્ઠ માનવામાં આવે છે.

---

#### ફેરફાર ૨: `viewport` કન્ફિગ્યુરેશન ઉમેર્યું
* **લાઇન ક્રમાંક**: ૨૪ થી ૨૮
* **ઉમેરેલો નવો કોડ**:
  ```tsx
  export const viewport: Viewport = {
    themeColor: "#090A0E",
    width: "device-width",
    initialScale: 1,
  };
  ```
* **શા માટે ઉમેર્યું (Reason)**: મોબાઈલ બ્રાઉઝર્સ (Chrome, Safari) અને Android/iOS સ્ટેટસ બાર માટે તમારા લોગોનો ડાર્ક સ્લેટ બેકગ્રાઉન્ડ કલર (`#090A0E`) સેટ કર્યો જેથી સંપૂર્ણ પ્રીમિયમ લુક મળે.

---

#### ફેરફાર ૩: `metadataBase` ઉમેર્યું
* **લાઇન ક્રમાંક**: ૩૧
* **ઉમેરેલો નવો કોડ**:
  ```tsx
  metadataBase: new URL("https://mycorps.vercel.app"),
  ```
* **શા માટે ઉમેર્યું (Reason - અતિ મહત્વપૂર્ણ)**: આ Next.js નો સૌથી જરૂરી નિયમ છે. જ્યારે તમે કોઈ પણ ઈમેજ પાથ (દા.ત. `/og-image.png`) આપો છો, ત્યારે Next.js આપોઆપ તેને `https://mycorps.vercel.app/og-image.png` માં બદલી નાખે છે. આના વગર WhatsApp કે LinkedIn ઈમેજ શોધી શકતા નથી.

---

#### ફેરફાર ૪: ટાઇટલ ટેમ્પલેટ અને એપ્લિકેશન નામ
* **લાઇન ક્રમાંક**: ૩૨ થી ૩૮
* **જૂનો કોડ**:
  ```tsx
  title: "NASS · Closed-Loop Control Tower",
  ```
* **નવો કોડ**:
  ```tsx
  title: {
    default: "NASS · Closed-Loop Control Tower",
    template: "%s · NASS Closed-Loop",
  },
  applicationName: "NASS Control Tower",
  ```
* **શા માટે બદલ્યું (Reason)**: જેથી ભવિષ્યમાં કોઈ પણ સબ-રૂટ (sub-route) બને તો પણ ટાઇટલ એકસમાન અને સુઘડ રીતે દેખાય.

---

#### ફેરફાર ૫: ઓથર અને કેનોનિકલ URL
* **લાઇન ક્રમાંક**: ૫૦ થી ૫૫
* **ઉમેરેલો નવો કોડ**:
  ```tsx
  authors: [{ name: "NASS Corporation" }],
  creator: "NASS Corporation",
  publisher: "NASS Corporation",
  alternates: {
    canonical: "https://mycorps.vercel.app",
  },
  ```
* **શા માટે ઉમેર્યું (Reason)**: SEO અને સર્ચ એન્જિન માટે સત્તાવાર વેબસાઇટ URL પ્રમાણિત કરવા માટે.

---

#### ફેરફાર ૬: `openGraph` સંપૂર્ણ ડેટા ઉમેર્યો
* **લાઇન ક્રમાંક**: ૫૭ થી ૮૦
* **ઉમેરેલો નવો કોડ**:
  ```tsx
  openGraph: {
    title: "NASS · Closed-Loop Control Tower",
    description:
      "NASS Closed-Loop Control Tower — Freight Traceability, Decision Management & Operations Assistant: Bahrain-first maritime freight visibility, evidence-before-assertion, verified outcomes only.",
    url: "https://mycorps.vercel.app",
    siteName: "NASS Closed-Loop Control Tower",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "NASS Closed-Loop Control Tower",
        type: "image/png",
      },
      {
        url: "/thumbnail.png",
        width: 1024,
        height: 1024,
        alt: "NASS Control Tower Logo",
        type: "image/png",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  ```
* **શા માટે ઉમેર્યું (Reason)**: 
  - WhatsApp, LinkedIn, Facebook, Slack અને iMessage જ્યારે લિંક ફેચ કરે છે ત્યારે તેઓ સીધું `og:image` વાંચે છે.
  - અહીં ૧૨૦૦x૬૩૦ (વાઈડ કાર્ડ) અને ૧૦૨૪x૧૦૨૪ (સ્ક્વેર કાર્ડ) બંને સાઈઝ આપી છે, જેથી જે પ્લેટફોર્મને જે સાઈઝ અનુકૂળ આવે તે આપોઆપ પસંદ કરી લે.

---

#### ફેરફાર ૭: `twitter` કાર્ડ સેટિંગ્સ ઉમેરી
* **લાઇન ક્રમાંક**: ૮૧ થી ૮૯
* **ઉમેરેલો નવો કોડ**:
  ```tsx
  twitter: {
    card: "summary_large_image",
    title: "NASS · Closed-Loop Control Tower",
    description:
      "NASS Closed-Loop Control Tower — Bahrain-first maritime freight visibility, BOL intelligence, verified outcomes only.",
    images: ["/og-image.png"],
    creator: "@nass_corporation",
  },
  ```
* **શા માટે ઉમેર્યું (Reason)**: Twitter / X પર જ્યારે લિંક ટ્વીટ થાય ત્યારે તે નાની લિંકને બદલે મોટું શાનદાર પ્રિવ્યૂ કાર્ડ (`summary_large_image`) બતાવે.

---

#### ફેરફાર ૮: આઈકોન્સ અને મેનિફેસ્ટ લિંક
* **લાઇન ક્રમાંક**: ૯૦ થી ૧૦૩
* **જૂનો કોડ**:
  ```tsx
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  ```
* **નવો કોડ**:
  ```tsx
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon.svg", type: "image/svg+xml" },
    ],
  },
  manifest: "/site.webmanifest",
  ```
* **શા માટે બદલ્યું (Reason)**: જૂની થર્ડ પાર્ટી અજાણી લિંક હટાવીને આપણા લોકલ જનરેટ કરેલા હાઈ-રિઝોલ્યુશન લોગો આઈકોન્સ અને `site.webmanifest` જોડી દીધું.

---

### ફાઈલ ૨: `public/robots.txt`

સોશિયલ નેટવર્કના ક્રાઉલર્સ અને સર્ચ એન્જિન બોટ્સ માટેની ફાઈલ.

* **લાઇન ક્રમાંક**: ૧૩ થી ૨૯
* **ઉમેરેલો કોડ**:
  ```txt
  User-agent: WhatsApp
  Allow: /

  User-agent: LinkedInBot
  Allow: /

  User-agent: TelegramBot
  Allow: /

  User-agent: Slackbot
  Allow: /

  User-agent: Discordbot
  Allow: /

  User-agent: Applebot
  Allow: /

  User-agent: *
  Allow: /

  Host: https://mycorps.vercel.app
  ```
* **શા માટે બદલ્યું (Reason)**: WhatsApp, Telegram, LinkedIn અને Discord ના બોટ્સ જ્યારે `mycorps.vercel.app` પર થંબનેલ ઈમેજ ફેચ કરવા આવે, ત્યારે `robots.txt` તેમને કોઈ પણ અવરોધ વગર ઈમેજ ડાઉનલોડ કરવાની પરવાનગી આપે.

---

### ફાઈલ ૩: `public/site.webmanifest` (નવી ફાઈલ)

PWA અને મોબાઈલ બ્રાઉઝર્સ માટે ક્રિએટ કરેલ ફાઈલ.

* **કોડ**:
  ```json
  {
    "name": "NASS · Closed-Loop Control Tower",
    "short_name": "NASS Tower",
    "description": "Bahrain-first maritime freight visibility, BOL intelligence, and verified outcomes only.",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#090A0E",
    "theme_color": "#090A0E",
    "icons": [
      {
        "src": "/favicon-16x16.png",
        "sizes": "16x16",
        "type": "image/png"
      },
      {
        "src": "/favicon-32x32.png",
        "sizes": "32x32",
        "type": "image/png"
      },
      {
        "src": "/apple-touch-icon.png",
        "sizes": "180x180",
        "type": "image/png"
      },
      {
        "src": "/icon.png",
        "sizes": "512x512",
        "type": "image/png"
      }
    ]
  }
  ```
* **શા માટે બનાવી (Reason)**: કોઈ યુઝર મોબાઈલમાં સાઈટને "Add to Home Screen" કરે ત્યારે નવો લોગો એપ આઈકોન તરીકે દેખાય.

---

### ફાઈલ ૪: આપમેળે જનરેટ કરેલી નવી ઈમેજ ફાઈલો

તમે મોકલેલા મૂળ ૧૦૨૪x૧૦૨૪ ચિત્રમાંથી નીચે મુજબની ઈમેજો પ્રોડક્શન-રેડી બનાવીને યોગ્ય ફોલ્ડરમાં ગોઠવી છે:

| ફાઈલ પાથ | પરિમાણ (Dimensions) | હેતુ / ક્યાં વપરાશે |
|---|---|---|
| `public/og-image.png` | 1200 x 630 px | સોશિયલ કાર્ડ (WhatsApp, LinkedIn, Twitter) માટે પ્રાઈમરી ઈમેજ |
| `src/app/opengraph-image.png` | 1200 x 630 px | Next.js App Router નો ઓટોમેટોક ફોલબેક (દરેક રૂટ માટે) |
| `src/app/twitter-image.png` | 1200 x 630 px | Twitter / X લાર્જ કાર્ડ માટે ખાસ App Router ફાઈલ |
| `public/thumbnail.png` | 1024 x 1024 px | હાઈ-રિઝોલ્યુશન સ્ક્વેર લોગો |
| `public/icon.png` & `src/app/icon.png` | 512 x 512 px | બ્રાઉઝર અને PWA હાઈ-ડેન્સિટી આઈકોન |
| `public/apple-touch-icon.png` & `src/app/apple-icon.png` | 180 x 180 px | iPhone / iPad / Safari હોમ સ્ક્રીન આઈકોન |
| `public/favicon.ico` | Multi-size ICO | ડેસ્કટોપ બ્રાઉઝર ટેબ આઈકોન |
| `public/favicon-32x32.png` & `favicon-16x16.png` | 32x32 & 16x16 px | સ્ટાન્ડર્ડ બુકમાર્ક ફેવિકોન |

> **વિશેષતા**: ૧૨૦૦x૬૩૦ કેનવાસમાં લોગો મૂકતી વખતે તમારા લોગોના ચારેય ખૂણાનો મૂળ રંગ (`#090A0E`) સેમ્પલ કરીને જ બેકગ્રાઉન્ડ બનાવવામાં આવ્યું છે. આનાથી ઈમેજની આજુબાજુ કોઈ બોર્ડર કે કટ દેખાશે નહીં અને સંપૂર્ણ સ્મૂધ લાગશે.

---

## ૩. Vercel પર લાઈવ કરવા અને ચકાસવાના પગલાં (Deployment & Verification)

આ ફેરફારો ગિટમાં કમિટ કરીને પુશ કરવા માટે:

```bash
git add .
git commit -m "feat: setup universal opengraph thumbnail for all routes"
git push origin main
```

### સોશિયલ કેશ (Cache) રિફ્રેશ કરવાની રીત:
સોશિયલ નેટવર્ક્સ (WhatsApp, LinkedIn) અગાઉની લિંકને કેશ કરી લેતા હોય છે. નવો થંબનેલ તરત જોવા માટે:
1. **LinkedIn માટે**: [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) માં જઈને `https://mycorps.vercel.app` નાખો અને "Inspect" દબાવો (આનાથી LinkedIn નવો ફોટો ખેંચી લેશે).
2. **WhatsApp / Facebook માટે**: [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) માં જઈને લિંક પેસ્ટ કરો અને **"Scrape Again"** બટન પર ક્લિક કરો.
3. હવે જ્યારે પણ તમે કોઈને પણ `https://mycorps.vercel.app` કે તેના કોઈ પણ સબ-રૂટની લિંક મોકલશો, ત્યારે આ નવો લોગો/થંબનેલ મોટા કાર્ડ સાથે આપોઆપ પ્રદર્શિત થશે.
