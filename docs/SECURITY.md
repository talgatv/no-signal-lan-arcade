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

## What we do not do (yet)

- Passwords / room PINs  
- TLS on LAN (HTTP/WS cleartext on local IPs)  
- Player authentication  
- Sandbox isolation beyond the browser  

## Recommendations for hosts

1. Prefer a **private hotspot** or home LAN.  
2. Do not port-forward the host to the public internet.  
3. Stop the server when the party ends.  
4. Review third-party game PRs for unexpected network calls.  

## Reporting issues

Open a GitHub Issue with the `security` label on  
https://github.com/talgatv/no-signal-lan-arcade  

Do not file critical exploit details in public issues if impact is severe — request a private contact in the issue body.
