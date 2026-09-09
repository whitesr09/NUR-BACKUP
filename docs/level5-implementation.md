# Levels 11–13 implementation plan

This increment is source-only and must not produce an APK.

11. Quran & Dhikr: attributed Arabic text, translation controls, bookmarks, reading progress, search, and verified adhkar. Full Quran content must be sourced from a vetted edition and validated before distribution; never imply a sample is complete. Keep reading state separate from prayer progress.
12. Prayer companion: manual coordinates or explicitly permitted device location, calculation presets and madhhab, per-prayer offsets, countdown and a local timetable. Calculated times are estimates; manual corrections remain available. Notification and adhan controls must expose actual native support rather than pretend scheduling succeeds.
13. NUR AI: user-owned Gemini key, model selection, connection test, chat and optional explicitly selected local context. No hardcoded keys, no implicit tracking-data uploads, no personal data in URLs or API error logs. Use an authenticated, source-aware Islamic reference workflow, not invented citations. Disclose that direct client-side keys cannot be fully protected and may be exposed by a compromised device. Keep secrets out of all backups.

Preserve app.nur.intentional, original signing identity, existing daily data, and the custom NUR appearance. Add deterministic tests and verify integration before requesting a release.