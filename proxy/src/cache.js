class TtlCache {
  constructor({ now = Date.now } = {}) {
    this.entries = new Map();
    this.now = now;
  }

  get(key) {
    const entry = this.entries.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlMs) {
    if (!ttlMs || ttlMs <= 0) {
      return;
    }
    this.entries.set(key, {
      value,
      expiresAt: this.now() + ttlMs
    });
  }

  clear() {
    this.entries.clear();
  }
}

module.exports = { TtlCache };
