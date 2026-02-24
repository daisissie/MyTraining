# Daily Training Space

Small local web app to:
- Track your training every day
- Decide exercise vs rest
- Get a simple training suggestion
- Optionally import Apple Health data (`export.xml`)

## Run

Open [`index.html`](./index.html) directly in your browser.

Or run a local server:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## How it works

- Click `I want to exercise` to get a workout recommendation.
- Click `I do not want to exercise` and it will suggest resting.
- Fill your daily log and save it.
- Data is stored in browser `localStorage`.

## Apple Health import (optional)

Direct automatic sync from iPhone Health app to a plain web page is not available due to Apple platform permissions.

This app supports semi-auto import:
1. On iPhone, open Health app.
2. Tap profile icon (top-right).
3. Tap `Export All Health Data`.
4. Unzip the export file and find `export.xml`.
5. Upload `export.xml` in this app.

Imported data currently uses:
- Daily steps (`HKQuantityTypeIdentifierStepCount`)
- Workouts (`Workout` duration)

## Next upgrade ideas

- Add weekly charts
- Add goals and streak widgets
- Build iOS app with HealthKit for real automatic sync
