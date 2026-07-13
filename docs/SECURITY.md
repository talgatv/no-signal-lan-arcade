# Security notes

## Threat model (MVP)

Offline Games Hub is designed for **trusted local networks**:

- Friends in one room  
- Family Wi‑Fi  
- Phone hotspot at a cabin  

It is **not** hardened for hostile public Wi‑Fi or the open internet.

## What we do

- No cloud accounts, no telemetry required to play  
- No CDN dependencies for gameplay  
- Games are static files + optional WebSocket messages  
- PC and Android hosts can use optional self-signed HTTPS/WSS for browser
  features that require a secure context

## What we do not do (yet)

- Passwords / room PINs  
- Publicly trusted certificates or automatic peer identity verification; the
  optional local certificate is self-signed
- Player authentication  
- Sandbox isolation beyond the browser  

## Recommendations for hosts

1. Prefer a **private hotspot** or home LAN.  
2. Do not port-forward the host to the public internet.  
3. Stop the server when the party ends.  
4. Review third-party game PRs for unexpected network calls.  

## Reporting vulnerabilities

Please use GitHub's private **Report a vulnerability** form:

https://github.com/talgatv/no-signal-lan-arcade/security/advisories/new

Include affected versions, reproduction steps, impact, and any suggested fix.
Do not publish exploit details in a public Issue. If GitHub does not show the
private reporting form, open an Issue asking only for a private contact method;
do not include sensitive details in that Issue.
