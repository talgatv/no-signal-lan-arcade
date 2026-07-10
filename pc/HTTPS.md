# HTTPS on the LAN (“fake HTTPS”)

## Why

Phones treat `http://192.168.x.x` as an **insecure context**.  
Many APIs then refuse to work (or work only on `localhost` on the PC):

| Feature | Often needs HTTPS on phone |
|---------|----------------------------|
| Microphone (LAN Chat radio / PTT) | **Yes** |
| Device orientation / motion (compass) | **Often yes** |
| Geolocation | **Yes** |
| Plain text games / chat | No — HTTP is fine |
| WebSocket multiplayer | HTTP `ws://` works; with HTTPS use `wss://` automatically |

So we do **not** buy a public certificate. We mint a **self-signed** cert on the host PC.  
Browsers will show a warning once — after you accept it, the page is a *secure context* for that origin.

This is “fake HTTPS” in the sense that **trust is local**, not verified by Let’s Encrypt / a public CA.  
On a private party LAN that is intentional.

---

## Quick start

```bash
cd pc
./start.sh --https
# Windows:  start.bat --https
```

Then on the phone (same Wi‑Fi):

```text
https://YOUR_PC_IP:8080/
```

**Not** `http://` — use **https://**.

WebSocket becomes `wss://` automatically when the page is loaded over HTTPS (`ogh-net` uses `location.protocol`).

---

## First visit on a phone

### Android (Chrome)

1. Open `https://192.168.x.x:8080/`  
2. Warning: *Your connection is not private*  
3. **Advanced** → **Proceed to 192.168.x.x (unsafe)**  
4. Bookmark the page  

### iPhone (Safari)

1. Open the `https://…` URL  
2. **Show Details** → **visit this website** → confirm  
3. If it keeps failing, install the cert (below) or try Chrome/Firefox with the same proceed step  

### After Wi‑Fi IP changes

Regenerate the cert so the new IP is in the certificate SAN:

```bash
./start.sh --https-regen
```

---

## Requirements

- **OpenSSL** on the host PC (`openssl version` must work)  
  - Linux: `sudo apt install openssl`  
  - macOS: usually included  
  - Windows: Git for Windows, or install Win64 OpenSSL and put it on `PATH`

Cert files (auto-created, gitignored):

```text
pc/.certs/cert.pem
pc/.certs/key.pem
pc/.certs/ogh-lan.crt   # copy of cert for manual install
pc/.certs/san.stamp     # rebuilds cert when LAN IPs change
```

---

## Optional: install the cert on the phone (stronger trust)

If “Proceed anyway” is not enough for mic/sensors:

1. On the phone browser open (while host is running HTTP or copy via USB):  
   Or copy `pc/.certs/ogh-lan.crt` to the phone.  
2. **Android:** Settings → Security → Install a certificate → CA certificate  
3. **iOS:** Settings → Profile Downloaded → Install → then  
   Settings → General → About → Certificate Trust Settings → enable full trust  

Exact menu names vary by OS version.

---

## Security notes

- Self-signed TLS **encrypts the LAN link** but does **not** prove the host is a public website.  
- Anyone on the Wi‑Fi can still try to join rooms if they know the URL (same as HTTP).  
- Do **not** port-forward this server to the public internet.  
- Treat the party network as trusted (see `docs/SECURITY.md`).

---

## HTTP vs HTTPS

| Mode | Command | Use when |
|------|---------|----------|
| HTTP | `./start.sh` | Simple games, no mic/GPS |
| HTTPS | `./start.sh --https` | Chat radio, compass, sensors |
| Regen | `./start.sh --https-regen` | After IP change |

You cannot mix `http://` page with `wss://` easily — open the **same scheme** the host prints.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `openssl not found` | Install OpenSSL; retry `--https` |
| Cert warning loops | Use exact IP printed by host; try `--https-regen` |
| Mic still blocked | Accept cert for that origin; check site permissions; iOS needs trust |
| Works on PC, not phone | PC used `https://127.0.0.1` (trusted loopback); phone needs accept-warning step |
| Wrong IP in cert | Host IP changed → `--https-regen` |

---

## Summary

**Yes — we can add “fake HTTPS”.**  
It is real TLS with a **self-signed** certificate generated offline.  
That is the standard way to unlock phone APIs on a home LAN without the public internet.
