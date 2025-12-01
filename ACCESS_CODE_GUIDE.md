# How the New Access Code System Works

## Overview

The app now uses **access codes** instead of requiring participants to create accounts. This makes it easier for participants and works perfectly with GitHub Pages.

## For Event Organizers:

1. **Create an event** (requires Google/Email login)
2. **Add participants** with their name and email
   - Each participant automatically gets a unique 6-digit access code
   - The code is displayed in the participant list
3. **Share the event link** and individual access codes:
   - Event URL: `https://keval-kasper.github.io/Secret-santa/#/event/YOUR_EVENT_ID`
   - Send each participant their unique access code via email

## For Participants:

1. **Receive the event link and access code** from the organizer
2. **Open the link** in your browser
3. **Enter your access code** when prompted
4. **Draw your Secret Santa assignment** - you'll see who you're buying for!

## Benefits:

✅ **No account required** for participants  
✅ **Works perfectly with GitHub Pages** (uses hash routing)  
✅ **Secure** - each person has a unique code  
✅ **Simple** - just share link + code via email  
✅ **No 404 errors** - hash routing handles all routes client-side

## Technical Details:

- Uses `HashRouter` instead of `BrowserRouter` for GitHub Pages compatibility
- Access codes stored in Firestore with participant records
- No complex OAuth flows for participants
- Event organizers still use Google/Email auth for event management

## Deployment:

```bash
npm run deploy
```

Your app will be live at: `https://keval-kasper.github.io/Secret-santa/`
