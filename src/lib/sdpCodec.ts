function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function encodeCompactSDP(desc: RTCSessionDescriptionInit | RTCSessionDescription): Promise<string> {
  const payload = JSON.stringify({ type: desc.type, sdp: desc.sdp });
  const rawBytes = new TextEncoder().encode(payload);

  if (typeof CompressionStream !== 'undefined') {
    try {
      const cs = new CompressionStream('deflate-raw');
      const writer = cs.writable.getWriter();
      writer.write(rawBytes);
      writer.close();
      const compressedBuf = await new Response(cs.readable).arrayBuffer();
      const compressedBytes = new Uint8Array(compressedBuf);
      const token = `QLZ1:${bytesToBase64(compressedBytes)}`;
      if (token.length < payload.length * 1.1) {
        return token;
      }
    } catch {
      // Fall back to plain UTF-8 base64 if deflate-raw is unavailable
    }
  }

  return bytesToBase64(rawBytes);
}

export async function decodeCompactSDP(input: string): Promise<string> {
  if (!input) throw new Error('Empty protocol string');
  const clean = input.trim();
  if (clean.startsWith('{') && clean.endsWith('}')) {
    return clean;
  }

  if (clean.startsWith('QLZ1:')) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('This browser does not support DecompressionStream for compressed tokens');
    }
    const b64 = clean.slice(5);
    const bytes = base64ToBytes(b64);
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(bytes);
    writer.close();
    const decompressedBuf = await new Response(ds.readable).arrayBuffer();
    const text = new TextDecoder().decode(decompressedBuf).trim();
    if (text.startsWith('{')) return text;
    throw new Error('Corrupt compressed protocol descriptor');
  }

  try {
    const raw = base64ToBytes(clean);
    const utf8 = new TextDecoder().decode(raw).trim();
    if (utf8.startsWith('{')) return utf8;
    const legacy = decodeURIComponent(atob(clean)).trim();
    if (legacy.startsWith('{')) return legacy;
  } catch {}

  try {
    const legacy = decodeURIComponent(atob(clean)).trim();
    if (legacy.startsWith('{')) return legacy;
  } catch {}

  try {
    const unescaped = decodeURIComponent(clean).trim();
    if (unescaped.startsWith('{') && unescaped.endsWith('}')) return unescaped;
    const decoded = atob(unescaped).trim();
    if (decoded.startsWith('{')) return decoded;
  } catch {}

  throw new Error('Invalid or corrupt protocol string format');
}
