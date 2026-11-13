import * as zlib from 'zlib';

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[";,\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsvBuffer(
  headers: string[],
  rows: (string | number | null | undefined)[][],
): Buffer {
  const lines: string[] = [];
  lines.push(headers.map(escapeCsvCell).join(';'));
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(';'));
  }
  return Buffer.from('\uFEFF' + lines.join('\r\n'), 'utf8');
}

function escapeXml(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  // Strip XML 1.0 invalid control characters
  const cleaned = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  return cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function columnLetter(colIdxZeroBased: number): string {
  let n = colIdxZeroBased;
  let letters = '';
  while (n >= 0) {
    letters = String.fromCharCode((n % 26) + 65) + letters;
    n = Math.floor(n / 26) - 1;
  }
  return letters;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

interface ZipEntry {
  name: string;
  data: Buffer;
}

function buildZipBuffer(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const compressed = zlib.deflateRawSync(entry.data);
    const crc = crc32(entry.data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
    localHeader.writeUInt16LE(20, 4); // Version needed
    localHeader.writeUInt16LE(0x0800, 6); // UTF-8 filename flag
    localHeader.writeUInt16LE(8, 8); // Compression method: deflate
    localHeader.writeUInt16LE(0, 10); // Mod time
    localHeader.writeUInt16LE(0x5421, 12); // Mod date
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(entry.data.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuf, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Central directory signature
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0x5421, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(entry.data.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + compressed.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDir, eocd]);
}

export function buildXlsxBuffer(input: {
  sheetName: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
}): Buffer {
  const safeSheetName = (input.sheetName || 'Respostas')
    .replace(/[\\/*?:\[\]]/g, ' ')
    .trim()
    .slice(0, 31) || 'Respostas';

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${escapeXml(safeSheetName)}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF18181B"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1">
    <border><left/><right/><top/><bottom/><diagonal/></border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
  </cellXfs>
</styleSheet>`;

  const colsXml = input.headers
    .map((h, i) => {
      const width = Math.min(48, Math.max(16, String(h || '').length + 6));
      return `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`;
    })
    .join('');

  const buildRowXml = (
    rowIndexOneBased: number,
    cells: (string | number | null | undefined)[],
    isHeader: boolean,
  ) => {
    const cellXml = cells
      .map((val, colIdx) => {
        const ref = `${columnLetter(colIdx)}${rowIndexOneBased}`;
        const styleAttr = isHeader ? ' s="1"' : '';
        if (typeof val === 'number' && Number.isFinite(val)) {
          return `<c r="${ref}"${styleAttr}><v>${val}</v></c>`;
        }
        return `<c r="${ref}" t="inlineStr"${styleAttr}><is><t xml:space="preserve">${escapeXml(val)}</t></is></c>`;
      })
      .join('');
    return `<row r="${rowIndexOneBased}">${cellXml}</row>`;
  };

  const rowsXml = [
    buildRowXml(1, input.headers, true),
    ...input.rows.map((r, idx) => buildRowXml(idx + 2, r, false)),
  ].join('');

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>${colsXml}</cols>
  <sheetData>${rowsXml}</sheetData>
</worksheet>`;

  return buildZipBuffer([
    { name: '[Content_Types].xml', data: Buffer.from(contentTypesXml, 'utf8') },
    { name: '_rels/.rels', data: Buffer.from(rootRelsXml, 'utf8') },
    { name: 'xl/workbook.xml', data: Buffer.from(workbookXml, 'utf8') },
    { name: 'xl/_rels/workbook.xml.rels', data: Buffer.from(workbookRelsXml, 'utf8') },
    { name: 'xl/styles.xml', data: Buffer.from(stylesXml, 'utf8') },
    { name: 'xl/worksheets/sheet1.xml', data: Buffer.from(sheetXml, 'utf8') },
  ]);
}
