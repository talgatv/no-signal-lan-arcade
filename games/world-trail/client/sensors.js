/**
 * GPS + compass + simulation fallback.
 */

/**
 * @typedef {{
 *   lat: number,
 *   lon: number,
 *   acc: number|null,
 *   hdg: number|null,
 *   source: 'gps'|'sim',
 *   error: string|null,
 *   heading: number|null,
 * }} SensorState
 */

export function createSensors() {
  /** @type {SensorState} */
  const state = {
    lat: 20,
    lon: 0,
    acc: null,
    hdg: null,
    source: 'sim',
    error: null,
    heading: null,
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
    emit();
  }

  function onGeoError(err) {
    state.error = err?.message || 'GPS unavailable';
    if (state.source !== 'gps') state.source = 'sim';
    emit();
  }

  function onOrient(ev) {
    // absolute if available
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

  return {
    get state() {
      return { ...state };
    },

    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    start() {
      if (navigator.geolocation && watchId == null) {
        try {
          watchId = navigator.geolocation.watchPosition(onGeoSuccess, onGeoError, {
            enableHighAccuracy: true,
            maximumAge: 2000,
            timeout: 15000,
          });
        } catch (e) {
          state.error = String(e);
        }
      } else if (!navigator.geolocation) {
        state.error = 'Geolocation not supported';
        state.source = 'sim';
      }

      if (typeof window !== 'undefined' && !orientHandler) {
        orientHandler = onOrient;
        window.addEventListener('deviceorientationabsolute', orientHandler, true);
        window.addEventListener('deviceorientation', orientHandler, true);
      }
      emit();
    },

    stop() {
      if (watchId != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      if (orientHandler) {
        window.removeEventListener('deviceorientationabsolute', orientHandler, true);
        window.removeEventListener('deviceorientation', orientHandler, true);
        orientHandler = null;
      }
    },

    /** After user gesture — iOS compass permission */
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

    /** Simulate / override position (desktop testing) */
    setSim(lat, lon) {
      state.lat = lat;
      state.lon = lon;
      state.acc = 50;
      state.source = 'sim';
      state.error = null;
      emit();
    },
  };
}
