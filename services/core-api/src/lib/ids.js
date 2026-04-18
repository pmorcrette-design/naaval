export function createId(prefix) {
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${randomSuffix}`;
}

