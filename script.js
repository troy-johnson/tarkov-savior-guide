const freshnessStamp = document.getElementById('freshnessStamp');
const refreshButton = document.getElementById('refreshButton');

function formatTimestamp(date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function updateFreshness() {
  freshnessStamp.textContent = `Updated ${formatTimestamp(new Date())}`;
}

refreshButton.addEventListener('click', updateFreshness);
updateFreshness();
