export default function ActivityDatePicker({ scope, onScopeChange, date, onDateChange, min, max, window }) {
  return (
    <div className="activity-date-picker">
      <div className="card-view-toggle" role="group" aria-label="Which period to show">
        {[['today', 'Today'], ['day', 'Pick a day'], ['week', 'Pick a week']].map(([value, label]) => (
          <button key={value} type="button" aria-pressed={scope === value}
            className={scope === value ? 'is-active' : ''} onClick={() => onScopeChange(value)}>
            {label}
          </button>
        ))}
      </div>
      {scope !== 'today' && (
        <div className="activity-date-control">
          <label>
            {scope === 'week' ? 'Week of' : 'Day'}
            <input type="date" value={date} min={min} max={max}
              onChange={event => onDateChange(event.target.value)}
              aria-invalid={!window} aria-describedby="activity-period-description" />
          </label>
          <span id="activity-period-description" role="status">
            {window ? `${window.label} (Manila time)` : 'Choose a date within the available period.'}
          </span>
        </div>
      )}
    </div>
  );
}
