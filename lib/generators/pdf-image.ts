const WIDTH = 32
const HEIGHT = 32

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function writeUint32(value: number) {
  return new Uint8Array([(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff])
}

function chunk(type: string, data: Uint8Array) {
  const typeBytes = new TextEncoder().encode(type)
  const crcInput = new Uint8Array(typeBytes.length + data.length)
  crcInput.set(typeBytes)
  crcInput.set(data, typeBytes.length)
  const output = new Uint8Array(12 + data.length)
  output.set(writeUint32(data.length))
  output.set(typeBytes, 4)
  output.set(data, 8)
  output.set(writeUint32(crc32(crcInput)), data.length + 8)
  return output
}

function adler32(bytes: Uint8Array) {
  let a = 1
  let b = 0
  for (const byte of bytes) {
    a = (a + byte) % 65521
    b = (b + a) % 65521
  }
  return ((b << 16) | a) >>> 0
}

function encodeStoredDeflate(bytes: Uint8Array) {
  const blocks: number[] = [0x78, 0x01]
  for (let offset = 0; offset < bytes.length || offset === 0; offset += 65_535) {
    const size = Math.min(65_535, bytes.length - offset)
    const final = offset + size >= bytes.length ? 1 : 0
    blocks.push(final)
    blocks.push(size & 0xff, (size >>> 8) & 0xff)
    const inverse = 0xffff - size
    blocks.push(inverse & 0xff, (inverse >>> 8) & 0xff)
    blocks.push(...bytes.subarray(offset, offset + size))
    if (final) break
  }
  blocks.push(...writeUint32(adler32(bytes)))
  return new Uint8Array(blocks)
}

export function createPdfTestImage() {
  const scanlines = new Uint8Array(HEIGHT * (1 + WIDTH * 3))
  for (let y = 0; y < HEIGHT; y += 1) {
    const row = y * (1 + WIDTH * 3)
    scanlines[row] = 0
    for (let x = 0; x < WIDTH; x += 1) {
      const offset = row + 1 + x * 3
      const dark = (x >> 3) % 2 === (y >> 3) % 2
      scanlines[offset] = dark ? 105 : 224
      scanlines[offset + 1] = dark ? 55 : 185
      scanlines[offset + 2] = dark ? 170 : 235
    }
  }

  const header = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = new Uint8Array(13)
  ihdr.set(writeUint32(WIDTH))
  ihdr.set(writeUint32(HEIGHT), 4)
  ihdr.set([8, 2, 0, 0, 0], 8)
  const idat = chunk("IDAT", encodeStoredDeflate(scanlines))
  const result = new Uint8Array(header.length + chunk("IHDR", ihdr).length + idat.length + chunk("IEND", new Uint8Array()).length)
  let offset = 0
  for (const part of [header, chunk("IHDR", ihdr), idat, chunk("IEND", new Uint8Array())]) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}
