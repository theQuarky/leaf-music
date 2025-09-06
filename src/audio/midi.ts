export async function requestMIDIPermission(opts: { sysex?: boolean } = {}) {
  if (typeof navigator === 'undefined' || !(navigator as any).requestMIDIAccess) {
    return { ok: false, error: 'Web MIDI API not supported in this browser' }
  }
  try {
    // requestMIDIAccess must be called from a user gesture in many browsers
    const access = await (navigator as any).requestMIDIAccess({ sysex: !!opts.sysex })
    // enumerate ports for convenience
    const inputs: any[] = []
    const outputs: any[] = []
    try {
      access.inputs.forEach((p: any) => inputs.push({ id: p.id, name: p.name, manufacturer: p.manufacturer }))
      access.outputs.forEach((p: any) => outputs.push({ id: p.id, name: p.name, manufacturer: p.manufacturer }))
    } catch (_) {}
    return { ok: true, access, inputs, outputs }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

export function prettyMIDIPorts(access: any) {
  const ins: string[] = []
  const outs: string[] = []
  try {
    access.inputs.forEach((p: any) => ins.push(`${p.name || p.id} (${p.manufacturer || 'unknown'})`))
    access.outputs.forEach((p: any) => outs.push(`${p.name || p.id} (${p.manufacturer || 'unknown'})`))
  } catch (_) {}
  return { inputs: ins, outputs: outs }
}
