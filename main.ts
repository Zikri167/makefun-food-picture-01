const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const source = path.join(__dirname, 'entry.png');
const outputDirectory = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function fail(message) {
  throw new Error(message);
}

function readFrame(bytes) {
  let cursor = 2;

  while (cursor < bytes.length) {
    if (bytes[cursor] !== 0xff) fail('JPEG marker stream is malformed.');
    while (cursor < bytes.length && bytes[cursor] === 0xff) cursor++;
    if (cursor >= bytes.length) break;

    const marker = bytes[cursor++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (cursor + 2 > bytes.length) fail('JPEG segment header is incomplete.');

    const length = bytes.readUInt16BE(cursor);
    if (length < 2 || cursor + length > bytes.length) {
      fail('JPEG segment length is invalid.');
    }

    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      if (length < 7) fail('JPEG frame header is incomplete.');
      return {
        width: bytes.readUInt16BE(cursor + 5),
        height: bytes.readUInt16BE(cursor + 3)
      };
    }
    cursor += length;
  }

  fail('JPEG has no baseline, extended, or progressive frame.');
}

function main() {
  const bytes = fs.readFileSync(source);
  if (bytes.length === 0) fail('The source image is empty.');
  if (bytes.length > 1048576) fail('The source image exceeds 1 MiB.');
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    fail('The source does not begin with a JPEG signature.');
  }
  if (bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) {
    fail('The source is missing the JPEG end marker (FF D9).');
  }

  const { width, height } = readFrame(bytes);
  if (width === 0 || height === 0) fail('The JPEG frame has zero dimensions.');
  if (width > 1024 || height > 1024) fail('The JPEG frame exceeds 1024 pixels.');

  fs.mkdirSync(outputDirectory, { recursive: true });
  const destination = path.join(outputDirectory, 'entry.png');
  fs.writeFileSync(destination, bytes);
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  process.stdout.write(
    destination + ' ' + bytes.length + ' bytes ' + width + 'x' + height +
    ' sha256 ' + digest + '\n'
  );
}

try {
  main();
} catch (error) {
  process.stderr.write('Image copy failed: ' + error.message + '\n');
  process.exitCode = 1;
}
