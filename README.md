# IRL Dailies

A mobile app for tracking recurring real-life tasks — daily habits, weekly chores, monthly routines, and more.

Built with Vue 3 + TypeScript + Vite, packaged as an Android app via Capacitor.

## Features

- Create tasks with flexible scheduling (daily, weekly, monthly, every N days/weeks/months)
- Track completions and skips with timestamped entries
- Overdue task detection
- Start/end of day notification reminders
- Drag-and-drop task reordering
- Historical date view for retroactive check-offs

## Dev

```bash
npm install
npm run dev
```

## Android Build

```bash
npm run build
npx cap sync android
```

Then open `android/` in Android Studio and run on device.
