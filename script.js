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

  // Get unique values
  const days = [...new Set(sessions.map(s => getWeekday(s.start_time)))];
  const tracks = [
    ...new Set(
      sessions.flatMap(s => 
        s.track ? s.track.split(',').map(t => t.trim()) : []
      )
    )
  ];
  const types = [...new Set(sessions.map(s => s.session_type).filter(Boolean))];

  // Build dropdowns
  function createSelect(label, id, options) {
    const wrapper = document.createElement('label');
    wrapper.innerHTML = `${label}: <select id="${id}"><option value="">All</option>${options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}</select>`;
    wrapper.style.marginRight = '1rem';
    filtersContainer.appendChild(wrapper);
  }

  // Day buttons as pills (multi-select)
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
  createSelect('Track', 'trackFilter', tracks);
  createSelect('Type', 'typeFilter', types);

  function renderSessions(data) {
    container.innerHTML = '';
    data.forEach(session => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h2>${session.session_title}</h2>
        <p class="weekday"><strong>${getWeekday(session.start_time)}</strong></p>
        <p><strong>Track:</strong> ${session.track}</p>
        <p><strong>Type:</strong> ${session.session_type}</p>
        <p><strong>Start:</strong> ${formatLocalTime(session.start_time)}</p>
        <p><strong>End:</strong> ${formatLocalTime(session.end_time)}</p>
        <p>${session.description || ''}</p>
      `;

      if (session.speakers && session.speakers.length > 0) {
        const speakerList = session.speakers.map(speaker => {
          const name = `${speaker.first} ${speaker.last}`;
          const affiliation = speaker.affiliation ? ` (${speaker.affiliation})` : '';
          return `<li>${name}${affiliation}</li>`;
        }).join('');
        
        card.innerHTML += `
          <p><strong>Speakers:</strong></p>
          <ul>${speakerList}</ul>
        `;
      }

      container.appendChild(card);
    });
  }

  function applyFilters() {
    const selectedDays = [...document.querySelectorAll('.day-button.active')].map(btn => btn.dataset.day);
    const selectedTrack = document.getElementById('trackFilter').value;
    const selectedType = document.getElementById('typeFilter').value;

    const filtered = sessions.filter(s => {
      const sessionDay = getWeekday(s.start_time);
      const matchesDay = selectedDays.length ? selectedDays.includes(sessionDay) : true;
      const matchesTrack = selectedTrack
        ? s.track && s.track.split(',').map(t => t.trim()).includes(selectedTrack)
        : true;
      const matchesType = selectedType
        ? s.session_type === selectedType
        : true;

      return matchesDay && matchesTrack && matchesType;
    });

    renderSessions(filtered);
  }

  renderSessions(sessions); // initial render

  // Toggle day button active state
  filtersContainer.addEventListener('click', (e) => {
    if (e.target.matches('.day-button')) {
      e.target.classList.toggle('active');
      applyFilters();
    }
  });

  // Handle dropdown changes
  filtersContainer.addEventListener('change', () => {
    applyFilters();
  });
}

loadSchedule();
