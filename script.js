const STORAGE_KEY = "habit-tracker-data-v1";
const COLORS = ["#2563eb", "#16a34a", "#7c3aed", "#ea580c", "#db2777"];

const habitList = document.getElementById("habitList");
const emptyState = document.getElementById("emptyState");
const todaySummary = document.getElementById("todaySummary");
const todayMessage = document.getElementById("todayMessage");
const monthlyRate = document.getElementById("monthlyRate");
const bestStreak = document.getElementById("bestStreak");
const bestStreakName = document.getElementById("bestStreakName");
const weekGrid = document.getElementById("weekGrid");
const todayHeading = document.getElementById("todayHeading");
const statusMessage = document.getElementById("statusMessage");
const dialog = document.getElementById("habitDialog");
const habitForm = document.getElementById("habitForm");
const habitId = document.getElementById("habitId");
const habitName = document.getElementById("habitName");
const dialogTitle = document.getElementById("dialogTitle");
const importInput = document.getElementById("importInput");

let data = loadData();
let messageTimer;

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadData() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored && Array.isArray(stored.habits) && stored.records && typeof stored.records === "object") return stored;
  } catch {}
  return { version: 1, habits: [], records: {} };
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function showStatus(message, error = false) {
  clearTimeout(messageTimer);
  statusMessage.textContent = message;
  statusMessage.style.color = error ? "#dc2626" : "#15803d";
  messageTimer = setTimeout(() => statusMessage.textContent = "", 3500);
}

function isDone(habitIdValue, dateKey = localDateKey()) {
  return Boolean(data.records[dateKey]?.includes(habitIdValue));
}

function toggleHabit(id) {
  const key = localDateKey();
  const record = new Set(data.records[key] || []);
  record.has(id) ? record.delete(id) : record.add(id);
  data.records[key] = [...record];
  saveData();
  render();
}

function calculateStreak(id) {
  let streak = 0;
  const date = new Date();
  while (isDone(id, localDateKey(date))) {
    streak += 1;
    date.setDate(date.getDate() - 1);
  }
  return streak;
}

function daysInCurrentMonthUntilToday() {
  return new Date().getDate();
}

function monthlyCompletion() {
  if (data.habits.length === 0) return 0;
  const now = new Date();
  let completed = 0;
  for (let day = 1; day <= now.getDate(); day += 1) {
    const key = localDateKey(new Date(now.getFullYear(), now.getMonth(), day));
    completed += (data.records[key] || []).filter(id => data.habits.some(h => h.id === id)).length;
  }
  const possible = data.habits.length * daysInCurrentMonthUntilToday();
  return possible ? Math.round(completed / possible * 100) : 0;
}

function renderHabits() {
  habitList.replaceChildren();
  emptyState.classList.toggle("hidden", data.habits.length !== 0);
  const todayDone = data.habits.filter(habit => isDone(habit.id)).length;

  data.habits.forEach(habit => {
    const item = document.createElement("article");
    item.className = `habit-item${isDone(habit.id) ? " done" : ""}`;
    item.style.setProperty("--habit-color", habit.color);

    const check = document.createElement("button");
    check.className = "habit-check";
    check.type = "button";
    check.setAttribute("aria-label", `${habit.name}を${isDone(habit.id) ? "未達成" : "達成"}にする`);
    check.textContent = isDone(habit.id) ? "✓" : "";
    check.addEventListener("click", () => toggleHabit(habit.id));

    const info = document.createElement("div");
    info.className = "habit-info";
    const name = document.createElement("strong");
    name.textContent = habit.name;
    const detail = document.createElement("span");
    const streak = calculateStreak(habit.id);
    detail.textContent = streak ? `連続 ${streak}日` : "今日から始めましょう";
    info.append(name, detail);

    const actions = document.createElement("div");
    actions.className = "habit-actions";
    const edit = document.createElement("button");
    edit.className = "small-button";
    edit.type = "button";
    edit.textContent = "編集";
    edit.addEventListener("click", () => openDialog(habit));
    const remove = document.createElement("button");
    remove.className = "small-button delete-button";
    remove.type = "button";
    remove.textContent = "削除";
    remove.addEventListener("click", () => deleteHabit(habit.id));
    actions.append(edit, remove);

    item.append(check, info, actions);
    habitList.append(item);
  });

  todaySummary.textContent = `${todayDone} / ${data.habits.length}`;
  todayMessage.textContent = data.habits.length === 0 ? "習慣を登録しましょう" : todayDone === data.habits.length ? "今日の習慣をすべて達成！" : `あと${data.habits.length - todayDone}個です`;
}

function renderSummary() {
  monthlyRate.textContent = `${monthlyCompletion()}%`;
  let best = { name: "まだ記録がありません", streak: 0 };
  data.habits.forEach(habit => {
    const streak = calculateStreak(habit.id);
    if (streak > best.streak) best = { name: habit.name, streak };
  });
  bestStreak.textContent = `${best.streak}日`;
  bestStreakName.textContent = best.name;
}

function renderWeek() {
  weekGrid.replaceChildren();
  const weekday = ["日", "月", "火", "水", "木", "金", "土"];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const key = localDateKey(date);
    const done = (data.records[key] || []).filter(id => data.habits.some(h => h.id === id)).length;
    const total = data.habits.length;
    const card = document.createElement("div");
    card.className = `day-card${offset === 0 ? " today" : ""}`;
    card.innerHTML = `<span>${weekday[date.getDay()]}曜日</span><strong>${date.getMonth() + 1}/${date.getDate()}</strong><small>${done} / ${total}</small>`;
    weekGrid.append(card);
  }
}

function render() {
  const today = new Date();
  todayHeading.textContent = `${today.getMonth() + 1}月${today.getDate()}日の習慣`;
  renderHabits();
  renderSummary();
  renderWeek();
}

function openDialog(habit = null) {
  habitForm.reset();
  habitId.value = habit?.id || "";
  habitName.value = habit?.name || "";
  dialogTitle.textContent = habit ? "習慣を編集" : "習慣を追加";
  const color = habit?.color || COLORS[0];
  const radio = habitForm.querySelector(`[name="habitColor"][value="${color}"]`);
  if (radio) radio.checked = true;
  dialog.showModal();
  setTimeout(() => habitName.focus(), 50);
}

function closeDialog() { dialog.close(); }

function saveHabit(event) {
  event.preventDefault();
  const name = habitName.value.trim();
  if (!name) return;
  const color = new FormData(habitForm).get("habitColor");
  const existing = data.habits.find(habit => habit.id === habitId.value);
  if (existing) {
    existing.name = name;
    existing.color = color;
  } else {
    data.habits.push({ id: `habit-${Date.now()}-${Math.random().toString(16).slice(2)}`, name, color, createdAt: new Date().toISOString() });
  }
  saveData();
  closeDialog();
  render();
}

function deleteHabit(id) {
  const habit = data.habits.find(item => item.id === id);
  if (!habit || !confirm(`「${habit.name}」を削除しますか？\n過去のチェック記録からも削除されます。`)) return;
  data.habits = data.habits.filter(item => item.id !== id);
  Object.keys(data.records).forEach(key => data.records[key] = data.records[key].filter(recordId => recordId !== id));
  saveData();
  render();
}

function exportData() {
  const payload = { ...data, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `habit-tracker-backup-${localDateKey()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showStatus("バックアップを書き出しました。");
}

async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!Array.isArray(parsed.habits) || !parsed.records || typeof parsed.records !== "object") throw new Error("invalid");
    if (!confirm("現在のデータを、選択したバックアップで上書きしますか？")) return;
    data = { version: 1, habits: parsed.habits, records: parsed.records };
    saveData();
    render();
    showStatus("バックアップを読み込みました。");
  } catch {
    showStatus("このファイルは読み込めません。", true);
  } finally {
    importInput.value = "";
  }
}

function resetAll() {
  if (!data.habits.length && !Object.keys(data.records).length) return showStatus("削除するデータがありません。", true);
  if (!confirm("すべての習慣と記録を削除しますか？\nこの操作は元に戻せません。")) return;
  data = { version: 1, habits: [], records: {} };
  saveData();
  render();
  showStatus("すべてのデータを削除しました。");
}

document.getElementById("openAddButton").addEventListener("click", () => openDialog());
document.getElementById("closeDialogButton").addEventListener("click", closeDialog);
document.getElementById("cancelButton").addEventListener("click", closeDialog);
document.getElementById("exportButton").addEventListener("click", exportData);
document.getElementById("resetAllButton").addEventListener("click", resetAll);
habitForm.addEventListener("submit", saveHabit);
importInput.addEventListener("change", importData);
dialog.addEventListener("click", event => { if (event.target === dialog) closeDialog(); });

render();
