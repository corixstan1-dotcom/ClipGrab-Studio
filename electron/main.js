const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const YTDlpWrap = require("yt-dlp-wrap").default;
const ffmpegPath = require("ffmpeg-static");

const isDev = process.env.NODE_ENV === "development";

const binDir = path.join(app.getPath("userData"), "bin");
const ytDlpBinaryPath = path.join(
  binDir,
  process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp"
);

let ytDlpWrap;
let mainWindow;

const settingsPath = path.join(app.getPath("userData"), "settings.json");

function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
  } catch {
    return {};
  }
}

function writeSettings(settings) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

function getDownloadDir() {
  const settings = readSettings();
  if (settings.downloadDir && fs.existsSync(settings.downloadDir)) {
    return settings.downloadDir;
  }
  return app.getPath("downloads");
}

const historyPath = path.join(app.getPath("userData"), "history.json");

function readHistory() {
  try {
    return JSON.parse(fs.readFileSync(historyPath, "utf-8"));
  } catch {
    return [];
  }
}

function writeHistory(history) {
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
}

function addHistoryEntry(entry) {
  const history = readHistory();
  history.unshift(entry);
  writeHistory(history.slice(0, 50));
}

async function ensureYtDlp() {
  if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });
  if (!fs.existsSync(ytDlpBinaryPath)) {
    await YTDlpWrap.downloadFromGithub(ytDlpBinaryPath);
  }
  ytDlpWrap = new YTDlpWrap(ytDlpBinaryPath);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 780,
    minWidth: 760,
    minHeight: 560,
    backgroundColor: "#0d0620",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "..", "build", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(async () => {
  await ensureYtDlp();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("get-info", async (_event, url) => {
  try {
    const raw = await ytDlpWrap.execPromise([
      url,
      "--dump-json",
      "--no-playlist"
    ]);
    const data = JSON.parse(raw);

    const heights = new Set();
    (data.formats || []).forEach((f) => {
      if (f.height) heights.add(f.height);
    });
    const targetHeights = [1080, 720, 480, 144].filter((h) =>
      [...heights].some((avail) => avail >= h - 20 && avail <= h + 200) ||
      heights.size === 0
    );

    return {
      ok: true,
      title: data.title,
      thumbnail: data.thumbnail,
      duration: data.duration,
      uploader: data.uploader,
      availableQualities: targetHeights.length ? targetHeights : [1080, 720, 480, 144]
    };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
});

ipcMain.handle("download-video", async (_event, { url, quality, keepAudio, title, thumbnail }) => {
  try {
    const downloadsDir = getDownloadDir();
    const outputTemplate = path.join(downloadsDir, "%(title)s.%(ext)s");

    const heightLimit = quality || 720;
    const formatSelector = keepAudio
      ? `bestvideo[height<=${heightLimit}]+bestaudio/best[height<=${heightLimit}]`
      : `bestvideo[height<=${heightLimit}]`;

    const args = [
      url,
      "-f",
      formatSelector,
      "--ffmpeg-location",
      ffmpegPath,
      "--merge-output-format",
      "mp4",
      "--no-playlist",
      "-o",
      outputTemplate
    ];

    const finalPath = await new Promise((resolve, reject) => {
      let lastLine = "";
      ytDlpWrap
        .exec(args)
        .on("progress", (p) => {
          mainWindow?.webContents.send("download-progress", p.percent || 0);
        })
        .on("ytDlpEvent", (_type, data) => {
          lastLine = data;
        })
        .on("error", reject)
        .on("close", () => resolve(lastLine));
    });

    addHistoryEntry({
      title: title || url,
      thumbnail: thumbnail || null,
      type: "video",
      quality: heightLimit,
      dir: downloadsDir,
      date: new Date().toISOString()
    });

    return { ok: true, message: "İndirme tamamlandı", downloadsDir, raw: finalPath };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
});

ipcMain.handle("download-audio", async (_event, { url, title }) => {
  try {
    const downloadsDir = getDownloadDir();
    const outputTemplate = path.join(downloadsDir, "%(title)s.%(ext)s");

    const args = [
      url,
      "-x",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "0",
      "--ffmpeg-location",
      ffmpegPath,
      "--no-playlist",
      "-o",
      outputTemplate
    ];

    await new Promise((resolve, reject) => {
      ytDlpWrap
        .exec(args)
        .on("progress", (p) => {
          mainWindow?.webContents.send("download-progress", p.percent || 0);
        })
        .on("error", reject)
        .on("close", resolve);
    });

    addHistoryEntry({
      title: title || url,
      thumbnail: null,
      type: "mp3",
      quality: null,
      dir: downloadsDir,
      date: new Date().toISOString()
    });

    return { ok: true, message: "MP3 indirildi", downloadsDir };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
});

ipcMain.handle("open-downloads-folder", () => {
  shell.openPath(getDownloadDir());
});

ipcMain.handle("get-download-dir", () => {
  return getDownloadDir();
});

ipcMain.handle("choose-download-dir", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
    title: "İndirilen dosyaların kaydedileceği klasörü seç"
  });
  if (result.canceled || !result.filePaths[0]) {
    return { ok: false, dir: getDownloadDir() };
  }
  const settings = readSettings();
  settings.downloadDir = result.filePaths[0];
  writeSettings(settings);
  return { ok: true, dir: result.filePaths[0] };
});

ipcMain.handle("get-history", () => {
  return readHistory();
});

ipcMain.handle("clear-history", () => {
  writeHistory([]);
  return { ok: true };
});

ipcMain.handle("open-history-folder", (_event, dir) => {
  shell.openPath(dir || getDownloadDir());
});