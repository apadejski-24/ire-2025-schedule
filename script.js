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
    sessions.forEach(session => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h2>${session.session_title}</h2>
        <p><strong>Track:</strong> ${session.track}</p>
        <p><strong>Type:</strong> ${session.session_type}</p>
       <p><strong>Start:</strong> ${formatLocalTime(session.start_time)}</p>
<p><strong>End:</strong> ${formatLocalTime(session.end_time)}</p>

        <p>${session.description || ''}</p>
      `;
      container.appendChild(card);
    });
  }
  
  loadSchedule();
  