async function loadSchedule() {
  const res = await fetch('schedule.json');
  const sessions = await res.json();

  const container = document.getElementById('schedule');
  const filtersContainer = document.getElementById('filters');
  const { DateTime } = luxon;

  const STORAGE_KEY = 'userSchedule2025';

  function loadUserSchedule() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return new Set(stored ? JSON.parse(stored) : []);
  }

  function saveUserSchedule(scheduleSet) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...scheduleSet]));
  }

  let userSchedule = loadUserSchedule();
  let viewingMySchedule = false;

  function formatLocalTime(utcString, timeOnly = false) {
    const dt = DateTime.fromISO(utcString, { zone: 'utc' }).setZone('America/Chicago');
    return timeOnly ? dt.toFormat('h:mm a') : dt.toLocaleString(DateTime.DATETIME_SHORT);
  }

  function getWeekday(utcString) {
    return DateTime.fromISO(utcString, { zone: 'utc' }).setZone('America/Chicago').toFormat('cccc');
  }

  const days = [...new Set(sessions.map(s => getWeekday(s.start_time)))];
  const tracks = [...new Set(sessions.flatMap(s => s.track ? s.track.split(',').map(t => t.trim()) : []))];
  const types = [...new Set(sessions.map(s => s.session_type).filter(Boolean))];

  // Day filters
  const dayFilterWrapper = document.createElement('div');
  dayFilterWrapper.id = 'day-buttons';
  days.forEach(day => {
    const btn = document.createElement('button');
    btn.textContent = day;
    btn.dataset.day = day;
    btn.className = 'day-button';
    dayFilterWrapper.appendChild(btn);
  });
  filtersContainer.appendChild(dayFilterWrapper);

  function createCheckboxFilter(label, id, options) {
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-multiselect';
    wrapper.style.marginRight = '1rem';
    wrapper.innerHTML = `
      <details>
        <summary><strong>${label}:</strong> <span id="${id}-summary">All</span></summary>
        <div id="${id}-options">
          ${options.map(opt => `
            <label><input type="checkbox" value="${opt}"> ${opt}</label>
          `).join('')}
        </div>
      </details>
    `;
    filtersContainer.appendChild(wrapper);
  }

  createCheckboxFilter('Track', 'trackFilter', tracks);
  createCheckboxFilter('Type', 'typeFilter', types);

  function getCheckedValues(containerId) {
    return [...document.querySelectorAll(`#${containerId}-options input:checked`)].map(i => i.value);
  }

  function updateSummary(id, values) {
    const summary = document.getElementById(`${id}-summary`);
    summary.textContent = values.length ? `${values.length} selected` : 'All';
  }

  function applyFilters() {
    const selectedDays = [...document.querySelectorAll('.day-button.active')].map(btn => btn.dataset.day);
    const selectedTracks = getCheckedValues('trackFilter');
    const selectedTypes = getCheckedValues('typeFilter');

    updateSummary('trackFilter', selectedTracks);
    updateSummary('typeFilter', selectedTypes);

    let filtered = sessions.filter(s => {
      const sessionDay = getWeekday(s.start_time);
      const sessionTracks = s.track ? s.track.split(',').map(t => t.trim()) : [];

      const matchesDay = selectedDays.length ? selectedDays.includes(sessionDay) : true;
      const matchesTrack = selectedTracks.length ? selectedTracks.some(track => sessionTracks.includes(track)) : true;
      const matchesType = selectedTypes.length ? selectedTypes.includes(s.session_type) : true;

      return matchesDay && matchesTrack && matchesType;
    });

    if (viewingMySchedule) {
      filtered = filtered.filter(s => userSchedule.has(s.session_id));
    }

    renderSessions(filtered);
  }

  function renderSessions(data) {
    container.innerHTML = '';

    // Group by time
    const grouped = {};
    data.forEach(session => {
      const startTime = DateTime.fromISO(session.start_time, { zone: 'utc' })
        .setZone('America/Chicago')
        .toFormat('cccc h:mm a');
      if (!grouped[startTime]) grouped[startTime] = [];
      grouped[startTime].push(session);
    });

    document.getElementById('event-count').textContent = `${data.length} event${data.length === 1 ? '' : 's'} shown`;

    Object.entries(grouped).forEach(([startLabel, sessionsAtTime]) => {
      const groupSection = document.createElement('div');
      groupSection.className = 'session-group';

      const header = document.createElement('h3');
      header.textContent = startLabel;
      header.className = 'session-time-header';
      groupSection.appendChild(header);

      const grid = document.createElement('div');
      grid.className = 'card-grid';

      sessionsAtTime.forEach(session => {
        const card = document.createElement('div');
        card.className = 'card collapsed';

        const isAdded = userSchedule.has(session.session_id);
        const addBtn = document.createElement('button');
        addBtn.className = 'schedule-toggle-button';
        addBtn.textContent = isAdded ? 'Remove from Schedule' : 'Add to Schedule';

        addBtn.addEventListener('click', () => {
          if (userSchedule.has(session.session_id)) {
            userSchedule.delete(session.session_id);
          } else {
            userSchedule.add(session.session_id);
          }
          saveUserSchedule(userSchedule);
          applyFilters(); // ✅ Re-filter and re-render based on current mode
        });

        card.innerHTML = `
          <h2>${session.session_title}</h2>
          <p><strong>Track:</strong> ${session.track}</br>
          <strong>Type:</strong> ${session.session_type}</br>
          <strong>Time:</strong> ${formatLocalTime(session.start_time, true)} – ${formatLocalTime(session.end_time, true)}</br>
          <strong>Location:</strong> ${session.room?.room_name || 'TBA'}</p>
          <div class="card-description"><p>${session.description || ''}</p></div>
        `;

        card.prepend(addBtn);

        if (session.speakers?.length > 0) {
          const speakerList = session.speakers.map(speaker => {
            const name = `${speaker.first} ${speaker.last}`;
            const affiliation = speaker.affiliation ? ` (${speaker.affiliation})` : '';
            return `<li>${name}${affiliation}</li>`;
          }).join('');
          card.querySelector('.card-description').innerHTML += `<p><strong>Speakers:</strong></p><ul>${speakerList}</ul>`;
        }

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'read-more-button';
        toggleBtn.textContent = 'Read more';
        toggleBtn.addEventListener('click', () => {
          const isCollapsed = card.classList.toggle('collapsed');
          toggleBtn.textContent = isCollapsed ? 'Read more' : 'Read less';
        });

        card.appendChild(toggleBtn);
        grid.appendChild(card);
      });

      groupSection.appendChild(grid);
      container.appendChild(groupSection);
    });
  }

  // UI Controls
  const utilityBar = document.createElement('div');
  utilityBar.id = 'filter-utility-bar';

  const countDisplay = document.createElement('p');
  countDisplay.id = 'event-count';
  utilityBar.appendChild(countDisplay);

  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear Filters';
  clearBtn.className = 'clear-filters-button';
  clearBtn.addEventListener('click', () => {
    document.querySelectorAll('.day-button.active').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('#trackFilter-options input, #typeFilter-options input').forEach(input => input.checked = false);
    updateSummary('trackFilter', []);
    updateSummary('typeFilter', []);
    applyFilters();
  });
  utilityBar.appendChild(clearBtn);

  const viewToggleBtn = document.createElement('button');
  viewToggleBtn.className = 'view-toggle-button';
  viewToggleBtn.textContent = 'View My Schedule';
  viewToggleBtn.addEventListener('click', () => {
    viewingMySchedule = !viewingMySchedule;
    viewToggleBtn.textContent = viewingMySchedule ? 'View All Events' : 'View My Schedule';
    applyFilters();
  });
  utilityBar.appendChild(viewToggleBtn);

  filtersContainer.appendChild(utilityBar);

  // Event listeners
  filtersContainer.addEventListener('click', (e) => {
    if (e.target.matches('.day-button')) {
      e.target.classList.toggle('active');
      applyFilters();
    }
  });

  filtersContainer.addEventListener('change', () => {
    applyFilters();
  });

  renderSessions(sessions);
}
loadSchedule();
