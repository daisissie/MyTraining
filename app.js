const STORAGE_KEY = "training_entries_v1";
const HEALTH_KEY = "health_import_v1";
const PROFILE_KEY = "training_profile_v1";

const entryDateEl = document.getElementById("entryDate");
const sleepHoursEl = document.getElementById("sleepHours");
const energyLevelEl = document.getElementById("energyLevel");
const sorenessLevelEl = document.getElementById("sorenessLevel");
const yesExerciseEl = document.getElementById("yesExercise");
const noExerciseEl = document.getElementById("noExercise");
const suggestionBoxEl = document.getElementById("suggestionBox");
const entryFormEl = document.getElementById("entryForm");
const didExerciseEl = document.getElementById("didExercise");
const workoutTypeEl = document.getElementById("workoutType");
const durationMinEl = document.getElementById("durationMin");
const intensityLevelEl = document.getElementById("intensityLevel");
const dailyNotesEl = document.getElementById("dailyNotes");
const historyBodyEl = document.getElementById("historyBody");
const healthFileInputEl = document.getElementById("healthFileInput");
const healthStatusEl = document.getElementById("healthStatus");
const profileNameEl = document.getElementById("profileName");
const profileGoalEl = document.getElementById("profileGoal");
const heroTitleEl = document.getElementById("heroTitle");
const heroSubtitleEl = document.getElementById("heroSubtitle");

function formatDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function todayString() {
  const now = new Date();
  const tzOffsetMs = now.getTimezoneOffset() * 60 * 1000;
  return formatDateInput(new Date(now.getTime() - tzOffsetMs));
}

function getEntries() {
  return loadJson(STORAGE_KEY, []);
}

function setEntries(entries) {
  saveJson(STORAGE_KEY, entries);
}

function getHealthData() {
  return loadJson(HEALTH_KEY, {});
}

function setHealthData(data) {
  saveJson(HEALTH_KEY, data);
}

function getProfile() {
  return loadJson(PROFILE_KEY, { name: "", goal: "" });
}

function setProfile(profile) {
  saveJson(PROFILE_KEY, profile);
}

function sortedByDateDesc(entries) {
  return [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));
}

function getConsecutiveExerciseDays(entries) {
  const sorted = sortedByDateDesc(entries);
  let streak = 0;
  let cursorDate = new Date();
  cursorDate.setHours(0, 0, 0, 0);

  for (const entry of sorted) {
    const entryDate = new Date(entry.date + "T00:00:00");
    const diffDays = Math.round((cursorDate - entryDate) / (1000 * 60 * 60 * 24));
    if (diffDays !== streak) {
      if (!(streak === 0 && diffDays === 0)) break;
      if (streak > 0) break;
    }

    if (entry.didExercise) {
      streak += 1;
      continue;
    }
    break;
  }

  return streak;
}

function suggestionForExerciseDecision(wantsExercise, context) {
  if (!wantsExercise) {
    return "Rest is fine today. Focus on recovery: hydration, food, and sleep.";
  }

  const { sleepHours, energy, soreness, recentEntries, healthToday } = context;
  const streak = getConsecutiveExerciseDays(recentEntries);
  const sleptPoorly = sleepHours > 0 && sleepHours < 6;
  const highSoreness = soreness >= 7;
  const lowEnergy = energy > 0 && energy <= 4;
  const steps = healthToday?.steps || 0;

  if (sleptPoorly || highSoreness || lowEnergy || streak >= 3) {
    return "Do a light session: 20-30 min walk + 10 min mobility. Keep intensity easy.";
  }

  const trainedYesterday = recentEntries.some((e) => {
    if (!e.didExercise) return false;
    const d = new Date(e.date + "T00:00:00");
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.round((now - d) / (1000 * 60 * 60 * 24)) === 1;
  });

  if (!trainedYesterday && energy >= 7 && soreness <= 4) {
    return "Good day for strength: 45-60 min full-body (squat/hinge/push/pull/core).";
  }

  if (steps < 5000) {
    return "Try cardio today: 25-40 min zone-2 jog, bike, or brisk walk.";
  }

  return "Balanced session: 30-45 min mixed training (mobility + moderate strength/cardio).";
}

function renderHistory() {
  const entries = sortedByDateDesc(getEntries());
  const healthData = getHealthData();
  historyBodyEl.innerHTML = "";

  if (entries.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="8" class="muted">No entries yet.</td>`;
    historyBodyEl.appendChild(tr);
    return;
  }

  entries.slice(0, 30).forEach((entry) => {
    const tr = document.createElement("tr");
    const health = healthData[entry.date] || {};
    tr.innerHTML = `
      <td>${entry.date}</td>
      <td>${entry.didExercise ? "Yes" : "No"}</td>
      <td>${entry.type || "-"}</td>
      <td>${entry.durationMin || "-"}</td>
      <td>${entry.sleepHours || "-"}</td>
      <td>${entry.energy || "-"}</td>
      <td>${entry.soreness || "-"}</td>
      <td>${health.steps ?? "-"}</td>
    `;
    historyBodyEl.appendChild(tr);
  });
}

function getContext() {
  const entries = getEntries();
  const selectedDate = entryDateEl.value || todayString();
  const healthData = getHealthData();

  return {
    sleepHours: Number(sleepHoursEl.value) || 0,
    energy: Number(energyLevelEl.value) || 0,
    soreness: Number(sorenessLevelEl.value) || 0,
    recentEntries: entries,
    healthToday: healthData[selectedDate] || null,
  };
}

function setSuggestion(message) {
  const name = getProfile().name?.trim();
  suggestionBoxEl.textContent = name ? `${name}, ${message}` : message;
}

function renderProfile() {
  const profile = getProfile();
  const name = profile.name?.trim() || "";
  const goal = profile.goal?.trim() || "";

  profileNameEl.value = profile.name || "";
  profileGoalEl.value = profile.goal || "";

  heroTitleEl.textContent = name ? `${name}'s Training Space` : "Daily Training Space";
  heroSubtitleEl.textContent = goal
    ? `Goal: ${goal}. Track your training, decide rest vs exercise, and get a practical suggestion.`
    : "Track your training, decide rest vs exercise, and get a practical suggestion.";
}

function upsertEntry(newEntry) {
  const entries = getEntries();
  const idx = entries.findIndex((entry) => entry.date === newEntry.date);
  if (idx >= 0) entries[idx] = newEntry;
  else entries.push(newEntry);
  setEntries(entries);
}

function parseDatePart(isoDateTime) {
  if (!isoDateTime || typeof isoDateTime !== "string") return null;
  return isoDateTime.slice(0, 10);
}

function importAppleHealthXml(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Invalid XML file");
  }

  const records = Array.from(doc.querySelectorAll("Record"));
  const workouts = Array.from(doc.querySelectorAll("Workout"));
  const aggregated = {};

  function ensureDay(date) {
    if (!aggregated[date]) {
      aggregated[date] = { steps: 0, workoutMin: 0, workoutCount: 0 };
    }
    return aggregated[date];
  }

  records.forEach((record) => {
    const type = record.getAttribute("type");
    const endDate = parseDatePart(record.getAttribute("endDate"));
    const value = Number(record.getAttribute("value"));
    if (!endDate) return;

    if (type === "HKQuantityTypeIdentifierStepCount") {
      const day = ensureDay(endDate);
      day.steps += Number.isFinite(value) ? value : 0;
    }
  });

  workouts.forEach((workout) => {
    const endDate = parseDatePart(workout.getAttribute("endDate"));
    const durationMin = Number(workout.getAttribute("duration"));
    if (!endDate) return;
    const day = ensureDay(endDate);
    day.workoutMin += Number.isFinite(durationMin) ? durationMin : 0;
    day.workoutCount += 1;
  });

  setHealthData(aggregated);
  return {
    days: Object.keys(aggregated).length,
    recordCount: records.length,
    workoutCount: workouts.length,
  };
}

function bindEvents() {
  profileNameEl.addEventListener("input", () => {
    const profile = getProfile();
    setProfile({ ...profile, name: profileNameEl.value });
    renderProfile();
  });

  profileGoalEl.addEventListener("input", () => {
    const profile = getProfile();
    setProfile({ ...profile, goal: profileGoalEl.value });
    renderProfile();
  });

  yesExerciseEl.addEventListener("click", () => {
    const message = suggestionForExerciseDecision(true, getContext());
    didExerciseEl.value = "yes";
    setSuggestion(message);
  });

  noExerciseEl.addEventListener("click", () => {
    didExerciseEl.value = "no";
    workoutTypeEl.value = "rest";
    setSuggestion(suggestionForExerciseDecision(false, getContext()));
  });

  entryFormEl.addEventListener("submit", (event) => {
    event.preventDefault();
    const date = entryDateEl.value || todayString();
    const didExercise = didExerciseEl.value === "yes";

    const entry = {
      date,
      didExercise,
      type: didExercise ? workoutTypeEl.value : "rest",
      durationMin: Number(durationMinEl.value) || 0,
      intensity: Number(intensityLevelEl.value) || 0,
      sleepHours: Number(sleepHoursEl.value) || 0,
      energy: Number(energyLevelEl.value) || 0,
      soreness: Number(sorenessLevelEl.value) || 0,
      notes: dailyNotesEl.value.trim(),
    };

    upsertEntry(entry);
    setSuggestion("Saved. Your daily log is updated.");
    renderHistory();
  });

  healthFileInputEl.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      healthStatusEl.textContent = "Importing...";
      const text = await file.text();
      const result = importAppleHealthXml(text);
      healthStatusEl.textContent = `Imported ${result.days} day(s), ${result.recordCount} records, ${result.workoutCount} workouts.`;
      renderHistory();
    } catch (error) {
      healthStatusEl.textContent = `Import failed: ${error.message}`;
    }
  });
}

function init() {
  entryDateEl.value = todayString();
  renderProfile();
  setSuggestion("Choose if you want to exercise today to get a suggestion.");
  bindEvents();
  renderHistory();
}

init();
