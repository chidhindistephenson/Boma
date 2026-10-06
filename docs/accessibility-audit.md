# Boma Accessibility Audit Baseline

This is the baseline accessibility record for the current Boma UI.

## Target

- Standard: WCAG 2.2 AA
- Scope: public pages, authentication, provider directory, profile/account management, requests, inbox, notifications, admin operations

## Automated Checks In Repo

- Static smoke test for core accessibility affordances.
- HTML shell checks for `lang`, viewport, theme/manifest metadata.
- Image accessibility check for JSX `<img>` tags requiring `alt`.
- Button/control name smoke check for known icon-only controls.

## Manual Audit Checklist

- Keyboard navigation reaches all interactive controls.
- Visible focus state is present on links, buttons, inputs, modals, and chat controls.
- Modal focus is trapped and returns to the trigger on close.
- Form inputs have visible labels and error text.
- Color contrast is checked in light and dark mode.
- Dynamic notifications and offline status use appropriate live/status semantics.
- Payment, wallet, and destructive actions provide clear confirmation and error recovery.
- Maps and media galleries have non-map/list alternatives.

## Known Follow-Up

- Run a browser-based axe/Lighthouse audit before production launch.
- Test with NVDA or Narrator on Windows and VoiceOver on mobile.
- Validate real payment, chat, and upload workflows with keyboard-only navigation.
