(() => {
  const $ = selector => document.querySelector(selector);

  function installWindowChrome() {
    const shell = $('.wrap');
    const header = $('.top');
    if (!shell || !header || $('#windowTitleBar')) return;
    const titlebar = document.createElement('div');
    titlebar.id = 'windowTitleBar';
    titlebar.className = 'window-titlebar';
    titlebar.innerHTML = '<div class="window-title-app"><img src="vendor/app-icon.png" alt=""><span>Shared Cockpit Flight Desk</span><span class="window-version-badge" id="windowVersionBadge">Alpha 0.6</span></div><div class="window-title-controls" aria-label="Window controls"><button type="button" data-window-control="minimize" aria-label="Minimize" title="Minimize"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10"/></svg></button><button type="button" data-window-control="toggleMaximize" aria-label="Maximize" title="Maximize"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="3.5" width="9" height="9" rx="1"/></svg></button><button type="button" data-window-control="close" aria-label="Close" title="Close"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8"/></svg></button></div>';
    shell.insertBefore(titlebar, header);

    const api = window.cockpitDesktop?.windowControls;
    document.documentElement.dataset.customWindow = String(!!api);
    const reflectState = state => {
      const maximized = !!state?.maximized;
      document.documentElement.dataset.windowMaximized = String(maximized);
      const button = titlebar.querySelector('[data-window-control="toggleMaximize"]');
      if (!button) return;
      button.setAttribute('aria-label', maximized ? 'Restore' : 'Maximize');
      button.title = maximized ? 'Restore' : 'Maximize';
      button.innerHTML = maximized
        ? '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5" y="3.5" width="7.5" height="7.5" rx=".8"/><path d="M4 5.5v6.8c0 .4.3.7.7.7h6.8"/></svg>'
        : '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="3.5" width="9" height="9" rx="1"/></svg>';
    };
    titlebar.querySelectorAll('[data-window-control]').forEach(button => {
      button.addEventListener('click', () => api?.[button.dataset.windowControl]?.().catch?.(() => {}));
    });
    api?.getState?.().then(reflectState).catch(() => {});
    api?.onStateChange?.(reflectState);
    window.cockpitDesktop?.getAppInfo?.().then(info => {
      if (info?.displayVersion) $('#windowVersionBadge').textContent = info.displayVersion;
    }).catch(() => {});
  }

  function installGlobalSearch() {
    const header = $('.top');
    const tools = $('#headerTools');
    if (!header || !tools || $('#globalSearch')) return;
    const search = document.createElement('div');
    search.id = 'globalSearch';
    search.className = 'global-search';
    search.innerHTML = '<span class="global-search-icon" aria-hidden="true"></span><input id="globalSearchInput" type="search" autocomplete="off" spellcheck="false" aria-label="Search pages, flights and settings" aria-controls="globalSearchResults" aria-expanded="false" placeholder="Search pages, flights, settings..."><kbd aria-hidden="true">Ctrl + K</kbd><div id="globalSearchResults" class="global-search-results" role="listbox" aria-label="Search results" hidden></div>';
    header.insertBefore(search, tools);
    const input = $('#globalSearchInput');
    const results = $('#globalSearchResults');
    const destinations = [
      ['Flight Board', 'Live flight, crew and readiness', 'overview', 'dashboard home cockpit'],
      ['Flight Plan', 'SimBrief plan and OFP', 'flight-plan', 'simbrief ofp plan route fuel'],
      ['Route Viewer', 'Map, waypoints and route progress', 'route', 'map navigation waypoints'],
      ['Checklist', 'Operational scan flow', 'checklist', 'flows tasks pf pm'],
      ['Briefing', 'Departure, arrival and crew notes', 'notes', 'crew notes departure arrival debrief'],
      ['ATC & Traffic', 'VATSIM controllers and traffic', 'traffic', 'atc vatsim traffic frequencies'],
      ['Flight Analysis', 'History, replay and statistics', 'analysis', 'history replay statistics'],
      ['EFB', 'Aircraft electronic flight bag', 'efb', 'fenix documents'],
      ['Charts', 'Airport chart workspace', 'charts', 'airport chartfox'],
      ['Crew Tools', 'Voice, timeline and flight history', 'crew-tools', 'voice ptt timeline history'],
      ['Diagnostics', 'Simulator and connection status', 'diagnostics', 'simconnect fsuipc logs'],
      ['Settings', 'Application preferences and integrations', 'settings', 'preferences light mode audio']
    ];
    const close = () => { results.hidden = true; input.setAttribute('aria-expanded', 'false'); };
    const matches = query => {
      const needle = query.trim().toLocaleLowerCase();
      const found = destinations.filter(([title, description, , keywords]) => !needle || `${title} ${description} ${keywords}`.toLocaleLowerCase().includes(needle))
        .map(([title, description, page]) => ({ title, description, action: () => page === 'settings' ? $('#settingsToggle')?.click() : activatePage(page, page === 'notes' ? 'departure' : null) }));
      if (typeof data !== 'undefined' && data.plan) {
        const route = `${getPlanAirport(data.plan, 'origin') || '—'} → ${getPlanAirport(data.plan, 'destination') || '—'}`;
        const flight = `${callsignFor(data.plan) || ''} ${route} ${flightAircraftLabel()}`.trim();
        if (!needle || flight.toLocaleLowerCase().includes(needle)) found.unshift({ title: flight, description: 'Current flight · open Flight Board', action: () => activatePage('overview') });
      }
      if (typeof historyRecords === 'function') {
        try {
          historyRecords().filter(record => `${record.callsign || record.flightNumber || ''} ${record.departure || ''} ${record.arrival || ''} ${record.aircraft || ''}`.toLocaleLowerCase().includes(needle) && needle).slice(0, 5).forEach(record => found.push({
            title: `${record.callsign || record.flightNumber || 'Flight'} · ${record.departure || '—'} → ${record.arrival || '—'}`,
            description: `${record.aircraft || 'Aircraft unavailable'} · ${new Date(record.date).toLocaleDateString()} · open flight report`,
            action: () => { activatePage('crew-tools'); renderFlightHistoryReport(record); }
          }));
        } catch { }
      }
      return found.slice(0, 8);
    };
    const render = () => {
      const items = matches(input.value);
      results.replaceChildren();
      items.forEach((item, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'global-search-result';
        button.role = 'option';
        button.dataset.searchIndex = String(index);
        const title = document.createElement('strong');
        const detail = document.createElement('small');
        title.textContent = item.title;
        detail.textContent = item.description;
        button.append(title, detail);
        button.addEventListener('click', () => { close(); input.blur(); item.action(); });
        results.append(button);
      });
      if (!items.length) {
        const empty = document.createElement('div');
        empty.className = 'global-search-empty';
        empty.textContent = 'No matching pages or flights.';
        results.append(empty);
      }
      results.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    };
    input.addEventListener('focus', render);
    input.addEventListener('input', render);
    input.addEventListener('keydown', event => {
      if (event.key === 'Escape') { close(); input.blur(); }
      if (event.key === 'Enter') results.querySelector('.global-search-result')?.click();
      if (event.key === 'ArrowDown') { event.preventDefault(); results.querySelector('.global-search-result')?.focus(); }
    });
    document.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        input.focus();
        input.select();
      }
      if (event.key === 'Escape' && !results.hidden) close();
    });
    document.addEventListener('pointerdown', event => { if (!search.contains(event.target)) close(); });
  }

  function installSemanticNavigation() {
    const nav = $('.side-nav');
    if (!nav) return;
    const buttons = [...nav.querySelectorAll('.nav-item')];
    const briefing = buttons.find(button => button.dataset.page === 'notes');
    const visibleButtons = buttons.slice();
    if (briefing) {
      for (const duplicate of buttons.filter(button => button.dataset.page === 'notes' && button !== briefing)) {
        duplicate.remove();
        visibleButtons.splice(visibleButtons.indexOf(duplicate), 1);
      }
      briefing.textContent = 'Briefing';
      briefing.dataset.noteGroup = 'briefing';
      briefing.dataset.noteTab = '';
      briefing.title = 'Departure, arrival, cockpit notes, enroute and debrief';
      briefing.onclick = () => activatePage('notes', 'departure');
    }
    const groups = [
      { id: 'flightDeskGroup', label: 'FLIGHT DESK', pages: ['overview', 'flight-plan', 'route', 'checklist'] },
      { id: 'crewGroup', label: 'CREW', pages: ['notes'] },
      { id: 'trafficGroup', label: 'TRAFFIC', pages: ['traffic'] },
      { id: 'analysisGroup', label: 'ANALYSIS', pages: ['analysis'] },
      { id: 'toolsGroup', label: 'TOOLS', pages: ['efb', 'charts', 'crew-tools'] },
      { id: 'systemGroup', label: 'SYSTEM', pages: ['diagnostics'] }
    ];
    const scroll = document.createElement('div');
    scroll.id = 'navScroll';
    scroll.className = 'nav-scroll';
    for (const group of groups) {
      const section = document.createElement('section');
      section.id = group.id;
      section.className = 'nav-group';
      section.setAttribute('aria-label', group.label);
      const label = document.createElement('div');
      label.className = 'nav-group-label';
      label.textContent = group.label;
      section.append(label);
      for (const page of group.pages) {
        for (const button of visibleButtons.filter(item => item.dataset.page === page)) {
          button.dataset.navSection = group.label.toLowerCase();
          section.append(button);
        }
      }
      if (section.querySelector('.nav-item')) scroll.append(section);
    }
    let sidebarBrand = nav.querySelector('.side-nav-brand');
    if (!sidebarBrand) {
      const brand = $('.top > .brand');
      if (brand) {
        sidebarBrand = document.createElement('div');
        sidebarBrand.className = 'side-nav-brand';
        sidebarBrand.setAttribute('role', 'group');
        sidebarBrand.setAttribute('aria-label', 'Shared Cockpit Flight Desk');
        sidebarBrand.append(brand);
      }
    }
    nav.replaceChildren(...(sidebarBrand ? [sidebarBrand, scroll] : [scroll]));
    nav.dataset.grouped = 'true';
    syncSidebarHeight?.();
  }

  function installGlobalFlightContext() {
    const header = $('.top');
    const context = $('#pageContext');
    const tools = $('#headerTools');
    const status = $('#pageLinkStatus');
    const sessionbar = $('#sessionbar');
    const identity = $('.session-identity');
    const toolbar = $('.session-toolbar');
    if (header && context && tools && context.parentElement !== header) header.insertBefore(context, tools);
    if (header && status && status.parentElement !== header) header.insertBefore(status, sessionbar || null);
    if (toolbar && identity && identity.parentElement !== toolbar) toolbar.insertBefore(identity, toolbar.firstChild);
    const copyButton = $('#copyLobbyCode');
    if (copyButton) {
      copyButton.textContent = 'Copy';
      copyButton.setAttribute('aria-label', 'Copy lobby code');
      copyButton.title = 'Copy lobby code';
    }
    const roleControl = $('.role-control');
    const roleSelect = roleControl?.querySelector('select');
    if (roleControl && roleSelect) {
      roleControl.firstChild.textContent = 'Role ';
      roleSelect.setAttribute('aria-label', 'Your pilot role');
    }
    if (context) context.setAttribute('aria-label', 'Current page');
    if (status) {
      status.setAttribute('role', 'group');
      status.setAttribute('aria-label', 'System status');
    }
    const sections = {
      overview: 'FLIGHT DESK', 'flight-plan': 'FLIGHT DESK', route: 'FLIGHT DESK', checklist: 'FLIGHT DESK',
      notes: 'CREW', traffic: 'TRAFFIC', analysis: 'ANALYSIS', efb: 'TOOLS', charts: 'TOOLS',
      'crew-tools': 'TOOLS', diagnostics: 'SYSTEM'
    };
    const label = $('#pageContextSection');
    if (label) label.textContent = sections[activePage] || 'FLIGHT DESK';
  }

  function wrapGlobalContextRenderer() {
    if (typeof renderGlobalPageContext !== 'function' || renderGlobalPageContext.finalPolish) return;
    const previous = renderGlobalPageContext;
    const wrapped = function (...args) {
      const result = previous.apply(this, args);
      installGlobalFlightContext();
      return result;
    };
    wrapped.finalPolish = true;
    renderGlobalPageContext = wrapped;
    renderGlobalPageContext();
  }

  function installRouteHero() {
    const route = $('#page-overview .route');
    if (!route || route.dataset.finalPolish) return;
    const [departure, progress, arrival] = route.children;
    if (!departure || !progress || !arrival) return;
    departure.classList.add('route-column', 'route-column-departure');
    progress.classList.add('route-column', 'route-column-progress');
    arrival.classList.add('route-column', 'route-column-arrival');
    departure.dataset.routeColumn = 'departure';
    progress.dataset.routeColumn = 'progress';
    arrival.dataset.routeColumn = 'arrival';
    departure.setAttribute('role', 'group');
    departure.setAttribute('aria-label', 'Departure information');
    progress.setAttribute('role', 'group');
    progress.setAttribute('aria-label', 'Flight progress');
    arrival.setAttribute('role', 'group');
    arrival.setAttribute('aria-label', 'Arrival information');
    const badge = $('#aircraftBadge');
    const stats = $('#page-overview .stats');
    const flightNumber = stats?.querySelector('#flightno')?.closest('.stat');
    const identity = document.createElement('div');
    identity.className = 'route-flight-identity';
    identity.setAttribute('aria-label', 'Flight identity');
    if (flightNumber) identity.append(flightNumber);
    if (badge) {
      badge.classList.add('route-aircraft-badge');
      badge.title = 'Aircraft in the imported flight plan';
      identity.append(badge);
    }
    progress.prepend(identity);
    if (!$('#routeContextStatus')) {
      const status = document.createElement('span');
      status.id = 'routeContextStatus';
      status.className = 'route-context-status';
      status.hidden = true;
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      progress.append(status);
    }
    route.dataset.finalPolish = 'true';

    const renderContext = () => {
      const status = $('#routeContextStatus');
      const feed = typeof vatsimOperationsCache !== 'undefined' ? vatsimOperationsCache : null;
      const position = typeof routePosition !== 'undefined' && routePosition?.connected ? routePosition : null;
      const trafficEmpty = $('#trafficEmptyState');
      if (trafficEmpty) {
        trafficEmpty.classList.add('workspace-state');
        trafficEmpty.dataset.state = feed?.error ? 'error' : !feed?.checkedAt ? 'loading' : !position ? 'waiting' : 'empty';
      }
      if (!status) return;
      if (!feed?.checkedAt && !feed?.error) { status.hidden = true; return; }
      const nearby = Array.isArray(feed.traffic) ? feed.traffic.filter(item => Number.isFinite(item.distanceNm) && item.distanceNm <= 100).length : 0;
      if (feed.error) {
        status.textContent = 'VATSIM · feed unavailable';
        status.dataset.state = 'error';
      } else if (!position) {
        status.textContent = 'VATSIM · waiting for simulator position';
        status.dataset.state = 'waiting';
      } else {
        status.textContent = nearby ? `VATSIM · ${nearby} aircraft within 100 NM` : 'VATSIM · no aircraft within 100 NM';
        status.dataset.state = 'ready';
      }
      status.hidden = false;
    };
    if (typeof renderFlightProgress === 'function' && !renderFlightProgress.finalPolish) {
      const previous = renderFlightProgress;
      const wrapped = function (...args) { const result = previous.apply(this, args); renderContext(); return result; };
      wrapped.finalPolish = true;
      renderFlightProgress = wrapped;
    }
    if (typeof renderVatsimSituation === 'function' && !renderVatsimSituation.finalHeroContext) {
      const previous = renderVatsimSituation;
      const wrapped = function (...args) { const result = previous.apply(this, args); renderContext(); return result; };
      wrapped.finalHeroContext = true;
      renderVatsimSituation = wrapped;
    }
    renderContext();
  }

  function installFlightBoardComposition() {
    const page = $('#page-overview');
    const dashboard = $('#flightSessionDashboard');
    const prompts = $('#operationsPrompts');
    if (!page || !dashboard || !prompts || page.dataset.composed === 'true') return;

    const sharedState = document.createElement('article');
    sharedState.id = 'sharedCockpitState';
    sharedState.className = 'card shared-state-card';
    sharedState.innerHTML = '<div class="card-head"><div><span class="eyebrow">CREW ACTIVITY</span><h2>Shared Cockpit State</h2></div><span class="muted small">Live pilot updates</span></div>';
    const lastEvent = dashboard.querySelector('.session-last-event');
    const activity = dashboard.querySelector('.crew-activity-wrap');
    const timeline = dashboard.querySelector('#sessionTimeline');
    if (lastEvent) sharedState.append(lastEvent);
    if (activity) sharedState.append(activity);
    if (timeline) sharedState.append(timeline);

    const routePreview = document.createElement('article');
    routePreview.id = 'liveRoutePreview';
    routePreview.className = 'card live-route-preview';
    routePreview.innerHTML = '<div class="card-head"><div class="route-preview-heading"><span class="route-preview-icon" aria-hidden="true">⌖</span><div><span class="eyebrow">FLIGHT PATH</span><h2>Live Route Preview</h2></div></div><button type="button" class="small" data-open-route-viewer>Open Route Viewer</button></div><div class="route-preview-body"><div id="boardRouteMap" class="board-route-map" role="img" aria-label="Planned flight route preview"><div class="route-empty">Import a flight plan to preview its route.</div></div><div id="boardRouteMetrics" class="board-route-metrics" aria-label="Route and simulator metrics"></div></div>';
    dashboard.insertAdjacentElement('afterend', routePreview);
    routePreview.querySelector('[data-open-route-viewer]').addEventListener('click', () => activatePage('route'));

    dashboard.insertAdjacentElement('afterend', sharedState);
    const next = prompts.querySelector('#whatsNext');
    const focus = prompts.querySelector('#operationsFocus');
    if (next && focus) {
      focus.classList.add('focus-inline');
      next.append(focus);
    }
    page.dataset.composed = 'true';
  }

  function installBoardRoutePreview() {
    const boardMap = $('#boardRouteMap');
    const routeArea = $('#routeMapArea');
    if (!boardMap || !routeArea || boardMap.dataset.previewInstalled === 'true') return;
    boardMap.dataset.previewInstalled = 'true';
    let renderingPreview = false;
    let scheduled = false;

    const updatePreview = () => {
      if (scheduled || !boardMap.isConnected) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        if (renderingPreview) return;
        renderingPreview = true;
        try {
          if (typeof renderRouteViewer === 'function') renderRouteViewer({ preview: true });
          const sourceMap = routeArea.querySelector('svg.route-map');
          if (sourceMap) {
            const copy = sourceMap.cloneNode(true);
            copy.removeAttribute('data-interactive-map');
            copy.style.cursor = 'default';
            copy.style.pointerEvents = 'none';
            copy.querySelector('#routeDynamicLayer')?.removeAttribute('id');
            copy.setAttribute('aria-label', 'Planned route and available live aircraft position');
            const attribution = routeArea.querySelector('.route-map-attribution')?.cloneNode(true);
            boardMap.replaceChildren(...(attribution ? [copy, attribution] : [copy]));
          } else {
            const empty = routeArea.querySelector('.route-empty');
            const message = document.createElement('div');
            message.className = 'route-empty';
            message.textContent = empty?.textContent || 'Route geometry is not available in the current flight plan.';
            boardMap.replaceChildren(message);
          }

          const stats = [...($('#routeStats')?.querySelectorAll('.route-stat') || [])];
          const wanted = ['DISTANCE REMAINING', 'ESTIMATED ARRIVAL', 'GROUND SPEED', 'ALTITUDE'];
          const metrics = $('#boardRouteMetrics');
          metrics.replaceChildren();
          for (const label of wanted) {
            const source = stats.find(item => item.querySelector('small')?.textContent.trim() === label);
            const metric = document.createElement('div');
            const name = document.createElement('small');
            const value = document.createElement('strong');
            name.textContent = label === 'ESTIMATED ARRIVAL' ? 'EST. ARRIVAL' : label;
            value.textContent = source?.querySelector('b')?.textContent.trim() || 'Unavailable';
            metric.append(name, value);
            metrics.append(metric);
          }
        } catch {
          boardMap.innerHTML = '<div class="route-empty">Route preview is unavailable. Open Route Viewer for details.</div>';
        } finally {
          renderingPreview = false;
        }
      });
    };

    if (typeof renderRouteViewer === 'function' && !renderRouteViewer.boardPreviewSync) {
      const previous = renderRouteViewer;
      const wrapped = function (...args) {
        const result = previous.apply(this, args);
        if (!renderingPreview) updatePreview();
        return result;
      };
      wrapped.boardPreviewSync = true;
      renderRouteViewer = wrapped;
    }
    for (const name of ['renderSessionDashboard', 'renderFlightProgress']) {
      if (typeof window[name] !== 'function' || window[name].boardPreviewSync) continue;
      const previous = window[name];
      const wrapped = function (...args) {
        const result = previous.apply(this, args);
        updatePreview();
        return result;
      };
      wrapped.boardPreviewSync = true;
      window[name] = wrapped;
    }
    if (typeof activatePage === 'function' && !activatePage.boardPreviewSync) {
      const previous = activatePage;
      const wrapped = function (...args) {
        const result = previous.apply(this, args);
        if (args[0] === 'overview' || args[0] === 'route') updatePreview();
        return result;
      };
      wrapped.boardPreviewSync = true;
      activatePage = wrapped;
    }
    updatePreview();
  }

  function installRouteNavigationHierarchy() {
    if (typeof renderRouteViewer !== 'function' || renderRouteViewer.finalNavigationHierarchy) return;
    const previous = renderRouteViewer;
    const wrapped = function (...args) {
      const result = previous.apply(this, args);
      if (activePage !== 'route') return result;
      const stats = $('#routeStats');
      const statItems = stats ? [...stats.querySelectorAll('.route-stat')] : [];
      statItems[0]?.classList.add('route-stat-current');
      statItems[1]?.classList.add('route-stat-next');
      const waypoints = $('#routeWaypointList');
      if (waypoints) {
        const entries = [...waypoints.querySelectorAll('.route-waypoint')];
        const currentIndex = entries.findIndex(entry => entry.classList.contains('active'));
        entries.forEach((entry, index) => {
          entry.classList.toggle('completed', currentIndex >= 0 && index < currentIndex);
          entry.classList.toggle('active', currentIndex >= 0 && index === currentIndex);
          entry.classList.toggle('next', currentIndex >= 0 && index === currentIndex + 1);
          if (currentIndex >= 0 && index === currentIndex) {
            entry.dataset.state = 'current';
            entry.setAttribute('aria-current', 'step');
          } else {
            delete entry.dataset.state;
            entry.removeAttribute('aria-current');
            if (currentIndex >= 0 && index === currentIndex + 1) entry.dataset.state = 'next';
          }
        });
      }
      return result;
    };
    wrapped.finalNavigationHierarchy = true;
    renderRouteViewer = wrapped;
  }

  function installInteractiveRouteMap() {
    if (typeof renderRouteViewer !== 'function' || renderRouteViewer.finalInteractiveMap) return;
    const previous = renderRouteViewer;
    const wrapped = function (...args) {
      const result = previous.apply(this, args);
      if (activePage !== 'route') return result;
      const area = $('#routeMapArea');
      if (!area) return result;
      if (!$('#routeMapToolbar')) installRouteViewerPolish?.();
      const procedures = $('#routeProceduresSection');
      if (procedures) {
        procedures.hidden = true;
        procedures.setAttribute('aria-hidden', 'true');
      }
      const svg = area.querySelector('.route-map');
      if (!svg || svg.dataset.interactiveMap === 'true') return result;
      svg.dataset.interactiveMap = 'true';
      svg.style.cursor = 'grab';
      svg.style.touchAction = 'none';
      svg.setAttribute('aria-label', 'Interactive route map. Drag to pan and scroll to zoom.');

      const readTileAnchor = () => {
        const image = svg.querySelector('.route-map-tile');
        const match = image?.getAttribute('href')?.match(/\/([0-9]+)\/([0-9]+)\/([0-9]+)\.png(?:\?|$)/);
        if (!image || !match) return null;
        return {
          zoom: Number(match[1]), tileX: Number(match[2]), tileY: Number(match[3]),
          x: Number(image.getAttribute('x')), y: Number(image.getAttribute('y')),
          width: Number(image.getAttribute('width')), height: Number(image.getAttribute('height'))
        };
      };
      const refreshTiles = () => {
        const layer = svg.querySelector('.route-map-tiles');
        if (!layer) return;
        const anchor = svg.__routeTileAnchor || (svg.__routeTileAnchor = readTileAnchor());
        if (!anchor || !anchor.width || !anchor.height) return;
        const box = svg.viewBox.baseVal;
        const scale = Math.max(.6, Number(routeMapViewState.scale) || 1);
        const zoom = Math.max(0, Math.min(19, Math.round(anchor.zoom + Math.log2(scale))));
        const factor = 2 ** (zoom - anchor.zoom);
        const tileWidth = anchor.width / factor;
        const tileHeight = anchor.height / factor;
        const minX = Math.floor((anchor.tileX + (box.x - anchor.x) / anchor.width) * factor) - 1;
        const maxX = Math.floor((anchor.tileX + (box.x + box.width - anchor.x) / anchor.width) * factor) + 1;
        const minY = Math.max(0, Math.floor((anchor.tileY + (box.y - anchor.y) / anchor.height) * factor) - 1);
        const maxY = Math.min(2 ** zoom - 1, Math.floor((anchor.tileY + (box.y + box.height - anchor.y) / anchor.height) * factor) + 1);
        const key = [zoom, minX, maxX, minY, maxY].join(':');
        if (svg.dataset.routeTileKey === key) return;
        svg.dataset.routeTileKey = key;
        const tiles = [];
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const wrappedX = ((x % (2 ** zoom)) + (2 ** zoom)) % (2 ** zoom);
            const sx = anchor.x + (x / factor - anchor.tileX) * anchor.width;
            const sy = anchor.y + (y / factor - anchor.tileY) * anchor.height;
            tiles.push(`<image class="route-map-tile" href="https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png" x="${sx.toFixed(1)}" y="${sy.toFixed(1)}" width="${tileWidth.toFixed(1)}" height="${tileHeight.toFixed(1)}" preserveAspectRatio="none"/>`);
          }
        }
        layer.innerHTML = tiles.join('');
      };
      const updateView = () => {
        const scale = Math.max(.6, Math.min(12, Number(routeMapViewState.scale) || 1));
        const center = routeMapViewState.centerAircraft && routeMapViewState.aircraft
          ? routeMapViewState.aircraft
          : routeMapViewState.center || { x: 480, y: 180 };
        svg.setAttribute('viewBox', `${center.x - 480 / scale} ${center.y - 180 / scale} ${960 / scale} ${360 / scale}`);
        svg.querySelectorAll('.route-line,.route-line-shadow').forEach(path => { path.style.display = routeMapViewState.showRoute ? '' : 'none'; });
        refreshTiles();
      };

      svg.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        const box = svg.viewBox.baseVal;
        const rect = svg.getBoundingClientRect();
        svg.__routeDrag = { id: event.pointerId, x: event.clientX, y: event.clientY, centerX: box.x + box.width / 2, centerY: box.y + box.height / 2, factorX: box.width / rect.width, factorY: box.height / rect.height };
        routeMapViewState.centerAircraft = false;
        svg.style.cursor = 'grabbing';
        try { svg.setPointerCapture(event.pointerId); } catch {}
        event.preventDefault();
      });
      svg.addEventListener('pointermove', event => {
        const drag = svg.__routeDrag;
        if (!drag || drag.id !== event.pointerId) return;
        routeMapViewState.center = { x: drag.centerX - (event.clientX - drag.x) * drag.factorX, y: drag.centerY - (event.clientY - drag.y) * drag.factorY };
        updateView();
      });
      const endDrag = event => {
        if (svg.__routeDrag?.id !== event.pointerId) return;
        svg.__routeDrag = null;
        svg.style.cursor = 'grab';
        if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
      };
      svg.addEventListener('pointerup', endDrag);
      svg.addEventListener('pointercancel', endDrag);
      svg.addEventListener('wheel', event => {
        event.preventDefault();
        const box = svg.viewBox.baseVal;
        const rect = svg.getBoundingClientRect();
        const anchorX = box.x + (event.clientX - rect.left) / rect.width * box.width;
        const anchorY = box.y + (event.clientY - rect.top) / rect.height * box.height;
        const fractionX = (anchorX - box.x) / box.width;
        const fractionY = (anchorY - box.y) / box.height;
        const oldScale = Number(routeMapViewState.scale) || 1;
        const nextScale = Math.max(.6, Math.min(12, oldScale * Math.exp(-event.deltaY * .0012)));
        const width = 960 / nextScale;
        const height = 360 / nextScale;
        routeMapViewState.scale = nextScale;
        routeMapViewState.centerAircraft = false;
        routeMapViewState.center = { x: anchorX + width / 2 - fractionX * width, y: anchorY + height / 2 - fractionY * height };
        updateView();
      }, { passive: false });
      updateView();
      let hint = $('#routeMapHint');
      if (!hint && $('#routeMapToolbar')) {
        hint = document.createElement('span');
        hint.id = 'routeMapHint';
        hint.className = 'route-map-hint';
        hint.textContent = 'Drag to pan · Scroll or use + / − to zoom';
        $('#routeMapToolbar').prepend(hint);
      }
      const toolbar = $('#routeMapToolbar');
      if (toolbar && toolbar.dataset.interactiveControls !== 'true') {
        toolbar.dataset.interactiveControls = 'true';
        toolbar.addEventListener('click', event => {
          const button = event.target.closest('[data-route-command]');
          if (!button || button.disabled) return;
          const box = svg.viewBox.baseVal;
          const center = routeMapViewState.centerAircraft && routeMapViewState.aircraft
            ? routeMapViewState.aircraft
            : routeMapViewState.center || { x: box.x + box.width / 2, y: box.y + box.height / 2 };
          switch (button.dataset.routeCommand) {
            case 'zoom-in':
              routeMapViewState.center = center;
              routeMapViewState.centerAircraft = false;
              routeMapViewState.scale = Math.min(12, (Number(routeMapViewState.scale) || 1) * 1.25);
              break;
            case 'zoom-out':
              routeMapViewState.center = center;
              routeMapViewState.centerAircraft = false;
              routeMapViewState.scale = Math.max(.6, (Number(routeMapViewState.scale) || 1) / 1.25);
              break;
            case 'center':
              if (routeMapViewState.aircraft) {
                routeMapViewState.centerAircraft = true;
                routeMapViewState.center = routeMapViewState.aircraft;
                routeMapViewState.scale = Math.max(1.4, Number(routeMapViewState.scale) || 1);
              }
              break;
            case 'toggle-route':
              routeMapViewState.showRoute = !routeMapViewState.showRoute;
              break;
            default:
              return;
          }
          event.preventDefault();
          event.stopImmediatePropagation();
          renderRouteViewer();
        }, true);
      }
      return result;
    };
    wrapped.finalInteractiveMap = true;
    renderRouteViewer = wrapped;
  }

  function removeAircraftSystemsPanel() {
    if (typeof renderDiagnostics === 'function' && !renderDiagnostics.finalNoAircraftSystems) {
      const previous = renderDiagnostics;
      const wrapped = async function (...args) {
        const result = await previous.apply(this, args);
        $('#aircraftSystemsStatus')?.remove();
        return result;
      };
      wrapped.finalNoAircraftSystems = true;
      renderDiagnostics = wrapped;
    }
    $('#aircraftSystemsStatus')?.remove();
    renderDiagnostics?.();
  }

  function installChronologicalActivityStream() {
    if (typeof renderSessionDashboard === 'function' && !renderSessionDashboard.finalChronologicalStream) {
      const previous = renderSessionDashboard;
      const wrapped = function (...args) {
        const result = previous.apply(this, args);
        const stream = $('#sessionTimeline');
        if (stream) {
          const events = [...stream.querySelectorAll(':scope > div')];
          events.reverse().forEach(event => stream.append(event));
          stream.setAttribute('role', 'list');
          stream.setAttribute('aria-label', 'Recent flight events in chronological order');
          events.forEach(event => { event.classList.add('timeline-event'); event.setAttribute('role', 'listitem'); });
        }
        return result;
      };
      wrapped.finalChronologicalStream = true;
      renderSessionDashboard = wrapped;
      renderSessionDashboard();
    }
    if (typeof renderCrewTools === 'function' && !renderCrewTools.finalChronologicalStream) {
      const previous = renderCrewTools;
      const wrapped = function (...args) {
        const result = previous.apply(this, args);
        const stream = $('#timelineList');
        if (stream) {
          stream.setAttribute('role', 'list');
          stream.setAttribute('aria-label', 'Flight events in chronological order');
          stream.querySelectorAll(':scope > .tool-row').forEach(event => {
            event.classList.add('timeline-event');
            event.setAttribute('role', 'listitem');
          });
        }
        return result;
      };
      wrapped.finalChronologicalStream = true;
      renderCrewTools = wrapped;
      renderCrewTools();
    }
  }

  function installVoiceGroups() {
    const card = $('#voiceLinkCard');
    const controls = card?.querySelector('.voice-controls');
    if (!card || !controls || card.dataset.finalGroups) return;
    const profile = card.querySelector('.voice-profile-grid');
    const devices = card.querySelector('.voice-device-grid');
    const status = $('#voiceStatus');
    const meter = card.querySelector('.voice-mic-meter');
    const audio = $('#voiceRemoteAudio');
    const makeGroup = (id, title) => {
      const section = document.createElement('section');
      section.className = 'voice-section';
      section.dataset.voiceGroup = id;
      const heading = document.createElement('h3');
      heading.textContent = title;
      const body = document.createElement('div');
      body.className = 'voice-section-body';
      section.append(heading, body);
      return { section, body };
    };
    const groups = [makeGroup('connection', 'CONNECTION'), makeGroup('audio', 'AUDIO'), makeGroup('transmit', 'TRANSMIT'), makeGroup('profile', 'VOICE PROFILE')];
    const grid = document.createElement('div');
    grid.className = 'voice-group-grid';
    for (const group of groups) grid.append(group.section);
    card.insertBefore(grid, controls);
    const [connection, audioGroup, transmit, voiceProfile] = groups;
    const mode = controls.querySelector('label');
    for (const node of [$('#voiceEnable'), status].filter(Boolean)) connection.body.append(node);
    for (const node of [$('#voiceSpeaker'), $('#voiceMicTest'), devices, meter].filter(Boolean)) audioGroup.body.append(node);
    for (const node of [mode, $('#voiceKeybindsButton'), $('#voiceMute'), $('#voicePtt')].filter(Boolean)) transmit.body.append(node);
    if (profile) voiceProfile.body.append(profile);
    controls.remove();
    if (audio) card.append(audio);
    card.dataset.finalGroups = 'true';
  }

  function installReplayEmptyState() {
    const section = $('#analysis-replay');
    const card = section?.querySelector('.card');
    const head = card?.querySelector('.card-head');
    if (!card || !head) return;
    let workspace = $('#replayWorkspace');
    if (!workspace) {
      workspace = document.createElement('div');
      workspace.id = 'replayWorkspace';
      workspace.className = 'replay-workspace';
      const content = [...card.children].filter(node => node !== head);
      for (const node of content) workspace.append(node);
      card.append(workspace);
    }
    let empty = $('#replayEmptyState');
    if (!empty) {
      empty = document.createElement('div');
      empty.id = 'replayEmptyState';
      empty.className = 'workspace-state replay-empty-state';
      empty.setAttribute('role', 'status');
      empty.setAttribute('aria-live', 'polite');
      empty.innerHTML = '<span class="empty-mark" aria-hidden="true">⌖</span><strong id="replayEmptyTitle"></strong><span id="replayEmptyDescription"></span><button type="button" class="small" id="replayHistoryButton">View Flight History</button>';
      card.append(empty);
      $('#replayHistoryButton').addEventListener('click', () => {
        activatePage('crew-tools');
        $('#crewToolsNavTabs [data-crew-key="history"]')?.click();
      });
    }
    const select = $('#replayFlightSelect');
    select?.addEventListener('change', updateReplayEmptyState);
    if (typeof renderReplay === 'function' && !renderReplay.finalWorkspaceState) {
      const previous = renderReplay;
      const wrapped = function (...args) { const result = previous.apply(this, args); updateReplayEmptyState(); return result; };
      wrapped.finalWorkspaceState = true;
      renderReplay = wrapped;
    }
    updateReplayEmptyState();
  }

  function updateReplayEmptyState() {
    const workspace = $('#replayWorkspace');
    const empty = $('#replayEmptyState');
    if (!workspace || !empty) return;
    const records = typeof historyRecords === 'function' ? historyRecords() : [];
    const selectedId = $('#replayFlightSelect')?.value || (typeof selectedReplayId !== 'undefined' ? selectedReplayId : '');
    const selected = records.find(record => record.id === selectedId);
    const hasTrack = !!selected && !!window.FlightDeskAnalysis?.sanitizeSamples(selected.samples)?.length;
    const unavailable = !hasTrack;
    workspace.hidden = unavailable;
    empty.hidden = !unavailable;
    empty.dataset.state = 'empty';
    const picker = $('#replayFlightSelect');
    if (picker) picker.hidden = records.length === 0;
    if (!unavailable) return;
    const title = $('#replayEmptyTitle');
    const description = $('#replayEmptyDescription');
    if (records.length === 0) {
      if (title) title.textContent = 'No completed flights';
      if (description) description.textContent = 'No completed flight sessions are available in local history. Complete a flight to populate replay data.';
    } else if (selected) {
      if (title) title.textContent = 'No recorded track for this flight';
      if (description) description.textContent = 'This completed flight has no stored simulator position samples. Flights recorded with the simulator connected will include a replay track.';
    } else {
      if (title) title.textContent = 'Select a flight to replay';
      if (description) description.textContent = 'Choose a completed flight with stored simulator position samples to open its replay workspace.';
    }
  }

  function polishWorkspaceStates() {
    const charts = $('#page-charts .integration-state');
    if (charts && !charts.dataset.finalPolish) {
      charts.classList.add('workspace-state', 'charts-empty-state');
      charts.dataset.finalPolish = 'true';
      charts.dataset.state = 'error';
      const heading = charts.querySelector('h2');
      if (heading) heading.textContent = 'Charts unavailable';
      const copy = charts.querySelector('p');
      if (copy) copy.textContent = 'The dedicated charts workspace is not available in this build. ChartFox airport search remains available in Crew Tools when configured, and aircraft charts may be available through the EFB.';
      const mark = document.createElement('span');
      mark.className = 'empty-mark';
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = '▦';
      charts.querySelector('.card-head')?.prepend(mark);
      charts.setAttribute('role', 'status');
    }
    const diagnosticTitle = $('#page-diagnostics .diagnostics-card .card-head h2');
    if (diagnosticTitle) diagnosticTitle.textContent = 'System health';
    for (const section of document.querySelectorAll('#connectionDiagnostics .diagnostic-section')) {
      const title = section.querySelector('.diagnostic-section-head h3');
      if (title && /peer|connection/i.test(title.textContent)) title.textContent = 'Peer connection';
      else if (title && /simulator/i.test(title.textContent)) title.textContent = 'Simulator';
      else if (title && /aircraft/i.test(title.textContent)) title.textContent = 'Aircraft';
      else if (title && /service/i.test(title.textContent)) title.textContent = 'Services';
    }
  }

  function addAboutVersion() {
    const grid = $('.settings-grid');
    if (!grid || $('#settingsAboutVersion')) return;
    const section = document.createElement('section');
    section.className = 'settings-section settings-about';
    section.innerHTML = '<h3>ABOUT</h3><div class="settings-about-row"><span>Shared Cockpit Flight Desk</span><b id="settingsAboutVersion">Loading build…</b></div>';
    grid.append(section);
    window.cockpitDesktop?.getAppInfo?.().then(info => {
      if (!info) return;
      const version = info.version || info.displayVersion || 'Version unavailable';
      $('#settingsAboutVersion').textContent = version;
      $('#settingsAboutVersion').title = 'Installed application build';
      if (info.displayVersion && $('#appVersion')) {
        $('#appVersion').textContent = info.displayVersion;
        $('#appVersion').title = 'Build ' + version;
      }
    }).catch(() => { $('#settingsAboutVersion').textContent = 'Version unavailable'; });
  }

  function addTooltips() {
    document.querySelectorAll('button[aria-label]:not([title])').forEach(button => {
      const label = button.getAttribute('aria-label')?.trim();
      if (label) button.title = label;
    });
  }

  installWindowChrome();
  installSemanticNavigation();
  wrapGlobalContextRenderer();
  installGlobalSearch();
  installRouteHero();
  installFlightBoardComposition();
  installBoardRoutePreview();
  installRouteNavigationHierarchy();
  installInteractiveRouteMap();
  removeAircraftSystemsPanel();
  installChronologicalActivityStream();
  installVoiceGroups();
  installReplayEmptyState();
  polishWorkspaceStates();
  addAboutVersion();
  addTooltips();
})();
