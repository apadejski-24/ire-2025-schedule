async function loadSchedule() {
  const res = await fetch('schedule.json');
  const sessions = await res.json();

  const container = document.getElementById('schedule');
  const filtersContainer = document.getElementById('filters');
  const { DateTime } = luxon;

  function formatLocalTime(utcString) {
    return DateTime.fromISO(utcString, { zone: 'utc' })
      .setZone('America/Chicago')
      .toLocaleString(DateTime.DATETIME_SHORT);
  }

  function getWeekday(utcString) {
    return DateTime.fromISO(utcString, { zone: 'utc' })
      .setZone('America/Chicago')
      .toFormat('cccc');
  }

  const days = [...new Set(sessions.map(s => getWeekday(s.start_time)))];
  const tracks = [...new Set(sessions.flatMap(s => s.track ? s.track.split(',').map(t => t.trim()) : []))];
  const types = [...new Set(sessions.map(s => s.session_type).filter(Boolean))];

  // Day filters
  const dayFilterWrapper = document.createElement('div');
  dayFilterWrapper.id = 'day-buttons';
  dayFilterWrapper.innerHTML = `<strong>Day:</strong> `;

  days.forEach(day => {
    const btn = document.createElement('button');
    btn.textContent = day;
    btn.dataset.day = day;
    btn.className = 'day-button';
    dayFilterWrapper.appendChild(btn);
  });

  filtersContainer.appendChild(dayFilterWrapper);

  // Custom multi-select filter with checkboxes
  function createCheckboxFilter(label, id, options) {
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-multiselect';
    wrapper.style.marginRight = '1rem';

    wrapper.innerHTML = `
      <details>
        <summary><strong>${label}:</strong> <span id="${id}-summary">All</span></summary>
        <div id="${id}-options">
          ${options.map(opt => `
            <label style="display: block; margin-left: 1rem;">
              <input type="checkbox" value="${opt}"> ${opt}
            </label>
          `).join('')}
        </div>
      </details>
    `;

    filtersContainer.appendChild(wrapper);
  }

  createCheckboxFilter('Track', 'trackFilter', tracks);
  createCheckboxFilter('Type', 'typeFilter', types);

  function renderSessions(data) {
    container.innerHTML = '';
  
    // Sort sessions by start time
    data.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  
    // Group sessions by local start time label
    const grouped = {};
    data.forEach(session => {
      const startTime = DateTime.fromISO(session.start_time, { zone: 'utc' })
        .setZone('America/Chicago')
        .toFormat('cccc h:mm a'); // e.g. "Thursday 9:00 AM"
  
      if (!grouped[startTime]) grouped[startTime] = [];
      grouped[startTime].push(session);
    });
  
    // Count display
    document.getElementById('event-count').textContent = `${data.length} event${data.length === 1 ? '' : 's'} shown`;
  
    // Render each group section
    Object.entries(grouped).forEach(([startLabel, sessionsAtTime]) => {
      const groupSection = document.createElement('div');
      groupSection.className = 'session-group';
  
      const header = document.createElement('h3');
      header.textContent = startLabel;
      header.className = 'session-time-header';
      groupSection.appendChild(header);
  
      sessionsAtTime.forEach(session => {
        const grid = document.createElement('div');
        grid.className = 'card-grid';
        
        sessionsAtTime.forEach(session => {
          const card = document.createElement('div');
          card.className = 'card collapsed';
        
          card.innerHTML = `
            <h2>${session.session_title}</h2>
            <p class="weekday"><strong>${getWeekday(session.start_time)}</strong></p>
            <p><strong>Track:</strong> ${session.track}</p>
            <p><strong>Type:</strong> ${session.session_type}</p>
            <p><strong>Start:</strong> ${formatLocalTime(session.start_time)}</p>
            <p><strong>End:</strong> ${formatLocalTime(session.end_time)}</p>
            <div class="card-description"><p>${session.description || ''}</p></div>
          `;
        
          if (session.speakers && session.speakers.length > 0) {
            const speakerList = session.speakers.map(speaker => {
              const name = `${speaker.first} ${speaker.last}`;
              const affiliation = speaker.affiliation ? ` (${speaker.affiliation})` : '';
              return `<li>${name}${affiliation}</li>`;
            }).join('');
        
            card.querySelector('.card-description').innerHTML += `
              <p><strong>Speakers:</strong></p>
              <ul>${speakerList}</ul>
            `;
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
  
      container.appendChild(groupSection);
    });
  }
  

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

    const filtered = sessions.filter(s => {
      const sessionDay = getWeekday(s.start_time);
      const sessionTracks = s.track ? s.track.split(',').map(t => t.trim()) : [];

      const matchesDay = selectedDays.length ? selectedDays.includes(sessionDay) : true;
      const matchesTrack = selectedTracks.length ? selectedTracks.some(track => sessionTracks.includes(track)) : true;
      const matchesType = selectedTypes.length ? selectedTypes.includes(s.session_type) : true;

      return matchesDay && matchesTrack && matchesType;
    });

    renderSessions(filtered);
  }

  const countDisplay = document.createElement('p');
countDisplay.id = 'event-count';
countDisplay.style.fontWeight = 'bold';
countDisplay.style.marginBottom = '1rem';
container.parentNode.insertBefore(countDisplay, container);

  renderSessions(sessions);

  filtersContainer.addEventListener('click', (e) => {
    if (e.target.matches('.day-button')) {
      e.target.classList.toggle('active');
      applyFilters();
    }
  });

  filtersContainer.addEventListener('change', () => {
    applyFilters();
  });

  // Add Clear All Filters button
const clearBtn = document.createElement('button');
clearBtn.textContent = 'Clear All Filters';
clearBtn.className = 'clear-filters-button';
clearBtn.style.marginTop = '1rem';
clearBtn.style.display = 'block';

clearBtn.addEventListener('click', () => {
  // Clear day buttons
  document.querySelectorAll('.day-button.active').forEach(btn => btn.classList.remove('active'));

  // Clear all checkboxes
  document.querySelectorAll('#trackFilter-options input, #typeFilter-options input').forEach(input => {
    input.checked = false;
  });

  // Update summaries
  updateSummary('trackFilter', []);
  updateSummary('typeFilter', []);

  // Re-render full list
  renderSessions(sessions);
});

filtersContainer.appendChild(clearBtn);

}

loadSchedule();
