"use client";

type ZipInput = {
  path: string;
  data: Uint8Array;
  modifiedAt?: Date;
};

const encoder = new TextEncoder();

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime =
    (date.getHours() << 11)
    | (date.getMinutes() << 5)
    | Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((year - 1980) << 9)
    | ((date.getMonth() + 1) << 5)
    | date.getDate();
  return { dosTime, dosDate };
}

function view(size: number) {
  const bytes = new Uint8Array(size);
  return { bytes, data: new DataView(bytes.buffer) };
}

function localHeader(name: Uint8Array, data: Uint8Array, date: Date) {
  const { dosTime, dosDate } = dosDateTime(date);
  const { bytes, data: out } = view(30 + name.length);
  const checksum = crc32(data);

  out.setUint32(0, 0x04034b50, true);
  out.setUint16(4, 20, true);
  out.setUint16(6, 0x0800, true);
  out.setUint16(8, 0, true);
  out.setUint16(10, dosTime, true);
  out.setUint16(12, dosDate, true);
  out.setUint32(14, checksum, true);
  out.setUint32(18, data.length, true);
  out.setUint32(22, data.length, true);
  out.setUint16(26, name.length, true);
  out.setUint16(28, 0, true);
  bytes.set(name, 30);

  return { bytes, checksum, dosTime, dosDate };
}

function centralHeader(
  name: Uint8Array,
  data: Uint8Array,
  checksum: number,
  dosTime: number,
  dosDate: number,
  offset: number,
) {
  const { bytes, data: out } = view(46 + name.length);

  out.setUint32(0, 0x02014b50, true);
  out.setUint16(4, 20, true);
  out.setUint16(6, 20, true);
  out.setUint16(8, 0x0800, true);
  out.setUint16(10, 0, true);
  out.setUint16(12, dosTime, true);
  out.setUint16(14, dosDate, true);
  out.setUint32(16, checksum, true);
  out.setUint32(20, data.length, true);
  out.setUint32(24, data.length, true);
  out.setUint16(28, name.length, true);
  out.setUint16(30, 0, true);
  out.setUint16(32, 0, true);
  out.setUint16(34, 0, true);
  out.setUint16(36, 0, true);
  out.setUint32(38, 0, true);
  out.setUint32(42, offset, true);
  bytes.set(name, 46);

  return bytes;
}

export function createZip(files: ZipInput[]) {
  const body: BlobPart[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const normalizedPath = file.path.replaceAll("\\", "/").replace(/^\/+/, "");
    const name = encoder.encode(normalizedPath);
    const header = localHeader(name, file.data, file.modifiedAt ?? new Date());

    body.push(header.bytes, file.data);
    central.push(
      centralHeader(
        name,
        file.data,
        header.checksum,
        header.dosTime,
        header.dosDate,
        offset,
      ),
    );

    offset += header.bytes.length + file.data.length;
  }

  const centralSize = central.reduce((sum, item) => sum + item.length, 0);
  const { bytes: end, data: out } = view(22);

  out.setUint32(0, 0x06054b50, true);
  out.setUint16(4, 0, true);
  out.setUint16(6, 0, true);
  out.setUint16(8, files.length, true);
  out.setUint16(10, files.length, true);
  out.setUint32(12, centralSize, true);
  out.setUint32(16, offset, true);
  out.setUint16(20, 0, true);

  return new Blob([...body, ...central, end], { type: "application/zip" });
}

export function textBytes(value: string) {
  return encoder.encode(value);
}

export function safeFileName(value: string, fallback: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return normalized || fallback;
}
