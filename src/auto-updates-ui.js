(() => {
  const desktop = window.cockpitDesktop;
  const banner = document.getElementById('appUpdateBanner');
  const message = document.getElementById('appUpdateMessage');
  const progress = document.getElementById('appUpdateProgress');
  const installButton = document.getElementById('installAppUpdate');
  const checkButton = document.getElementById('checkAppUpdates');
  const dismissButton = document.getElementById('dismissAppUpdate');
  if (!banner || !desktop?.getAppUpdateStatus || !desktop?.checkForAppUpdates) {
    if (checkButton) checkButton.hidden = true;
    return;
  }

  let hideTimer;
  function hideTransient(delay) {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (banner.dataset.state === 'up-to-date' || banner.dataset.state === 'error') banner.classList.add('hidden');
    }, delay);
  }

  function render(status = {}) {
    const state = String(status.state || 'idle');
    banner.dataset.state = state;
    banner.classList.remove('hidden');
    installButton.classList.add('hidden');
    progress.classList.add('hidden');

    if (state === 'checking') {
      message.textContent = 'Checking for updates…';
    } else if (state === 'downloading') {
      const percent = Number.isFinite(status.percent) ? Math.round(Math.max(0, Math.min(100, status.percent))) : null;
      message.textContent = `Downloading Flight Desk ${status.version || 'update'}${percent === null ? '' : ` · ${percent}%`}`;
      progress.classList.remove('hidden');
      progress.firstElementChild.style.width = `${Math.max(0, Math.min(100, Number(status.percent) || 0))}%`;
    } else if (state === 'downloaded') {
      message.textContent = `Update ready${status.version ? ` · Flight Desk ${status.version}` : ''}. Restart to install.`;
      installButton.classList.remove('hidden');
    } else if (state === 'up-to-date') {
      message.textContent = 'Flight Desk is up to date.';
      hideTransient(6000);
    } else if (state === 'error') {
      message.textContent = status.message || 'Could not check for updates. Flight Desk will try again later.';
      hideTransient(9000);
    } else {
      banner.classList.add('hidden');
    }
  }

  checkButton.addEventListener('click', async () => {
    checkButton.disabled = true;
    render({ state: 'checking' });
    try { render(await desktop.checkForAppUpdates()); }
    catch { render({ state: 'error' }); }
    finally { checkButton.disabled = false; }
  });

  installButton.addEventListener('click', () => desktop.installAppUpdate());
  dismissButton.addEventListener('click', () => banner.classList.add('hidden'));
  desktop.onAppUpdateStatus?.(render);
  desktop.getAppUpdateStatus().then(render).catch(() => { checkButton.hidden = true; });
})();
