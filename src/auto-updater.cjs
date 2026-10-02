'use strict';

const { autoUpdater } = require('electron-updater');

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 12 * 1000;

function createAutoUpdater({ app, onStatus, updater = autoUpdater }) {
  let status = { state: 'idle', version: app.getVersion() };
  let checkPromise = null;
  let retryTimer = null;

  const publish = next => {
    status = { ...status, ...next, checkedAt: Date.now() };
    onStatus?.({ ...status });
  };

  if (!app.isPackaged) {
    status = { state: 'development', version: app.getVersion() };
    return {
      getStatus: () => ({ ...status }),
      checkNow: async () => ({ ...status }),
      install: () => ({ ...status })
    };
  }

  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = true;
  updater.allowPrerelease = /-alpha(?:\.|$)/i.test(app.getVersion());

  updater.on('checking-for-update', () => publish({ state: 'checking' }));
  updater.on('update-available', info => publish({ state: 'downloading', version: info.version, percent: 0 }));
  updater.on('download-progress', progress => publish({
    state: 'downloading',
    percent: Math.max(0, Math.min(100, Math.round(progress.percent || 0))),
    bytesPerSecond: Math.max(0, Number(progress.bytesPerSecond) || 0)
  }));
  updater.on('update-downloaded', info => publish({ state: 'downloaded', version: info.version, percent: 100 }));
  updater.on('update-not-available', info => publish({ state: 'up-to-date', version: info.version || app.getVersion() }));
  updater.on('error', () => publish({ state: 'error', message: 'Could not check for updates. Flight Desk will try again later.' }));

  async function checkNow() {
    if (status.state === 'downloading' || status.state === 'downloaded') return { ...status };
    if (checkPromise) return checkPromise;
    publish({ state: 'checking', message: '' });
    checkPromise = updater.checkForUpdates()
      .catch(() => {
        publish({ state: 'error', message: 'Could not check for updates. Flight Desk will try again later.' });
        return null;
      })
      .then(() => ({ ...status }))
      .finally(() => { checkPromise = null; });
    return checkPromise;
  }

  function install() {
    if (status.state !== 'downloaded') return { ...status };
    updater.quitAndInstall();
    return { ...status };
  }

  retryTimer = setInterval(() => {
    if (status.state !== 'downloaded' && status.state !== 'downloading') checkNow();
  }, CHECK_INTERVAL_MS);
  retryTimer.unref?.();
  const startupTimer = setTimeout(() => checkNow(), STARTUP_DELAY_MS);
  startupTimer.unref?.();

  app.once('will-quit', () => {
    clearInterval(retryTimer);
    clearTimeout(startupTimer);
  });

  return {
    getStatus: () => ({ ...status }),
    checkNow,
    install
  };
}

module.exports = { createAutoUpdater };
