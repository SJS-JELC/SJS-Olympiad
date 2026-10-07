# SJS Olympiad: Competition Security Proof of Concept

## Objective

Build a small React proof-of-concept web app called **SJS Olympiad** and deploy it to **GitHub Pages**.

The purpose is to test whether a normal pupil BYOD laptop can be used for an inter-school competition while discouraging access to other browser tabs, applications or windows.

This is a front-end-only proof of concept. There is currently **no backend**.

The app should:

1. Require the user to deliberately enter **Competition Mode**.
2. Enter browser fullscreen before the competition begins.
3. Monitor for behaviour suggesting the pupil has left the competition.
4. Immediately lock the competition if such behaviour is detected.
5. Require a staff PIN to unlock it.
6. Persist the lock through refresh/reopening where practical.
7. Maintain a visible security event log for testing.

The app should be built so that the local security state can later be replaced by a server-side Azure implementation.

---

# Technology

Use:

- React
- TypeScript
- Vite
- Modern CSS
- GitHub Pages
- GitHub Actions deployment

Keep dependencies minimal.

Do not add a backend.

The site must work correctly when hosted at a GitHub Pages repository path such as:

`https://USERNAME.github.io/sjs-olympiad/`

Configure Vite appropriately for the repository base path.

---

# Overall user flow

## 1. Landing screen

Display:

# SJS Olympiad

**Competition Security Test**

Brief explanation:

> This device will enter Competition Mode. Once the competition has started, leaving fullscreen, changing browser tab or switching away from the competition will lock the device.

Display a prominent:

**ENTER COMPETITION MODE**

button.

Also display:

> Once Competition Mode has started, do not switch tabs, minimise the browser, leave fullscreen or switch to another application.

Competition monitoring must **not** be armed until the user deliberately presses this button.

---

# 2. Entering Competition Mode

The button must:

1. Call the browser Fullscreen API using a genuine user interaction.
2. Wait for fullscreen to succeed.
3. Arm the security monitoring.
4. Record the competition start time.
5. Persist an `active` competition session locally.
6. Display the main competition screen.

If fullscreen cannot be entered:

- do not start the competition;
- explain that fullscreen is required;
- allow the user to try again.

Do not silently continue without fullscreen.

---

# 3. Main competition screen

Create a visually polished placeholder competition interface.

Header:

**SJS Olympiad**

Show:

- `Competition Mode: ACTIVE`
- elapsed competition time
- current fullscreen status
- security event count

Main content can contain a dummy question such as:

## Question 1

Which element has the highest first ionisation energy?

- A: Na
- B: Mg
- C: Al
- D: Si

Include simple answer buttons purely for demonstration.

There is no requirement to score the chemistry question.

The purpose of this screen is to give realistic content that visibly disappears when the security lock activates.

---

# Security architecture

Create the security functionality separately from the competition UI.

Suggested structure:

```text
src/
  components/
    LandingScreen.tsx
    CompetitionScreen.tsx
    LockScreen.tsx
    SecurityStatus.tsx

  security/
    CompetitionSecurityProvider.tsx
    securityEvents.ts
    securityStorage.ts
    securityTypes.ts

  hooks/
    useCompetitionSecurity.ts
```

Do not scatter security event listeners throughout components.

There should be one authoritative security state.

---

# Security states

Implement:

```ts
type CompetitionStatus =
  | "NOT_STARTED"
  | "ACTIVE"
  | "LOCKED";
```

Maintain at least:

```ts
interface CompetitionSession {
  status: CompetitionStatus;
  startedAt?: string;
  lockedAt?: string;
  lockReason?: SecurityEventType;
  eventCount: number;
}
```

---

# Detecting malpractice

When Competition Mode is ACTIVE, monitor the following.

## A. Page visibility

Listen for:

```ts
document.addEventListener("visibilitychange", ...)
```

If:

```ts
document.hidden === true
```

immediately lock the competition.

Reason:

```text
PAGE_HIDDEN
```

This should catch scenarios such as:

- switching browser tab;
- minimising the browser;
- switching application;
- locking the device.

---

## B. Window losing focus

Listen for:

```ts
window.addEventListener("blur", ...)
```

While Competition Mode is ACTIVE, this should trigger a lock.

Reason:

```text
WINDOW_BLUR
```

This is particularly intended to detect cases such as:

- Alt+Tab;
- clicking into another application;
- clicking another browser window;
- using another window alongside the competition.

Be aware that browsers/platforms may occasionally produce blur events for legitimate reasons.

For this proof of concept, treat every blur event after Competition Mode starts as a lock.

---

## C. Exiting fullscreen

Listen for:

```ts
document.addEventListener("fullscreenchange", ...)
```

When ACTIVE, if:

```ts
document.fullscreenElement === null
```

lock immediately.

Reason:

```text
FULLSCREEN_EXIT
```

---

# Lock behaviour

The lock needs to happen **immediately in the client UI**.

Do not wait for asynchronous work.

As soon as a security event occurs:

1. Set the competition state to `LOCKED`.
2. Completely hide/remove the competition question.
3. Record the event.
4. Persist the locked state.
5. Display the Lock Screen.

Only the **first event responsible for a particular lock** should become the primary lock reason.

Avoid generating dozens of duplicate lock events because, for example, leaving fullscreen also causes blur and visibility events.

Deduplicate related events occurring within approximately 500 ms.

---

# Lock screen

The lock screen should completely obscure all competition content.

Design it prominently.

Example:

# COMPETITION LOCKED

This device has left Competition Mode.

**Reason:** Browser lost focus  
**Time:** 17:42:16

A member of staff must unlock this device before the competition can continue.

Then show:

### Staff unlock

PIN input:

`[ _ _ _ _ _ _ ]`

Button:

**UNLOCK COMPETITION**

Use a temporary test PIN of:

```text
271828
```

Put the test PIN in a clearly named configuration constant such as:

```ts
TEST_STAFF_PIN
```

Do not present this as secure authentication.

Add a code comment explaining that GitHub Pages is entirely client-side and therefore the PIN can be discovered by inspecting the JavaScript bundle. It exists only to test the user experience.

---

# Unlock behaviour

When the correct PIN is entered:

1. Clear the lock.
2. Record a `STAFF_UNLOCK` event.
3. Request fullscreen again.

Because browsers require fullscreen requests to originate from a user gesture, use the staff's **Unlock Competition** button click to call:

```ts
document.documentElement.requestFullscreen()
```

Only restore the status to `ACTIVE` once fullscreen has successfully been entered.

If fullscreen fails, remain locked.

The pupil should never return to the question screen outside fullscreen.

---

# Failed PIN attempts

Record incorrect PIN attempts as:

```text
INVALID_STAFF_PIN
```

Show:

> Incorrect staff PIN.

Do not reveal whether digits are partially correct.

Do not impose a long lockout for this proof of concept.

---

# Persistence

Because there is no backend yet, use `localStorage`.

Persist:

- competition status;
- competition start time;
- lock state;
- lock reason;
- event log.

Important behaviour:

If the competition has been locked and the user presses:

```text
Ctrl+R
```

the app must reload directly into:

```text
COMPETITION LOCKED
```

Refreshing must **not** clear the lock.

Similarly, if the browser is closed and reopened on the same device/profile, a locked competition should remain locked.

Provide a separate development/reset function for clearing the session.

Do not expose a normal pupil-facing "reset competition" button.

---

# Security event model

Use something similar to:

```ts
type SecurityEventType =
  | "COMPETITION_STARTED"
  | "PAGE_HIDDEN"
  | "WINDOW_BLUR"
  | "FULLSCREEN_EXIT"
  | "INVALID_STAFF_PIN"
  | "STAFF_UNLOCK"
  | "SESSION_RESET";
```

Each event:

```ts
interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  timestamp: string;
  details?: string;
}
```

Use ISO timestamps internally.

---

# Security event log

For the proof of concept, provide a small collapsible:

**Security Diagnostics**

panel.

This is for testing only.

Show:

| Time | Event |
|---|---|
| 17:30:04 | Competition started |
| 17:32:18 | Window blur |
| 17:32:26 | Invalid PIN |
| 17:32:31 | Staff unlock |

This will let us test exactly which events different browsers generate.

Make the diagnostics panel visually secondary.

Later this panel will be removed from pupil devices and the events will instead appear on a staff dashboard.

---

# Browser information

In the diagnostics area also display:

- user agent;
- viewport size;
- fullscreen supported: yes/no;
- current visibility state;
- current focus state using `document.hasFocus()`;
- current fullscreen state.

This is important because the test will be performed across devices from different schools.

---

# False-positive handling

Do not try to be clever at this stage.

For the proof of concept:

```text
PAGE_HIDDEN     = lock
WINDOW_BLUR     = lock
FULLSCREEN_EXIT = lock
```

However, structure the code so that individual event types can later be configured differently, for example:

```ts
const SECURITY_RULES = {
  pageHidden: "LOCK",
  windowBlur: "LOCK",
  fullscreenExit: "LOCK",
};
```

This will let us later change `windowBlur` to warning-only if browser testing shows too many false positives.

---

# Event suppression

There will be legitimate focus/fullscreen changes caused by the app itself.

For example:

```text
LOCKED
→ staff enters PIN
→ app requests fullscreen
→ fullscreen events occur
→ ACTIVE
```

Make sure this does not immediately re-lock the app.

Security monitoring should understand whether it is:

- NOT_STARTED;
- ACTIVE;
- LOCKED;
- transitioning from LOCKED → ACTIVE.

A small internal transient state is acceptable if necessary.

---

# Testing screen

Add a development-only or diagnostic section before starting the competition with buttons such as:

- Clear stored session
- View stored state
- Start clean test

This should make repeated browser testing easy.

Do not let these buttons remain usable once the competition is ACTIVE or LOCKED.

---

# Visual design

This should look like a genuine SJS Olympiad application, not a developer demo.

Style direction:

- clean;
- modern;
- academic/scientific;
- suitable for pupils aged approximately 14–18;
- strong visual distinction between normal and locked states.

Use responsive sizing so it works on:

- Windows laptops;
- Chromebooks;
- Macs;
- iPads;
- reasonably large tablets.

Do not spend excessive time creating complex branding assets.

Text branding should simply read:

**SJS Olympiad**

---

# Accessibility / usability

Ensure:

- large buttons;
- clear focus states;
- keyboard-operable controls;
- PIN input works cleanly with keyboard;
- lock reason is shown in text as well as visually;
- mobile/tablet layouts remain usable.

---

# Important security disclaimer

Add a section to the repository `README.md` explaining:

This proof of concept does **not** provide secure examination lockdown.

A browser application cannot control an unmanaged BYOD device.

In particular it cannot reliably prevent:

- use of a second physical device;
- sophisticated developer-tools manipulation;
- disabling JavaScript;
- manipulating localStorage;
- inspecting the client-side PIN;
- some operating-system-level overlays;
- determined deliberate bypass attempts.

The objective is to detect and strongly discourage ordinary behaviours such as:

- changing tab;
- switching application;
- minimising the browser;
- exiting fullscreen;
- using another browser window.

For the real system, lock/session state and staff authentication will be moved server-side.

---

# Future Azure architecture

Keep interfaces clean enough that the current implementation:

```text
React
   ↓
localStorage
```

can later become:

```text
React
   ↓
Azure Web App / API
   ↓
server-side competition session
   ↓
database
```

In particular, create a storage/service abstraction rather than accessing `localStorage` directly from every component.

For example:

```ts
interface CompetitionSessionStore {
  getSession(): Promise<CompetitionSession>;
  saveSession(session: CompetitionSession): Promise<void>;
  addEvent(event: SecurityEvent): Promise<void>;
}
```

For now implement:

```text
LocalCompetitionSessionStore
```

Later it should be possible to implement:

```text
ApiCompetitionSessionStore
```

without changing the competition UI.

---

# GitHub Pages deployment

Configure the repository so that pushing to `main` automatically builds and deploys the site to GitHub Pages using GitHub Actions.

Include:

```text
.github/workflows/deploy.yml
```

Use the current recommended GitHub Pages Actions deployment approach.

The Vite production build should be deployed from:

```text
dist/
```

Document in the README any one-off GitHub repository setting required, such as:

```text
Settings
→ Pages
→ Build and deployment
→ Source: GitHub Actions
```

---

# README

Create a concise README containing:

## SJS Olympiad Security PoC

### Purpose

Testing browser-based competition integrity controls for pupil BYOD devices.

### Running locally

Commands required to install dependencies and start Vite.

### Building

Production build command.

### Deployment

How GitHub Pages deployment works.

### Test PIN

Clearly state:

```text
271828
```

for this proof of concept.

### Test procedure

Ask a tester to try:

1. Start competition.
2. Press Escape to leave fullscreen.
3. Unlock.
4. Switch browser tab.
5. Unlock.
6. Alt+Tab to another application.
7. Unlock.
8. Minimise browser.
9. Unlock.
10. Refresh while locked.
11. Close/reopen browser while locked.
12. Enter an incorrect PIN.
13. Test split-screen behaviour.
14. Repeat on Windows, macOS, Chromebook and iPad where possible.

Record which security events are generated.

---

# Acceptance criteria

The implementation is complete when all of the following work:

- [ ] Site loads successfully from GitHub Pages.
- [ ] Landing screen appears without security monitoring firing.
- [ ] User must click Enter Competition Mode.
- [ ] Competition does not start unless fullscreen succeeds.
- [ ] Competition screen appears in fullscreen.
- [ ] Switching browser tab locks it.
- [ ] Minimising the browser locks it.
- [ ] Window blur locks it.
- [ ] Exiting fullscreen locks it.
- [ ] Competition content disappears immediately when locked.
- [ ] Lock reason and timestamp are displayed.
- [ ] Correct staff PIN can unlock it.
- [ ] Incorrect PIN does not unlock it.
- [ ] Unlocking requires fullscreen to be restored.
- [ ] Refreshing while locked remains locked.
- [ ] Reopening the page while locked remains locked.
- [ ] Security events are stored and displayed in diagnostics.
- [ ] Related browser events do not produce excessive duplicate records.
- [ ] A clean-session/reset mechanism exists before competition start.
- [ ] Responsive layout works on common BYOD screen sizes.
- [ ] GitHub Actions automatically deploys pushes to `main`.
- [ ] README clearly explains that this is a deterrence/detection PoC, not a secure exam browser.

---

# Implementation priority

Prioritise in this order:

1. Reliable security state machine.
2. Reliable fullscreen entry/exit handling.
3. Visibility and focus detection.
4. Persistent lock.
5. Staff PIN unlock flow.
6. Diagnostics/event logging.
7. GitHub Pages deployment.
8. Visual polish.

Do not over-engineer the chemistry competition functionality yet.

The objective of this version is to answer:

> **Can an ordinary pupil BYOD browser provide a sufficiently robust supervised competition mode for the SJS Olympiad?**

Build the application, test the production build locally, fix TypeScript/build errors, and configure deployment ready for GitHub Pages.
