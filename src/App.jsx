import React, { useState } from "react";

const PLATFORMS = [
  { id: "youtube", label: "YouTube" },
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" }
];

const PLATFORM_PATTERNS = {
  youtube: /(youtube\.com|youtu\.be)/i,
  tiktok: /tiktok\.com/i,
  instagram: /instagram\.com/i
};

function detectPlatformLabel(url) {
  if (PLATFORM_PATTERNS.youtube.test(url)) return "YouTube";
  if (PLATFORM_PATTERNS.tiktok.test(url)) return "TikTok";
  if (PLATFORM_PATTERNS.instagram.test(url)) return "Instagram";
  return null;
}

function formatDuration(sec) {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function emptyState() {
  return {
    url: "",
    info: null,
    quality: 720,
    keepAudio: true,
    downloading: false,
    progress: 0,
    status: null,
    error: null
  };
}

export default function App() {
  const [mode, setMode] = useState("video");
  const [platform, setPlatform] = useState("youtube");
  const [url, setUrl] = useState("");
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [info, setInfo] = useState(null);
  const [quality, setQuality] = useState(720);
  const [keepAudio, setKeepAudio] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [downloadDir, setDownloadDir] = useState("");
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const refreshHistory = () => {
    window.api?.getHistory().then((h) => setHistory(h || []));
  };

  React.useEffect(() => {
    window.api?.onProgress((p) => setProgress(p));
    window.api?.getDownloadDir().then((dir) => setDownloadDir(dir));
    refreshHistory();
  }, []);

  const resetForm = () => {
    const s = emptyState();
    setUrl(s.url);
    setInfo(s.info);
    setQuality(s.quality);
    setKeepAudio(s.keepAudio);
    setDownloading(s.downloading);
    setProgress(s.progress);
    setStatus(s.status);
    setError(s.error);
  };

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    resetForm();
  };

  const handlePlatformChange = (nextPlatform) => {
    setPlatform(nextPlatform);
    resetForm();
  };

  const handleChooseFolder = async () => {
    const res = await window.api.chooseDownloadDir();
    if (res.ok) setDownloadDir(res.dir);
  };

  const handlePreview = async () => {
    if (!url.trim()) return;
    setError(null);
    setInfo(null);

    const selectedLabel = PLATFORMS.find((p) => p.id === platform)?.label;
    const pattern = PLATFORM_PATTERNS[platform];

    if (pattern && !pattern.test(url.trim())) {
      const detected = detectPlatformLabel(url.trim());
      setError(
        detected
          ? `Bu link ${selectedLabel}'a ait değil, ${detected} linki gibi görünüyor. Üstten doğru platformu seç.`
          : `Bu link ${selectedLabel}'a ait değil gibi görünüyor. Linki kontrol et.`
      );
      return;
    }

    setLoadingInfo(true);
    const res = await window.api.getInfo(url.trim());
    setLoadingInfo(false);
    if (res.ok) {
      setInfo(res);
      setQuality(res.availableQualities[0] || 720);
    } else {
      setError(res.error);
    }
  };

  const handleDownload = async () => {
    setError(null);
    setStatus(null);
    setProgress(0);
    setDownloading(true);

    const res =
      mode === "mp3"
        ? await window.api.downloadAudio({ url: url.trim(), title: info?.title || url.trim() })
        : await window.api.downloadVideo({
            url: url.trim(),
            quality,
            keepAudio,
            title: info?.title,
            thumbnail: info?.thumbnail
          });

    setDownloading(false);
    if (res.ok) {
      setStatus(res.message);
      setProgress(100);
      refreshHistory();
      setTimeout(() => {
        resetForm();
      }, 1800);
    } else {
      setError(res.error);
    }
  };

  const handleClearHistory = async () => {
    await window.api.clearHistory();
    refreshHistory();
  };

  const formatHistoryDate = (iso) => {
    try {
      return new Date(iso).toLocaleString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="app">
      <div className="folder-picker">
        <span className="folder-label" title={downloadDir}>
          📁 {downloadDir || "Yükleniyor..."}
        </span>
        <button className="folder-btn" onClick={handleChooseFolder}>
          Değiştir
        </button>
      </div>

      <button className="history-toggle" onClick={() => setShowHistory(true)}>
        🕒 Geçmiş
      </button>

      {showHistory && (
        <div className="history-overlay" onClick={() => setShowHistory(false)}>
          <div className="history-panel" onClick={(e) => e.stopPropagation()}>
            <div className="history-header">
              <h3>İndirme Geçmişi</h3>
              <div className="history-header-actions">
                {history.length > 0 && (
                  <button className="history-clear" onClick={handleClearHistory}>
                    Temizle
                  </button>
                )}
                <button className="history-close" onClick={() => setShowHistory(false)}>
                  ✕
                </button>
              </div>
            </div>

            {history.length === 0 ? (
              <div className="history-empty">Henüz bir indirme yapılmadı.</div>
            ) : (
              <div className="history-list">
                {history.map((item, idx) => (
                  <div className="history-item" key={idx}>
                    {item.thumbnail ? (
                      <img className="history-thumb" src={item.thumbnail} alt="" />
                    ) : (
                      <div className="history-thumb history-thumb-audio">🎵</div>
                    )}
                    <div className="history-info">
                      <span className="history-title">{item.title}</span>
                      <span className="history-meta">
                        {item.type === "mp3" ? "MP3" : `Video · ${item.quality}p`} ·{" "}
                        {formatHistoryDate(item.date)}
                      </span>
                    </div>
                    <button
                      className="history-open-btn"
                      onClick={() => window.api.openHistoryFolder(item.dir)}
                    >
                      Klasörü Aç
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="app-header">
        <h1>ClipGrab Studio</h1>
        <p>YouTube · TikTok · Instagram — video indir veya MP3'e çevir</p>
      </div>

      <div className="mode-tabs">
        <button
          className={mode === "video" ? "active" : ""}
          onClick={() => handleModeChange("video")}
        >
          Video
        </button>
        <button
          className={mode === "mp3" ? "active" : ""}
          onClick={() => handleModeChange("mp3")}
        >
          MP3
        </button>
      </div>

      {mode === "video" && (
        <div className="platform-row">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              className={"platform-chip" + (platform === p.id ? " active" : "")}
              onClick={() => handlePlatformChange(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div className="card">
        <div className="link-row">
          <input
            placeholder={
              mode === "mp3"
                ? "Video linkini yapıştır (MP3'e çevrilecek)..."
                : `${PLATFORMS.find((p) => p.id === platform)?.label} linkini yapıştır...`
            }
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          {mode === "video" && (
            <button className="btn btn-primary" onClick={handlePreview} disabled={loadingInfo}>
              {loadingInfo ? "Yükleniyor..." : "İndir"}
            </button>
          )}
        </div>

        {error && <div className="error-box">{error}</div>}

        {mode === "video" && info && (
          <>
            <div className="preview">
              {info.thumbnail && <img src={info.thumbnail} alt="önizleme" />}
              <div className="preview-info">
                <h3>{info.title}</h3>
                <span>
                  {info.uploader} {info.duration ? `· ${formatDuration(info.duration)}` : ""}
                </span>
              </div>
            </div>

            <div className="options-row">
              <div className="option-block">
                <label>Kalite</label>
                <select value={quality} onChange={(e) => setQuality(Number(e.target.value))}>
                  {(info.availableQualities || [1080, 720, 480, 144]).map((q) => (
                    <option key={q} value={q}>
                      {q}p
                    </option>
                  ))}
                </select>
              </div>
              <div className="option-block">
                <label>Ses</label>
                <div className="toggle-row">
                  <input
                    type="checkbox"
                    checked={keepAudio}
                    onChange={(e) => setKeepAudio(e.target.checked)}
                  />
                  <span>{keepAudio ? "Sesli indir" : "Sessiz (sadece görüntü)"}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {(mode === "mp3" || info) && (
          <div className="download-row">
            <button
              className="btn btn-accent"
              onClick={handleDownload}
              disabled={downloading || !url.trim()}
            >
              {downloading
                ? "İndiriliyor..."
                : mode === "mp3"
                ? "MP3 olarak indir"
                : "Videoyu indir"}
            </button>
          </div>
        )}

        {(downloading || progress > 0) && (
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}

        {status && <div className="status-line success">{status}</div>}
      </div>
    </div>
  );
}