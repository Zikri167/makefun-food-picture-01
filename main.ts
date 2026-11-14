const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

function inspectJpeg(data) {
  if (data.length === 0) throw new Error("The image file is empty.");
  if (data.length > 1048576) throw new Error("The image exceeds the 1 MiB limit.");
  if (data.length < 2 || data[data.length - 2] !== 0xff || data[data.length - 1] !== 0xd9) {
    throw new Error("The JPEG is missing its end marker (FF D9).");
  }
  if (data[0] !== 0xff || data[1] !== 0xd8 || data[2] !== 0xff) {
    throw new Error("The image does not begin with a JPEG signature.");
  }

  let cursor = 2;
  while (cursor < data.length) {
    if (data[cursor] !== 0xff) throw new Error("Malformed JPEG marker sequence.");
    while (cursor < data.length && data[cursor] === 0xff) cursor++;
    if (cursor >= data.length) break;

    const marker = data[cursor++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (cursor + 2 > data.length) throw new Error("A JPEG segment is incomplete.");

    const length = data.readUInt16BE(cursor);
    if (length < 2 || cursor + length > data.length) {
      throw new Error("A JPEG segment has an invalid length.");
    }

    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      if (length < 7) throw new Error("The JPEG frame header is incomplete.");
      const height = data.readUInt16BE(cursor + 3);
      const width = data.readUInt16BE(cursor + 5);
      if (width === 0 || height === 0) throw new Error("The JPEG frame has no dimensions.");
      if (width > 1024 || height > 1024) throw new Error("The JPEG dimensions exceed 1024 pixels.");
      return { width, height };
    }
    cursor += length;
  }
  throw new Error("No supported JPEG frame (SOF0, SOF1, or SOF2) was found.");
}

try {
  const source = path.join(__dirname, "entry.png");
  const bytes = fs.readFileSync(source);
  const { width, height } = inspectJpeg(bytes);
  const destinationDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  fs.mkdirSync(destinationDir, { recursive: true });
  const destination = path.join(destinationDir, "entry.png");
  fs.writeFileSync(destination, bytes);
  const digest = crypto.createHash("sha256").update(bytes).digest("hex");
  process.stdout.write(
    `Wrote ${destination} — ${bytes.length} bytes, ${width}×${height}, sha256 ${digest}\n`
  );
} catch (error) {
  process.stderr.write(`Image copy failed: ${error.message}\n`);
  process.exitCode = 1;
}
