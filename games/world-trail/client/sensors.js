/**
 * GPS + compass + simulation fallback.
 *
 * Note: mobile browsers require a *secure context* (HTTPS or localhost)
 * for Geolocation. Plain http://192.168.x.x is blocked — use host --https.
 */

/**
 * @typedef {{
 *   lat: number,
 *   lon: number,
 *   acc: number|null,
 *   hdg: number|null,
 *   source: 'gps'|'sim',
 *   error: string|null,
 *   errorCode: number|null,
 *   heading: number|null,
 *   secure: boolean,
 *   status: string,
 * }} SensorState
 */

function isSecureContext() {
  try {
    if (typeof window !== 'undefined' && 'isSecureContext' in window) {
      return !!window.isSecureContext;
    }
  } catch {
    /* ignore */
  }
  return location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
}

function geoErrorMessage(err) {
  const code = err?.code;
  if (code === 1) {
    return 'Permission denied — allow Location for this site in browser settings';
  }
  if (code === 2) {
    return 'Position unavailable — turn on GPS / Location services';
  }
  if (code === 3) {
    return 'GPS timeout — go outdoors / wait and tap Enable GPS again';
  }
  return err?.message || 'GPS unavailable';
}

export function createSensors() {
  /** @type {SensorState} */
  const state = {
    lat: 20,
    lon: 0,
    acc: null,
    hdg: null,
    source: 'sim',
    error: null,
    errorCode: null,
    heading: null,
    secure: isSecureContext(),
    status: 'idle',
  };

  let watchId = null;
  let orientHandler = null;
  /** @type {Set<(s: SensorState) => void>} */
  const listeners = new Set();

  function emit() {
    for (const fn of listeners) {
      try {
        fn({ ...state });
      } catch (e) {
        console.warn('[sensors]', e);
      }
    }
  }

  function onGeoSuccess(pos) {
    const c = pos.coords;
    state.lat = c.latitude;
    state.lon = c.longitude;
    state.acc = typeof c.accuracy === 'number' ? c.accuracy : null;
    state.hdg =
      typeof c.heading === 'number' && !Number.isNaN(c.heading)
        ? c.heading
        : state.hdg;
    state.source = 'gps';
    state.error = null;
    state.errorCode = null;
    state.status = 'gps';
    emit();
  }

  function onGeoError(err) {
    state.error = geoErrorMessage(err);
    state.errorCode = typeof err?.code === 'number' ? err.code : null;
    if (state.source !== 'gps') {
      state.source = 'sim';
      state.status = 'error';
    }
    emit();
  }

  function onOrient(ev) {
    let h = null;
    if (typeof ev.webkitCompassHeading === 'number') {
      h = ev.webkitCompassHeading;
    } else if (ev.absolute && typeof ev.alpha === 'number') {
      h = (360 - ev.alpha) % 360;
    } else if (typeof ev.alpha === 'number') {
      h = (360 - ev.alpha) % 360;
    }
    if (h != null && Number.isFinite(h)) {
      state.heading = h;
      emit();
    }
  }

  function clearWatch() {
    if (watchId != null && navigator.geolocation) {
      try {
        navigator.geolocation.clearWatch(watchId);
      } catch {
        /* ignore */
      }
      watchId = null;
    }
  }

  /**
   * Start / restart GPS. Call from a user gesture on mobile (tap).
   * @returns {Promise<{ ok: boolean, reason?: string }>}
   */
  async function requestGps() {
    state.secure = isSecureContext();

    if (!navigator.geolocation) {
      state.error = 'Geolocation API not supported in this browser';
      state.status = 'error';
      emit();
      return { ok: false, reason: state.error };
    }

    if (!state.secure) {
      state.error =
        'Browser blocks GPS on plain HTTP. Open the host via HTTPS (pc/start.sh --https) and accept the certificate.';
      state.status = 'insecure';
      state.source = 'sim';
      emit();
      return { ok: false, reason: 'insecure' };
    }

    // Optional Permissions API (Chrome)
    try {
      if (navigator.permissions?.query) {
        const st = await navigator.permissions.query({ name: 'geolocation' });
        if (st.state === 'denied') {
          state.error =
            'Location permission denied. Reset site permissions and allow Location.';
          state.errorCode = 1;
          state.status = 'error';
          emit();
          return { ok: false, reason: 'denied' };
        }
      }
    } catch {
      /* Safari may throw on permissions.query */
    }

    state.status = 'requesting';
    state.error = null;
    emit();

    clearWatch();

    const opts = {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 20000,
    };

    // One-shot first (triggers permission prompt reliably), then watch
    await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          onGeoSuccess(pos);
          resolve(true);
        },
        (err) => {
          onGeoError(err);
          resolve(false);
        },
        opts
      );
    });

    try {
      watchId = navigator.geolocation.watchPosition(onGeoSuccess, onGeoError, {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 25000,
      });
    } catch (e) {
      state.error = String(e);
      state.status = 'error';
      emit();
      return { ok: false, reason: state.error };
    }

    return { ok: state.source === 'gps', reason: state.error || undefined };
  }

  return {
    get state() {
      return { ...state };
    },

    isSecureContext,

    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    /** Passive start — may fail silently on HTTP / without gesture */
    start() {
      state.secure = isSecureContext();
      if (!state.secure) {
        state.error =
          'Need HTTPS for GPS on phone. Run: ./start.sh --https';
        state.status = 'insecure';
        state.source = 'sim';
        emit();
      } else {
        // Best-effort without waiting for gesture
        requestGps().catch(() => {});
      }

      if (typeof window !== 'undefined' && !orientHandler) {
        orientHandler = onOrient;
        window.addEventListener('deviceorientationabsolute', orientHandler, true);
        window.addEventListener('deviceorientation', orientHandler, true);
      }
      emit();
    },

    requestGps,

    stop() {
      clearWatch();
      if (orientHandler) {
        window.removeEventListener('deviceorientationabsolute', orientHandler, true);
        window.removeEventListener('deviceorientation', orientHandler, true);
        orientHandler = null;
      }
    },

    async requestCompassPermission() {
      try {
        const DOE = window.DeviceOrientationEvent;
        if (DOE && typeof DOE.requestPermission === 'function') {
          const r = await DOE.requestPermission();
          return r === 'granted';
        }
      } catch {
        /* ignore */
      }
      return true;
    },

    setSim(lat, lon) {
      state.lat = lat;
      state.lon = lon;
      state.acc = 50;
      state.source = 'sim';
      // keep insecure/error status text if still relevant
      if (state.status === 'gps') state.status = 'sim';
      emit();
    },
  };
}
