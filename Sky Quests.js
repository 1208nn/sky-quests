// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: purple; icon-glyph: tasks;
// Sky Quests - A widget for tracking daily quests in the Sky: Children of the Light game.

const WORKER_URL = "https://quest.skyapi.shhy.in/";
const SOURCE_URL = "https://thatskyapplication.com/daily-guides";
const CACHE_KEY = "sky_daily_quests_cache";
const BG_IMAGE_PATH = "sky_quests_bg.jpg";

const data = await getDailyQuests();

if (!config.runsInWidget) await presentBackgroundMenu();

const widget = await createWidget(data);
Script.setWidget(widget);
widget.presentMedium();
Script.complete();

async function getDailyQuests() {
  const laDate = getLADate();
  const cache = getCache();

  if (cache && cache.date === laDate) return cache;

  try {
    const res = await fetchJson(WORKER_URL);
    if (Array.isArray(res) && res.length === 4) {
      const obj = { date: laDate, quests: res };
      saveCache(obj);
      return obj;
    }
  } catch (e) {}

  const quests = await fetchFromSource();
  const obj = { date: laDate, quests };
  saveCache(obj);
  return obj;
}

async function fetchFromSource() {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
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

  const spans = [
    ...html.matchAll(/<span[^>]*flex-1[^>]*>([^<]+)<\/span>/g),
  ].map((m) => m[1].trim());

  const btns = [
    ...html.matchAll(/<button[^>]*regular-link[^>]*>([^<]+)<\/button>/g),
  ].map((m) => m[1].trim());

  return [...spans, ...btns].slice(0, 4);
}

function getLADate() {
  const la = new Date().toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
  });
  const [month, day, year] = la.split(",")[0].split("/");
  return `${year}-${month}-${day}`;
}

function getCache() {
  if (!Keychain.contains(CACHE_KEY))
    try {
      const raw = Keychain.get(CACHE_KEY);
      return JSON.parse(raw);
    } catch {
      return null;
    }
  return null;
}

function saveCache(obj) {
  Keychain.set(CACHE_KEY, JSON.stringify(obj));
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
  alert.addAction("清除背景");
  alert.addCancelAction("跳过");
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
    a.title = "选择失败";
    a.message = "无法从相册读取图片";
    a.addAction("好");
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
