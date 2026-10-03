(() => {
  const $ = selector => document.querySelector(selector);

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
    nav.replaceChildren(scroll);
    nav.dataset.grouped = 'true';
    syncSidebarHeight?.();
  }

  function installGlobalFlightContext() {
    const header = $('.top');
    const context = $('#pageFlightContext');
    const tools = $('#headerTools');
    if (header && context && tools && context.parentElement !== header) header.insertBefore(context, tools);
    if (context) {
      context.classList.add('global-flight-context');
      context.setAttribute('role', 'group');
      context.setAttribute('aria-label', 'Current flight context');
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
    if (badge) {
      badge.classList.add('route-aircraft-badge');
      badge.title = 'Aircraft in the imported flight plan';
      departure.insertBefore(badge, departure.firstChild);
    }
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

  installSemanticNavigation();
  wrapGlobalContextRenderer();
  installRouteHero();
  installRouteNavigationHierarchy();
  installChronologicalActivityStream();
  installVoiceGroups();
  installReplayEmptyState();
  polishWorkspaceStates();
  addAboutVersion();
  addTooltips();
})();
