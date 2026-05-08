// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: purple; icon-glyph: tasks;
// Sky Quests - A widget for tracking daily quests in the Sky: Children of the Light game.

const WORKER_URL = "https://quest.skyapi.shhy.in/";
const SOURCE_URL = "https://thatskyapplication.com/daily-guides";
const CACHE_KEY = "sky_daily_quests_cache";
const BG_IMAGE_PATH = "sky_quests_bg.jpg";

const data = await getDailyQuests(getWidgetLanguage());

if (!config.runsInWidget) await presentBackgroundMenu();

const widget = await createWidget(data);
Script.setWidget(widget);
widget.presentMedium();
Script.complete();

async function getDailyQuests(lang) {
  const laDate = getLADate();
  const cache = getCache(lang);

  if (cache && cache.date === laDate) return cache;

  try {
    const res = await fetchJson(
      `${WORKER_URL}?lang=${encodeURIComponent(lang)}`,
    );
    if (Array.isArray(res) && res.length === 4) {
      const obj = { date: laDate, quests: res };
      saveCache(lang, obj);
      return obj;
    }
  } catch (e) {}

  const quests = await fetchFromSource(lang);
  const obj = { date: laDate, quests };
  saveCache(lang, obj);
  return obj;
}

async function fetchFromSource(lang) {
  const acceptLanguage =
    lang === "en" ? "en-US,en;q=0.9" : "zh-CN,zh;q=0.9,en;q=0.8";
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": acceptLanguage,
    Referer: "https://thatskyapplication.com/",
    "sec-ch-ua": '"Chromium";v="123", "Not:A-Brand";v="8"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "same-origin",
    "sec-fetch-user": "?1",
    "Upgrade-Insecure-Requests": "1",
  };

  const req = new Request(SOURCE_URL, { headers });
  const html = await req.loadString();

  return [
    ...html.matchAll(
      /<(span|button)[^>]*(flex-1|regular-link)[^>]*>([^<]+)<\/(span|button)>/g,
    ),
  ]
    .map((m) => m[3].trim())
    .slice(0, 4);
}

function getLADate() {
  const la = new Date().toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
  });
  const [month, day, year] = la.split(",")[0].split("/");
  return `${year}-${month}-${day}`;
}

function getWidgetLanguage() {
  return args.widgetParameter || Device.locale() || "zh";
}

function getCache(lang) {
  const key = `${CACHE_KEY}_${lang}`;
  if (Keychain.contains(key))
    try {
      const raw = Keychain.get(key);
      return JSON.parse(raw);
    } catch {
      return null;
    }
  return null;
}

function saveCache(lang, obj) {
  const key = `${CACHE_KEY}_${lang}`;
  Keychain.set(key, JSON.stringify(obj));
}

async function fetchJson(url) {
  const req = new Request(url);
  req.timeoutInterval = 8;
  return await req.loadJSON();
}

async function createWidget(data) {
  const w = new ListWidget();
  const bg = await loadSelectedBackground();
  if (bg) w.backgroundImage = bg;
  else w.backgroundColor = new Color("#1c1c1e");

  const title = w.addText("Sky: CotL 每日任务");
  title.textColor = Color.white();
  title.font = Font.boldSystemFont(16);
  w.addSpacer(8);

  for (let i = 0; i < data.quests.length; i++) {
    const t = w.addText(`${i + 1}. ${data.quests[i]}`);
    t.textColor = Color.white();
    t.font = Font.systemFont(13);
    w.addSpacer(4);
  }

  w.addSpacer();
  const footer = w.addText(`更新: ${data.date}; 数据源于 thatskyapplication`);
  footer.textColor = Color.gray();
  footer.font = Font.systemFont(10);

  return w;
}

async function presentBackgroundMenu() {
  const alert = new Alert();
  alert.title = "背景图片";
  alert.message = "从相册选择或清除用背景图片";
  alert.addAction("从相册选择图片");
  alert.addAction("清除背景 / Clear Background");
  alert.addCancelAction("跳过 / Skip");
  const resp = await alert.presentSheet();
  if (resp === 0) {
    await pickPhotoFromLibrary();
  } else if (resp === 1) {
    const fm = FileManager.local();
    const path = fm.joinPath(fm.documentsDirectory(), BG_IMAGE_PATH);
    if (fm.fileExists(path)) fm.remove(path);
  }
}

async function pickPhotoFromLibrary() {
  try {
    const img = await Photos.fromLibrary();
    if (!img) return;
    const fm = FileManager.local();
    const path = fm.joinPath(fm.documentsDirectory(), BG_IMAGE_PATH);
    fm.writeImage(path, img);
  } catch (e) {
    const a = new Alert();
    a.title = "选择失败 / Failed";
    a.message = "无法从相册读取图片";
    a.addAction("好 / OK");
    await a.presentAlert();
  }
}

async function loadSelectedBackground() {
  try {
    const fm = FileManager.local();
    const path = fm.joinPath(fm.documentsDirectory(), BG_IMAGE_PATH);
    if (!fm.fileExists(path)) return null;
    return fm.readImage(path);
  } catch (e) {
    return null;
  }
}
