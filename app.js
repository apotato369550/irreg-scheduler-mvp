// State
const appState = {
  subjects: [], // { courseCode, courseName, sections: [{group, schedule, enrolled, status}]} 
  constraints: {
    earliestStart: '07:30',
    latestEnd: '16:30',
    allowFull: false,
    allowAtRisk: false,
    maxFullPerSchedule: 1,
    maxSchedules: 20,
  },
  generated: {
    schedules: [],
    filtered: [],
    activeTab: 'all',
    sort: 'best',
  },
};

// Utilities: Time parsing and schedule parsing
function toMinutesFromTimeInput(hhmm) {
  const [hh, mm] = hhmm.split(':').map(Number);
  return hh * 60 + mm;
}

function parseAmPmToMinutes(timeStr) {
  // e.g. '10:00 AM' => minutes
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === 'AM') {
    if (hours === 12) hours = 0;
  } else {
    if (hours !== 12) hours += 12;
  }
  return hours * 60 + minutes;
}

function parseSchedule(scheduleString) {
  // Expect format like: 'MW 10:00 AM - 12:30 PM' or 'TTh 07:30 AM - 10:00 AM'
  if (!scheduleString) return null;
  const parts = scheduleString.split(/\s+/);
  if (parts.length < 4) return null;
  const daysToken = parts[0];
  const timePart = scheduleString.slice(daysToken.length).trim();
  const timeMatch = timePart.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
  if (!timeMatch) return null;

  // Parse days: recognize 'Th' first, then singles M,T,W,F
  const days = [];
  let s = daysToken;
  while (s.length) {
    if (s.startsWith('Th')) { days.push('Th'); s = s.slice(2); continue; }
    const ch = s[0];
    if ('MTWF'.includes(ch)) days.push(ch);
    s = s.slice(1);
  }

  const start = parseAmPmToMinutes(timeMatch[1]);
  const end = parseAmPmToMinutes(timeMatch[2]);
  if (start == null || end == null) return null;
  return { days, startTime: start, endTime: end };
}

function hasTimeConflict(schedule1, schedule2) {
  if (!schedule1 || !schedule2) return false;
  const days1 = new Set(schedule1.days);
  const overlapDays = schedule2.days.some(d => days1.has(d));
  if (!overlapDays) return false;
  return schedule1.startTime < schedule2.endTime && schedule2.startTime < schedule1.endTime;
}

function isFullSection(section) {
  const [cur, tot] = section.enrolled.split('/').map(v => parseInt(v.trim(), 10));
  return cur >= tot;
}

function isAtRiskSection(section) {
  const [cur, tot] = section.enrolled.split('/').map(v => parseInt(v.trim(), 10));
  if (cur === 0) return true;
  if (tot >= 40 && cur <= 6) return true;
  if (tot >= 18 && cur <= 2) return true;
  return false;
}

function isViableSection(section, constraints) {
  if (!constraints.allowFull && isFullSection(section)) return false;
  if (!constraints.allowAtRisk && isAtRiskSection(section)) return false;
  const parsed = parseSchedule(section.schedule);
  if (!parsed) return false;
  const earliest = toMinutesFromTimeInput(constraints.earliestStart);
  const latest = toMinutesFromTimeInput(constraints.latestEnd);
  if (parsed.startTime < earliest) return false;
  if (parsed.endTime > (23 * 60 + 59)) return false; // sanity
  // Allow sections ending after latest; they are not filtered here, but used for stats and tabs.
  return true;
}

// Combination generation
function generateValidSchedules(subjects, constraints) {
  const viablePerSubject = subjects.map(subj => subj.sections.filter(sec => isViableSection(sec, constraints)));
  // Early exit if any subject has no viable section
  if (viablePerSubject.some(list => list.length === 0)) return [];

  const results = [];
  const current = [];

  function backtrack(subjectIndex) {
    if (results.length >= constraints.maxSchedules) return;
    if (subjectIndex === subjects.length) {
      // Validate full sections count
      const fullCount = current.reduce((acc, s) => acc + (isFullSection(s) ? 1 : 0), 0);
      if (!constraints.allowFull && fullCount > 0) return; // defensive
      if (constraints.allowFull && fullCount > constraints.maxFullPerSchedule) return;
      const parsedArr = current.map(s => parseSchedule(s.schedule));
      const latestEndPref = toMinutesFromTimeInput(constraints.latestEnd);
      const endsByPreferred = parsedArr.every(p => p.endTime <= latestEndPref);
      const hasLate = !endsByPreferred;
      results.push({
        selections: [...current],
        parsed: parsedArr,
        meta: {
          fullCount,
          endsByPreferred,
          hasLate,
          latestEnd: Math.max(...parsedArr.map(p => p.endTime)),
        },
      });
      return;
    }

    const options = viablePerSubject[subjectIndex];
    for (const sec of options) {
      // Check for conflicts with current
      const parsedSec = parseSchedule(sec.schedule);
      let conflict = false;
      for (const existing of current) {
        if (hasTimeConflict(parsedSec, parseSchedule(existing.schedule))) { conflict = true; break; }
      }
      if (conflict) continue;
      current.push(sec);
      backtrack(subjectIndex + 1);
      current.pop();
      if (results.length >= constraints.maxSchedules) return;
    }
  }

  backtrack(0);
  return results;
}

// Rendering helpers
function el(tag, opts = {}, children = []) { const e = document.createElement(tag); Object.assign(e, opts); children.forEach(c => e.appendChild(c)); return e; }
function text(t) { return document.createTextNode(t); }

function renderSubjects() {
  const wrap = document.getElementById('subject-list');
  wrap.innerHTML = '';
  if (appState.subjects.length === 0) {
    wrap.appendChild(el('div', { className: 'subject-meta', innerText: 'No subjects added yet.' }));
    return;
  }
  appState.subjects.forEach((subj, idx) => {
    const head = el('div', { className: 'subject-head' }, [
      el('div', { }, [
        el('div', { innerText: `${subj.courseCode} — ${subj.courseName}` }),
        el('div', { className: 'subject-meta', innerText: `${subj.sections.length} section(s)` }),
      ]),
      el('div', {}, [
        el('button', { className: 'btn', innerText: 'Add Section', onclick: () => promptAddSection(idx) }),
        el('button', { className: 'btn', innerText: 'Remove', style: 'margin-left:8px', onclick: () => { appState.subjects.splice(idx,1); renderSubjects(); } }),
      ])
    ]);

    const chips = el('div', { className: 'chips' });
    subj.sections.forEach((s, sidx) => {
      const chip = el('span', { className: `chip ${isFullSection(s) ? 'full' : (isAtRiskSection(s) ? 'warn' : 'ok')}` , innerText: `G${s.group} • ${s.schedule} • ${s.enrolled}` });
      chip.title = 'Click to remove';
      chip.style.cursor = 'pointer';
      chip.onclick = () => { subj.sections.splice(sidx,1); renderSubjects(); };
      chips.appendChild(chip);
    });

    const item = el('div', { className: 'subject-item' }, [ head, chips ]);
    wrap.appendChild(item);
  });
}

function promptAddSection(subjectIndex) {
  const group = prompt('Group number (e.g., 1)');
  if (group == null) return;
  const schedule = prompt('Schedule (e.g., TTh 07:30 AM - 10:00 AM)');
  if (schedule == null) return;
  const enrolled = prompt('Enrolled (current/total) (e.g., 7/20)');
  if (enrolled == null) return;
  const status = deriveStatusFromEnrolled(enrolled);
  appState.subjects[subjectIndex].sections.push({ group: Number(group), schedule, enrolled, status });
  renderSubjects();
}

function deriveStatusFromEnrolled(enrolled) {
  const [cur, tot] = (enrolled || '0/0').split('/').map(v => parseInt(v.trim(), 10) || 0);
  return cur >= tot ? 'FULL' : 'OK';
}

// Sections builder (within new subject form)
function addBuilderRow() {
  const list = document.getElementById('builder-section-list');
  const row = document.createElement('div');
  row.className = 'builder-row';
  row.innerHTML = `
    <input type="number" min="0" placeholder="Group" class="b-group" />
    <input type="text" placeholder="e.g., TTh 07:30 AM - 10:00 AM" class="b-schedule" />
    <input type="text" placeholder="7/20" class="b-enrolled" />
    <button type="button" class="remove-icon" title="Remove">✕</button>
  `;
  row.querySelector('.remove-icon').onclick = () => row.remove();
  list.appendChild(row);
}

function clearBuilder() {
  document.getElementById('builder-section-list').innerHTML = '';
}

// Constraints and generation
function readConstraints() {
  const earliestStart = document.getElementById('earliestStart').value || '07:30';
  const latestEnd = document.getElementById('latestEnd').value || '16:30';
  const allowFull = document.getElementById('allowFull').checked;
  const allowAtRisk = document.getElementById('allowAtRisk').checked;
  const maxFullPerSchedule = parseInt(document.getElementById('maxFullPerSchedule').value, 10) || 0;
  const maxSchedules = parseInt(document.getElementById('maxSchedules').value, 10) || 20;
  return { earliestStart, latestEnd, allowFull, allowAtRisk, maxFullPerSchedule, maxSchedules };
}

function formatMinutesToLabel(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}

function refreshTabsLabels() {
  const latestEndPref = toMinutesFromTimeInput(appState.constraints.latestEnd);
  document.querySelectorAll('#result-tabs .time-label').forEach(el => el.textContent = formatMinutesToLabel(latestEndPref));
}

function renderSummary(schedules) {
  const wrap = document.getElementById('summary-stats');
  wrap.innerHTML = '';
  const total = schedules.length;
  const latestEndPref = toMinutesFromTimeInput(appState.constraints.latestEnd);
  const endsBy = schedules.filter(s => s.meta.endsByPreferred).length;
  const late = total - endsBy;
  const hasFull = schedules.filter(s => s.meta.fullCount > 0).length;
  const stats = [
    { label: 'Total schedules', value: total },
    { label: `End by ${formatMinutesToLabel(latestEndPref)}`, value: endsBy },
    { label: 'With late classes', value: late },
    { label: 'With full sections', value: hasFull },
  ];
  stats.forEach(s => {
    const node = el('div', { className: 'stat' }, [ el('strong', { innerText: s.value + ' ' }), text(s.label) ]);
    wrap.appendChild(node);
  });
}

function timetableBounds(parsedArray) {
  const minStart = Math.min(...parsedArray.map(p => p.startTime));
  const maxEnd = Math.max(...parsedArray.map(p => p.endTime));
  const startHour = Math.max(7*60, Math.floor(minStart/60)*60);
  const endHour = Math.min(22*60, Math.ceil(maxEnd/60)*60);
  return { startHour, endHour };
}

function renderTimetableGrid(container, selections, parsedArray) {
  const days = ['M','T','W','Th','F'];
  const { startHour, endHour } = timetableBounds(parsedArray);
  const hours = [];
  for (let t = startHour; t <= endHour; t += 60) hours.push(t);

  const grid = el('div', { className: 'grid' });
  grid.appendChild(el('div'));
  days.forEach(d => grid.appendChild(el('div', { className: 'col-head', innerText: d })));

  hours.forEach(hh => {
    grid.appendChild(el('div', { className: 'time-cell', innerText: formatMinutesToLabel(hh) }));
    for (let i=0;i<5;i++) grid.appendChild(el('div', { className: 'cell' }));
  });

  // Blocks
  parsedArray.forEach((p, idx) => {
    p.days.forEach(d => {
      const dayIndex = days.indexOf(d);
      if (dayIndex === -1) return;
      const colOffset = 1 + dayIndex; // first column are times
      const rowCount = hours.length;
      // Find container cell for that day; we'll absolutely position block within grid container
      const block = el('div', { className: `block ${isFullSection(selections[idx]) ? 'full' : (isAtRiskSection(selections[idx]) ? 'warn' : 'ok')}` });
      block.textContent = `${selections[idx].group} • ${formatMinutesToLabel(p.startTime)}-${formatMinutesToLabel(p.endTime)}`;
      // Compute top based on time
      const totalGridHeight = (rowCount) * 28 + (rowCount) * 4; // approx cell height + gap
      const dayTop = (p.startTime - startHour) / (endHour - startHour + 60) * totalGridHeight;
      const height = Math.max(18, (p.endTime - p.startTime) / (endHour - startHour + 60) * totalGridHeight);
      block.style.top = `${8 + dayTop}px`;
      block.style.height = `${height}px`;
      // Column positioning
      const gridRect = grid.getBoundingClientRect(); // may be 0 now; we will place after insert using requestAnimationFrame
      block.dataset.colIndex = String(colOffset);
      grid.appendChild(block);
      requestAnimationFrame(() => {
        const cells = grid.querySelectorAll('.cell');
        const columns = 6; // 1 time + 5 days
        const colWidth = grid.clientWidth / columns;
        block.style.left = `${colWidth * colOffset + 2}px`;
        block.style.right = `${2}px`;
        block.style.position = 'absolute';
      });
    });
  });

  // Make grid relatively positioned for absolute blocks
  grid.style.position = 'relative';
  container.appendChild(grid);
}

function renderScheduleCard(schedule, index) {
  const card = el('div', { className: 'card' });
  const header = el('div', { className: 'card-header' }, [
    el('div', { innerText: `Schedule #${index+1}` }),
    el('div', { className: 'badges' }),
  ]);

  const endsBadge = el('span', { className: `badge ${schedule.meta.endsByPreferred ? 'good' : 'warn'}` });
  endsBadge.innerText = schedule.meta.endsByPreferred ? `Ends by ${formatMinutesToLabel(toMinutesFromTimeInput(appState.constraints.latestEnd))}` : 'Has Late Classes';
  const fullBadge = el('span', { className: `badge ${schedule.meta.fullCount > 0 ? 'danger' : 'good'}` , innerText: schedule.meta.fullCount > 0 ? 'Has Full Sections' : 'No Full Sections' });
  header.querySelector('.badges').appendChild(endsBadge);
  header.querySelector('.badges').appendChild(fullBadge);

  const gridWrap = el('div');
  renderTimetableGrid(gridWrap, schedule.selections, schedule.parsed);

  const list = el('div', { className: 'subject-listing' });
  schedule.selections.forEach((s, i) => {
    const row = el('div', { className: 'subject-row' }, [
      el('div', { className: 'cc', innerText: findCourseCodeForSection(s) }),
      el('div', { innerText: `G${s.group}` }),
      el('div', { className: 'sched', innerText: s.schedule }),
      el('div', { className: 'enr', innerText: s.enrolled }),
      el('div', {}, [ el('span', { className: `chip ${isFullSection(s) ? 'full' : (isAtRiskSection(s) ? 'warn' : 'ok')}` , innerText: isFullSection(s) ? 'FULL' : (isAtRiskSection(s) ? 'AT-RISK' : 'OK') }) ])
    ]);
    list.appendChild(row);
  });

  const actions = el('div', { className: 'card-actions' }, [
    el('button', { className: 'btn', innerText: 'Copy Text', onclick: () => copyScheduleToClipboard(schedule) }),
  ]);

  card.appendChild(header);
  card.appendChild(gridWrap);
  card.appendChild(list);
  card.appendChild(actions);
  return card;
}

function findCourseCodeForSection(section) {
  for (const subj of appState.subjects) {
    if (subj.sections.includes(section)) return subj.courseCode;
  }
  return '';
}

function copyScheduleToClipboard(schedule) {
  const lines = schedule.selections.map(s => `${findCourseCodeForSection(s)} | G${s.group} | ${s.schedule} | ${s.enrolled}`);
  const textOut = `Schedule\n${lines.join('\n')}`;
  navigator.clipboard.writeText(textOut).then(() => {
    alert('Schedule copied to clipboard');
  }).catch(() => {
    alert('Copy failed');
  });
}

function sortSchedules(list) {
  const latestEndPref = toMinutesFromTimeInput(appState.constraints.latestEnd);
  const sort = appState.generated.sort;
  const scored = list.map(s => {
    const score = (s.meta.endsByPreferred ? 2 : 0) + (s.meta.fullCount === 0 ? 1 : 0) - Math.max(0, (s.meta.latestEnd - latestEndPref) / 60) * 0.01;
    return { s, score };
  });
  if (sort === 'earliest') {
    return [...list].sort((a, b) => a.meta.latestEnd - b.meta.latestEnd);
  } else if (sort === 'fewestFull') {
    return [...list].sort((a, b) => a.meta.fullCount - b.meta.fullCount || a.meta.latestEnd - b.meta.latestEnd);
  }
  return scored.sort((a,b) => b.score - a.score).map(x => x.s);
}

function applyResultsFilters() {
  const tab = appState.generated.activeTab;
  const latestEndPref = toMinutesFromTimeInput(appState.constraints.latestEnd);
  let list = appState.generated.schedules;
  if (tab === 'endsBy') list = list.filter(s => s.meta.endsByPreferred);
  else if (tab === 'late') list = list.filter(s => s.meta.hasLate);
  else if (tab === 'full') list = list.filter(s => s.meta.fullCount > 0);
  appState.generated.filtered = sortSchedules(list);
}

function renderResults() {
  renderSummary(appState.generated.schedules);
  applyResultsFilters();
  const listWrap = document.getElementById('results-list');
  listWrap.innerHTML = '';
  if (appState.generated.filtered.length === 0) {
    listWrap.appendChild(el('div', { className: 'subject-meta', innerText: 'No schedules to display.' }));
    return;
  }
  appState.generated.filtered.forEach((sched, i) => listWrap.appendChild(renderScheduleCard(sched, i)));
}

// Event wiring and initialization
function init() {
  document.getElementById('add-section-btn').onclick = addBuilderRow;
  document.getElementById('reset-form').onclick = (e) => {
    e.preventDefault();
    document.getElementById('courseCode').value = '';
    document.getElementById('courseName').value = '';
    clearBuilder();
  };
  document.getElementById('subject-form').onsubmit = (e) => {
    e.preventDefault();
    const courseCode = document.getElementById('courseCode').value.trim();
    const courseName = document.getElementById('courseName').value.trim();
    if (!courseCode || !courseName) return;
    const secs = [];
    document.querySelectorAll('#builder-section-list .builder-row').forEach(row => {
      const group = parseInt(row.querySelector('.b-group').value, 10);
      const schedule = row.querySelector('.b-schedule').value.trim();
      const enrolled = row.querySelector('.b-enrolled').value.trim();
      if (!group || !schedule || !enrolled) return;
      secs.push({ group, schedule, enrolled, status: deriveStatusFromEnrolled(enrolled) });
    });
    if (secs.length === 0) { alert('Add at least one section.'); return; }
    appState.subjects.push({ courseCode, courseName, sections: secs });
    document.getElementById('courseCode').value = '';
    document.getElementById('courseName').value = '';
    clearBuilder();
    renderSubjects();
  };

  const maxSlider = document.getElementById('maxSchedules');
  const maxVal = document.getElementById('maxSchedulesValue');
  maxSlider.addEventListener('input', () => { maxVal.textContent = maxSlider.value; });

  // Tabs
  document.querySelectorAll('#result-tabs .tab').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('#result-tabs .tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      appState.generated.activeTab = btn.dataset.tab;
      renderResults();
    };
  });

  document.getElementById('sortSelect').onchange = (e) => {
    appState.generated.sort = e.target.value;
    renderResults();
  };

  document.getElementById('allowFull').addEventListener('change', () => {
    document.getElementById('maxFullPerSchedule').disabled = !document.getElementById('allowFull').checked;
  });
  document.getElementById('maxFullPerSchedule').disabled = !document.getElementById('allowFull').checked;

  document.getElementById('generate-btn').onclick = async () => {
    const status = document.getElementById('gen-status');
    status.textContent = 'Generating…';
    // Read constraints and store
    appState.constraints = readConstraints();
    refreshTabsLabels();
    await new Promise(r => setTimeout(r, 50));
    // Generate
    const res = generateValidSchedules(appState.subjects, appState.constraints);
    appState.generated.schedules = res;
    status.textContent = res.length === 0 ? 'No schedules found.' : `Generated ${res.length} schedule(s).`;
    renderResults();
  };

  // Seed with sample data for smoke testing
  seedSample();
  renderSubjects();
  refreshTabsLabels();

  // Import/Export wiring
  document.getElementById('importCsvBtn').onclick = async () => {
    const fi = document.getElementById('csvFileInput');
    if (!fi.files || fi.files.length === 0) { alert('Choose a CSV file first.'); return; }
    const text = await fi.files[0].text();
    const rows = window.SampleData.parseCSV(text);
    const subjects = window.SampleData.csvRowsToSubjects(rows);
    appState.subjects = subjects;
    renderSubjects();
  };
  document.getElementById('exportCsvBtn').onclick = () => {
    const csv = window.SampleData.subjectsToCSV(appState.subjects);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'subjects_export.csv'; a.click();
    URL.revokeObjectURL(url);
  };
  document.getElementById('loadSampleJsonBtn').onclick = () => {
    const sel = document.getElementById('sampleSelect').value;
    appState.subjects = JSON.parse(JSON.stringify(window.SampleData.sampleCourseData[sel].subjects));
    renderSubjects();
  };
  document.getElementById('loadSampleCsvBtn').onclick = () => {
    const sel = document.getElementById('sampleSelect').value;
    const rows = window.SampleData.parseCSV(window.SampleData.sampleCourseDataCSV[sel]);
    appState.subjects = window.SampleData.csvRowsToSubjects(rows);
    renderSubjects();
  };
}

function seedSample() {
  if (appState.subjects.length > 0) return;
  // Default to CS sample
  appState.subjects = JSON.parse(JSON.stringify(window.SampleData.sampleCourseData.cs.subjects));
}

document.addEventListener('DOMContentLoaded', init);

// Expose critical functions to window for quick testing
window.parseSchedule = parseSchedule;
window.hasTimeConflict = hasTimeConflict;
window.isViableSection = (s,c) => isViableSection(s, c || appState.constraints);
window.generateValidSchedules = generateValidSchedules;


