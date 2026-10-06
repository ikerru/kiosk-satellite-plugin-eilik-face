# Changelog

## Unreleased

### Fixed

- Stop a rejected screensaver publication from cascading. A failed call now counts against the KS
  rate limit, so the next event no longer republishes immediately and keeps the renderer
  unavailable. Retries back off exponentially and recover the face without further voice events,
  which could otherwise leave the screensaver black for the length of a conversation.

### Added

- Warn when the card's configured entity does not exist, on screen and in the console. The face
  would otherwise stay idle, which in overlay mode is indistinguishable from the card not working.

- Add an `overlay` option to the card. It contributes no height to the view and draws the face
  fixed over the dashboard only while a voice turn lasts, without intercepting taps, for views whose
  single custom card already draws the whole panel.

- Add a Lovelace custom card under `dashboard/` that draws the same face from the `assist_satellite`
  entity. It updates live from Home Assistant, so it follows a voice turn without recreating its
  document and its transitions play out in full.

- Add a **Mostrar el panel al hablar** setting that dismisses the screensaver when a voice turn
  starts and restores it when the turn ends, so the dashboard card is visible while talking. KS
  hides the screensaver surface for the length of a turn, which no plugin can prevent. It only
  acts when the screensaver was already on, and needs the new `host.control` capability.

- Add an opt-in **Diagnóstico de pantalla** setting that observes `screensaver.state`,
  `screensaver.view` and `screen.state` and reports them in the plugin status line, to tell a failed
  publication apart from a KS overlay. The diagnostic events never republish the face.

- Add a Status tile demo group that publishes a Hello World demo tile on the Remote Admin Overview Status panel, with a toggle, a level selection and a text setting. Document the SDK 1 status tile API, its limits, lifecycle and the `getPluginStatusTiles` remote command.

- Keep each demo together using manifest display groups. Chart demo settings are followed by the chart and Chart readings. Home Assistant and Shizuku each have dedicated reading groups below their settings.

- Add a Home Assistant demo with the shared entity picker and live state and detail readings. Document SDK 1 entity reads, subscriptions, availability, reconnection and lifecycle rules.

- Document the expanded SDK 1 device snapshot with RAM, internal storage, IP addresses, battery and display readings, including units, null values and polling guidance.

- Document the SDK 1 device codename, board, manufacturer and ordered ABI fields available through `getDeviceInfo` without root or Shizuku.

- Add a Logo size slider to the DVD screensaver demo, from 50% to 200% with the original size at 100%. Size changes save automatically and keep the logo inside its available viewport.

- Bundle screensaver HTML, CSS, JavaScript, images and fonts under assets and load them on demand through the SDK. Move the DVD demo to separate files, retain its color settings and document asset validation and package limits. Raise the inline HTML limit to 512 KiB.

- Add SDK 1 screensaver rendering and a bouncing DVD Logo demo with Logo color and Background color settings. Document stock settings, lifecycle, document limits and fleet behavior.

- Add an opt-in Shizuku demo group to Hello World with process identity, Android version and kernel version diagnostics. Publish results as live readings, handle unavailable access and ignore stale callbacks without affecting the greeting or chart.

- Add optional SDK 1 Shizuku access, documentation and a separate read-only identity example.

- Demonstrate live readings in KS with numeric values, confirmed states, a history sample count and multiline text. Document automatic display of existing SDK 1 entities without an ESPHome connection.

- Document SDK 1 dashboard URL reads and change notifications, with component redaction and an updated read-only example.

- Add SDK 1 writable switches with boolean commands and confirmed states. Hello World exposes its chart toggle and the entity guide documents the protocol limits and migration steps.

### Changed

- Update the plugin description to explain that Hello World showcases SDK capabilities and serves as a starting point for other plugins.

## 1.2.0

### Fixed

- Take release package versions from the GitHub tag automatically. Generate matching manifests and package filenames without requiring a source manifest version bump. Local builds can use `--version` too.

- Handle dotted Android platform directories such as `android-37.0` without crashing. Release builds explicitly select Android 35 and tests cover mixed platform installations.

### Changed

- Lead the README with the plugin SDK, documentation and getting started steps before introducing the Hello World template.

- Document automatic setting saves and the on-device text edit dialog.

- Document the entry row update check and info modal, automatic stop and resume during updates and rollback after failed activation.

- Rename the settings feature to Plugin Manager and hide its follow-up controls while the master switch is off.

### Added

- Support SDK 1 grouped bar charts in regular and mini layouts and add a Chart type selector to Hello World.

- Add SDK 1 numeric, text and binary sensors plus writable selects, with validated metadata, unknown readings and confirmed select callbacks.
- Demonstrate all four entity types in Hello World and document repository update steps.

- Add SDK 1 regular and mini chart publication and removal with bounded history, sample inspection and an existing-repository migration guide.
- Expand Hello World to showcase every settings control, groups and a live simulated chart with a sampler that stops with its session.

- Consolidate all features into the first public SDK 1. Document KS reads, passive events and transient controls and add a buildable screen and screensaver observer.
- Add a release-triggered GitHub Actions build and document required Actions asset publication and developer-only ZIP testing.

- Document reusable plugin actions for gestures, optional drawer shortcuts and optional Home Assistant buttons.

- Document SDK 1 native files, rich settings, runtime status and RGB entities and vendor host interfaces.

- Document the persistent Enable Plugins master switch, paused plugin behavior and state commands.
- Document local ZIP testing through the Developer Tools group on the kiosk and remote admin.

## 1.0.1

### Changed

- Use `kiosk-satellite-plugin.json` as the single manifest in the repository, release assets and plugin ZIP.
- Discover plugins through the latest stable GitHub release with a separate checksum and README from the release tag.
- Consolidated plugin installation and SDK documentation in the Hello World repository.
- Included the SDK consistency check alongside the template's build and test tools.

## 1.0.0

- Floating Hello World window with a configurable greeting and button counter.
- Settings and commands for the Kiosk Satellite plugin subpage.
- Standalone source repository with compile-time SDK, tests and release descriptor generation.
- GitHub repository installation with a manifest and README preview.
