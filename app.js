const STORAGE_KEY = "training_entries_v1";
const HEALTH_KEY = "health_import_v1";
const PROFILE_KEY = "training_profile_v1";

const entryDateEl = document.getElementById("entryDate");
const sleepHoursEl = document.getElementById("sleepHours");
const energyLevelEl = document.getElementById("energyLevel");
const sorenessLevelEl = document.getElementById("sorenessLevel");
const moodStateEl = document.getElementById("moodState");
const motivationLevelEl = document.getElementById("motivationLevel");
const yesExerciseEl = document.getElementById("yesExercise");
const noExerciseEl = document.getElementById("noExercise");
const suggestionBoxEl = document.getElementById("suggestionBox");
const coachMessageEl = document.getElementById("coachMessage");
const coachStatsEl = document.getElementById("coachStats");
const notesFormEl = document.getElementById("notesForm");
const notesDateEl = document.getElementById("notesDate");
const dailyNotesEl = document.getElementById("dailyNotes");
const notesStatusEl = document.getElementById("notesStatus");
const autoLogStatusEl = document.getElementById("autoLogStatus");
const historyBodyEl = document.getElementById("historyBody");
const healthFileInputEl = document.getElementById("healthFileInput");
const healthFileNameEl = document.getElementById("healthFileName");
const healthStatusEl = document.getElementById("healthStatus");
const healthInsightsEl = document.getElementById("healthInsights");
const profileNameEl = document.getElementById("profileName");
const supportStyleEl = document.getElementById("supportStyle");
const goalCategoryEl = document.getElementById("goalCategory");
const profileGoalEl = document.getElementById("profileGoal");
const heroTitleEl = document.getElementById("heroTitle");
const heroSubtitleEl = document.getElementById("heroSubtitle");

const GOAL_LABELS = {
  look_fit: "Looking Fit / 塑造线条",
  half_marathon: "Run Half Marathon / 半马",
  gain_muscle: "Gain Muscle / 增肌",
  general: "General Health / 综合体能",
};

const SUPPORT_STYLE_LABELS = {
  encouraging: "Encouraging",
  calm: "Calm",
  direct: "Direct",
};

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

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateKey(dateKey) {
  if (!dateKey || typeof dateKey !== "string") return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function shiftDateKey(dateKey, deltaDays) {
  const date = parseDateKey(dateKey);
  if (!date) return null;
  date.setDate(date.getDate() + deltaDays);
  return toDateKey(date);
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
  return loadJson(PROFILE_KEY, {
    name: "",
    goal: "",
    category: "look_fit",
    supportStyle: "encouraging",
  });
}

function setProfile(profile) {
  saveJson(PROFILE_KEY, profile);
}

function normalizeGoalCategory(raw) {
  if (!raw || !GOAL_LABELS[raw]) return "look_fit";
  return raw;
}

function goalLabel(goalCategory) {
  return GOAL_LABELS[normalizeGoalCategory(goalCategory)];
}

function normalizeSupportStyle(raw) {
  if (!raw || !SUPPORT_STYLE_LABELS[raw]) return "encouraging";
  return raw;
}

function sortedByDateDesc(entries) {
  return [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));
}

function getHealthDatesDesc(healthData) {
  return Object.keys(healthData).sort((a, b) => (a < b ? 1 : -1));
}

function getLatestHealthDate(healthData) {
  return getHealthDatesDesc(healthData)[0] || null;
}

function summarizeHealthWindow(healthData, endDateKey, days = 7) {
  if (!endDateKey) return null;

  let totalSteps = 0;
  let totalWorkoutMin = 0;
  let totalRunMin = 0;
  let workoutDays = 0;
  let activeDays = 0;

  for (let i = 0; i < days; i += 1) {
    const key = shiftDateKey(endDateKey, -i);
    if (!key) continue;

    const day = healthData[key] || { steps: 0, workoutMin: 0, workoutCount: 0, runMin: 0 };
    const steps = Number(day.steps) || 0;
    const workoutMin = Number(day.workoutMin) || 0;
    const runMin = Number(day.runMin) || 0;

    totalSteps += steps;
    totalWorkoutMin += workoutMin;
    totalRunMin += runMin;
    if ((Number(day.workoutCount) || 0) > 0 || workoutMin > 0) workoutDays += 1;
    if (steps >= 6000 || workoutMin >= 20) activeDays += 1;
  }

  return {
    totalSteps,
    avgSteps: totalSteps / days,
    totalWorkoutMin,
    totalRunMin,
    workoutDays,
    activeDays,
    windowDays: days,
  };
}

function metricOrDash(value) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return String(Math.round(num));
}

function hasWorkout(healthDay) {
  if (!healthDay) return false;
  return (Number(healthDay.workoutCount) || 0) > 0 || (Number(healthDay.workoutMin) || 0) > 0;
}

function normalizeWorkoutType(rawType) {
  if (!rawType) return "cardio";
  const type = String(rawType).replace("HKWorkoutActivityType", "").toLowerCase();

  if (/(strength|crossfit|functional|traditional|weight|resistance)/.test(type)) return "strength";
  if (/(yoga|pilates|stretch|flexibility|mobility|mindandbody|cooldown)/.test(type)) return "mobility";
  if (/(basketball|soccer|football|tennis|baseball|volleyball|hockey|rugby|martial|wrestling|sport)/.test(type)) {
    return "sports";
  }

  return "cardio";
}

function convertWorkoutDurationToMin(duration, unit) {
  const value = Number(duration);
  if (!Number.isFinite(value)) return 0;

  const normalizedUnit = String(unit || "min").toLowerCase();
  if (normalizedUnit.startsWith("sec") || normalizedUnit === "s") return value / 60;
  if (normalizedUnit.startsWith("hour") || normalizedUnit === "h") return value * 60;
  return value;
}

function resolvePrimaryType(typeCounts) {
  const entries = Object.entries(typeCounts || {});
  if (entries.length === 0) return "cardio";
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

function isRunningWorkout(rawType) {
  return /running/i.test(String(rawType || ""));
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

function buildHealthExplainText(context) {
  const { healthSummary, healthDateUsed, selectedDate, goalCategory } = context;
  if (!healthSummary || !healthDateUsed) return "";

  const sourceDateNote =
    selectedDate && selectedDate !== healthDateUsed
      ? ` Using latest imported date ${healthDateUsed} (no data on selected date ${selectedDate}).`
      : ` Using imported date ${healthDateUsed}.`;

  return `${sourceDateNote} Goal: ${goalLabel(goalCategory)}. Last 7d avg steps: ${Math.round(healthSummary.avgSteps)}; workout minutes: ${Math.round(healthSummary.totalWorkoutMin)}.`;
}

function goalRecoverySuggestion(goalCategory) {
  const goal = normalizeGoalCategory(goalCategory);

  if (goal === "half_marathon") {
    return "Run-focus recovery: 20-30 min easy walk or very easy jog, then calf/hip mobility.";
  }
  if (goal === "gain_muscle") {
    return "Muscle-focus recovery: 25-35 min light pump or mobility, keep 3-4 reps in reserve.";
  }
  if (goal === "look_fit") {
    return "Fit/line recovery: 20-30 min incline walk + 10 min core and mobility.";
  }

  return "Recovery day: 20-30 min easy walk + mobility, then prioritize sleep and food.";
}

function goalTrainingSuggestion(goalCategory, metrics) {
  const goal = normalizeGoalCategory(goalCategory);
  const {
    trainedYesterday,
    stepsToday,
    recentAvgSteps,
    recentWorkoutMin,
    recentWorkoutDays,
    recentRunMin,
  } = metrics;

  if (goal === "half_marathon") {
    if (recentRunMin < 60) {
      return "Half-marathon build: easy run 35-50 min at conversational pace.";
    }
    if (recentRunMin < 120) {
      return "Half-marathon progression: 10 min warm-up, then 3 x 8 min tempo with 3 min easy between.";
    }
    return "Half-marathon endurance: long easy run 70-90 min, keep effort controlled.";
  }

  if (goal === "gain_muscle") {
    if (!trainedYesterday) {
      return "Hypertrophy day: 55-75 min full-body (squat/hinge/push/pull), 8-12 reps, 2-4 hard sets each.";
    }
    return "Split day: 45-65 min upper/lower focus + 10 min accessory work (arms/shoulders/core).";
  }

  if (goal === "look_fit") {
    if (stepsToday < 6000) {
      return "Fit/line focus: 30-40 min full-body circuit + 15 min brisk walk.";
    }
    return "Fit/line focus: 40-55 min strength + conditioning finisher (8-12 min intervals).";
  }

  if (!trainedYesterday && recentWorkoutDays <= 2) {
    return "General fitness: 40-55 min full-body strength + 10 min zone-2 cardio.";
  }
  if (recentAvgSteps < 5000) {
    return "General fitness: cardio day 30-45 min zone-2 jog, bike, or brisk walk.";
  }
  if (recentWorkoutMin >= 210) {
    return "General fitness: moderate day 30-40 min mixed mobility + light strength.";
  }
  return "General fitness: balanced 30-45 min mixed training (mobility + strength/cardio).";
}

function windowTrainingStats(entries, endDateKey, days = 7) {
  if (!endDateKey) return { days: 0, minutes: 0 };
  const startKey = shiftDateKey(endDateKey, -(days - 1));
  if (!startKey) return { days: 0, minutes: 0 };

  let trainedDays = 0;
  let totalMinutes = 0;

  entries.forEach((entry) => {
    if (entry.date < startKey || entry.date > endDateKey) return;
    if (!entry.didExercise) return;
    trainedDays += 1;
    totalMinutes += Number(entry.durationMin) || 0;
  });

  return { days: trainedDays, minutes: totalMinutes };
}

function trendText(delta) {
  if (delta > 0) return `+${delta}`;
  return `${delta}`;
}

function buildHistoryInsights(context) {
  const { recentEntries, healthDateUsed, healthSummary } = context;

  if (!healthDateUsed) {
    return {
      streak: getConsecutiveExerciseDays(recentEntries),
      last7: { days: 0, minutes: 0 },
      prev7: { days: 0, minutes: 0 },
      deltaDays: 0,
      deltaMinutes: 0,
      avgSteps: 0,
      runMin: 0,
    };
  }

  const last7 = windowTrainingStats(recentEntries, healthDateUsed, 7);
  const prevEnd = shiftDateKey(healthDateUsed, -7);
  const prev7 = windowTrainingStats(recentEntries, prevEnd, 7);

  return {
    streak: getConsecutiveExerciseDays(recentEntries),
    last7,
    prev7,
    deltaDays: last7.days - prev7.days,
    deltaMinutes: Math.round(last7.minutes - prev7.minutes),
    avgSteps: Math.round(Number(healthSummary?.avgSteps) || 0),
    runMin: Math.round(Number(healthSummary?.totalRunMin) || 0),
  };
}

function emotionalSupportLine(context, wantsExercise, historyInsights) {
  const profile = getProfile();
  const style = normalizeSupportStyle(profile.supportStyle);
  const motivation = context.motivation;
  const mood = context.mood;

  if (!wantsExercise) {
    if (style === "direct") {
      return "One rest day is a strategy, not a failure. Recover hard and come back tomorrow.";
    }
    if (style === "calm") {
      return "Rest is part of training. A calmer day now protects consistency later.";
    }
    return "Resting today is valid. You are still building progress through recovery.";
  }

  if (style === "direct") {
    if (motivation <= 4) return "No pressure for perfect. Start 10 minutes, then decide again.";
    if (mood === "drained" || mood === "stressed") return "Keep it controlled and finish feeling better than you started.";
    return "You are ready. Execute the plan and keep the quality high.";
  }

  if (style === "calm") {
    if (motivation <= 4) return "Keep it simple: gentle start, then settle into rhythm.";
    if (historyInsights.streak >= 3) return "Your consistency is strong. Choose a smooth, sustainable pace today.";
    return "You are building quietly and steadily. One focused session is enough.";
  }

  if (motivation <= 4) return "You only need one small win today. Start easy and let momentum grow.";
  if (historyInsights.deltaDays > 0) return "You are trending up this week. Keep that streak alive today.";
  return "You’ve got this. A focused session today moves you closer to your goal.";
}

function setCoachMessage(message, context = null, wantsExercise = true) {
  if (!context) {
    coachMessageEl.textContent = message;
    coachStatsEl.textContent = "";
    return;
  }

  const historyInsights = buildHistoryInsights(context);
  const supportLine = emotionalSupportLine(context, wantsExercise, historyInsights);
  coachMessageEl.textContent = `${message} ${supportLine}`;
  coachStatsEl.textContent = `Your trend: last 7d ${historyInsights.last7.days} training day(s), ${Math.round(historyInsights.last7.minutes)} min (${trendText(historyInsights.deltaDays)} day(s), ${trendText(historyInsights.deltaMinutes)} min vs previous 7d). Streak: ${historyInsights.streak} day(s).`;
}

function suggestionForExerciseDecision(wantsExercise, context) {
  const { sleepHours, energy, soreness, recentEntries, healthToday, healthYesterday, healthSummary, goalCategory } = context;

  if (!wantsExercise) {
    return "Rest is fine today. Focus on recovery: hydration, food, and sleep.";
  }

  const streak = getConsecutiveExerciseDays(recentEntries);
  const sleptPoorly = sleepHours > 0 && sleepHours < 6;
  const highSoreness = soreness >= 7;
  const lowEnergy = energy > 0 && energy <= 4;
  const stepsToday = Number(healthToday?.steps) || 0;
  const workoutMinYesterday = Number(healthYesterday?.workoutMin) || 0;
  const recentAvgSteps = Number(healthSummary?.avgSteps) || 0;
  const recentWorkoutMin = Number(healthSummary?.totalWorkoutMin) || 0;
  const recentWorkoutDays = Number(healthSummary?.workoutDays) || 0;
  const recentRunMin = Number(healthSummary?.totalRunMin) || 0;

  const trainedYesterday = recentEntries.some((entry) => {
    if (!entry.didExercise) return false;
    const d = new Date(entry.date + "T00:00:00");
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.round((now - d) / (1000 * 60 * 60 * 24)) === 1;
  });

  const heavyRecentLoad = workoutMinYesterday >= 50 || (recentWorkoutMin >= 210 && recentWorkoutDays >= 4);
  if (sleptPoorly || highSoreness || lowEnergy || streak >= 3 || heavyRecentLoad) {
    return goalRecoverySuggestion(goalCategory);
  }

  return goalTrainingSuggestion(goalCategory, {
    trainedYesterday,
    stepsToday,
    recentAvgSteps,
    recentWorkoutMin,
    recentWorkoutDays,
    recentRunMin,
  });
}

function renderHistory() {
  const entries = sortedByDateDesc(getEntries());
  const healthData = getHealthData();
  historyBodyEl.innerHTML = "";

  if (entries.length === 0) {
    const healthDates = getHealthDatesDesc(healthData);

    if (healthDates.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="9" class="muted">No entries yet.</td>`;
      historyBodyEl.appendChild(tr);
      return;
    }

    healthDates.slice(0, 30).forEach((date) => {
      const health = healthData[date] || {};
      const source = hasWorkout(health) ? "Auto" : "Imported";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${date}</td>
        <td>${hasWorkout(health) ? "Yes" : "No"}</td>
        <td>${hasWorkout(health) ? health.primaryType || "cardio" : "-"}</td>
        <td>${metricOrDash(health.workoutMin)}</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>${source}</td>
        <td>${metricOrDash(health.steps)}</td>
      `;
      historyBodyEl.appendChild(tr);
    });

    return;
  }

  entries.slice(0, 30).forEach((entry) => {
    const tr = document.createElement("tr");
    const health = healthData[entry.date] || {};
    tr.innerHTML = `
      <td>${entry.date}</td>
      <td>${entry.didExercise ? "Yes" : "No"}</td>
      <td>${entry.type || "-"}</td>
      <td>${metricOrDash(entry.durationMin)}</td>
      <td>${metricOrDash(entry.sleepHours)}</td>
      <td>${metricOrDash(entry.energy)}</td>
      <td>${metricOrDash(entry.soreness)}</td>
      <td>${entry.autoFromHealth ? "Auto" : "Manual"}</td>
      <td>${metricOrDash(entry.importedSteps ?? health.steps)}</td>
    `;
    historyBodyEl.appendChild(tr);
  });
}

function getContext() {
  const entries = getEntries();
  const selectedDate = entryDateEl.value || todayString();
  const healthData = getHealthData();

  const latestHealthDate = getLatestHealthDate(healthData);
  const healthDateUsed = healthData[selectedDate] ? selectedDate : latestHealthDate;
  const healthToday = healthDateUsed ? healthData[healthDateUsed] || null : null;
  const yesterdayKey = healthDateUsed ? shiftDateKey(healthDateUsed, -1) : null;
  const healthYesterday = yesterdayKey ? healthData[yesterdayKey] || null : null;
  const healthSummary = healthDateUsed ? summarizeHealthWindow(healthData, healthDateUsed, 7) : null;

  return {
    selectedDate,
    goalCategory: normalizeGoalCategory(getProfile().category),
    supportStyle: normalizeSupportStyle(getProfile().supportStyle),
    mood: moodStateEl.value || "neutral",
    motivation: Number(motivationLevelEl.value) || 5,
    sleepHours: Number(sleepHoursEl.value) || 0,
    energy: Number(energyLevelEl.value) || 0,
    soreness: Number(sorenessLevelEl.value) || 0,
    recentEntries: entries,
    healthDateUsed,
    healthToday,
    healthYesterday,
    healthSummary,
  };
}

function setSuggestion(message, context = null) {
  const name = getProfile().name?.trim();
  const baseMessage = name ? `${name}, ${message}` : message;
  const explain = context ? buildHealthExplainText(context) : "";
  suggestionBoxEl.textContent = `${baseMessage}${explain}`;
}

function renderHealthInsights() {
  const healthData = getHealthData();
  const selectedDate = entryDateEl.value || todayString();
  const latestDate = getLatestHealthDate(healthData);

  if (!latestDate) {
    healthInsightsEl.textContent = "No imported health data yet.";
    return;
  }

  const healthDateUsed = healthData[selectedDate] ? selectedDate : latestDate;
  const today = healthData[healthDateUsed] || { steps: 0, workoutMin: 0, workoutCount: 0, runMin: 0 };
  const summary = summarizeHealthWindow(healthData, healthDateUsed, 7);
  const sourceNote =
    healthDateUsed === selectedDate
      ? `Using selected date ${healthDateUsed}.`
      : `Using latest imported date ${healthDateUsed} (no imported data on ${selectedDate}).`;

  healthInsightsEl.textContent = `${sourceNote} Steps: ${Math.round(Number(today.steps) || 0)}, workouts: ${Number(today.workoutCount) || 0}, workout min: ${Math.round(Number(today.workoutMin) || 0)}. Last 7d avg steps: ${Math.round(summary.avgSteps)}, last 7d workout min: ${Math.round(summary.totalWorkoutMin)}, last 7d run min: ${Math.round(summary.totalRunMin)}.`;
}

function renderProfile() {
  const profile = getProfile();
  const name = profile.name?.trim() || "";
  const goal = profile.goal?.trim() || "";
  const category = normalizeGoalCategory(profile.category);
  const supportStyle = normalizeSupportStyle(profile.supportStyle);

  profileNameEl.value = profile.name || "";
  supportStyleEl.value = supportStyle;
  goalCategoryEl.value = category;
  profileGoalEl.value = profile.goal || "";

  heroTitleEl.textContent = name ? `${name}'s Training Space` : "Daily Training Space";
  heroSubtitleEl.textContent = goal
    ? `Focus: ${goalLabel(category)}. Goal: ${goal}. Coaching style: ${SUPPORT_STYLE_LABELS[supportStyle]}.`
    : `Focus: ${goalLabel(category)}. Coaching style: ${SUPPORT_STYLE_LABELS[supportStyle]}.`;
}

function upsertEntry(newEntry) {
  const entries = getEntries();
  const idx = entries.findIndex((entry) => entry.date === newEntry.date);
  if (idx >= 0) entries[idx] = newEntry;
  else entries.push(newEntry);
  setEntries(entries);
}

function getEntryByDate(date) {
  const entries = getEntries();
  return entries.find((entry) => entry.date === date) || null;
}

function saveNoteForDate(date, note) {
  const entries = getEntries();
  const idx = entries.findIndex((entry) => entry.date === date);

  if (idx >= 0) {
    entries[idx] = { ...entries[idx], notes: note };
    setEntries(entries);
    return;
  }

  const health = getHealthData()[date] || {};
  const didExercise = hasWorkout(health);

  entries.push({
    date,
    didExercise,
    type: didExercise ? health.primaryType || "cardio" : "rest",
    durationMin: Math.round(Number(health.workoutMin) || 0),
    intensity: null,
    sleepHours: null,
    energy: null,
    soreness: null,
    notes: note,
    autoFromHealth: didExercise,
    importedSteps: Math.round(Number(health.steps) || 0),
  });

  setEntries(entries);
}

function loadNoteForDate(date) {
  const entry = getEntryByDate(date);
  dailyNotesEl.value = entry?.notes || "";
}

function renderAutoLogStatus(syncResult = null) {
  const autoCount = getEntries().filter((entry) => entry.autoFromHealth).length;

  if (syncResult && (syncResult.created > 0 || syncResult.updated > 0)) {
    autoLogStatusEl.textContent = `Auto sync complete. Created ${syncResult.created}, updated ${syncResult.updated} log(s). Total auto logs: ${autoCount}.`;
    return;
  }

  if (autoCount === 0) {
    autoLogStatusEl.textContent = "No auto logs yet. Import Health data to create exercise logs automatically.";
    return;
  }

  autoLogStatusEl.textContent = `Auto logs ready: ${autoCount} day(s) synced from Health data.`;
}

function syncEntriesFromHealthData() {
  const healthData = getHealthData();
  const dates = getHealthDatesDesc(healthData);
  const entries = getEntries();

  let created = 0;
  let updated = 0;

  dates.forEach((date) => {
    const health = healthData[date] || {};
    if (!hasWorkout(health)) return;

    const idx = entries.findIndex((entry) => entry.date === date);
    const current = idx >= 0 ? entries[idx] : null;

    const mergedEntry = {
      date,
      didExercise: true,
      type: health.primaryType || (current?.type && current.type !== "rest" ? current.type : "cardio"),
      durationMin: Math.round(Number(health.workoutMin) || 0),
      intensity: current?.intensity ?? null,
      sleepHours: current?.sleepHours ?? null,
      energy: current?.energy ?? null,
      soreness: current?.soreness ?? null,
      notes: current?.notes || "",
      autoFromHealth: true,
      importedSteps: Math.round(Number(health.steps) || 0),
    };

    if (idx >= 0) {
      entries[idx] = { ...current, ...mergedEntry };
      updated += 1;
    } else {
      entries.push(mergedEntry);
      created += 1;
    }
  });

  if (created > 0 || updated > 0) {
    setEntries(entries);
  }

  return { created, updated };
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
      aggregated[date] = { steps: 0, workoutMin: 0, workoutCount: 0, runMin: 0, typeCounts: {} };
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
    const duration = workout.getAttribute("duration");
    const durationUnit = workout.getAttribute("durationUnit");
    const rawActivityType = workout.getAttribute("workoutActivityType");
    const workoutType = normalizeWorkoutType(rawActivityType);

    if (!endDate) return;
    const day = ensureDay(endDate);
    const workoutMin = convertWorkoutDurationToMin(duration, durationUnit);
    day.workoutMin += workoutMin;
    day.workoutCount += 1;
    day.typeCounts[workoutType] = (day.typeCounts[workoutType] || 0) + 1;
    if (isRunningWorkout(rawActivityType)) {
      day.runMin += workoutMin;
    }
  });

  Object.keys(aggregated).forEach((date) => {
    const day = aggregated[date];
    day.primaryType = resolvePrimaryType(day.typeCounts);
    delete day.typeCounts;
  });

  setHealthData(aggregated);
  return {
    days: Object.keys(aggregated).length,
    recordCount: records.length,
    workoutCount: workouts.length,
    latestDate: getLatestHealthDate(aggregated),
  };
}

function bindEvents() {
  profileNameEl.addEventListener("input", () => {
    const profile = getProfile();
    setProfile({ ...profile, name: profileNameEl.value });
    renderProfile();
  });

  supportStyleEl.addEventListener("change", () => {
    const profile = getProfile();
    setProfile({ ...profile, supportStyle: normalizeSupportStyle(supportStyleEl.value) });
    renderProfile();
    setCoachMessage("Coaching style updated.", getContext(), true);
  });

  goalCategoryEl.addEventListener("change", () => {
    const profile = getProfile();
    setProfile({ ...profile, category: normalizeGoalCategory(goalCategoryEl.value) });
    renderProfile();
    setCoachMessage("Goal focus updated.", getContext(), true);
  });

  profileGoalEl.addEventListener("input", () => {
    const profile = getProfile();
    setProfile({ ...profile, goal: profileGoalEl.value });
    renderProfile();
  });

  entryDateEl.addEventListener("change", () => {
    renderHealthInsights();
  });

  notesDateEl.addEventListener("change", () => {
    loadNoteForDate(notesDateEl.value);
    notesStatusEl.textContent = "";
  });

  yesExerciseEl.addEventListener("click", () => {
    const context = getContext();
    const message = suggestionForExerciseDecision(true, context);
    setSuggestion(message, context);
    setCoachMessage(`Today plan: ${message}`, context, true);
  });

  noExerciseEl.addEventListener("click", () => {
    const context = getContext();
    const message = suggestionForExerciseDecision(false, context);
    setSuggestion(message, context);
    setCoachMessage(`Today plan: ${message}`, context, false);
  });

  notesFormEl.addEventListener("submit", (event) => {
    event.preventDefault();
    const date = notesDateEl.value || todayString();
    const note = dailyNotesEl.value.trim();

    saveNoteForDate(date, note);
    notesStatusEl.textContent = `Saved note for ${date}.`;
    renderHistory();
  });

  healthFileInputEl.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      healthFileNameEl.textContent = "No file selected";
      return;
    }

    healthFileNameEl.textContent = file.name;

    try {
      healthStatusEl.textContent = "Importing...";
      const text = await file.text();
      const result = importAppleHealthXml(text);
      const syncResult = syncEntriesFromHealthData();

      healthStatusEl.textContent = `Imported ${result.days} day(s), ${result.recordCount} records, ${result.workoutCount} workouts. Latest imported date: ${result.latestDate || "n/a"}.`;
      renderAutoLogStatus(syncResult);
      renderHealthInsights();
      renderHistory();
      loadNoteForDate(notesDateEl.value || todayString());
      setSuggestion("Health data imported and logs auto-synced. Click exercise/rest for a recommendation.", getContext());
      setCoachMessage("I updated your history and I am ready to coach your next move.", getContext(), true);
    } catch (error) {
      healthStatusEl.textContent = `Import failed: ${error.message}`;
    }
  });
}

function init() {
  const today = todayString();
  entryDateEl.value = today;
  notesDateEl.value = today;
  moodStateEl.value = "neutral";
  motivationLevelEl.value = "6";

  renderProfile();
  const initialSyncResult = syncEntriesFromHealthData();
  bindEvents();
  renderAutoLogStatus(initialSyncResult);
  renderHealthInsights();
  renderHistory();
  loadNoteForDate(today);
  setSuggestion("Choose if you want to exercise today to get a suggestion.");
  setCoachMessage("I know your recent training trend. Pick exercise or rest and I will guide you.", getContext(), true);
}

init();
