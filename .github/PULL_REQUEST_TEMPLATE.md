## What changed

Describe the change and why it belongs in Offline Games Hub.

## How I tested it

List the commands, browsers, and devices you used.

## Game pack checklist

Delete this section if the pull request does not add or change a game.

- [ ] The folder is `games/<id>/`, and the folder name matches the manifest and catalog `id`.
- [ ] `manifest.json`, `README.md`, and `client/index.html` are present.
- [ ] The catalog row points to the correct entry and manifest.
- [ ] The game works offline with no CDN or required cloud service.
- [ ] Touch targets are usable on a phone; mouse/keyboard support is documented where applicable.
- [ ] The pack is family-friendly, uses an original title/assets, and is no larger than 10 MB.
- [ ] Author credit is correct; `ogh-team` is used only for work authored by the core team.
- [ ] Solo play works, or the multiplayer/offline fallback is documented and tested.

## Final checks

- [ ] `python3 tools/validate_catalog.py` passes.
- [ ] I tested through `pc/start.sh`, not by opening the HTML with `file://`.
- [ ] The pull request is focused and contains no secrets, keystores, generated builds, or portable runtimes.
- [ ] I agree that my contribution is licensed under the repository's MIT License unless a file explicitly says otherwise.
- [ ] I have read and will follow the [Code of Conduct](https://github.com/talgatv/no-signal-lan-arcade/blob/main/CODE_OF_CONDUCT.md).
