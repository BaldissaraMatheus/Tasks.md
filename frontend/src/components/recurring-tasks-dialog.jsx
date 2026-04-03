import { IconClear } from "@stackoverflow/stacks-icons/icons";
import { For, Show, createSignal } from "solid-js";
import { Portal } from "solid-js/web";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatSchedule(schedule) {
  if (!schedule) return "";
  switch (schedule.type) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    case "specific_days":
      if (Array.isArray(schedule.days)) {
        return schedule.days.map((d) => DAY_LABELS[d]).join(", ");
      }
      return "Specific days";
    default:
      return schedule.type;
  }
}

export function RecurringTasksDialog(props) {
  const [showForm, setShowForm] = createSignal(false);
  const [name, setName] = createSignal("");
  const [lane, setLane] = createSignal("");
  const [content, setContent] = createSignal("");
  const [scheduleType, setScheduleType] = createSignal("daily");
  const [selectedDays, setSelectedDays] = createSignal([]);

  function resetForm() {
    setName("");
    setLane("");
    setContent("");
    setScheduleType("daily");
    setSelectedDays([]);
    setShowForm(false);
  }

  function handleCreate() {
    const taskName = name().trim();
    if (!taskName || !lane()) return;
    const schedule = { type: scheduleType() };
    if (scheduleType() === "specific_days") {
      schedule.days = selectedDays();
    }
    props.onCreate({
      name: taskName,
      lane: lane(),
      content: content(),
      schedule,
    });
    resetForm();
  }

  function toggleDay(day) {
    const current = selectedDays();
    if (current.includes(day)) {
      setSelectedDays(current.filter((d) => d !== day));
    } else {
      setSelectedDays([...current, day].sort());
    }
  }

  return (
    <Portal>
      <div
        class="dialog-backdrop"
        onClick={() => props.onClose()}
        onKeyDown={(e) => e.key === "Escape" && props.onClose()}
      >
        <dialog
          open
          class="recurring-dialog"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div class="dialog__body recurring-dialog__body">
            <div class="recurring-dialog__header">
              <h2 class="recurring-dialog__title">
                {props.t()('recurring.title')}
              </h2>
              <button
                type="button"
                class="dialog__toolbar-btn"
                onClick={() => props.onClose()}
                title={props.t()('common.close')}
              >
                <span innerHTML={IconClear} />
              </button>
            </div>

            <div class="recurring-dialog__list">
              <Show
                when={props.recurringTasks.length > 0}
                fallback={
                  <p class="recurring-dialog__empty">
                    {props.t()('recurring.empty')}
                  </p>
                }
              >
                <For each={props.recurringTasks}>
                  {(task) => (
                    <div class="recurring-dialog__item">
                      <div class="recurring-dialog__item-info">
                        <strong>{task.name}</strong>
                        <span class="recurring-dialog__item-meta">
                          {task.lane} &middot; {formatSchedule(task.schedule)}
                        </span>
                        <Show when={task.lastCreated}>
                          <span class="recurring-dialog__item-meta">
                            {props.t()('recurring.lastCreated')}{" "}
                            {new Date(task.lastCreated).toLocaleDateString()}
                          </span>
                        </Show>
                      </div>
                      <button
                        type="button"
                        class="recurring-dialog__delete-btn"
                        onClick={() => props.onDelete(task.id)}
                      >
                        {props.t()('common.cancel')}
                      </button>
                    </div>
                  )}
                </For>
              </Show>
            </div>

            <Show
              when={showForm()}
              fallback={
                <button
                  type="button"
                  class="recurring-dialog__add-btn"
                  onClick={() => {
                    if (props.lanes.length > 0 && !lane()) {
                      setLane(props.lanes[0]);
                    }
                    setShowForm(true);
                  }}
                >
                  {props.t()('recurring.add')}
                </button>
              }
            >
              <div class="recurring-dialog__form">
                <label class="recurring-dialog__label">
                  {props.t()('recurring.taskName')}
                  <input
                    type="text"
                    value={name()}
                    onInput={(e) => setName(e.target.value)}
                    class="recurring-dialog__input"
                  />
                </label>
                <label class="recurring-dialog__label">
                  {props.t()('recurring.targetLane')}
                  <select
                    value={lane()}
                    onChange={(e) => setLane(e.target.value)}
                    class="recurring-dialog__select"
                  >
                    <For each={props.lanes}>
                      {(l) => <option value={l}>{l}</option>}
                    </For>
                  </select>
                </label>
                <label class="recurring-dialog__label">
                  {props.t()('recurring.content')}
                  <textarea
                    value={content()}
                    onInput={(e) => setContent(e.target.value)}
                    class="recurring-dialog__textarea"
                    rows="3"
                  />
                </label>
                <label class="recurring-dialog__label">
                  {props.t()('recurring.schedule')}
                  <select
                    value={scheduleType()}
                    onChange={(e) => setScheduleType(e.target.value)}
                    class="recurring-dialog__select"
                  >
                    <option value="daily">{props.t()('recurring.daily')}</option>
                    <option value="weekly">{props.t()('recurring.weekly')}</option>
                    <option value="monthly">{props.t()('recurring.monthly')}</option>
                    <option value="specific_days">{props.t()('recurring.specificDays')}</option>
                  </select>
                </label>
                <Show when={scheduleType() === "specific_days"}>
                  <div class="recurring-dialog__days">
                    <For each={DAY_LABELS}>
                      {(label, i) => (
                        <label class="recurring-dialog__day-label">
                          <input
                            type="checkbox"
                            checked={selectedDays().includes(i())}
                            onChange={() => toggleDay(i())}
                          />
                          {label}
                        </label>
                      )}
                    </For>
                  </div>
                </Show>
                <div class="recurring-dialog__form-actions">
                  <button type="button" onClick={handleCreate}>
                    {props.t()('recurring.create')}
                  </button>
                  <button type="button" onClick={resetForm}>
                    {props.t()('common.cancel')}
                  </button>
                </div>
              </div>
            </Show>
          </div>
        </dialog>
      </div>
    </Portal>
  );
}
