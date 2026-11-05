# Chai Break

Seven relaxing mini games from everyday Indian life: roll a roti, pour chai, sprinkle a rangoli, trace mehndi, fill a masala dabba, crunch papad and shell peas. Breathe, a slow breathing exercise with a marigold, sits beside them with no score.

Plain HTML, CSS and JavaScript with no dependencies. All art is drawn in code and all sound is generated at runtime, so the game ships no image, audio or font files.

## Play locally

```bash
python3 -m http.server 8765 --directory .
```

Then open http://localhost:8765.

## Build the upload ZIPs

```bash
sh package.sh
```

This writes two files to `dist/`. They are not interchangeable:

- `chai-break-itch.zip` has no Playables SDK. Use it for itch.io and other websites.
- `chai-break-playables.zip` has the SDK. Use it only for the Playables Developer Portal.

Inside any iframe, the SDK assumes it is on YouTube, and reports audio as off, which would silence the game on itch.io, so the web build leaves the SDK out.

## Upload to itch.io

1. Choose **Create new project** on the dashboard.
2. Set **Kind of project** to **HTML** and upload `chai-break-itch.zip`.
3. Tick **This file will be played in the browser**.
4. Set the embed size to 800 x 600 and tick **Mobile friendly**.
5. Set **Visibility & access** to **Public**, then test the link in a private window.

## How it meets the Playables rules

| Rule | How the game handles it |
|---|---|
| Load the SDK first | In the Playables build, the SDK script comes before all game code in `index.html` |
| `firstFrameReady` and `gameReady` | Called from `js/main.js`, without waiting for animation frames, so a hidden zero-size view can't block them |
| Saving progress | None. The game is designed to restart each session, which the rules exempt from cloud saves. Ticks and coins last only until it is closed |
| Pause and resume | `onPause` and `onResume` only; no Page Visibility API |
| YouTube mute | `isAudioEnabled` and `onAudioEnabledChange`; the in-game sound button is hidden inside Playables |
| No outside calls | No network requests, analytics, links, logins or personal data |
| Touch and mouse, any shape | Pointer events and a stage that scales to any viewport; orientation isn't locked |
| Bundle size | Well under the 15 MiB recommended initial size |
| End of content | The menu says when every level is done and more are coming |
| No real-world value | Coins only exist inside the game and can't be bought, traded or cashed out |
| 13+ and original | Not aimed at kids, with no brands, celebrities, film music or third-party assets |
| English | All in-game text is in English |

Run the Playables test suite before submitting. It hasn't been run yet.
