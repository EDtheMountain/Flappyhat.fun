---
name: iOS mobile audio silent switch
description: Why Web Audio API sound plays on desktop/iPad but not on iPhone, and how to fix it.
---

# iPhone silent switch mutes Web Audio API

If game/app sound effects (built with the Web Audio API / `AudioContext`) play on
desktop and tablet (iPad) but are silent on phones, the cause is almost always the
**iPhone physical ring/silent switch**. iOS routes Web Audio through the "ambient"
audio session by default, which is muted when the silent switch is on. iPads and
desktops have no such switch, so they play fine — that asymmetry is the tell.

**Fix:** set the audio session to playback so iOS ignores the silent switch:

```js
// iOS 16.4+
(navigator as any).audioSession.type = "playback";
```

Assert this both when creating the `AudioContext` and inside the user-gesture
unlock handler (iOS can drop the session when the context auto-suspends or the tab
backgrounds — it is not strictly one-shot).

**Why:** the unlock-on-first-gesture trick (silent buffer + `ctx.resume()`) only
satisfies the *autoplay* policy; it does NOT change the audio session category, so
the silent switch still mutes everything until `audioSession.type = "playback"`.

**How to apply:** for older iOS without `navigator.audioSession`, fall back to
keeping a looping silent `<audio playsinline>` element playing, which puts the page
into a "playing media" state that also bypasses the switch. Lives in
`artifacts/wifhat-game/src/lib/sounds.ts`.
