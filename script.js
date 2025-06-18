async function loadSchedule() {
    const res = await fetch('schedule.json');
    const sessions = await res.json();
  
    const container = document.getElementById('schedule');

    const { DateTime } = luxon;

    function formatLocalTime(utcString) {
    return DateTime.fromISO(utcString, { zone: 'utc' })
    .setZone('America/Chicago') // or use your actual zone if needed
    .toLocaleString(DateTime.DATETIME_SHORT);
    }
    function getWeekday(utcString) {
    return DateTime.fromISO(utcString, { zone: 'utc' })
      .setZone('America/Chicago')
      .toFormat('cccc'); // e.g., 'Thursday'
    }
  
    sessions.forEach(session => {
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
  
  loadSchedule();
  