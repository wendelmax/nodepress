function parseVersion(value: string): [number, number, number] | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(value.trim())
  if (!match) return undefined
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function compare(left: [number, number, number], right: [number, number, number]): number {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index] ? 1 : -1
  }
  return 0
}

export function assertVersionCompatible(
  currentVersion: string,
  compatibility: { minNodePressVersion: string; maxNodePressVersion?: string },
): void {
  const current = parseVersion(currentVersion)
  const minimum = parseVersion(compatibility.minNodePressVersion)
  const maximum = compatibility.maxNodePressVersion ? parseVersion(compatibility.maxNodePressVersion) : undefined
  if (!current || !minimum || (compatibility.maxNodePressVersion && !maximum)) {
    throw new Error('Backup compatibility version is invalid')
  }
  if (compare(current, minimum) < 0 || (maximum && compare(current, maximum) > 0)) {
    throw new Error(`Backup is incompatible with NodePress ${currentVersion}`)
  }
}
