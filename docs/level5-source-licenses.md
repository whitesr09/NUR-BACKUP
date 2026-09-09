# Source and integration requirements

Quran text: Tanzil Project (https://tanzil.net/download/), version 1.1, February 2021, with verbatim Arabic text and required attribution/license. Do not edit the source text or claim a partial dataset is complete. Translation permissions and translator attribution must be checked separately. Hadith should be cited by collection and number with edition or source information; do not manufacture reports or authenticity grades.

Prayer calculation references: https://aladhan.com/calculation-methods and https://aladhan.com/prayer-times-api. Different methods and local mosque conventions can differ; show the method, location, offsets and estimated status. Do not assume GPS permission or native notification support.

Gemini REST API: https://ai.google.dev/api/generate-content and https://ai.google.dev/api. Use the x-goog-api-key request header, not query parameters. The key is supplied by the user and never committed or included in a backup. Model availability is discovered through the provider API; a connection test must not be represented as successful without a response. A direct client-side key is not equivalent to a server-side secret. The AI must distinguish retrieved references from generated explanations and must not invent religious citations.
