# NUR Level 4 — Planning & reliability

Continue the custom NUR design without Material 3. Build the next feature set on a development branch and do not dispatch, compile, sign, or publish an APK until explicitly requested.

Priorities: close any remaining Level 3 integration gaps; implement persistent, date-aware reminders for Amanah and goals; support optional notification permissions, local reminders, and safe cancellation; preserve existing prayers, tasks, intentions, money, notes, goals, focus history, and all migration data. Never fabricate completions or send a reminder for a deleted entry. Native scheduling must respect Android permissions and system limitations and must never promise exact delivery.

All additions require source integration and regression tests before release. The original NUR and NUR-material-3 repositories are out of scope.