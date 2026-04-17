var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/mediabunny/dist/modules/src/misc.js
function assert(x) {
  if (!x) {
    throw new Error("Assertion failed.");
  }
}
var normalizeRotation = (rotation) => {
  const mappedRotation = (rotation % 360 + 360) % 360;
  if (mappedRotation === 0 || mappedRotation === 90 || mappedRotation === 180 || mappedRotation === 270) {
    return mappedRotation;
  } else {
    throw new Error(`Invalid rotation ${rotation}.`);
  }
};
var last = (arr) => {
  return arr && arr[arr.length - 1];
};
var isU32 = (value) => {
  return value >= 0 && value < 2 ** 32;
};
var readExpGolomb = (bitstream) => {
  let leadingZeroBits = 0;
  while (bitstream.readBits(1) === 0 && leadingZeroBits < 32) {
    leadingZeroBits++;
  }
  if (leadingZeroBits >= 32) {
    throw new Error("Invalid exponential-Golomb code.");
  }
  const result = (1 << leadingZeroBits) - 1 + bitstream.readBits(leadingZeroBits);
  return result;
};
var readSignedExpGolomb = (bitstream) => {
  const codeNum = readExpGolomb(bitstream);
  return (codeNum & 1) === 0 ? -(codeNum >> 1) : codeNum + 1 >> 1;
};
var writeBits = (bytes2, start, end, value) => {
  for (let i = start; i < end; i++) {
    const byteIndex = Math.floor(i / 8);
    let byte = bytes2[byteIndex];
    const bitIndex = 7 - (i & 7);
    byte &= ~(1 << bitIndex);
    byte |= (value & 1 << end - i - 1) >> end - i - 1 << bitIndex;
    bytes2[byteIndex] = byte;
  }
};
var toUint8Array = (source) => {
  if (source.constructor === Uint8Array) {
    return source;
  } else if (ArrayBuffer.isView(source)) {
    return new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
  } else {
    return new Uint8Array(source);
  }
};
var toDataView = (source) => {
  if (source.constructor === DataView) {
    return source;
  } else if (ArrayBuffer.isView(source)) {
    return new DataView(source.buffer, source.byteOffset, source.byteLength);
  } else {
    return new DataView(source);
  }
};
var textEncoder = /* @__PURE__ */ new TextEncoder();
var COLOR_PRIMARIES_MAP = {
  bt709: 1,
  // ITU-R BT.709
  bt470bg: 5,
  // ITU-R BT.470BG
  smpte170m: 6,
  // ITU-R BT.601 525 - SMPTE 170M
  bt2020: 9,
  // ITU-R BT.202
  smpte432: 12
  // SMPTE EG 432-1
};
var TRANSFER_CHARACTERISTICS_MAP = {
  "bt709": 1,
  // ITU-R BT.709
  "smpte170m": 6,
  // SMPTE 170M
  "linear": 8,
  // Linear transfer characteristics
  "iec61966-2-1": 13,
  // IEC 61966-2-1
  "pq": 16,
  // Rec. ITU-R BT.2100-2 perceptual quantization (PQ) system
  "hlg": 18
  // Rec. ITU-R BT.2100-2 hybrid loggamma (HLG) system
};
var MATRIX_COEFFICIENTS_MAP = {
  "rgb": 0,
  // Identity
  "bt709": 1,
  // ITU-R BT.709
  "bt470bg": 5,
  // ITU-R BT.470BG
  "smpte170m": 6,
  // SMPTE 170M
  "bt2020-ncl": 9
  // ITU-R BT.2020-2 (non-constant luminance)
};
var colorSpaceIsComplete = (colorSpace) => {
  return !!colorSpace && !!colorSpace.primaries && !!colorSpace.transfer && !!colorSpace.matrix && colorSpace.fullRange !== void 0;
};
var isAllowSharedBufferSource = (x) => {
  return x instanceof ArrayBuffer || typeof SharedArrayBuffer !== "undefined" && x instanceof SharedArrayBuffer || ArrayBuffer.isView(x);
};
var AsyncMutex = class {
  constructor() {
    this.currentPromise = Promise.resolve();
    this.pending = 0;
  }
  async acquire() {
    let resolver;
    const nextPromise = new Promise((resolve) => {
      let resolved = false;
      resolver = () => {
        if (resolved) {
          return;
        }
        resolve();
        this.pending--;
        resolved = true;
      };
    });
    const currentPromiseAlias = this.currentPromise;
    this.currentPromise = nextPromise;
    this.pending++;
    await currentPromiseAlias;
    return resolver;
  }
};
var promiseWithResolvers = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};
var assertNever = (x) => {
  throw new Error(`Unexpected value: ${x}`);
};
var setUint24 = (view2, byteOffset, value, littleEndian) => {
  value = value >>> 0;
  value = value & 16777215;
  if (littleEndian) {
    view2.setUint8(byteOffset, value & 255);
    view2.setUint8(byteOffset + 1, value >>> 8 & 255);
    view2.setUint8(byteOffset + 2, value >>> 16 & 255);
  } else {
    view2.setUint8(byteOffset, value >>> 16 & 255);
    view2.setUint8(byteOffset + 1, value >>> 8 & 255);
    view2.setUint8(byteOffset + 2, value & 255);
  }
};
var UNDETERMINED_LANGUAGE = "und";
var roundToMultiple = (value, multiple) => {
  return Math.round(value / multiple) * multiple;
};
var ISO_639_2_REGEX = /^[a-z]{3}$/;
var isIso639Dash2LanguageCode = (x) => {
  return ISO_639_2_REGEX.test(x);
};
var SECOND_TO_MICROSECOND_FACTOR = 1e6 * (1 + Number.EPSILON);
var computeRationalApproximation = (x, maxDenominator) => {
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  let prevNumerator = 0, prevDenominator = 1;
  let currNumerator = 1, currDenominator = 0;
  let remainder = x;
  while (true) {
    const integer = Math.floor(remainder);
    const nextNumerator = integer * currNumerator + prevNumerator;
    const nextDenominator = integer * currDenominator + prevDenominator;
    if (nextDenominator > maxDenominator) {
      return {
        numerator: sign * currNumerator,
        denominator: currDenominator
      };
    }
    prevNumerator = currNumerator;
    prevDenominator = currDenominator;
    currNumerator = nextNumerator;
    currDenominator = nextDenominator;
    remainder = 1 / (remainder - integer);
    if (!isFinite(remainder)) {
      break;
    }
  }
  return {
    numerator: sign * currNumerator,
    denominator: currDenominator
  };
};
var keyValueIterator = function* (object) {
  for (const key in object) {
    const value = object[key];
    if (value === void 0) {
      continue;
    }
    yield { key, value };
  }
};
var imageMimeTypeToExtension = (mimeType) => {
  switch (mimeType.toLowerCase()) {
    case "image/jpeg":
    case "image/jpg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/gif":
      return ".gif";
    case "image/webp":
      return ".webp";
    case "image/bmp":
      return ".bmp";
    case "image/svg+xml":
      return ".svg";
    case "image/tiff":
      return ".tiff";
    case "image/avif":
      return ".avif";
    case "image/x-icon":
    case "image/vnd.microsoft.icon":
      return ".ico";
    default:
      return null;
  }
};
var uint8ArraysAreEqual = (a, b) => {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};
var simplifyRational = (rational) => {
  assert(rational.den !== 0);
  let a = Math.abs(rational.num);
  let b = Math.abs(rational.den);
  while (b !== 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  const gcd = a || 1;
  return {
    num: rational.num / gcd,
    den: rational.den / gcd
  };
};

// node_modules/mediabunny/dist/modules/src/metadata.js
var RichImageData = class {
  /** Creates a new {@link RichImageData}. */
  constructor(data, mimeType) {
    this.data = data;
    this.mimeType = mimeType;
    if (!(data instanceof Uint8Array)) {
      throw new TypeError("data must be a Uint8Array.");
    }
    if (typeof mimeType !== "string") {
      throw new TypeError("mimeType must be a string.");
    }
  }
};
var AttachedFile = class {
  /** Creates a new {@link AttachedFile}. */
  constructor(data, mimeType, name, description) {
    this.data = data;
    this.mimeType = mimeType;
    this.name = name;
    this.description = description;
    if (!(data instanceof Uint8Array)) {
      throw new TypeError("data must be a Uint8Array.");
    }
    if (mimeType !== void 0 && typeof mimeType !== "string") {
      throw new TypeError("mimeType, when provided, must be a string.");
    }
    if (name !== void 0 && typeof name !== "string") {
      throw new TypeError("name, when provided, must be a string.");
    }
    if (description !== void 0 && typeof description !== "string") {
      throw new TypeError("description, when provided, must be a string.");
    }
  }
};
var validateMetadataTags = (tags) => {
  if (!tags || typeof tags !== "object") {
    throw new TypeError("tags must be an object.");
  }
  if (tags.title !== void 0 && typeof tags.title !== "string") {
    throw new TypeError("tags.title, when provided, must be a string.");
  }
  if (tags.description !== void 0 && typeof tags.description !== "string") {
    throw new TypeError("tags.description, when provided, must be a string.");
  }
  if (tags.artist !== void 0 && typeof tags.artist !== "string") {
    throw new TypeError("tags.artist, when provided, must be a string.");
  }
  if (tags.album !== void 0 && typeof tags.album !== "string") {
    throw new TypeError("tags.album, when provided, must be a string.");
  }
  if (tags.albumArtist !== void 0 && typeof tags.albumArtist !== "string") {
    throw new TypeError("tags.albumArtist, when provided, must be a string.");
  }
  if (tags.trackNumber !== void 0 && (!Number.isInteger(tags.trackNumber) || tags.trackNumber <= 0)) {
    throw new TypeError("tags.trackNumber, when provided, must be a positive integer.");
  }
  if (tags.tracksTotal !== void 0 && (!Number.isInteger(tags.tracksTotal) || tags.tracksTotal <= 0)) {
    throw new TypeError("tags.tracksTotal, when provided, must be a positive integer.");
  }
  if (tags.discNumber !== void 0 && (!Number.isInteger(tags.discNumber) || tags.discNumber <= 0)) {
    throw new TypeError("tags.discNumber, when provided, must be a positive integer.");
  }
  if (tags.discsTotal !== void 0 && (!Number.isInteger(tags.discsTotal) || tags.discsTotal <= 0)) {
    throw new TypeError("tags.discsTotal, when provided, must be a positive integer.");
  }
  if (tags.genre !== void 0 && typeof tags.genre !== "string") {
    throw new TypeError("tags.genre, when provided, must be a string.");
  }
  if (tags.date !== void 0 && (!(tags.date instanceof Date) || Number.isNaN(tags.date.getTime()))) {
    throw new TypeError("tags.date, when provided, must be a valid Date.");
  }
  if (tags.lyrics !== void 0 && typeof tags.lyrics !== "string") {
    throw new TypeError("tags.lyrics, when provided, must be a string.");
  }
  if (tags.images !== void 0) {
    if (!Array.isArray(tags.images)) {
      throw new TypeError("tags.images, when provided, must be an array.");
    }
    for (const image of tags.images) {
      if (!image || typeof image !== "object") {
        throw new TypeError("Each image in tags.images must be an object.");
      }
      if (!(image.data instanceof Uint8Array)) {
        throw new TypeError("Each image.data must be a Uint8Array.");
      }
      if (typeof image.mimeType !== "string") {
        throw new TypeError("Each image.mimeType must be a string.");
      }
      if (!["coverFront", "coverBack", "unknown"].includes(image.kind)) {
        throw new TypeError("Each image.kind must be 'coverFront', 'coverBack', or 'unknown'.");
      }
    }
  }
  if (tags.comment !== void 0 && typeof tags.comment !== "string") {
    throw new TypeError("tags.comment, when provided, must be a string.");
  }
  if (tags.raw !== void 0) {
    if (!tags.raw || typeof tags.raw !== "object") {
      throw new TypeError("tags.raw, when provided, must be an object.");
    }
    for (const value of Object.values(tags.raw)) {
      if (value !== null && typeof value !== "string" && !(value instanceof Uint8Array) && !(value instanceof RichImageData) && !(value instanceof AttachedFile)) {
        throw new TypeError("Each value in tags.raw must be a string, Uint8Array, RichImageData, AttachedFile, or null.");
      }
    }
  }
};
var validateTrackDisposition = (disposition) => {
  if (!disposition || typeof disposition !== "object") {
    throw new TypeError("disposition must be an object.");
  }
  if (disposition.default !== void 0 && typeof disposition.default !== "boolean") {
    throw new TypeError("disposition.default must be a boolean.");
  }
  if (disposition.forced !== void 0 && typeof disposition.forced !== "boolean") {
    throw new TypeError("disposition.forced must be a boolean.");
  }
  if (disposition.original !== void 0 && typeof disposition.original !== "boolean") {
    throw new TypeError("disposition.original must be a boolean.");
  }
  if (disposition.commentary !== void 0 && typeof disposition.commentary !== "boolean") {
    throw new TypeError("disposition.commentary must be a boolean.");
  }
  if (disposition.hearingImpaired !== void 0 && typeof disposition.hearingImpaired !== "boolean") {
    throw new TypeError("disposition.hearingImpaired must be a boolean.");
  }
  if (disposition.visuallyImpaired !== void 0 && typeof disposition.visuallyImpaired !== "boolean") {
    throw new TypeError("disposition.visuallyImpaired must be a boolean.");
  }
};

// node_modules/mediabunny/dist/modules/shared/bitstream.js
var Bitstream = class _Bitstream {
  constructor(bytes2) {
    this.bytes = bytes2;
    this.pos = 0;
  }
  seekToByte(byteOffset) {
    this.pos = 8 * byteOffset;
  }
  readBit() {
    const byteIndex = Math.floor(this.pos / 8);
    const byte = this.bytes[byteIndex] ?? 0;
    const bitIndex = 7 - (this.pos & 7);
    const bit = (byte & 1 << bitIndex) >> bitIndex;
    this.pos++;
    return bit;
  }
  readBits(n) {
    if (n === 1) {
      return this.readBit();
    }
    let result = 0;
    for (let i = 0; i < n; i++) {
      result <<= 1;
      result |= this.readBit();
    }
    return result;
  }
  writeBits(n, value) {
    const end = this.pos + n;
    for (let i = this.pos; i < end; i++) {
      const byteIndex = Math.floor(i / 8);
      let byte = this.bytes[byteIndex];
      const bitIndex = 7 - (i & 7);
      byte &= ~(1 << bitIndex);
      byte |= (value & 1 << end - i - 1) >> end - i - 1 << bitIndex;
      this.bytes[byteIndex] = byte;
    }
    this.pos = end;
  }
  readAlignedByte() {
    if (this.pos % 8 !== 0) {
      throw new Error("Bitstream is not byte-aligned.");
    }
    const byteIndex = this.pos / 8;
    const byte = this.bytes[byteIndex] ?? 0;
    this.pos += 8;
    return byte;
  }
  skipBits(n) {
    this.pos += n;
  }
  getBitsLeft() {
    return this.bytes.length * 8 - this.pos;
  }
  clone() {
    const clone = new _Bitstream(this.bytes);
    clone.pos = this.pos;
    return clone;
  }
};

// node_modules/mediabunny/dist/modules/shared/aac-misc.js
var aacFrequencyTable = [
  96e3,
  88200,
  64e3,
  48e3,
  44100,
  32e3,
  24e3,
  22050,
  16e3,
  12e3,
  11025,
  8e3,
  7350
];
var aacChannelMap = [-1, 1, 2, 3, 4, 5, 6, 8];
var buildAacAudioSpecificConfig = (config) => {
  let frequencyIndex = aacFrequencyTable.indexOf(config.sampleRate);
  let customSampleRate = null;
  if (frequencyIndex === -1) {
    frequencyIndex = 15;
    customSampleRate = config.sampleRate;
  }
  const channelConfiguration = aacChannelMap.indexOf(config.numberOfChannels);
  if (channelConfiguration === -1) {
    throw new TypeError(`Unsupported number of channels: ${config.numberOfChannels}`);
  }
  let bitCount = 5 + 4 + 4;
  if (config.objectType >= 32) {
    bitCount += 6;
  }
  if (frequencyIndex === 15) {
    bitCount += 24;
  }
  const byteCount = Math.ceil(bitCount / 8);
  const bytes2 = new Uint8Array(byteCount);
  const bitstream = new Bitstream(bytes2);
  if (config.objectType < 32) {
    bitstream.writeBits(5, config.objectType);
  } else {
    bitstream.writeBits(5, 31);
    bitstream.writeBits(6, config.objectType - 32);
  }
  bitstream.writeBits(4, frequencyIndex);
  if (frequencyIndex === 15) {
    bitstream.writeBits(24, customSampleRate);
  }
  bitstream.writeBits(4, channelConfiguration);
  return bytes2;
};

// node_modules/mediabunny/dist/modules/src/codec.js
var VIDEO_CODECS = [
  "avc",
  "hevc",
  "vp9",
  "av1",
  "vp8"
];
var PCM_AUDIO_CODECS = [
  "pcm-s16",
  // We don't prefix 'le' so we're compatible with the WebCodecs-registered PCM codec strings
  "pcm-s16be",
  "pcm-s24",
  "pcm-s24be",
  "pcm-s32",
  "pcm-s32be",
  "pcm-f32",
  "pcm-f32be",
  "pcm-f64",
  "pcm-f64be",
  "pcm-u8",
  "pcm-s8",
  "ulaw",
  "alaw"
];
var NON_PCM_AUDIO_CODECS = [
  "aac",
  "opus",
  "mp3",
  "vorbis",
  "flac",
  "ac3",
  "eac3"
];
var AUDIO_CODECS = [
  ...NON_PCM_AUDIO_CODECS,
  ...PCM_AUDIO_CODECS
];
var SUBTITLE_CODECS = [
  "webvtt"
];
var AVC_LEVEL_TABLE = [
  { maxMacroblocks: 99, maxBitrate: 64e3, maxDpbMbs: 396, level: 10 },
  // Level 1
  { maxMacroblocks: 396, maxBitrate: 192e3, maxDpbMbs: 900, level: 11 },
  // Level 1.1
  { maxMacroblocks: 396, maxBitrate: 384e3, maxDpbMbs: 2376, level: 12 },
  // Level 1.2
  { maxMacroblocks: 396, maxBitrate: 768e3, maxDpbMbs: 2376, level: 13 },
  // Level 1.3
  { maxMacroblocks: 396, maxBitrate: 2e6, maxDpbMbs: 2376, level: 20 },
  // Level 2
  { maxMacroblocks: 792, maxBitrate: 4e6, maxDpbMbs: 4752, level: 21 },
  // Level 2.1
  { maxMacroblocks: 1620, maxBitrate: 4e6, maxDpbMbs: 8100, level: 22 },
  // Level 2.2
  { maxMacroblocks: 1620, maxBitrate: 1e7, maxDpbMbs: 8100, level: 30 },
  // Level 3
  { maxMacroblocks: 3600, maxBitrate: 14e6, maxDpbMbs: 18e3, level: 31 },
  // Level 3.1
  { maxMacroblocks: 5120, maxBitrate: 2e7, maxDpbMbs: 20480, level: 32 },
  // Level 3.2
  { maxMacroblocks: 8192, maxBitrate: 2e7, maxDpbMbs: 32768, level: 40 },
  // Level 4
  { maxMacroblocks: 8192, maxBitrate: 5e7, maxDpbMbs: 32768, level: 41 },
  // Level 4.1
  { maxMacroblocks: 8704, maxBitrate: 5e7, maxDpbMbs: 34816, level: 42 },
  // Level 4.2
  { maxMacroblocks: 22080, maxBitrate: 135e6, maxDpbMbs: 110400, level: 50 },
  // Level 5
  { maxMacroblocks: 36864, maxBitrate: 24e7, maxDpbMbs: 184320, level: 51 },
  // Level 5.1
  { maxMacroblocks: 36864, maxBitrate: 24e7, maxDpbMbs: 184320, level: 52 },
  // Level 5.2
  { maxMacroblocks: 139264, maxBitrate: 24e7, maxDpbMbs: 696320, level: 60 },
  // Level 6
  { maxMacroblocks: 139264, maxBitrate: 48e7, maxDpbMbs: 696320, level: 61 },
  // Level 6.1
  { maxMacroblocks: 139264, maxBitrate: 8e8, maxDpbMbs: 696320, level: 62 }
  // Level 6.2
];
var generateVp9CodecConfigurationFromCodecString = (codecString) => {
  const parts = codecString.split(".");
  const profile = Number(parts[1]);
  const level = Number(parts[2]);
  const bitDepth = Number(parts[3]);
  const chromaSubsampling = parts[4] ? Number(parts[4]) : 1;
  return [
    1,
    1,
    profile,
    2,
    1,
    level,
    3,
    1,
    bitDepth,
    4,
    1,
    chromaSubsampling
  ];
};
var generateAv1CodecConfigurationFromCodecString = (codecString) => {
  const parts = codecString.split(".");
  const marker = 1;
  const version = 1;
  const firstByte = (marker << 7) + version;
  const profile = Number(parts[1]);
  const levelAndTier = parts[2];
  const level = Number(levelAndTier.slice(0, -1));
  const secondByte = (profile << 5) + level;
  const tier = levelAndTier.slice(-1) === "H" ? 1 : 0;
  const bitDepth = Number(parts[3]);
  const highBitDepth = bitDepth === 8 ? 0 : 1;
  const twelveBit = 0;
  const monochrome = parts[4] ? Number(parts[4]) : 0;
  const chromaSubsamplingX = parts[5] ? Number(parts[5][0]) : 1;
  const chromaSubsamplingY = parts[5] ? Number(parts[5][1]) : 1;
  const chromaSamplePosition = parts[5] ? Number(parts[5][2]) : 0;
  const thirdByte = (tier << 7) + (highBitDepth << 6) + (twelveBit << 5) + (monochrome << 4) + (chromaSubsamplingX << 3) + (chromaSubsamplingY << 2) + chromaSamplePosition;
  const initialPresentationDelayPresent = 0;
  const fourthByte = initialPresentationDelayPresent;
  return [firstByte, secondByte, thirdByte, fourthByte];
};
var OPUS_SAMPLE_RATE = 48e3;
var PCM_CODEC_REGEX = /^pcm-([usf])(\d+)+(be)?$/;
var parsePcmCodec = (codec) => {
  assert(PCM_AUDIO_CODECS.includes(codec));
  if (codec === "ulaw") {
    return { dataType: "ulaw", sampleSize: 1, littleEndian: true, silentValue: 255 };
  } else if (codec === "alaw") {
    return { dataType: "alaw", sampleSize: 1, littleEndian: true, silentValue: 213 };
  }
  const match = PCM_CODEC_REGEX.exec(codec);
  assert(match);
  let dataType;
  if (match[1] === "u") {
    dataType = "unsigned";
  } else if (match[1] === "s") {
    dataType = "signed";
  } else {
    dataType = "float";
  }
  const sampleSize = Number(match[2]) / 8;
  const littleEndian = match[3] !== "be";
  const silentValue = codec === "pcm-u8" ? 2 ** 7 : 0;
  return { dataType, sampleSize, littleEndian, silentValue };
};
var VALID_VIDEO_CODEC_STRING_PREFIXES = ["avc1", "avc3", "hev1", "hvc1", "vp8", "vp09", "av01"];
var AVC_CODEC_STRING_REGEX = /^(avc1|avc3)\.[0-9a-fA-F]{6}$/;
var HEVC_CODEC_STRING_REGEX = /^(hev1|hvc1)\.(?:[ABC]?\d+)\.[0-9a-fA-F]{1,8}\.[LH]\d+(?:\.[0-9a-fA-F]{1,2}){0,6}$/;
var VP9_CODEC_STRING_REGEX = /^vp09(?:\.\d{2}){3}(?:(?:\.\d{2}){5})?$/;
var AV1_CODEC_STRING_REGEX = /^av01\.\d\.\d{2}[MH]\.\d{2}(?:\.\d\.\d{3}\.\d{2}\.\d{2}\.\d{2}\.\d)?$/;
var validateVideoChunkMetadata = (metadata) => {
  if (!metadata) {
    throw new TypeError("Video chunk metadata must be provided.");
  }
  if (typeof metadata !== "object") {
    throw new TypeError("Video chunk metadata must be an object.");
  }
  if (!metadata.decoderConfig) {
    throw new TypeError("Video chunk metadata must include a decoder configuration.");
  }
  if (typeof metadata.decoderConfig !== "object") {
    throw new TypeError("Video chunk metadata decoder configuration must be an object.");
  }
  if (typeof metadata.decoderConfig.codec !== "string") {
    throw new TypeError("Video chunk metadata decoder configuration must specify a codec string.");
  }
  if (!VALID_VIDEO_CODEC_STRING_PREFIXES.some((prefix) => metadata.decoderConfig.codec.startsWith(prefix))) {
    throw new TypeError("Video chunk metadata decoder configuration codec string must be a valid video codec string as specified in the Mediabunny Codec Registry.");
  }
  if (!Number.isInteger(metadata.decoderConfig.codedWidth) || metadata.decoderConfig.codedWidth <= 0) {
    throw new TypeError("Video chunk metadata decoder configuration must specify a valid codedWidth (positive integer).");
  }
  if (!Number.isInteger(metadata.decoderConfig.codedHeight) || metadata.decoderConfig.codedHeight <= 0) {
    throw new TypeError("Video chunk metadata decoder configuration must specify a valid codedHeight (positive integer).");
  }
  if (metadata.decoderConfig.description !== void 0) {
    if (!isAllowSharedBufferSource(metadata.decoderConfig.description)) {
      throw new TypeError("Video chunk metadata decoder configuration description, when defined, must be an ArrayBuffer or an ArrayBuffer view.");
    }
  }
  if (metadata.decoderConfig.colorSpace !== void 0) {
    const { colorSpace } = metadata.decoderConfig;
    if (typeof colorSpace !== "object") {
      throw new TypeError("Video chunk metadata decoder configuration colorSpace, when provided, must be an object.");
    }
    const primariesValues = Object.keys(COLOR_PRIMARIES_MAP);
    if (colorSpace.primaries != null && !primariesValues.includes(colorSpace.primaries)) {
      throw new TypeError(`Video chunk metadata decoder configuration colorSpace primaries, when defined, must be one of ${primariesValues.join(", ")}.`);
    }
    const transferValues = Object.keys(TRANSFER_CHARACTERISTICS_MAP);
    if (colorSpace.transfer != null && !transferValues.includes(colorSpace.transfer)) {
      throw new TypeError(`Video chunk metadata decoder configuration colorSpace transfer, when defined, must be one of ${transferValues.join(", ")}.`);
    }
    const matrixValues = Object.keys(MATRIX_COEFFICIENTS_MAP);
    if (colorSpace.matrix != null && !matrixValues.includes(colorSpace.matrix)) {
      throw new TypeError(`Video chunk metadata decoder configuration colorSpace matrix, when defined, must be one of ${matrixValues.join(", ")}.`);
    }
    if (colorSpace.fullRange != null && typeof colorSpace.fullRange !== "boolean") {
      throw new TypeError("Video chunk metadata decoder configuration colorSpace fullRange, when defined, must be a boolean.");
    }
  }
  if (metadata.decoderConfig.codec.startsWith("avc1") || metadata.decoderConfig.codec.startsWith("avc3")) {
    if (!AVC_CODEC_STRING_REGEX.test(metadata.decoderConfig.codec)) {
      throw new TypeError("Video chunk metadata decoder configuration codec string for AVC must be a valid AVC codec string as specified in Section 3.4 of RFC 6381.");
    }
  } else if (metadata.decoderConfig.codec.startsWith("hev1") || metadata.decoderConfig.codec.startsWith("hvc1")) {
    if (!HEVC_CODEC_STRING_REGEX.test(metadata.decoderConfig.codec)) {
      throw new TypeError("Video chunk metadata decoder configuration codec string for HEVC must be a valid HEVC codec string as specified in Section E.3 of ISO 14496-15.");
    }
  } else if (metadata.decoderConfig.codec.startsWith("vp8")) {
    if (metadata.decoderConfig.codec !== "vp8") {
      throw new TypeError('Video chunk metadata decoder configuration codec string for VP8 must be "vp8".');
    }
  } else if (metadata.decoderConfig.codec.startsWith("vp09")) {
    if (!VP9_CODEC_STRING_REGEX.test(metadata.decoderConfig.codec)) {
      throw new TypeError('Video chunk metadata decoder configuration codec string for VP9 must be a valid VP9 codec string as specified in Section "Codecs Parameter String" of https://www.webmproject.org/vp9/mp4/.');
    }
  } else if (metadata.decoderConfig.codec.startsWith("av01")) {
    if (!AV1_CODEC_STRING_REGEX.test(metadata.decoderConfig.codec)) {
      throw new TypeError('Video chunk metadata decoder configuration codec string for AV1 must be a valid AV1 codec string as specified in Section "Codecs Parameter String" of https://aomediacodec.github.io/av1-isobmff/.');
    }
  }
};
var VALID_AUDIO_CODEC_STRING_PREFIXES = [
  "mp4a",
  "mp3",
  "opus",
  "vorbis",
  "flac",
  "ulaw",
  "alaw",
  "pcm",
  "ac-3",
  "ec-3"
];
var validateAudioChunkMetadata = (metadata) => {
  if (!metadata) {
    throw new TypeError("Audio chunk metadata must be provided.");
  }
  if (typeof metadata !== "object") {
    throw new TypeError("Audio chunk metadata must be an object.");
  }
  if (!metadata.decoderConfig) {
    throw new TypeError("Audio chunk metadata must include a decoder configuration.");
  }
  if (typeof metadata.decoderConfig !== "object") {
    throw new TypeError("Audio chunk metadata decoder configuration must be an object.");
  }
  if (typeof metadata.decoderConfig.codec !== "string") {
    throw new TypeError("Audio chunk metadata decoder configuration must specify a codec string.");
  }
  if (!VALID_AUDIO_CODEC_STRING_PREFIXES.some((prefix) => metadata.decoderConfig.codec.startsWith(prefix))) {
    throw new TypeError("Audio chunk metadata decoder configuration codec string must be a valid audio codec string as specified in the Mediabunny Codec Registry.");
  }
  if (!Number.isInteger(metadata.decoderConfig.sampleRate) || metadata.decoderConfig.sampleRate <= 0) {
    throw new TypeError("Audio chunk metadata decoder configuration must specify a valid sampleRate (positive integer).");
  }
  if (!Number.isInteger(metadata.decoderConfig.numberOfChannels) || metadata.decoderConfig.numberOfChannels <= 0) {
    throw new TypeError("Audio chunk metadata decoder configuration must specify a valid numberOfChannels (positive integer).");
  }
  if (metadata.decoderConfig.description !== void 0) {
    if (!isAllowSharedBufferSource(metadata.decoderConfig.description)) {
      throw new TypeError("Audio chunk metadata decoder configuration description, when defined, must be an ArrayBuffer or an ArrayBuffer view.");
    }
  }
  if (metadata.decoderConfig.codec.startsWith("mp4a") && metadata.decoderConfig.codec !== "mp4a.69" && metadata.decoderConfig.codec !== "mp4a.6B" && metadata.decoderConfig.codec !== "mp4a.6b") {
    const validStrings = ["mp4a.40.2", "mp4a.40.02", "mp4a.40.5", "mp4a.40.05", "mp4a.40.29", "mp4a.67"];
    if (!validStrings.includes(metadata.decoderConfig.codec)) {
      throw new TypeError("Audio chunk metadata decoder configuration codec string for AAC must be a valid AAC codec string as specified in https://www.w3.org/TR/webcodecs-aac-codec-registration/.");
    }
  } else if (metadata.decoderConfig.codec.startsWith("mp3") || metadata.decoderConfig.codec.startsWith("mp4a")) {
    if (metadata.decoderConfig.codec !== "mp3" && metadata.decoderConfig.codec !== "mp4a.69" && metadata.decoderConfig.codec !== "mp4a.6B" && metadata.decoderConfig.codec !== "mp4a.6b") {
      throw new TypeError('Audio chunk metadata decoder configuration codec string for MP3 must be "mp3", "mp4a.69" or "mp4a.6B".');
    }
  } else if (metadata.decoderConfig.codec.startsWith("opus")) {
    if (metadata.decoderConfig.codec !== "opus") {
      throw new TypeError('Audio chunk metadata decoder configuration codec string for Opus must be "opus".');
    }
    if (metadata.decoderConfig.description && metadata.decoderConfig.description.byteLength < 18) {
      throw new TypeError("Audio chunk metadata decoder configuration description, when specified, is expected to be an Identification Header as specified in Section 5.1 of RFC 7845.");
    }
  } else if (metadata.decoderConfig.codec.startsWith("vorbis")) {
    if (metadata.decoderConfig.codec !== "vorbis") {
      throw new TypeError('Audio chunk metadata decoder configuration codec string for Vorbis must be "vorbis".');
    }
    if (!metadata.decoderConfig.description) {
      throw new TypeError("Audio chunk metadata decoder configuration for Vorbis must include a description, which is expected to adhere to the format described in https://www.w3.org/TR/webcodecs-vorbis-codec-registration/.");
    }
  } else if (metadata.decoderConfig.codec.startsWith("flac")) {
    if (metadata.decoderConfig.codec !== "flac") {
      throw new TypeError('Audio chunk metadata decoder configuration codec string for FLAC must be "flac".');
    }
    const minDescriptionSize = 4 + 4 + 34;
    if (!metadata.decoderConfig.description || metadata.decoderConfig.description.byteLength < minDescriptionSize) {
      throw new TypeError("Audio chunk metadata decoder configuration for FLAC must include a description, which is expected to adhere to the format described in https://www.w3.org/TR/webcodecs-flac-codec-registration/.");
    }
  } else if (metadata.decoderConfig.codec.startsWith("ac-3") || metadata.decoderConfig.codec.startsWith("ac3")) {
    if (metadata.decoderConfig.codec !== "ac-3") {
      throw new TypeError('Audio chunk metadata decoder configuration codec string for AC-3 must be "ac-3".');
    }
  } else if (metadata.decoderConfig.codec.startsWith("ec-3") || metadata.decoderConfig.codec.startsWith("eac3")) {
    if (metadata.decoderConfig.codec !== "ec-3") {
      throw new TypeError('Audio chunk metadata decoder configuration codec string for EC-3 must be "ec-3".');
    }
  } else if (metadata.decoderConfig.codec.startsWith("pcm") || metadata.decoderConfig.codec.startsWith("ulaw") || metadata.decoderConfig.codec.startsWith("alaw")) {
    if (!PCM_AUDIO_CODECS.includes(metadata.decoderConfig.codec)) {
      throw new TypeError(`Audio chunk metadata decoder configuration codec string for PCM must be one of the supported PCM codecs (${PCM_AUDIO_CODECS.join(", ")}).`);
    }
  }
};
var validateSubtitleMetadata = (metadata) => {
  if (!metadata) {
    throw new TypeError("Subtitle metadata must be provided.");
  }
  if (typeof metadata !== "object") {
    throw new TypeError("Subtitle metadata must be an object.");
  }
  if (!metadata.config) {
    throw new TypeError("Subtitle metadata must include a config object.");
  }
  if (typeof metadata.config !== "object") {
    throw new TypeError("Subtitle metadata config must be an object.");
  }
  if (typeof metadata.config.description !== "string") {
    throw new TypeError("Subtitle metadata config description must be a string.");
  }
};

// node_modules/mediabunny/dist/modules/shared/ac3-misc.js
var AC3_SAMPLE_RATES = [48e3, 44100, 32e3];
var EAC3_REDUCED_SAMPLE_RATES = [24e3, 22050, 16e3];

// node_modules/mediabunny/dist/modules/src/codec-data.js
var AvcNalUnitType;
(function(AvcNalUnitType2) {
  AvcNalUnitType2[AvcNalUnitType2["NON_IDR_SLICE"] = 1] = "NON_IDR_SLICE";
  AvcNalUnitType2[AvcNalUnitType2["SLICE_DPA"] = 2] = "SLICE_DPA";
  AvcNalUnitType2[AvcNalUnitType2["SLICE_DPB"] = 3] = "SLICE_DPB";
  AvcNalUnitType2[AvcNalUnitType2["SLICE_DPC"] = 4] = "SLICE_DPC";
  AvcNalUnitType2[AvcNalUnitType2["IDR"] = 5] = "IDR";
  AvcNalUnitType2[AvcNalUnitType2["SEI"] = 6] = "SEI";
  AvcNalUnitType2[AvcNalUnitType2["SPS"] = 7] = "SPS";
  AvcNalUnitType2[AvcNalUnitType2["PPS"] = 8] = "PPS";
  AvcNalUnitType2[AvcNalUnitType2["AUD"] = 9] = "AUD";
  AvcNalUnitType2[AvcNalUnitType2["SPS_EXT"] = 13] = "SPS_EXT";
})(AvcNalUnitType || (AvcNalUnitType = {}));
var HevcNalUnitType;
(function(HevcNalUnitType2) {
  HevcNalUnitType2[HevcNalUnitType2["RASL_N"] = 8] = "RASL_N";
  HevcNalUnitType2[HevcNalUnitType2["RASL_R"] = 9] = "RASL_R";
  HevcNalUnitType2[HevcNalUnitType2["BLA_W_LP"] = 16] = "BLA_W_LP";
  HevcNalUnitType2[HevcNalUnitType2["RSV_IRAP_VCL23"] = 23] = "RSV_IRAP_VCL23";
  HevcNalUnitType2[HevcNalUnitType2["VPS_NUT"] = 32] = "VPS_NUT";
  HevcNalUnitType2[HevcNalUnitType2["SPS_NUT"] = 33] = "SPS_NUT";
  HevcNalUnitType2[HevcNalUnitType2["PPS_NUT"] = 34] = "PPS_NUT";
  HevcNalUnitType2[HevcNalUnitType2["AUD_NUT"] = 35] = "AUD_NUT";
  HevcNalUnitType2[HevcNalUnitType2["PREFIX_SEI_NUT"] = 39] = "PREFIX_SEI_NUT";
  HevcNalUnitType2[HevcNalUnitType2["SUFFIX_SEI_NUT"] = 40] = "SUFFIX_SEI_NUT";
})(HevcNalUnitType || (HevcNalUnitType = {}));
var iterateNalUnitsInAnnexB = function* (packetData) {
  let i = 0;
  let nalStart = -1;
  while (i < packetData.length - 2) {
    const zeroIndex = packetData.indexOf(0, i);
    if (zeroIndex === -1 || zeroIndex >= packetData.length - 2) {
      break;
    }
    i = zeroIndex;
    let startCodeLength = 0;
    if (i + 3 < packetData.length && packetData[i + 1] === 0 && packetData[i + 2] === 0 && packetData[i + 3] === 1) {
      startCodeLength = 4;
    } else if (packetData[i + 1] === 0 && packetData[i + 2] === 1) {
      startCodeLength = 3;
    }
    if (startCodeLength === 0) {
      i++;
      continue;
    }
    if (nalStart !== -1 && i > nalStart) {
      yield {
        offset: nalStart,
        length: i - nalStart
      };
    }
    nalStart = i + startCodeLength;
    i = nalStart;
  }
  if (nalStart !== -1 && nalStart < packetData.length) {
    yield {
      offset: nalStart,
      length: packetData.length - nalStart
    };
  }
};
var extractNalUnitTypeForAvc = (byte) => {
  return byte & 31;
};
var removeEmulationPreventionBytes = (data) => {
  const result = [];
  const len = data.length;
  for (let i = 0; i < len; i++) {
    if (i + 2 < len && data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 3) {
      result.push(0, 0);
      i += 2;
    } else {
      result.push(data[i]);
    }
  }
  return new Uint8Array(result);
};
var ANNEX_B_START_CODE = new Uint8Array([0, 0, 0, 1]);
var concatNalUnitsInLengthPrefixed = (nalUnits, lengthSize) => {
  const totalLength = nalUnits.reduce((a, b) => a + lengthSize + b.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const nalUnit of nalUnits) {
    const dataView = new DataView(result.buffer, result.byteOffset, result.byteLength);
    switch (lengthSize) {
      case 1:
        dataView.setUint8(offset, nalUnit.byteLength);
        break;
      case 2:
        dataView.setUint16(offset, nalUnit.byteLength, false);
        break;
      case 3:
        setUint24(dataView, offset, nalUnit.byteLength, false);
        break;
      case 4:
        dataView.setUint32(offset, nalUnit.byteLength, false);
        break;
    }
    offset += lengthSize;
    result.set(nalUnit, offset);
    offset += nalUnit.byteLength;
  }
  return result;
};
var extractAvcDecoderConfigurationRecord = (packetData) => {
  try {
    const spsUnits = [];
    const ppsUnits = [];
    const spsExtUnits = [];
    for (const loc of iterateNalUnitsInAnnexB(packetData)) {
      const nalUnit = packetData.subarray(loc.offset, loc.offset + loc.length);
      const type = extractNalUnitTypeForAvc(nalUnit[0]);
      if (type === AvcNalUnitType.SPS) {
        spsUnits.push(nalUnit);
      } else if (type === AvcNalUnitType.PPS) {
        ppsUnits.push(nalUnit);
      } else if (type === AvcNalUnitType.SPS_EXT) {
        spsExtUnits.push(nalUnit);
      }
    }
    if (spsUnits.length === 0) {
      return null;
    }
    if (ppsUnits.length === 0) {
      return null;
    }
    const spsData = spsUnits[0];
    const spsInfo = parseAvcSps(spsData);
    assert(spsInfo !== null);
    const hasExtendedData = spsInfo.profileIdc === 100 || spsInfo.profileIdc === 110 || spsInfo.profileIdc === 122 || spsInfo.profileIdc === 144;
    return {
      configurationVersion: 1,
      avcProfileIndication: spsInfo.profileIdc,
      profileCompatibility: spsInfo.constraintFlags,
      avcLevelIndication: spsInfo.levelIdc,
      lengthSizeMinusOne: 3,
      // Typically 4 bytes for length field
      sequenceParameterSets: spsUnits,
      pictureParameterSets: ppsUnits,
      chromaFormat: hasExtendedData ? spsInfo.chromaFormatIdc : null,
      bitDepthLumaMinus8: hasExtendedData ? spsInfo.bitDepthLumaMinus8 : null,
      bitDepthChromaMinus8: hasExtendedData ? spsInfo.bitDepthChromaMinus8 : null,
      sequenceParameterSetExt: hasExtendedData ? spsExtUnits : null
    };
  } catch (error) {
    console.error("Error building AVC Decoder Configuration Record:", error);
    return null;
  }
};
var serializeAvcDecoderConfigurationRecord = (record) => {
  const bytes2 = [];
  bytes2.push(record.configurationVersion);
  bytes2.push(record.avcProfileIndication);
  bytes2.push(record.profileCompatibility);
  bytes2.push(record.avcLevelIndication);
  bytes2.push(252 | record.lengthSizeMinusOne & 3);
  bytes2.push(224 | record.sequenceParameterSets.length & 31);
  for (const sps of record.sequenceParameterSets) {
    const length = sps.byteLength;
    bytes2.push(length >> 8);
    bytes2.push(length & 255);
    for (let i = 0; i < length; i++) {
      bytes2.push(sps[i]);
    }
  }
  bytes2.push(record.pictureParameterSets.length);
  for (const pps of record.pictureParameterSets) {
    const length = pps.byteLength;
    bytes2.push(length >> 8);
    bytes2.push(length & 255);
    for (let i = 0; i < length; i++) {
      bytes2.push(pps[i]);
    }
  }
  if (record.avcProfileIndication === 100 || record.avcProfileIndication === 110 || record.avcProfileIndication === 122 || record.avcProfileIndication === 144) {
    assert(record.chromaFormat !== null);
    assert(record.bitDepthLumaMinus8 !== null);
    assert(record.bitDepthChromaMinus8 !== null);
    assert(record.sequenceParameterSetExt !== null);
    bytes2.push(252 | record.chromaFormat & 3);
    bytes2.push(248 | record.bitDepthLumaMinus8 & 7);
    bytes2.push(248 | record.bitDepthChromaMinus8 & 7);
    bytes2.push(record.sequenceParameterSetExt.length);
    for (const spsExt of record.sequenceParameterSetExt) {
      const length = spsExt.byteLength;
      bytes2.push(length >> 8);
      bytes2.push(length & 255);
      for (let i = 0; i < length; i++) {
        bytes2.push(spsExt[i]);
      }
    }
  }
  return new Uint8Array(bytes2);
};
var AVC_HEVC_ASPECT_RATIO_IDC_TABLE = {
  1: { num: 1, den: 1 },
  2: { num: 12, den: 11 },
  3: { num: 10, den: 11 },
  4: { num: 16, den: 11 },
  5: { num: 40, den: 33 },
  6: { num: 24, den: 11 },
  7: { num: 20, den: 11 },
  8: { num: 32, den: 11 },
  9: { num: 80, den: 33 },
  10: { num: 18, den: 11 },
  11: { num: 15, den: 11 },
  12: { num: 64, den: 33 },
  13: { num: 160, den: 99 },
  14: { num: 4, den: 3 },
  15: { num: 3, den: 2 },
  16: { num: 2, den: 1 }
};
var parseAvcSps = (sps) => {
  try {
    const bitstream = new Bitstream(removeEmulationPreventionBytes(sps));
    bitstream.skipBits(1);
    bitstream.skipBits(2);
    const nalUnitType = bitstream.readBits(5);
    if (nalUnitType !== 7) {
      return null;
    }
    const profileIdc = bitstream.readAlignedByte();
    const constraintFlags = bitstream.readAlignedByte();
    const levelIdc = bitstream.readAlignedByte();
    readExpGolomb(bitstream);
    let chromaFormatIdc = 1;
    let bitDepthLumaMinus8 = 0;
    let bitDepthChromaMinus8 = 0;
    let separateColourPlaneFlag = 0;
    if (profileIdc === 100 || profileIdc === 110 || profileIdc === 122 || profileIdc === 244 || profileIdc === 44 || profileIdc === 83 || profileIdc === 86 || profileIdc === 118 || profileIdc === 128) {
      chromaFormatIdc = readExpGolomb(bitstream);
      if (chromaFormatIdc === 3) {
        separateColourPlaneFlag = bitstream.readBits(1);
      }
      bitDepthLumaMinus8 = readExpGolomb(bitstream);
      bitDepthChromaMinus8 = readExpGolomb(bitstream);
      bitstream.skipBits(1);
      const seqScalingMatrixPresentFlag = bitstream.readBits(1);
      if (seqScalingMatrixPresentFlag) {
        for (let i = 0; i < (chromaFormatIdc !== 3 ? 8 : 12); i++) {
          const seqScalingListPresentFlag = bitstream.readBits(1);
          if (seqScalingListPresentFlag) {
            const sizeOfScalingList = i < 6 ? 16 : 64;
            let lastScale = 8;
            let nextScale = 8;
            for (let j = 0; j < sizeOfScalingList; j++) {
              if (nextScale !== 0) {
                const deltaScale = readSignedExpGolomb(bitstream);
                nextScale = (lastScale + deltaScale + 256) % 256;
              }
              lastScale = nextScale === 0 ? lastScale : nextScale;
            }
          }
        }
      }
    }
    readExpGolomb(bitstream);
    const picOrderCntType = readExpGolomb(bitstream);
    if (picOrderCntType === 0) {
      readExpGolomb(bitstream);
    } else if (picOrderCntType === 1) {
      bitstream.skipBits(1);
      readSignedExpGolomb(bitstream);
      readSignedExpGolomb(bitstream);
      const numRefFramesInPicOrderCntCycle = readExpGolomb(bitstream);
      for (let i = 0; i < numRefFramesInPicOrderCntCycle; i++) {
        readSignedExpGolomb(bitstream);
      }
    }
    readExpGolomb(bitstream);
    bitstream.skipBits(1);
    const picWidthInMbsMinus1 = readExpGolomb(bitstream);
    const picHeightInMapUnitsMinus1 = readExpGolomb(bitstream);
    const codedWidth = 16 * (picWidthInMbsMinus1 + 1);
    const codedHeight = 16 * (picHeightInMapUnitsMinus1 + 1);
    let displayWidth = codedWidth;
    let displayHeight = codedHeight;
    const frameMbsOnlyFlag = bitstream.readBits(1);
    if (!frameMbsOnlyFlag) {
      bitstream.skipBits(1);
    }
    bitstream.skipBits(1);
    const frameCroppingFlag = bitstream.readBits(1);
    if (frameCroppingFlag) {
      const frameCropLeftOffset = readExpGolomb(bitstream);
      const frameCropRightOffset = readExpGolomb(bitstream);
      const frameCropTopOffset = readExpGolomb(bitstream);
      const frameCropBottomOffset = readExpGolomb(bitstream);
      let cropUnitX;
      let cropUnitY;
      const chromaArrayType = separateColourPlaneFlag === 0 ? chromaFormatIdc : 0;
      if (chromaArrayType === 0) {
        cropUnitX = 1;
        cropUnitY = 2 - frameMbsOnlyFlag;
      } else {
        const subWidthC = chromaFormatIdc === 3 ? 1 : 2;
        const subHeightC = chromaFormatIdc === 1 ? 2 : 1;
        cropUnitX = subWidthC;
        cropUnitY = subHeightC * (2 - frameMbsOnlyFlag);
      }
      displayWidth -= cropUnitX * (frameCropLeftOffset + frameCropRightOffset);
      displayHeight -= cropUnitY * (frameCropTopOffset + frameCropBottomOffset);
    }
    let colourPrimaries = 2;
    let transferCharacteristics = 2;
    let matrixCoefficients = 2;
    let fullRangeFlag = 0;
    let pixelAspectRatio = { num: 1, den: 1 };
    let numReorderFrames = null;
    let maxDecFrameBuffering = null;
    const vuiParametersPresentFlag = bitstream.readBits(1);
    if (vuiParametersPresentFlag) {
      const aspectRatioInfoPresentFlag = bitstream.readBits(1);
      if (aspectRatioInfoPresentFlag) {
        const aspectRatioIdc = bitstream.readBits(8);
        if (aspectRatioIdc === 255) {
          pixelAspectRatio = {
            num: bitstream.readBits(16),
            den: bitstream.readBits(16)
          };
        } else {
          const aspectRatio = AVC_HEVC_ASPECT_RATIO_IDC_TABLE[aspectRatioIdc];
          if (aspectRatio) {
            pixelAspectRatio = aspectRatio;
          }
        }
      }
      const overscanInfoPresentFlag = bitstream.readBits(1);
      if (overscanInfoPresentFlag) {
        bitstream.skipBits(1);
      }
      const videoSignalTypePresentFlag = bitstream.readBits(1);
      if (videoSignalTypePresentFlag) {
        bitstream.skipBits(3);
        fullRangeFlag = bitstream.readBits(1);
        const colourDescriptionPresentFlag = bitstream.readBits(1);
        if (colourDescriptionPresentFlag) {
          colourPrimaries = bitstream.readBits(8);
          transferCharacteristics = bitstream.readBits(8);
          matrixCoefficients = bitstream.readBits(8);
        }
      }
      const chromaLocInfoPresentFlag = bitstream.readBits(1);
      if (chromaLocInfoPresentFlag) {
        readExpGolomb(bitstream);
        readExpGolomb(bitstream);
      }
      const timingInfoPresentFlag = bitstream.readBits(1);
      if (timingInfoPresentFlag) {
        bitstream.skipBits(32);
        bitstream.skipBits(32);
        bitstream.skipBits(1);
      }
      const nalHrdParametersPresentFlag = bitstream.readBits(1);
      if (nalHrdParametersPresentFlag) {
        skipAvcHrdParameters(bitstream);
      }
      const vclHrdParametersPresentFlag = bitstream.readBits(1);
      if (vclHrdParametersPresentFlag) {
        skipAvcHrdParameters(bitstream);
      }
      if (nalHrdParametersPresentFlag || vclHrdParametersPresentFlag) {
        bitstream.skipBits(1);
      }
      bitstream.skipBits(1);
      const bitstreamRestrictionFlag = bitstream.readBits(1);
      if (bitstreamRestrictionFlag) {
        bitstream.skipBits(1);
        readExpGolomb(bitstream);
        readExpGolomb(bitstream);
        readExpGolomb(bitstream);
        readExpGolomb(bitstream);
        numReorderFrames = readExpGolomb(bitstream);
        maxDecFrameBuffering = readExpGolomb(bitstream);
      }
    }
    if (numReorderFrames === null) {
      assert(maxDecFrameBuffering === null);
      const constraintSet3Flag = constraintFlags & 16;
      if ((profileIdc === 44 || profileIdc === 86 || profileIdc === 100 || profileIdc === 110 || profileIdc === 122 || profileIdc === 244) && constraintSet3Flag) {
        numReorderFrames = 0;
        maxDecFrameBuffering = 0;
      } else {
        const picWidthInMbs = picWidthInMbsMinus1 + 1;
        const picHeightInMapUnits = picHeightInMapUnitsMinus1 + 1;
        const frameHeightInMbs = (2 - frameMbsOnlyFlag) * picHeightInMapUnits;
        const levelInfo = AVC_LEVEL_TABLE.find((x) => x.level >= levelIdc) ?? last(AVC_LEVEL_TABLE);
        const maxDpbFrames = Math.min(Math.floor(levelInfo.maxDpbMbs / (picWidthInMbs * frameHeightInMbs)), 16);
        numReorderFrames = maxDpbFrames;
        maxDecFrameBuffering = maxDpbFrames;
      }
    }
    assert(maxDecFrameBuffering !== null);
    return {
      profileIdc,
      constraintFlags,
      levelIdc,
      frameMbsOnlyFlag,
      chromaFormatIdc,
      bitDepthLumaMinus8,
      bitDepthChromaMinus8,
      codedWidth,
      codedHeight,
      displayWidth,
      displayHeight,
      pixelAspectRatio,
      colourPrimaries,
      matrixCoefficients,
      transferCharacteristics,
      fullRangeFlag,
      numReorderFrames,
      maxDecFrameBuffering
    };
  } catch (error) {
    console.error("Error parsing AVC SPS:", error);
    return null;
  }
};
var skipAvcHrdParameters = (bitstream) => {
  const cpb_cnt_minus1 = readExpGolomb(bitstream);
  bitstream.skipBits(4);
  bitstream.skipBits(4);
  for (let i = 0; i <= cpb_cnt_minus1; i++) {
    readExpGolomb(bitstream);
    readExpGolomb(bitstream);
    bitstream.skipBits(1);
  }
  bitstream.skipBits(5);
  bitstream.skipBits(5);
  bitstream.skipBits(5);
  bitstream.skipBits(5);
};
var extractNalUnitTypeForHevc = (byte) => {
  return byte >> 1 & 63;
};
var parseHevcSps = (sps) => {
  try {
    const bitstream = new Bitstream(removeEmulationPreventionBytes(sps));
    bitstream.skipBits(16);
    bitstream.readBits(4);
    const spsMaxSubLayersMinus1 = bitstream.readBits(3);
    const spsTemporalIdNestingFlag = bitstream.readBits(1);
    const { general_profile_space, general_tier_flag, general_profile_idc, general_profile_compatibility_flags, general_constraint_indicator_flags, general_level_idc } = parseProfileTierLevel(bitstream, spsMaxSubLayersMinus1);
    readExpGolomb(bitstream);
    const chromaFormatIdc = readExpGolomb(bitstream);
    let separateColourPlaneFlag = 0;
    if (chromaFormatIdc === 3) {
      separateColourPlaneFlag = bitstream.readBits(1);
    }
    const picWidthInLumaSamples = readExpGolomb(bitstream);
    const picHeightInLumaSamples = readExpGolomb(bitstream);
    let displayWidth = picWidthInLumaSamples;
    let displayHeight = picHeightInLumaSamples;
    if (bitstream.readBits(1)) {
      const confWinLeftOffset = readExpGolomb(bitstream);
      const confWinRightOffset = readExpGolomb(bitstream);
      const confWinTopOffset = readExpGolomb(bitstream);
      const confWinBottomOffset = readExpGolomb(bitstream);
      let subWidthC = 1;
      let subHeightC = 1;
      const chromaArrayType = separateColourPlaneFlag === 0 ? chromaFormatIdc : 0;
      if (chromaArrayType === 1) {
        subWidthC = 2;
        subHeightC = 2;
      } else if (chromaArrayType === 2) {
        subWidthC = 2;
        subHeightC = 1;
      }
      displayWidth -= (confWinLeftOffset + confWinRightOffset) * subWidthC;
      displayHeight -= (confWinTopOffset + confWinBottomOffset) * subHeightC;
    }
    const bitDepthLumaMinus8 = readExpGolomb(bitstream);
    const bitDepthChromaMinus8 = readExpGolomb(bitstream);
    readExpGolomb(bitstream);
    const spsSubLayerOrderingInfoPresentFlag = bitstream.readBits(1);
    const startI = spsSubLayerOrderingInfoPresentFlag ? 0 : spsMaxSubLayersMinus1;
    let spsMaxNumReorderPics = 0;
    for (let i = startI; i <= spsMaxSubLayersMinus1; i++) {
      readExpGolomb(bitstream);
      spsMaxNumReorderPics = readExpGolomb(bitstream);
      readExpGolomb(bitstream);
    }
    readExpGolomb(bitstream);
    readExpGolomb(bitstream);
    readExpGolomb(bitstream);
    readExpGolomb(bitstream);
    readExpGolomb(bitstream);
    readExpGolomb(bitstream);
    if (bitstream.readBits(1)) {
      if (bitstream.readBits(1)) {
        skipScalingListData(bitstream);
      }
    }
    bitstream.skipBits(1);
    bitstream.skipBits(1);
    if (bitstream.readBits(1)) {
      bitstream.skipBits(4);
      bitstream.skipBits(4);
      readExpGolomb(bitstream);
      readExpGolomb(bitstream);
      bitstream.skipBits(1);
    }
    const numShortTermRefPicSets = readExpGolomb(bitstream);
    skipAllStRefPicSets(bitstream, numShortTermRefPicSets);
    if (bitstream.readBits(1)) {
      const numLongTermRefPicsSps = readExpGolomb(bitstream);
      for (let i = 0; i < numLongTermRefPicsSps; i++) {
        readExpGolomb(bitstream);
        bitstream.skipBits(1);
      }
    }
    bitstream.skipBits(1);
    bitstream.skipBits(1);
    let colourPrimaries = 2;
    let transferCharacteristics = 2;
    let matrixCoefficients = 2;
    let fullRangeFlag = 0;
    let minSpatialSegmentationIdc = 0;
    let pixelAspectRatio = { num: 1, den: 1 };
    if (bitstream.readBits(1)) {
      const vui = parseHevcVui(bitstream, spsMaxSubLayersMinus1);
      pixelAspectRatio = vui.pixelAspectRatio;
      colourPrimaries = vui.colourPrimaries;
      transferCharacteristics = vui.transferCharacteristics;
      matrixCoefficients = vui.matrixCoefficients;
      fullRangeFlag = vui.fullRangeFlag;
      minSpatialSegmentationIdc = vui.minSpatialSegmentationIdc;
    }
    return {
      displayWidth,
      displayHeight,
      pixelAspectRatio,
      colourPrimaries,
      transferCharacteristics,
      matrixCoefficients,
      fullRangeFlag,
      maxDecFrameBuffering: spsMaxNumReorderPics + 1,
      spsMaxSubLayersMinus1,
      spsTemporalIdNestingFlag,
      generalProfileSpace: general_profile_space,
      generalTierFlag: general_tier_flag,
      generalProfileIdc: general_profile_idc,
      generalProfileCompatibilityFlags: general_profile_compatibility_flags,
      generalConstraintIndicatorFlags: general_constraint_indicator_flags,
      generalLevelIdc: general_level_idc,
      chromaFormatIdc,
      bitDepthLumaMinus8,
      bitDepthChromaMinus8,
      minSpatialSegmentationIdc
    };
  } catch (error) {
    console.error("Error parsing HEVC SPS:", error);
    return null;
  }
};
var extractHevcDecoderConfigurationRecord = (packetData) => {
  try {
    const vpsUnits = [];
    const spsUnits = [];
    const ppsUnits = [];
    const seiUnits = [];
    for (const loc of iterateNalUnitsInAnnexB(packetData)) {
      const nalUnit = packetData.subarray(loc.offset, loc.offset + loc.length);
      const type = extractNalUnitTypeForHevc(nalUnit[0]);
      if (type === HevcNalUnitType.VPS_NUT) {
        vpsUnits.push(nalUnit);
      } else if (type === HevcNalUnitType.SPS_NUT) {
        spsUnits.push(nalUnit);
      } else if (type === HevcNalUnitType.PPS_NUT) {
        ppsUnits.push(nalUnit);
      } else if (type === HevcNalUnitType.PREFIX_SEI_NUT || type === HevcNalUnitType.SUFFIX_SEI_NUT) {
        seiUnits.push(nalUnit);
      }
    }
    if (spsUnits.length === 0 || ppsUnits.length === 0)
      return null;
    const spsInfo = parseHevcSps(spsUnits[0]);
    if (!spsInfo)
      return null;
    let parallelismType = 0;
    if (ppsUnits.length > 0) {
      const pps = ppsUnits[0];
      const ppsBitstream = new Bitstream(removeEmulationPreventionBytes(pps));
      ppsBitstream.skipBits(16);
      readExpGolomb(ppsBitstream);
      readExpGolomb(ppsBitstream);
      ppsBitstream.skipBits(1);
      ppsBitstream.skipBits(1);
      ppsBitstream.skipBits(3);
      ppsBitstream.skipBits(1);
      ppsBitstream.skipBits(1);
      readExpGolomb(ppsBitstream);
      readExpGolomb(ppsBitstream);
      readSignedExpGolomb(ppsBitstream);
      ppsBitstream.skipBits(1);
      ppsBitstream.skipBits(1);
      if (ppsBitstream.readBits(1)) {
        readExpGolomb(ppsBitstream);
      }
      readSignedExpGolomb(ppsBitstream);
      readSignedExpGolomb(ppsBitstream);
      ppsBitstream.skipBits(1);
      ppsBitstream.skipBits(1);
      ppsBitstream.skipBits(1);
      ppsBitstream.skipBits(1);
      const tiles_enabled_flag = ppsBitstream.readBits(1);
      const entropy_coding_sync_enabled_flag = ppsBitstream.readBits(1);
      if (!tiles_enabled_flag && !entropy_coding_sync_enabled_flag)
        parallelismType = 0;
      else if (tiles_enabled_flag && !entropy_coding_sync_enabled_flag)
        parallelismType = 2;
      else if (!tiles_enabled_flag && entropy_coding_sync_enabled_flag)
        parallelismType = 3;
      else
        parallelismType = 0;
    }
    const arrays = [
      ...vpsUnits.length ? [
        {
          arrayCompleteness: 1,
          nalUnitType: HevcNalUnitType.VPS_NUT,
          nalUnits: vpsUnits
        }
      ] : [],
      ...spsUnits.length ? [
        {
          arrayCompleteness: 1,
          nalUnitType: HevcNalUnitType.SPS_NUT,
          nalUnits: spsUnits
        }
      ] : [],
      ...ppsUnits.length ? [
        {
          arrayCompleteness: 1,
          nalUnitType: HevcNalUnitType.PPS_NUT,
          nalUnits: ppsUnits
        }
      ] : [],
      ...seiUnits.length ? [
        {
          arrayCompleteness: 1,
          nalUnitType: extractNalUnitTypeForHevc(seiUnits[0][0]),
          nalUnits: seiUnits
        }
      ] : []
    ];
    const record = {
      configurationVersion: 1,
      generalProfileSpace: spsInfo.generalProfileSpace,
      generalTierFlag: spsInfo.generalTierFlag,
      generalProfileIdc: spsInfo.generalProfileIdc,
      generalProfileCompatibilityFlags: spsInfo.generalProfileCompatibilityFlags,
      generalConstraintIndicatorFlags: spsInfo.generalConstraintIndicatorFlags,
      generalLevelIdc: spsInfo.generalLevelIdc,
      minSpatialSegmentationIdc: spsInfo.minSpatialSegmentationIdc,
      parallelismType,
      chromaFormatIdc: spsInfo.chromaFormatIdc,
      bitDepthLumaMinus8: spsInfo.bitDepthLumaMinus8,
      bitDepthChromaMinus8: spsInfo.bitDepthChromaMinus8,
      avgFrameRate: 0,
      constantFrameRate: 0,
      numTemporalLayers: spsInfo.spsMaxSubLayersMinus1 + 1,
      temporalIdNested: spsInfo.spsTemporalIdNestingFlag,
      lengthSizeMinusOne: 3,
      arrays
    };
    return record;
  } catch (error) {
    console.error("Error building HEVC Decoder Configuration Record:", error);
    return null;
  }
};
var parseProfileTierLevel = (bitstream, maxNumSubLayersMinus1) => {
  const general_profile_space = bitstream.readBits(2);
  const general_tier_flag = bitstream.readBits(1);
  const general_profile_idc = bitstream.readBits(5);
  let general_profile_compatibility_flags = 0;
  for (let i = 0; i < 32; i++) {
    general_profile_compatibility_flags = general_profile_compatibility_flags << 1 | bitstream.readBits(1);
  }
  const general_constraint_indicator_flags = new Uint8Array(6);
  for (let i = 0; i < 6; i++) {
    general_constraint_indicator_flags[i] = bitstream.readBits(8);
  }
  const general_level_idc = bitstream.readBits(8);
  const sub_layer_profile_present_flag = [];
  const sub_layer_level_present_flag = [];
  for (let i = 0; i < maxNumSubLayersMinus1; i++) {
    sub_layer_profile_present_flag.push(bitstream.readBits(1));
    sub_layer_level_present_flag.push(bitstream.readBits(1));
  }
  if (maxNumSubLayersMinus1 > 0) {
    for (let i = maxNumSubLayersMinus1; i < 8; i++) {
      bitstream.skipBits(2);
    }
  }
  for (let i = 0; i < maxNumSubLayersMinus1; i++) {
    if (sub_layer_profile_present_flag[i])
      bitstream.skipBits(88);
    if (sub_layer_level_present_flag[i])
      bitstream.skipBits(8);
  }
  return {
    general_profile_space,
    general_tier_flag,
    general_profile_idc,
    general_profile_compatibility_flags,
    general_constraint_indicator_flags,
    general_level_idc
  };
};
var skipScalingListData = (bitstream) => {
  for (let sizeId = 0; sizeId < 4; sizeId++) {
    for (let matrixId = 0; matrixId < (sizeId === 3 ? 2 : 6); matrixId++) {
      const scaling_list_pred_mode_flag = bitstream.readBits(1);
      if (!scaling_list_pred_mode_flag) {
        readExpGolomb(bitstream);
      } else {
        const coefNum = Math.min(64, 1 << 4 + (sizeId << 1));
        if (sizeId > 1) {
          readSignedExpGolomb(bitstream);
        }
        for (let i = 0; i < coefNum; i++) {
          readSignedExpGolomb(bitstream);
        }
      }
    }
  }
};
var skipAllStRefPicSets = (bitstream, num_short_term_ref_pic_sets) => {
  const NumDeltaPocs = [];
  for (let stRpsIdx = 0; stRpsIdx < num_short_term_ref_pic_sets; stRpsIdx++) {
    NumDeltaPocs[stRpsIdx] = skipStRefPicSet(bitstream, stRpsIdx, num_short_term_ref_pic_sets, NumDeltaPocs);
  }
};
var skipStRefPicSet = (bitstream, stRpsIdx, num_short_term_ref_pic_sets, NumDeltaPocs) => {
  let NumDeltaPocsThis = 0;
  let inter_ref_pic_set_prediction_flag = 0;
  let RefRpsIdx = 0;
  if (stRpsIdx !== 0) {
    inter_ref_pic_set_prediction_flag = bitstream.readBits(1);
  }
  if (inter_ref_pic_set_prediction_flag) {
    if (stRpsIdx === num_short_term_ref_pic_sets) {
      const delta_idx_minus1 = readExpGolomb(bitstream);
      RefRpsIdx = stRpsIdx - (delta_idx_minus1 + 1);
    } else {
      RefRpsIdx = stRpsIdx - 1;
    }
    bitstream.readBits(1);
    readExpGolomb(bitstream);
    const numDelta = NumDeltaPocs[RefRpsIdx] ?? 0;
    for (let j = 0; j <= numDelta; j++) {
      const used_by_curr_pic_flag = bitstream.readBits(1);
      if (!used_by_curr_pic_flag) {
        bitstream.readBits(1);
      }
    }
    NumDeltaPocsThis = NumDeltaPocs[RefRpsIdx];
  } else {
    const num_negative_pics = readExpGolomb(bitstream);
    const num_positive_pics = readExpGolomb(bitstream);
    for (let i = 0; i < num_negative_pics; i++) {
      readExpGolomb(bitstream);
      bitstream.readBits(1);
    }
    for (let i = 0; i < num_positive_pics; i++) {
      readExpGolomb(bitstream);
      bitstream.readBits(1);
    }
    NumDeltaPocsThis = num_negative_pics + num_positive_pics;
  }
  return NumDeltaPocsThis;
};
var parseHevcVui = (bitstream, sps_max_sub_layers_minus1) => {
  let colourPrimaries = 2;
  let transferCharacteristics = 2;
  let matrixCoefficients = 2;
  let fullRangeFlag = 0;
  let minSpatialSegmentationIdc = 0;
  let pixelAspectRatio = { num: 1, den: 1 };
  if (bitstream.readBits(1)) {
    const aspect_ratio_idc = bitstream.readBits(8);
    if (aspect_ratio_idc === 255) {
      pixelAspectRatio = {
        num: bitstream.readBits(16),
        den: bitstream.readBits(16)
      };
    } else {
      const aspectRatio = AVC_HEVC_ASPECT_RATIO_IDC_TABLE[aspect_ratio_idc];
      if (aspectRatio) {
        pixelAspectRatio = aspectRatio;
      }
    }
  }
  if (bitstream.readBits(1)) {
    bitstream.readBits(1);
  }
  if (bitstream.readBits(1)) {
    bitstream.readBits(3);
    fullRangeFlag = bitstream.readBits(1);
    if (bitstream.readBits(1)) {
      colourPrimaries = bitstream.readBits(8);
      transferCharacteristics = bitstream.readBits(8);
      matrixCoefficients = bitstream.readBits(8);
    }
  }
  if (bitstream.readBits(1)) {
    readExpGolomb(bitstream);
    readExpGolomb(bitstream);
  }
  bitstream.readBits(1);
  bitstream.readBits(1);
  bitstream.readBits(1);
  if (bitstream.readBits(1)) {
    readExpGolomb(bitstream);
    readExpGolomb(bitstream);
    readExpGolomb(bitstream);
    readExpGolomb(bitstream);
  }
  if (bitstream.readBits(1)) {
    bitstream.readBits(32);
    bitstream.readBits(32);
    if (bitstream.readBits(1)) {
      readExpGolomb(bitstream);
    }
    if (bitstream.readBits(1)) {
      skipHevcHrdParameters(bitstream, true, sps_max_sub_layers_minus1);
    }
  }
  if (bitstream.readBits(1)) {
    bitstream.readBits(1);
    bitstream.readBits(1);
    bitstream.readBits(1);
    minSpatialSegmentationIdc = readExpGolomb(bitstream);
    readExpGolomb(bitstream);
    readExpGolomb(bitstream);
    readExpGolomb(bitstream);
    readExpGolomb(bitstream);
  }
  return {
    pixelAspectRatio,
    colourPrimaries,
    transferCharacteristics,
    matrixCoefficients,
    fullRangeFlag,
    minSpatialSegmentationIdc
  };
};
var skipHevcHrdParameters = (bitstream, commonInfPresentFlag, maxNumSubLayersMinus1) => {
  let nal_hrd_parameters_present_flag = false;
  let vcl_hrd_parameters_present_flag = false;
  let sub_pic_hrd_params_present_flag = false;
  if (commonInfPresentFlag) {
    nal_hrd_parameters_present_flag = bitstream.readBits(1) === 1;
    vcl_hrd_parameters_present_flag = bitstream.readBits(1) === 1;
    if (nal_hrd_parameters_present_flag || vcl_hrd_parameters_present_flag) {
      sub_pic_hrd_params_present_flag = bitstream.readBits(1) === 1;
      if (sub_pic_hrd_params_present_flag) {
        bitstream.readBits(8);
        bitstream.readBits(5);
        bitstream.readBits(1);
        bitstream.readBits(5);
      }
      bitstream.readBits(4);
      bitstream.readBits(4);
      if (sub_pic_hrd_params_present_flag) {
        bitstream.readBits(4);
      }
      bitstream.readBits(5);
      bitstream.readBits(5);
      bitstream.readBits(5);
    }
  }
  for (let i = 0; i <= maxNumSubLayersMinus1; i++) {
    const fixed_pic_rate_general_flag = bitstream.readBits(1) === 1;
    let fixed_pic_rate_within_cvs_flag = true;
    if (!fixed_pic_rate_general_flag) {
      fixed_pic_rate_within_cvs_flag = bitstream.readBits(1) === 1;
    }
    let low_delay_hrd_flag = false;
    if (fixed_pic_rate_within_cvs_flag) {
      readExpGolomb(bitstream);
    } else {
      low_delay_hrd_flag = bitstream.readBits(1) === 1;
    }
    let CpbCnt = 1;
    if (!low_delay_hrd_flag) {
      const cpb_cnt_minus1 = readExpGolomb(bitstream);
      CpbCnt = cpb_cnt_minus1 + 1;
    }
    if (nal_hrd_parameters_present_flag) {
      skipSubLayerHrdParameters(bitstream, CpbCnt, sub_pic_hrd_params_present_flag);
    }
    if (vcl_hrd_parameters_present_flag) {
      skipSubLayerHrdParameters(bitstream, CpbCnt, sub_pic_hrd_params_present_flag);
    }
  }
};
var skipSubLayerHrdParameters = (bitstream, CpbCnt, sub_pic_hrd_params_present_flag) => {
  for (let i = 0; i < CpbCnt; i++) {
    readExpGolomb(bitstream);
    readExpGolomb(bitstream);
    if (sub_pic_hrd_params_present_flag) {
      readExpGolomb(bitstream);
      readExpGolomb(bitstream);
    }
    bitstream.readBits(1);
  }
};
var serializeHevcDecoderConfigurationRecord = (record) => {
  const bytes2 = [];
  bytes2.push(record.configurationVersion);
  bytes2.push((record.generalProfileSpace & 3) << 6 | (record.generalTierFlag & 1) << 5 | record.generalProfileIdc & 31);
  bytes2.push(record.generalProfileCompatibilityFlags >>> 24 & 255);
  bytes2.push(record.generalProfileCompatibilityFlags >>> 16 & 255);
  bytes2.push(record.generalProfileCompatibilityFlags >>> 8 & 255);
  bytes2.push(record.generalProfileCompatibilityFlags & 255);
  bytes2.push(...record.generalConstraintIndicatorFlags);
  bytes2.push(record.generalLevelIdc & 255);
  bytes2.push(240 | record.minSpatialSegmentationIdc >> 8 & 15);
  bytes2.push(record.minSpatialSegmentationIdc & 255);
  bytes2.push(252 | record.parallelismType & 3);
  bytes2.push(252 | record.chromaFormatIdc & 3);
  bytes2.push(248 | record.bitDepthLumaMinus8 & 7);
  bytes2.push(248 | record.bitDepthChromaMinus8 & 7);
  bytes2.push(record.avgFrameRate >> 8 & 255);
  bytes2.push(record.avgFrameRate & 255);
  bytes2.push((record.constantFrameRate & 3) << 6 | (record.numTemporalLayers & 7) << 3 | (record.temporalIdNested & 1) << 2 | record.lengthSizeMinusOne & 3);
  bytes2.push(record.arrays.length & 255);
  for (const arr of record.arrays) {
    bytes2.push((arr.arrayCompleteness & 1) << 7 | 0 << 6 | arr.nalUnitType & 63);
    bytes2.push(arr.nalUnits.length >> 8 & 255);
    bytes2.push(arr.nalUnits.length & 255);
    for (const nal of arr.nalUnits) {
      bytes2.push(nal.length >> 8 & 255);
      bytes2.push(nal.length & 255);
      for (let i = 0; i < nal.length; i++) {
        bytes2.push(nal[i]);
      }
    }
  }
  return new Uint8Array(bytes2);
};
var parseOpusIdentificationHeader = (bytes2) => {
  const view2 = toDataView(bytes2);
  const outputChannelCount = view2.getUint8(9);
  const preSkip = view2.getUint16(10, true);
  const inputSampleRate = view2.getUint32(12, true);
  const outputGain = view2.getInt16(16, true);
  const channelMappingFamily = view2.getUint8(18);
  let channelMappingTable = null;
  if (channelMappingFamily) {
    channelMappingTable = bytes2.subarray(19, 19 + 2 + outputChannelCount);
  }
  return {
    outputChannelCount,
    preSkip,
    inputSampleRate,
    outputGain,
    channelMappingFamily,
    channelMappingTable
  };
};
var FlacBlockType;
(function(FlacBlockType2) {
  FlacBlockType2[FlacBlockType2["STREAMINFO"] = 0] = "STREAMINFO";
  FlacBlockType2[FlacBlockType2["VORBIS_COMMENT"] = 4] = "VORBIS_COMMENT";
  FlacBlockType2[FlacBlockType2["PICTURE"] = 6] = "PICTURE";
})(FlacBlockType || (FlacBlockType = {}));
var parseAc3SyncFrame = (data) => {
  if (data.length < 7) {
    return null;
  }
  if (data[0] !== 11 || data[1] !== 119) {
    return null;
  }
  const bitstream = new Bitstream(data);
  bitstream.skipBits(16);
  bitstream.skipBits(16);
  const fscod = bitstream.readBits(2);
  if (fscod === 3) {
    return null;
  }
  const frmsizecod = bitstream.readBits(6);
  const bsid = bitstream.readBits(5);
  if (bsid > 8) {
    return null;
  }
  const bsmod = bitstream.readBits(3);
  const acmod = bitstream.readBits(3);
  if ((acmod & 1) !== 0 && acmod !== 1) {
    bitstream.skipBits(2);
  }
  if ((acmod & 4) !== 0) {
    bitstream.skipBits(2);
  }
  if (acmod === 2) {
    bitstream.skipBits(2);
  }
  const lfeon = bitstream.readBits(1);
  const bitRateCode = Math.floor(frmsizecod / 2);
  return { fscod, bsid, bsmod, acmod, lfeon, bitRateCode };
};
var AC3_FRAME_SIZES = [
  // frmsizecod, [48kHz, 44.1kHz, 32kHz] in bytes
  64 * 2,
  69 * 2,
  96 * 2,
  64 * 2,
  70 * 2,
  96 * 2,
  80 * 2,
  87 * 2,
  120 * 2,
  80 * 2,
  88 * 2,
  120 * 2,
  96 * 2,
  104 * 2,
  144 * 2,
  96 * 2,
  105 * 2,
  144 * 2,
  112 * 2,
  121 * 2,
  168 * 2,
  112 * 2,
  122 * 2,
  168 * 2,
  128 * 2,
  139 * 2,
  192 * 2,
  128 * 2,
  140 * 2,
  192 * 2,
  160 * 2,
  174 * 2,
  240 * 2,
  160 * 2,
  175 * 2,
  240 * 2,
  192 * 2,
  208 * 2,
  288 * 2,
  192 * 2,
  209 * 2,
  288 * 2,
  224 * 2,
  243 * 2,
  336 * 2,
  224 * 2,
  244 * 2,
  336 * 2,
  256 * 2,
  278 * 2,
  384 * 2,
  256 * 2,
  279 * 2,
  384 * 2,
  320 * 2,
  348 * 2,
  480 * 2,
  320 * 2,
  349 * 2,
  480 * 2,
  384 * 2,
  417 * 2,
  576 * 2,
  384 * 2,
  418 * 2,
  576 * 2,
  448 * 2,
  487 * 2,
  672 * 2,
  448 * 2,
  488 * 2,
  672 * 2,
  512 * 2,
  557 * 2,
  768 * 2,
  512 * 2,
  558 * 2,
  768 * 2,
  640 * 2,
  696 * 2,
  960 * 2,
  640 * 2,
  697 * 2,
  960 * 2,
  768 * 2,
  835 * 2,
  1152 * 2,
  768 * 2,
  836 * 2,
  1152 * 2,
  896 * 2,
  975 * 2,
  1344 * 2,
  896 * 2,
  976 * 2,
  1344 * 2,
  1024 * 2,
  1114 * 2,
  1536 * 2,
  1024 * 2,
  1115 * 2,
  1536 * 2,
  1152 * 2,
  1253 * 2,
  1728 * 2,
  1152 * 2,
  1254 * 2,
  1728 * 2,
  1280 * 2,
  1393 * 2,
  1920 * 2,
  1280 * 2,
  1394 * 2,
  1920 * 2
];
var AC3_REGISTRATION_DESCRIPTOR = new Uint8Array([5, 4, 65, 67, 45, 51]);
var EAC3_REGISTRATION_DESCRIPTOR = new Uint8Array([5, 4, 69, 65, 67, 51]);
var EAC3_NUMBLKS_TABLE = [1, 2, 3, 6];
var parseEac3SyncFrame = (data) => {
  if (data.length < 6) {
    return null;
  }
  if (data[0] !== 11 || data[1] !== 119) {
    return null;
  }
  const bitstream = new Bitstream(data);
  bitstream.skipBits(16);
  const strmtyp = bitstream.readBits(2);
  bitstream.skipBits(3);
  if (strmtyp !== 0 && strmtyp !== 2) {
    return null;
  }
  const frmsiz = bitstream.readBits(11);
  const fscod = bitstream.readBits(2);
  let fscod2 = 0;
  let numblkscod;
  if (fscod === 3) {
    fscod2 = bitstream.readBits(2);
    numblkscod = 3;
  } else {
    numblkscod = bitstream.readBits(2);
  }
  const acmod = bitstream.readBits(3);
  const lfeon = bitstream.readBits(1);
  const bsid = bitstream.readBits(5);
  if (bsid < 11 || bsid > 16) {
    return null;
  }
  const numblks = EAC3_NUMBLKS_TABLE[numblkscod];
  let fs;
  if (fscod < 3) {
    fs = AC3_SAMPLE_RATES[fscod] / 1e3;
  } else {
    fs = EAC3_REDUCED_SAMPLE_RATES[fscod2] / 1e3;
  }
  const dataRate = Math.round((frmsiz + 1) * fs / (numblks * 16));
  const bsmod = 0;
  const numDepSub = 0;
  const chanLoc = 0;
  const substream = {
    fscod,
    fscod2,
    bsid,
    bsmod,
    acmod,
    lfeon,
    numDepSub,
    chanLoc
  };
  return {
    dataRate,
    substreams: [substream]
  };
};

// node_modules/mediabunny/dist/modules/src/packet.js
var PLACEHOLDER_DATA = /* @__PURE__ */ new Uint8Array(0);
var EncodedPacket = class _EncodedPacket {
  /** Creates a new {@link EncodedPacket} from raw bytes and timing information. */
  constructor(data, type, timestamp, duration, sequenceNumber = -1, byteLength, sideData) {
    this.data = data;
    this.type = type;
    this.timestamp = timestamp;
    this.duration = duration;
    this.sequenceNumber = sequenceNumber;
    if (data === PLACEHOLDER_DATA && byteLength === void 0) {
      throw new Error("Internal error: byteLength must be explicitly provided when constructing metadata-only packets.");
    }
    if (byteLength === void 0) {
      byteLength = data.byteLength;
    }
    if (!(data instanceof Uint8Array)) {
      throw new TypeError("data must be a Uint8Array.");
    }
    if (type !== "key" && type !== "delta") {
      throw new TypeError('type must be either "key" or "delta".');
    }
    if (!Number.isFinite(timestamp)) {
      throw new TypeError("timestamp must be a number.");
    }
    if (!Number.isFinite(duration) || duration < 0) {
      throw new TypeError("duration must be a non-negative number.");
    }
    if (!Number.isFinite(sequenceNumber)) {
      throw new TypeError("sequenceNumber must be a number.");
    }
    if (!Number.isInteger(byteLength) || byteLength < 0) {
      throw new TypeError("byteLength must be a non-negative integer.");
    }
    if (sideData !== void 0 && (typeof sideData !== "object" || !sideData)) {
      throw new TypeError("sideData, when provided, must be an object.");
    }
    if (sideData?.alpha !== void 0 && !(sideData.alpha instanceof Uint8Array)) {
      throw new TypeError("sideData.alpha, when provided, must be a Uint8Array.");
    }
    if (sideData?.alphaByteLength !== void 0 && (!Number.isInteger(sideData.alphaByteLength) || sideData.alphaByteLength < 0)) {
      throw new TypeError("sideData.alphaByteLength, when provided, must be a non-negative integer.");
    }
    this.byteLength = byteLength;
    this.sideData = sideData ?? {};
    if (this.sideData.alpha && this.sideData.alphaByteLength === void 0) {
      this.sideData.alphaByteLength = this.sideData.alpha.byteLength;
    }
  }
  /**
   * If this packet is a metadata-only packet. Metadata-only packets don't contain their packet data. They are the
   * result of retrieving packets with {@link PacketRetrievalOptions.metadataOnly} set to `true`.
   */
  get isMetadataOnly() {
    return this.data === PLACEHOLDER_DATA;
  }
  /** The timestamp of this packet in microseconds. */
  get microsecondTimestamp() {
    return Math.trunc(SECOND_TO_MICROSECOND_FACTOR * this.timestamp);
  }
  /** The duration of this packet in microseconds. */
  get microsecondDuration() {
    return Math.trunc(SECOND_TO_MICROSECOND_FACTOR * this.duration);
  }
  /** Converts this packet to an
   * [`EncodedVideoChunk`](https://developer.mozilla.org/en-US/docs/Web/API/EncodedVideoChunk) for use with the
   * WebCodecs API. */
  toEncodedVideoChunk() {
    if (this.isMetadataOnly) {
      throw new TypeError("Metadata-only packets cannot be converted to a video chunk.");
    }
    if (typeof EncodedVideoChunk === "undefined") {
      throw new Error("Your browser does not support EncodedVideoChunk.");
    }
    return new EncodedVideoChunk({
      data: this.data,
      type: this.type,
      timestamp: this.microsecondTimestamp,
      duration: this.microsecondDuration
    });
  }
  /**
   * Converts this packet to an
   * [`EncodedVideoChunk`](https://developer.mozilla.org/en-US/docs/Web/API/EncodedVideoChunk) for use with the
   * WebCodecs API, using the alpha side data instead of the color data. Throws if no alpha side data is defined.
   */
  alphaToEncodedVideoChunk(type = this.type) {
    if (!this.sideData.alpha) {
      throw new TypeError("This packet does not contain alpha side data.");
    }
    if (this.isMetadataOnly) {
      throw new TypeError("Metadata-only packets cannot be converted to a video chunk.");
    }
    if (typeof EncodedVideoChunk === "undefined") {
      throw new Error("Your browser does not support EncodedVideoChunk.");
    }
    return new EncodedVideoChunk({
      data: this.sideData.alpha,
      type,
      timestamp: this.microsecondTimestamp,
      duration: this.microsecondDuration
    });
  }
  /** Converts this packet to an
   * [`EncodedAudioChunk`](https://developer.mozilla.org/en-US/docs/Web/API/EncodedAudioChunk) for use with the
   * WebCodecs API. */
  toEncodedAudioChunk() {
    if (this.isMetadataOnly) {
      throw new TypeError("Metadata-only packets cannot be converted to an audio chunk.");
    }
    if (typeof EncodedAudioChunk === "undefined") {
      throw new Error("Your browser does not support EncodedAudioChunk.");
    }
    return new EncodedAudioChunk({
      data: this.data,
      type: this.type,
      timestamp: this.microsecondTimestamp,
      duration: this.microsecondDuration
    });
  }
  /**
   * Creates an {@link EncodedPacket} from an
   * [`EncodedVideoChunk`](https://developer.mozilla.org/en-US/docs/Web/API/EncodedVideoChunk) or
   * [`EncodedAudioChunk`](https://developer.mozilla.org/en-US/docs/Web/API/EncodedAudioChunk). This method is useful
   * for converting chunks from the WebCodecs API to `EncodedPacket` instances.
   */
  static fromEncodedChunk(chunk, sideData) {
    if (!(chunk instanceof EncodedVideoChunk || chunk instanceof EncodedAudioChunk)) {
      throw new TypeError("chunk must be an EncodedVideoChunk or EncodedAudioChunk.");
    }
    const data = new Uint8Array(chunk.byteLength);
    chunk.copyTo(data);
    return new _EncodedPacket(data, chunk.type, chunk.timestamp / 1e6, (chunk.duration ?? 0) / 1e6, void 0, void 0, sideData);
  }
  /** Clones this packet while optionally modifying the new packet's data. */
  clone(options) {
    if (options !== void 0 && (typeof options !== "object" || options === null)) {
      throw new TypeError("options, when provided, must be an object.");
    }
    if (options?.data !== void 0 && !(options.data instanceof Uint8Array)) {
      throw new TypeError("options.data, when provided, must be a Uint8Array.");
    }
    if (options?.type !== void 0 && options.type !== "key" && options.type !== "delta") {
      throw new TypeError('options.type, when provided, must be either "key" or "delta".');
    }
    if (options?.timestamp !== void 0 && !Number.isFinite(options.timestamp)) {
      throw new TypeError("options.timestamp, when provided, must be a number.");
    }
    if (options?.duration !== void 0 && !Number.isFinite(options.duration)) {
      throw new TypeError("options.duration, when provided, must be a number.");
    }
    if (options?.sequenceNumber !== void 0 && !Number.isFinite(options.sequenceNumber)) {
      throw new TypeError("options.sequenceNumber, when provided, must be a number.");
    }
    if (options?.sideData !== void 0 && (typeof options.sideData !== "object" || options.sideData === null)) {
      throw new TypeError("options.sideData, when provided, must be an object.");
    }
    return new _EncodedPacket(options?.data ?? this.data, options?.type ?? this.type, options?.timestamp ?? this.timestamp, options?.duration ?? this.duration, options?.sequenceNumber ?? this.sequenceNumber, this.byteLength, options?.sideData ?? this.sideData);
  }
};

// node_modules/mediabunny/dist/modules/src/isobmff/isobmff-misc.js
var buildIsobmffMimeType = (info) => {
  const base = info.hasVideo ? "video/" : info.hasAudio ? "audio/" : "application/";
  let string = base + (info.isQuickTime ? "quicktime" : "mp4");
  if (info.codecStrings.length > 0) {
    const uniqueCodecMimeTypes = [...new Set(info.codecStrings)];
    string += `; codecs="${uniqueCodecMimeTypes.join(", ")}"`;
  }
  return string;
};

// node_modules/mediabunny/dist/modules/src/isobmff/isobmff-reader.js
var MIN_BOX_HEADER_SIZE = 8;
var MAX_BOX_HEADER_SIZE = 16;

// node_modules/mediabunny/dist/modules/src/matroska/ebml.js
var EBMLFloat32 = class {
  constructor(value) {
    this.value = value;
  }
};
var EBMLFloat64 = class {
  constructor(value) {
    this.value = value;
  }
};
var EBMLSignedInt = class {
  constructor(value) {
    this.value = value;
  }
};
var EBMLUnicodeString = class {
  constructor(value) {
    this.value = value;
  }
};
var EBMLId;
(function(EBMLId2) {
  EBMLId2[EBMLId2["EBML"] = 440786851] = "EBML";
  EBMLId2[EBMLId2["EBMLVersion"] = 17030] = "EBMLVersion";
  EBMLId2[EBMLId2["EBMLReadVersion"] = 17143] = "EBMLReadVersion";
  EBMLId2[EBMLId2["EBMLMaxIDLength"] = 17138] = "EBMLMaxIDLength";
  EBMLId2[EBMLId2["EBMLMaxSizeLength"] = 17139] = "EBMLMaxSizeLength";
  EBMLId2[EBMLId2["DocType"] = 17026] = "DocType";
  EBMLId2[EBMLId2["DocTypeVersion"] = 17031] = "DocTypeVersion";
  EBMLId2[EBMLId2["DocTypeReadVersion"] = 17029] = "DocTypeReadVersion";
  EBMLId2[EBMLId2["Void"] = 236] = "Void";
  EBMLId2[EBMLId2["Segment"] = 408125543] = "Segment";
  EBMLId2[EBMLId2["SeekHead"] = 290298740] = "SeekHead";
  EBMLId2[EBMLId2["Seek"] = 19899] = "Seek";
  EBMLId2[EBMLId2["SeekID"] = 21419] = "SeekID";
  EBMLId2[EBMLId2["SeekPosition"] = 21420] = "SeekPosition";
  EBMLId2[EBMLId2["Duration"] = 17545] = "Duration";
  EBMLId2[EBMLId2["Info"] = 357149030] = "Info";
  EBMLId2[EBMLId2["TimestampScale"] = 2807729] = "TimestampScale";
  EBMLId2[EBMLId2["MuxingApp"] = 19840] = "MuxingApp";
  EBMLId2[EBMLId2["WritingApp"] = 22337] = "WritingApp";
  EBMLId2[EBMLId2["Tracks"] = 374648427] = "Tracks";
  EBMLId2[EBMLId2["TrackEntry"] = 174] = "TrackEntry";
  EBMLId2[EBMLId2["TrackNumber"] = 215] = "TrackNumber";
  EBMLId2[EBMLId2["TrackUID"] = 29637] = "TrackUID";
  EBMLId2[EBMLId2["TrackType"] = 131] = "TrackType";
  EBMLId2[EBMLId2["FlagEnabled"] = 185] = "FlagEnabled";
  EBMLId2[EBMLId2["FlagDefault"] = 136] = "FlagDefault";
  EBMLId2[EBMLId2["FlagForced"] = 21930] = "FlagForced";
  EBMLId2[EBMLId2["FlagOriginal"] = 21934] = "FlagOriginal";
  EBMLId2[EBMLId2["FlagHearingImpaired"] = 21931] = "FlagHearingImpaired";
  EBMLId2[EBMLId2["FlagVisualImpaired"] = 21932] = "FlagVisualImpaired";
  EBMLId2[EBMLId2["FlagCommentary"] = 21935] = "FlagCommentary";
  EBMLId2[EBMLId2["FlagLacing"] = 156] = "FlagLacing";
  EBMLId2[EBMLId2["Name"] = 21358] = "Name";
  EBMLId2[EBMLId2["Language"] = 2274716] = "Language";
  EBMLId2[EBMLId2["LanguageBCP47"] = 2274717] = "LanguageBCP47";
  EBMLId2[EBMLId2["CodecID"] = 134] = "CodecID";
  EBMLId2[EBMLId2["CodecPrivate"] = 25506] = "CodecPrivate";
  EBMLId2[EBMLId2["CodecDelay"] = 22186] = "CodecDelay";
  EBMLId2[EBMLId2["SeekPreRoll"] = 22203] = "SeekPreRoll";
  EBMLId2[EBMLId2["DefaultDuration"] = 2352003] = "DefaultDuration";
  EBMLId2[EBMLId2["Video"] = 224] = "Video";
  EBMLId2[EBMLId2["PixelWidth"] = 176] = "PixelWidth";
  EBMLId2[EBMLId2["PixelHeight"] = 186] = "PixelHeight";
  EBMLId2[EBMLId2["DisplayWidth"] = 21680] = "DisplayWidth";
  EBMLId2[EBMLId2["DisplayHeight"] = 21690] = "DisplayHeight";
  EBMLId2[EBMLId2["DisplayUnit"] = 21682] = "DisplayUnit";
  EBMLId2[EBMLId2["AlphaMode"] = 21440] = "AlphaMode";
  EBMLId2[EBMLId2["Audio"] = 225] = "Audio";
  EBMLId2[EBMLId2["SamplingFrequency"] = 181] = "SamplingFrequency";
  EBMLId2[EBMLId2["Channels"] = 159] = "Channels";
  EBMLId2[EBMLId2["BitDepth"] = 25188] = "BitDepth";
  EBMLId2[EBMLId2["SimpleBlock"] = 163] = "SimpleBlock";
  EBMLId2[EBMLId2["BlockGroup"] = 160] = "BlockGroup";
  EBMLId2[EBMLId2["Block"] = 161] = "Block";
  EBMLId2[EBMLId2["BlockAdditions"] = 30113] = "BlockAdditions";
  EBMLId2[EBMLId2["BlockMore"] = 166] = "BlockMore";
  EBMLId2[EBMLId2["BlockAdditional"] = 165] = "BlockAdditional";
  EBMLId2[EBMLId2["BlockAddID"] = 238] = "BlockAddID";
  EBMLId2[EBMLId2["BlockDuration"] = 155] = "BlockDuration";
  EBMLId2[EBMLId2["ReferenceBlock"] = 251] = "ReferenceBlock";
  EBMLId2[EBMLId2["Cluster"] = 524531317] = "Cluster";
  EBMLId2[EBMLId2["Timestamp"] = 231] = "Timestamp";
  EBMLId2[EBMLId2["Cues"] = 475249515] = "Cues";
  EBMLId2[EBMLId2["CuePoint"] = 187] = "CuePoint";
  EBMLId2[EBMLId2["CueTime"] = 179] = "CueTime";
  EBMLId2[EBMLId2["CueTrackPositions"] = 183] = "CueTrackPositions";
  EBMLId2[EBMLId2["CueTrack"] = 247] = "CueTrack";
  EBMLId2[EBMLId2["CueClusterPosition"] = 241] = "CueClusterPosition";
  EBMLId2[EBMLId2["Colour"] = 21936] = "Colour";
  EBMLId2[EBMLId2["MatrixCoefficients"] = 21937] = "MatrixCoefficients";
  EBMLId2[EBMLId2["TransferCharacteristics"] = 21946] = "TransferCharacteristics";
  EBMLId2[EBMLId2["Primaries"] = 21947] = "Primaries";
  EBMLId2[EBMLId2["Range"] = 21945] = "Range";
  EBMLId2[EBMLId2["Projection"] = 30320] = "Projection";
  EBMLId2[EBMLId2["ProjectionType"] = 30321] = "ProjectionType";
  EBMLId2[EBMLId2["ProjectionPoseRoll"] = 30325] = "ProjectionPoseRoll";
  EBMLId2[EBMLId2["Attachments"] = 423732329] = "Attachments";
  EBMLId2[EBMLId2["AttachedFile"] = 24999] = "AttachedFile";
  EBMLId2[EBMLId2["FileDescription"] = 18046] = "FileDescription";
  EBMLId2[EBMLId2["FileName"] = 18030] = "FileName";
  EBMLId2[EBMLId2["FileMediaType"] = 18016] = "FileMediaType";
  EBMLId2[EBMLId2["FileData"] = 18012] = "FileData";
  EBMLId2[EBMLId2["FileUID"] = 18094] = "FileUID";
  EBMLId2[EBMLId2["Chapters"] = 272869232] = "Chapters";
  EBMLId2[EBMLId2["Tags"] = 307544935] = "Tags";
  EBMLId2[EBMLId2["Tag"] = 29555] = "Tag";
  EBMLId2[EBMLId2["Targets"] = 25536] = "Targets";
  EBMLId2[EBMLId2["TargetTypeValue"] = 26826] = "TargetTypeValue";
  EBMLId2[EBMLId2["TargetType"] = 25546] = "TargetType";
  EBMLId2[EBMLId2["TagTrackUID"] = 25541] = "TagTrackUID";
  EBMLId2[EBMLId2["TagEditionUID"] = 25545] = "TagEditionUID";
  EBMLId2[EBMLId2["TagChapterUID"] = 25540] = "TagChapterUID";
  EBMLId2[EBMLId2["TagAttachmentUID"] = 25542] = "TagAttachmentUID";
  EBMLId2[EBMLId2["SimpleTag"] = 26568] = "SimpleTag";
  EBMLId2[EBMLId2["TagName"] = 17827] = "TagName";
  EBMLId2[EBMLId2["TagLanguage"] = 17530] = "TagLanguage";
  EBMLId2[EBMLId2["TagString"] = 17543] = "TagString";
  EBMLId2[EBMLId2["TagBinary"] = 17541] = "TagBinary";
  EBMLId2[EBMLId2["ContentEncodings"] = 28032] = "ContentEncodings";
  EBMLId2[EBMLId2["ContentEncoding"] = 25152] = "ContentEncoding";
  EBMLId2[EBMLId2["ContentEncodingOrder"] = 20529] = "ContentEncodingOrder";
  EBMLId2[EBMLId2["ContentEncodingScope"] = 20530] = "ContentEncodingScope";
  EBMLId2[EBMLId2["ContentCompression"] = 20532] = "ContentCompression";
  EBMLId2[EBMLId2["ContentCompAlgo"] = 16980] = "ContentCompAlgo";
  EBMLId2[EBMLId2["ContentCompSettings"] = 16981] = "ContentCompSettings";
  EBMLId2[EBMLId2["ContentEncryption"] = 20533] = "ContentEncryption";
})(EBMLId || (EBMLId = {}));
var LEVEL_0_EBML_IDS = [
  EBMLId.EBML,
  EBMLId.Segment
];
var LEVEL_1_EBML_IDS = [
  EBMLId.SeekHead,
  EBMLId.Info,
  EBMLId.Cluster,
  EBMLId.Tracks,
  EBMLId.Cues,
  EBMLId.Attachments,
  EBMLId.Chapters,
  EBMLId.Tags
];
var LEVEL_0_AND_1_EBML_IDS = [
  ...LEVEL_0_EBML_IDS,
  ...LEVEL_1_EBML_IDS
];
var measureUnsignedInt = (value) => {
  if (value < 1 << 8) {
    return 1;
  } else if (value < 1 << 16) {
    return 2;
  } else if (value < 1 << 24) {
    return 3;
  } else if (value < 2 ** 32) {
    return 4;
  } else if (value < 2 ** 40) {
    return 5;
  } else {
    return 6;
  }
};
var measureUnsignedBigInt = (value) => {
  if (value < 1n << 8n) {
    return 1;
  } else if (value < 1n << 16n) {
    return 2;
  } else if (value < 1n << 24n) {
    return 3;
  } else if (value < 1n << 32n) {
    return 4;
  } else if (value < 1n << 40n) {
    return 5;
  } else if (value < 1n << 48n) {
    return 6;
  } else if (value < 1n << 56n) {
    return 7;
  } else {
    return 8;
  }
};
var measureSignedInt = (value) => {
  if (value >= -(1 << 6) && value < 1 << 6) {
    return 1;
  } else if (value >= -(1 << 13) && value < 1 << 13) {
    return 2;
  } else if (value >= -(1 << 20) && value < 1 << 20) {
    return 3;
  } else if (value >= -(1 << 27) && value < 1 << 27) {
    return 4;
  } else if (value >= -(2 ** 34) && value < 2 ** 34) {
    return 5;
  } else {
    return 6;
  }
};
var measureVarInt = (value) => {
  if (value < (1 << 7) - 1) {
    return 1;
  } else if (value < (1 << 14) - 1) {
    return 2;
  } else if (value < (1 << 21) - 1) {
    return 3;
  } else if (value < (1 << 28) - 1) {
    return 4;
  } else if (value < 2 ** 35 - 1) {
    return 5;
  } else if (value < 2 ** 42 - 1) {
    return 6;
  } else {
    throw new Error("EBML varint size not supported " + value);
  }
};
var EBMLWriter = class {
  constructor(writer) {
    this.writer = writer;
    this.helper = new Uint8Array(8);
    this.helperView = new DataView(this.helper.buffer);
    this.offsets = /* @__PURE__ */ new WeakMap();
    this.dataOffsets = /* @__PURE__ */ new WeakMap();
  }
  writeByte(value) {
    this.helperView.setUint8(0, value);
    this.writer.write(this.helper.subarray(0, 1));
  }
  writeFloat32(value) {
    this.helperView.setFloat32(0, value, false);
    this.writer.write(this.helper.subarray(0, 4));
  }
  writeFloat64(value) {
    this.helperView.setFloat64(0, value, false);
    this.writer.write(this.helper);
  }
  writeUnsignedInt(value, width = measureUnsignedInt(value)) {
    let pos = 0;
    switch (width) {
      case 6:
        this.helperView.setUint8(pos++, value / 2 ** 40 | 0);
      // eslint-disable-next-line no-fallthrough
      case 5:
        this.helperView.setUint8(pos++, value / 2 ** 32 | 0);
      // eslint-disable-next-line no-fallthrough
      case 4:
        this.helperView.setUint8(pos++, value >> 24);
      // eslint-disable-next-line no-fallthrough
      case 3:
        this.helperView.setUint8(pos++, value >> 16);
      // eslint-disable-next-line no-fallthrough
      case 2:
        this.helperView.setUint8(pos++, value >> 8);
      // eslint-disable-next-line no-fallthrough
      case 1:
        this.helperView.setUint8(pos++, value);
        break;
      default:
        throw new Error("Bad unsigned int size " + width);
    }
    this.writer.write(this.helper.subarray(0, pos));
  }
  writeUnsignedBigInt(value, width = measureUnsignedBigInt(value)) {
    let pos = 0;
    for (let i = width - 1; i >= 0; i--) {
      this.helperView.setUint8(pos++, Number(value >> BigInt(i * 8) & 0xffn));
    }
    this.writer.write(this.helper.subarray(0, pos));
  }
  writeSignedInt(value, width = measureSignedInt(value)) {
    if (value < 0) {
      value += 2 ** (width * 8);
    }
    this.writeUnsignedInt(value, width);
  }
  writeVarInt(value, width = measureVarInt(value)) {
    let pos = 0;
    switch (width) {
      case 1:
        this.helperView.setUint8(pos++, 1 << 7 | value);
        break;
      case 2:
        this.helperView.setUint8(pos++, 1 << 6 | value >> 8);
        this.helperView.setUint8(pos++, value);
        break;
      case 3:
        this.helperView.setUint8(pos++, 1 << 5 | value >> 16);
        this.helperView.setUint8(pos++, value >> 8);
        this.helperView.setUint8(pos++, value);
        break;
      case 4:
        this.helperView.setUint8(pos++, 1 << 4 | value >> 24);
        this.helperView.setUint8(pos++, value >> 16);
        this.helperView.setUint8(pos++, value >> 8);
        this.helperView.setUint8(pos++, value);
        break;
      case 5:
        this.helperView.setUint8(pos++, 1 << 3 | value / 2 ** 32 & 7);
        this.helperView.setUint8(pos++, value >> 24);
        this.helperView.setUint8(pos++, value >> 16);
        this.helperView.setUint8(pos++, value >> 8);
        this.helperView.setUint8(pos++, value);
        break;
      case 6:
        this.helperView.setUint8(pos++, 1 << 2 | value / 2 ** 40 & 3);
        this.helperView.setUint8(pos++, value / 2 ** 32 | 0);
        this.helperView.setUint8(pos++, value >> 24);
        this.helperView.setUint8(pos++, value >> 16);
        this.helperView.setUint8(pos++, value >> 8);
        this.helperView.setUint8(pos++, value);
        break;
      default:
        throw new Error("Bad EBML varint size " + width);
    }
    this.writer.write(this.helper.subarray(0, pos));
  }
  writeAsciiString(str) {
    this.writer.write(new Uint8Array(str.split("").map((x) => x.charCodeAt(0))));
  }
  writeEBML(data) {
    if (data === null)
      return;
    if (data instanceof Uint8Array) {
      this.writer.write(data);
    } else if (Array.isArray(data)) {
      for (const elem of data) {
        this.writeEBML(elem);
      }
    } else {
      this.offsets.set(data, this.writer.getPos());
      this.writeUnsignedInt(data.id);
      if (Array.isArray(data.data)) {
        const sizePos = this.writer.getPos();
        const sizeSize = data.size === -1 ? 1 : data.size ?? 4;
        if (data.size === -1) {
          this.writeByte(255);
        } else {
          this.writer.seek(this.writer.getPos() + sizeSize);
        }
        const startPos = this.writer.getPos();
        this.dataOffsets.set(data, startPos);
        this.writeEBML(data.data);
        if (data.size !== -1) {
          const size = this.writer.getPos() - startPos;
          const endPos = this.writer.getPos();
          this.writer.seek(sizePos);
          this.writeVarInt(size, sizeSize);
          this.writer.seek(endPos);
        }
      } else if (typeof data.data === "number") {
        const size = data.size ?? measureUnsignedInt(data.data);
        this.writeVarInt(size);
        this.writeUnsignedInt(data.data, size);
      } else if (typeof data.data === "bigint") {
        const size = data.size ?? measureUnsignedBigInt(data.data);
        this.writeVarInt(size);
        this.writeUnsignedBigInt(data.data, size);
      } else if (typeof data.data === "string") {
        this.writeVarInt(data.data.length);
        this.writeAsciiString(data.data);
      } else if (data.data instanceof Uint8Array) {
        this.writeVarInt(data.data.byteLength, data.size);
        this.writer.write(data.data);
      } else if (data.data instanceof EBMLFloat32) {
        this.writeVarInt(4);
        this.writeFloat32(data.data.value);
      } else if (data.data instanceof EBMLFloat64) {
        this.writeVarInt(8);
        this.writeFloat64(data.data.value);
      } else if (data.data instanceof EBMLSignedInt) {
        const size = data.size ?? measureSignedInt(data.data.value);
        this.writeVarInt(size);
        this.writeSignedInt(data.data.value, size);
      } else if (data.data instanceof EBMLUnicodeString) {
        const bytes2 = textEncoder.encode(data.data.value);
        this.writeVarInt(bytes2.length);
        this.writer.write(bytes2);
      } else {
        assertNever(data.data);
      }
    }
  }
};
var MAX_VAR_INT_SIZE = 8;
var MAX_HEADER_SIZE = 2 * MAX_VAR_INT_SIZE;
var CODEC_STRING_MAP = {
  "avc": "V_MPEG4/ISO/AVC",
  "hevc": "V_MPEGH/ISO/HEVC",
  "vp8": "V_VP8",
  "vp9": "V_VP9",
  "av1": "V_AV1",
  "aac": "A_AAC",
  "mp3": "A_MPEG/L3",
  "opus": "A_OPUS",
  "vorbis": "A_VORBIS",
  "flac": "A_FLAC",
  "ac3": "A_AC3",
  "eac3": "A_EAC3",
  "pcm-u8": "A_PCM/INT/LIT",
  "pcm-s16": "A_PCM/INT/LIT",
  "pcm-s16be": "A_PCM/INT/BIG",
  "pcm-s24": "A_PCM/INT/LIT",
  "pcm-s24be": "A_PCM/INT/BIG",
  "pcm-s32": "A_PCM/INT/LIT",
  "pcm-s32be": "A_PCM/INT/BIG",
  "pcm-f32": "A_PCM/FLOAT/IEEE",
  "pcm-f64": "A_PCM/FLOAT/IEEE",
  "webvtt": "S_TEXT/WEBVTT"
};

// node_modules/mediabunny/dist/modules/src/matroska/matroska-misc.js
var buildMatroskaMimeType = (info) => {
  const base = info.hasVideo ? "video/" : info.hasAudio ? "audio/" : "application/";
  let string = base + (info.isWebM ? "webm" : "x-matroska");
  if (info.codecStrings.length > 0) {
    const uniqueCodecMimeTypes = [...new Set(info.codecStrings.filter(Boolean))];
    string += `; codecs="${uniqueCodecMimeTypes.join(", ")}"`;
  }
  return string;
};

// node_modules/mediabunny/dist/modules/src/adts/adts-reader.js
var MIN_ADTS_FRAME_HEADER_SIZE = 7;
var MAX_ADTS_FRAME_HEADER_SIZE = 9;
var readAdtsFrameHeader = (slice) => {
  const startPos = slice.filePos;
  const bytes2 = readBytes(slice, 9);
  const bitstream = new Bitstream(bytes2);
  const syncword = bitstream.readBits(12);
  if (syncword !== 4095) {
    return null;
  }
  bitstream.skipBits(1);
  const layer = bitstream.readBits(2);
  if (layer !== 0) {
    return null;
  }
  const protectionAbsence = bitstream.readBits(1);
  const objectType = bitstream.readBits(2) + 1;
  const samplingFrequencyIndex = bitstream.readBits(4);
  if (samplingFrequencyIndex === 15) {
    return null;
  }
  bitstream.skipBits(1);
  const channelConfiguration = bitstream.readBits(3);
  if (channelConfiguration === 0) {
    throw new Error("ADTS frames with channel configuration 0 are not supported.");
  }
  bitstream.skipBits(1);
  bitstream.skipBits(1);
  bitstream.skipBits(1);
  bitstream.skipBits(1);
  const frameLength = bitstream.readBits(13);
  bitstream.skipBits(11);
  const numberOfAacFrames = bitstream.readBits(2) + 1;
  if (numberOfAacFrames !== 1) {
    throw new Error("ADTS frames with more than one AAC frame are not supported.");
  }
  let crcCheck = null;
  if (protectionAbsence === 1) {
    slice.filePos -= 2;
  } else {
    crcCheck = bitstream.readBits(16);
  }
  return {
    objectType,
    samplingFrequencyIndex,
    channelConfiguration,
    frameLength,
    numberOfAacFrames,
    crcCheck,
    startPos
  };
};

// node_modules/mediabunny/dist/modules/src/reader.js
var FileSlice = class _FileSlice {
  constructor(bytes2, view2, offset, start, end) {
    this.bytes = bytes2;
    this.view = view2;
    this.offset = offset;
    this.start = start;
    this.end = end;
    this.bufferPos = start - offset;
  }
  static tempFromBytes(bytes2) {
    return new _FileSlice(bytes2, toDataView(bytes2), 0, 0, bytes2.length);
  }
  get length() {
    return this.end - this.start;
  }
  get filePos() {
    return this.offset + this.bufferPos;
  }
  set filePos(value) {
    this.bufferPos = value - this.offset;
  }
  /** The number of bytes left from the current pos to the end of the slice. */
  get remainingLength() {
    return Math.max(this.end - this.filePos, 0);
  }
  skip(byteCount) {
    this.bufferPos += byteCount;
  }
  /** Creates a new subslice of this slice whose byte range must be contained within this slice. */
  slice(filePos, length = this.end - filePos) {
    if (filePos < this.start || filePos + length > this.end) {
      throw new RangeError("Slicing outside of original slice.");
    }
    return new _FileSlice(this.bytes, this.view, this.offset, filePos, filePos + length);
  }
};
var checkIsInRange = (slice, bytesToRead) => {
  if (slice.filePos < slice.start || slice.filePos + bytesToRead > slice.end) {
    throw new RangeError(`Tried reading [${slice.filePos}, ${slice.filePos + bytesToRead}), but slice is [${slice.start}, ${slice.end}). This is likely an internal error, please report it alongside the file that caused it.`);
  }
};
var readBytes = (slice, length) => {
  checkIsInRange(slice, length);
  const bytes2 = slice.bytes.subarray(slice.bufferPos, slice.bufferPos + length);
  slice.bufferPos += length;
  return bytes2;
};

// node_modules/mediabunny/dist/modules/src/muxer.js
var Muxer = class {
  constructor(output) {
    this.mutex = new AsyncMutex();
    this.firstMediaStreamTimestamp = null;
    this.trackTimestampInfo = /* @__PURE__ */ new WeakMap();
    this.output = output;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onTrackClose(track) {
  }
  validateAndNormalizeTimestamp(track, timestampInSeconds, isKeyPacket) {
    timestampInSeconds += track.source._timestampOffset;
    if (timestampInSeconds < 0) {
      throw new Error(`Timestamps must be non-negative (got ${timestampInSeconds}s).`);
    }
    let timestampInfo = this.trackTimestampInfo.get(track);
    if (!timestampInfo) {
      if (!isKeyPacket) {
        throw new Error("First packet must be a key packet.");
      }
      timestampInfo = {
        maxTimestamp: timestampInSeconds,
        maxTimestampBeforeLastKeyPacket: null
      };
      this.trackTimestampInfo.set(track, timestampInfo);
    } else {
      if (isKeyPacket) {
        timestampInfo.maxTimestampBeforeLastKeyPacket = timestampInfo.maxTimestamp;
      }
      if (timestampInfo.maxTimestampBeforeLastKeyPacket !== null && timestampInSeconds < timestampInfo.maxTimestampBeforeLastKeyPacket) {
        throw new Error(`Timestamps cannot be smaller than the largest timestamp of the previous GOP (a GOP begins with a key packet and ends right before the next key packet). Got ${timestampInSeconds}s, but largest timestamp is ${timestampInfo.maxTimestampBeforeLastKeyPacket}s.`);
      }
      timestampInfo.maxTimestamp = Math.max(timestampInfo.maxTimestamp, timestampInSeconds);
    }
    return timestampInSeconds;
  }
};

// node_modules/mediabunny/dist/modules/src/subtitles.js
var inlineTimestampRegex = /<(?:(\d{2}):)?(\d{2}):(\d{2}).(\d{3})>/g;
var timestampRegex = /(?:(\d{2}):)?(\d{2}):(\d{2}).(\d{3})/;
var parseSubtitleTimestamp = (string) => {
  const match = timestampRegex.exec(string);
  if (!match)
    throw new Error("Expected match.");
  return 60 * 60 * 1e3 * Number(match[1] || "0") + 60 * 1e3 * Number(match[2]) + 1e3 * Number(match[3]) + Number(match[4]);
};
var formatSubtitleTimestamp = (timestamp) => {
  const hours = Math.floor(timestamp / (60 * 60 * 1e3));
  const minutes = Math.floor(timestamp % (60 * 60 * 1e3) / (60 * 1e3));
  const seconds = Math.floor(timestamp % (60 * 1e3) / 1e3);
  const milliseconds = timestamp % 1e3;
  return hours.toString().padStart(2, "0") + ":" + minutes.toString().padStart(2, "0") + ":" + seconds.toString().padStart(2, "0") + "." + milliseconds.toString().padStart(3, "0");
};

// node_modules/mediabunny/dist/modules/src/isobmff/isobmff-boxes.js
var IsobmffBoxWriter = class {
  constructor(writer) {
    this.writer = writer;
    this.helper = new Uint8Array(8);
    this.helperView = new DataView(this.helper.buffer);
    this.offsets = /* @__PURE__ */ new WeakMap();
  }
  writeU32(value) {
    this.helperView.setUint32(0, value, false);
    this.writer.write(this.helper.subarray(0, 4));
  }
  writeU64(value) {
    this.helperView.setUint32(0, Math.floor(value / 2 ** 32), false);
    this.helperView.setUint32(4, value, false);
    this.writer.write(this.helper.subarray(0, 8));
  }
  writeAscii(text) {
    for (let i = 0; i < text.length; i++) {
      this.helperView.setUint8(i % 8, text.charCodeAt(i));
      if (i % 8 === 7)
        this.writer.write(this.helper);
    }
    if (text.length % 8 !== 0) {
      this.writer.write(this.helper.subarray(0, text.length % 8));
    }
  }
  writeBox(box2) {
    this.offsets.set(box2, this.writer.getPos());
    if (box2.contents && !box2.children) {
      this.writeBoxHeader(box2, box2.size ?? box2.contents.byteLength + 8);
      this.writer.write(box2.contents);
    } else {
      const startPos = this.writer.getPos();
      this.writeBoxHeader(box2, 0);
      if (box2.contents)
        this.writer.write(box2.contents);
      if (box2.children) {
        for (const child of box2.children)
          if (child)
            this.writeBox(child);
      }
      const endPos = this.writer.getPos();
      const size = box2.size ?? endPos - startPos;
      this.writer.seek(startPos);
      this.writeBoxHeader(box2, size);
      this.writer.seek(endPos);
    }
  }
  writeBoxHeader(box2, size) {
    this.writeU32(box2.largeSize ? 1 : size);
    this.writeAscii(box2.type);
    if (box2.largeSize)
      this.writeU64(size);
  }
  measureBoxHeader(box2) {
    return 8 + (box2.largeSize ? 8 : 0);
  }
  patchBox(box2) {
    const boxOffset = this.offsets.get(box2);
    assert(boxOffset !== void 0);
    const endPos = this.writer.getPos();
    this.writer.seek(boxOffset);
    this.writeBox(box2);
    this.writer.seek(endPos);
  }
  measureBox(box2) {
    if (box2.contents && !box2.children) {
      const headerSize = this.measureBoxHeader(box2);
      return headerSize + box2.contents.byteLength;
    } else {
      let result = this.measureBoxHeader(box2);
      if (box2.contents)
        result += box2.contents.byteLength;
      if (box2.children) {
        for (const child of box2.children)
          if (child)
            result += this.measureBox(child);
      }
      return result;
    }
  }
};
var bytes = /* @__PURE__ */ new Uint8Array(8);
var view = /* @__PURE__ */ new DataView(bytes.buffer);
var u8 = (value) => {
  return [(value % 256 + 256) % 256];
};
var u16 = (value) => {
  view.setUint16(0, value, false);
  return [bytes[0], bytes[1]];
};
var i16 = (value) => {
  view.setInt16(0, value, false);
  return [bytes[0], bytes[1]];
};
var u24 = (value) => {
  view.setUint32(0, value, false);
  return [bytes[1], bytes[2], bytes[3]];
};
var u32 = (value) => {
  view.setUint32(0, value, false);
  return [bytes[0], bytes[1], bytes[2], bytes[3]];
};
var i32 = (value) => {
  view.setInt32(0, value, false);
  return [bytes[0], bytes[1], bytes[2], bytes[3]];
};
var u64 = (value) => {
  view.setUint32(0, Math.floor(value / 2 ** 32), false);
  view.setUint32(4, value, false);
  return [bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7]];
};
var fixed_8_8 = (value) => {
  view.setInt16(0, 2 ** 8 * value, false);
  return [bytes[0], bytes[1]];
};
var fixed_16_16 = (value) => {
  view.setInt32(0, 2 ** 16 * value, false);
  return [bytes[0], bytes[1], bytes[2], bytes[3]];
};
var fixed_2_30 = (value) => {
  view.setInt32(0, 2 ** 30 * value, false);
  return [bytes[0], bytes[1], bytes[2], bytes[3]];
};
var variableUnsignedInt = (value, byteLength) => {
  const bytes2 = [];
  let remaining = value;
  do {
    let byte = remaining & 127;
    remaining >>= 7;
    if (bytes2.length > 0) {
      byte |= 128;
    }
    bytes2.push(byte);
    if (byteLength !== void 0) {
      byteLength--;
    }
  } while (remaining > 0 || byteLength);
  return bytes2.reverse();
};
var ascii = (text, nullTerminated = false) => {
  const bytes2 = Array(text.length).fill(null).map((_, i) => text.charCodeAt(i));
  if (nullTerminated)
    bytes2.push(0);
  return bytes2;
};
var lastPresentedSample = (samples) => {
  let result = null;
  for (const sample of samples) {
    if (!result || sample.timestamp > result.timestamp) {
      result = sample;
    }
  }
  return result;
};
var rotationMatrix = (rotationInDegrees) => {
  const theta = rotationInDegrees * (Math.PI / 180);
  const cosTheta = Math.round(Math.cos(theta));
  const sinTheta = Math.round(Math.sin(theta));
  return [
    cosTheta,
    sinTheta,
    0,
    -sinTheta,
    cosTheta,
    0,
    0,
    0,
    1
  ];
};
var IDENTITY_MATRIX = /* @__PURE__ */ rotationMatrix(0);
var matrixToBytes = (matrix) => {
  return [
    fixed_16_16(matrix[0]),
    fixed_16_16(matrix[1]),
    fixed_2_30(matrix[2]),
    fixed_16_16(matrix[3]),
    fixed_16_16(matrix[4]),
    fixed_2_30(matrix[5]),
    fixed_16_16(matrix[6]),
    fixed_16_16(matrix[7]),
    fixed_2_30(matrix[8])
  ];
};
var box = (type, contents, children) => ({
  type,
  contents: contents && new Uint8Array(contents.flat(10)),
  children
});
var fullBox = (type, version, flags, contents, children) => box(type, [u8(version), u24(flags), contents ?? []], children);
var ftyp = (details) => {
  const minorVersion = 512;
  if (details.isQuickTime) {
    return box("ftyp", [
      ascii("qt  "),
      // Major brand
      u32(minorVersion),
      // Minor version
      // Compatible brands
      ascii("qt  ")
    ]);
  }
  if (details.fragmented) {
    return box("ftyp", [
      ascii("iso5"),
      // Major brand
      u32(minorVersion),
      // Minor version
      // Compatible brands
      ascii("iso5"),
      ascii("iso6"),
      ascii("mp41")
    ]);
  }
  return box("ftyp", [
    ascii("isom"),
    // Major brand
    u32(minorVersion),
    // Minor version
    // Compatible brands
    ascii("isom"),
    details.holdsAvc ? ascii("avc1") : [],
    ascii("mp41")
  ]);
};
var mdat = (reserveLargeSize) => ({ type: "mdat", largeSize: reserveLargeSize });
var free = (size) => ({ type: "free", size });
var moov = (muxer) => box("moov", void 0, [
  mvhd(muxer.creationTime, muxer.trackDatas),
  ...muxer.trackDatas.map((x) => trak(x, muxer.creationTime)),
  muxer.isFragmented ? mvex(muxer.trackDatas) : null,
  udta(muxer)
]);
var mvhd = (creationTime, trackDatas) => {
  const duration = intoTimescale(Math.max(0, ...trackDatas.filter((x) => x.samples.length > 0).map((x) => {
    const lastSample = lastPresentedSample(x.samples);
    return lastSample.timestamp + lastSample.duration;
  })), GLOBAL_TIMESCALE);
  const nextTrackId = Math.max(0, ...trackDatas.map((x) => x.track.id)) + 1;
  const needsU64 = !isU32(creationTime) || !isU32(duration);
  const u32OrU64 = needsU64 ? u64 : u32;
  return fullBox("mvhd", +needsU64, 0, [
    u32OrU64(creationTime),
    // Creation time
    u32OrU64(creationTime),
    // Modification time
    u32(GLOBAL_TIMESCALE),
    // Timescale
    u32OrU64(duration),
    // Duration
    fixed_16_16(1),
    // Preferred rate
    fixed_8_8(1),
    // Preferred volume
    Array(10).fill(0),
    // Reserved
    matrixToBytes(IDENTITY_MATRIX),
    // Matrix
    Array(24).fill(0),
    // Pre-defined
    u32(nextTrackId)
    // Next track ID
  ]);
};
var trak = (trackData, creationTime) => {
  const trackMetadata = getTrackMetadata(trackData);
  return box("trak", void 0, [
    tkhd(trackData, creationTime),
    mdia(trackData, creationTime),
    trackMetadata.name !== void 0 ? box("udta", void 0, [
      box("name", [
        ...textEncoder.encode(trackMetadata.name)
      ])
    ]) : null
  ]);
};
var tkhd = (trackData, creationTime) => {
  const lastSample = lastPresentedSample(trackData.samples);
  const durationInGlobalTimescale = intoTimescale(lastSample ? lastSample.timestamp + lastSample.duration : 0, GLOBAL_TIMESCALE);
  const needsU64 = !isU32(creationTime) || !isU32(durationInGlobalTimescale);
  const u32OrU64 = needsU64 ? u64 : u32;
  let matrix;
  if (trackData.type === "video") {
    const rotation = trackData.track.metadata.rotation;
    matrix = rotationMatrix(rotation ?? 0);
  } else {
    matrix = IDENTITY_MATRIX;
  }
  let flags = 2;
  if (trackData.track.metadata.disposition?.default !== false) {
    flags |= 1;
  }
  return fullBox("tkhd", +needsU64, flags, [
    u32OrU64(creationTime),
    // Creation time
    u32OrU64(creationTime),
    // Modification time
    u32(trackData.track.id),
    // Track ID
    u32(0),
    // Reserved
    u32OrU64(durationInGlobalTimescale),
    // Duration
    Array(8).fill(0),
    // Reserved
    u16(0),
    // Layer
    u16(trackData.track.id),
    // Alternate group
    fixed_8_8(trackData.type === "audio" ? 1 : 0),
    // Volume
    u16(0),
    // Reserved
    matrixToBytes(matrix),
    // Matrix
    fixed_16_16(trackData.type === "video" ? trackData.info.width : 0),
    // Track width
    fixed_16_16(trackData.type === "video" ? trackData.info.height : 0)
    // Track height
  ]);
};
var mdia = (trackData, creationTime) => box("mdia", void 0, [
  mdhd(trackData, creationTime),
  hdlr(true, TRACK_TYPE_TO_COMPONENT_SUBTYPE[trackData.type], TRACK_TYPE_TO_HANDLER_NAME[trackData.type]),
  minf(trackData)
]);
var mdhd = (trackData, creationTime) => {
  const lastSample = lastPresentedSample(trackData.samples);
  const localDuration = intoTimescale(lastSample ? lastSample.timestamp + lastSample.duration : 0, trackData.timescale);
  const needsU64 = !isU32(creationTime) || !isU32(localDuration);
  const u32OrU64 = needsU64 ? u64 : u32;
  return fullBox("mdhd", +needsU64, 0, [
    u32OrU64(creationTime),
    // Creation time
    u32OrU64(creationTime),
    // Modification time
    u32(trackData.timescale),
    // Timescale
    u32OrU64(localDuration),
    // Duration
    u16(getLanguageCodeInt(trackData.track.metadata.languageCode ?? UNDETERMINED_LANGUAGE)),
    // Language
    u16(0)
    // Quality
  ]);
};
var TRACK_TYPE_TO_COMPONENT_SUBTYPE = {
  video: "vide",
  audio: "soun",
  subtitle: "text"
};
var TRACK_TYPE_TO_HANDLER_NAME = {
  video: "MediabunnyVideoHandler",
  audio: "MediabunnySoundHandler",
  subtitle: "MediabunnyTextHandler"
};
var hdlr = (hasComponentType, handlerType, name, manufacturer = "\0\0\0\0") => fullBox("hdlr", 0, 0, [
  hasComponentType ? ascii("mhlr") : u32(0),
  // Component type
  ascii(handlerType),
  // Component subtype
  ascii(manufacturer),
  // Component manufacturer
  u32(0),
  // Component flags
  u32(0),
  // Component flags mask
  ascii(name, true)
  // Component name
]);
var minf = (trackData) => box("minf", void 0, [
  TRACK_TYPE_TO_HEADER_BOX[trackData.type](),
  dinf(),
  stbl(trackData)
]);
var vmhd = () => fullBox("vmhd", 0, 1, [
  u16(0),
  // Graphics mode
  u16(0),
  // Opcolor R
  u16(0),
  // Opcolor G
  u16(0)
  // Opcolor B
]);
var smhd = () => fullBox("smhd", 0, 0, [
  u16(0),
  // Balance
  u16(0)
  // Reserved
]);
var nmhd = () => fullBox("nmhd", 0, 0);
var TRACK_TYPE_TO_HEADER_BOX = {
  video: vmhd,
  audio: smhd,
  subtitle: nmhd
};
var dinf = () => box("dinf", void 0, [
  dref()
]);
var dref = () => fullBox("dref", 0, 0, [
  u32(1)
  // Entry count
], [
  url()
]);
var url = () => fullBox("url ", 0, 1);
var stbl = (trackData) => {
  const needsCtts = trackData.compositionTimeOffsetTable.length > 1 || trackData.compositionTimeOffsetTable.some((x) => x.sampleCompositionTimeOffset !== 0);
  return box("stbl", void 0, [
    stsd(trackData),
    stts(trackData),
    needsCtts ? ctts(trackData) : null,
    needsCtts ? cslg(trackData) : null,
    stsc(trackData),
    stsz(trackData),
    stco(trackData),
    stss(trackData)
  ]);
};
var stsd = (trackData) => {
  let sampleDescription;
  if (trackData.type === "video") {
    sampleDescription = videoSampleDescription(videoCodecToBoxName(trackData.track.source._codec, trackData.info.decoderConfig.codec), trackData);
  } else if (trackData.type === "audio") {
    const boxName = audioCodecToBoxName(trackData.track.source._codec, trackData.muxer.isQuickTime);
    assert(boxName);
    sampleDescription = soundSampleDescription(boxName, trackData);
  } else if (trackData.type === "subtitle") {
    sampleDescription = subtitleSampleDescription(SUBTITLE_CODEC_TO_BOX_NAME[trackData.track.source._codec], trackData);
  }
  assert(sampleDescription);
  return fullBox("stsd", 0, 0, [
    u32(1)
    // Entry count
  ], [
    sampleDescription
  ]);
};
var videoSampleDescription = (compressionType, trackData) => box(compressionType, [
  Array(6).fill(0),
  // Reserved
  u16(1),
  // Data reference index
  u16(0),
  // Pre-defined
  u16(0),
  // Reserved
  Array(12).fill(0),
  // Pre-defined
  u16(trackData.info.width),
  // Width
  u16(trackData.info.height),
  // Height
  u32(4718592),
  // Horizontal resolution
  u32(4718592),
  // Vertical resolution
  u32(0),
  // Reserved
  u16(1),
  // Frame count
  Array(32).fill(0),
  // Compressor name
  u16(24),
  // Depth
  i16(65535)
  // Pre-defined
], [
  VIDEO_CODEC_TO_CONFIGURATION_BOX[trackData.track.source._codec](trackData),
  pasp(trackData),
  colorSpaceIsComplete(trackData.info.decoderConfig.colorSpace) ? colr(trackData) : null
]);
var pasp = (trackData) => {
  if (trackData.info.pixelAspectRatio.num === trackData.info.pixelAspectRatio.den) {
    return null;
  }
  return box("pasp", [
    u32(trackData.info.pixelAspectRatio.num),
    u32(trackData.info.pixelAspectRatio.den)
  ]);
};
var colr = (trackData) => box("colr", [
  ascii("nclx"),
  // Colour type
  u16(COLOR_PRIMARIES_MAP[trackData.info.decoderConfig.colorSpace.primaries]),
  // Colour primaries
  u16(TRANSFER_CHARACTERISTICS_MAP[trackData.info.decoderConfig.colorSpace.transfer]),
  // Transfer characteristics
  u16(MATRIX_COEFFICIENTS_MAP[trackData.info.decoderConfig.colorSpace.matrix]),
  // Matrix coefficients
  u8((trackData.info.decoderConfig.colorSpace.fullRange ? 1 : 0) << 7)
  // Full range flag
]);
var avcC = (trackData) => trackData.info.decoderConfig && box("avcC", [
  // For AVC, description is an AVCDecoderConfigurationRecord, so nothing else to do here
  ...toUint8Array(trackData.info.decoderConfig.description)
]);
var hvcC = (trackData) => trackData.info.decoderConfig && box("hvcC", [
  // For HEVC, description is an HEVCDecoderConfigurationRecord, so nothing else to do here
  ...toUint8Array(trackData.info.decoderConfig.description)
]);
var vpcC = (trackData) => {
  if (!trackData.info.decoderConfig) {
    return null;
  }
  const decoderConfig = trackData.info.decoderConfig;
  const parts = decoderConfig.codec.split(".");
  const profile = Number(parts[1]);
  const level = Number(parts[2]);
  const bitDepth = Number(parts[3]);
  const chromaSubsampling = parts[4] ? Number(parts[4]) : 1;
  const videoFullRangeFlag = parts[8] ? Number(parts[8]) : Number(decoderConfig.colorSpace?.fullRange ?? 0);
  const thirdByte = (bitDepth << 4) + (chromaSubsampling << 1) + videoFullRangeFlag;
  const colourPrimaries = parts[5] ? Number(parts[5]) : decoderConfig.colorSpace?.primaries ? COLOR_PRIMARIES_MAP[decoderConfig.colorSpace.primaries] : 2;
  const transferCharacteristics = parts[6] ? Number(parts[6]) : decoderConfig.colorSpace?.transfer ? TRANSFER_CHARACTERISTICS_MAP[decoderConfig.colorSpace.transfer] : 2;
  const matrixCoefficients = parts[7] ? Number(parts[7]) : decoderConfig.colorSpace?.matrix ? MATRIX_COEFFICIENTS_MAP[decoderConfig.colorSpace.matrix] : 2;
  return fullBox("vpcC", 1, 0, [
    u8(profile),
    // Profile
    u8(level),
    // Level
    u8(thirdByte),
    // Bit depth, chroma subsampling, full range
    u8(colourPrimaries),
    // Colour primaries
    u8(transferCharacteristics),
    // Transfer characteristics
    u8(matrixCoefficients),
    // Matrix coefficients
    u16(0)
    // Codec initialization data size
  ]);
};
var av1C = (trackData) => {
  return box("av1C", generateAv1CodecConfigurationFromCodecString(trackData.info.decoderConfig.codec));
};
var soundSampleDescription = (compressionType, trackData) => {
  let version = 0;
  let contents;
  let sampleSizeInBits = 16;
  const isPcmCodec = PCM_AUDIO_CODECS.includes(trackData.track.source._codec);
  if (isPcmCodec) {
    const codec = trackData.track.source._codec;
    const { sampleSize } = parsePcmCodec(codec);
    sampleSizeInBits = 8 * sampleSize;
    if (sampleSizeInBits > 16) {
      version = 1;
    }
  }
  if (trackData.muxer.isQuickTime) {
    version = 1;
  }
  if (version === 0) {
    contents = [
      Array(6).fill(0),
      // Reserved
      u16(1),
      // Data reference index
      u16(version),
      // Version
      u16(0),
      // Revision level
      u32(0),
      // Vendor
      u16(trackData.info.numberOfChannels),
      // Number of channels
      u16(sampleSizeInBits),
      // Sample size (bits)
      u16(0),
      // Compression ID
      u16(0),
      // Packet size
      u16(trackData.info.sampleRate < 2 ** 16 ? trackData.info.sampleRate : 0),
      // Sample rate (upper)
      u16(0)
      // Sample rate (lower)
    ];
  } else {
    const compressionId = isPcmCodec ? 0 : -2;
    contents = [
      Array(6).fill(0),
      // Reserved
      u16(1),
      // Data reference index
      u16(version),
      // Version
      u16(0),
      // Revision level
      u32(0),
      // Vendor
      u16(trackData.info.numberOfChannels),
      // Number of channels
      u16(Math.min(sampleSizeInBits, 16)),
      // Sample size (bits)
      i16(compressionId),
      // Compression ID
      u16(0),
      // Packet size
      u16(trackData.info.sampleRate < 2 ** 16 ? trackData.info.sampleRate : 0),
      // Sample rate (upper)
      u16(0),
      // Sample rate (lower)
      isPcmCodec ? [
        u32(1),
        // Samples per packet (must be 1 for uncompressed formats)
        u32(sampleSizeInBits / 8),
        // Bytes per packet
        u32(trackData.info.numberOfChannels * sampleSizeInBits / 8)
        // Bytes per frame
      ] : [
        u32(0),
        // Samples per packet (don't bother, still works with 0)
        u32(0),
        // Bytes per packet (variable)
        u32(0)
        // Bytes per frame (variable)
      ],
      u32(2)
      // Bytes per sample (constant in FFmpeg)
    ];
  }
  return box(compressionType, contents, [
    audioCodecToConfigurationBox(trackData.track.source._codec, trackData.muxer.isQuickTime)?.(trackData) ?? null
  ]);
};
var esds = (trackData) => {
  let objectTypeIndication;
  switch (trackData.track.source._codec) {
    case "aac":
      {
        objectTypeIndication = 64;
      }
      ;
      break;
    case "mp3":
      {
        objectTypeIndication = 107;
      }
      ;
      break;
    case "vorbis":
      {
        objectTypeIndication = 221;
      }
      ;
      break;
    default:
      throw new Error(`Unhandled audio codec: ${trackData.track.source._codec}`);
  }
  let bytes2 = [
    ...u8(objectTypeIndication),
    // Object type indication
    ...u8(21),
    // stream type(6bits)=5 audio, flags(2bits)=1
    ...u24(0),
    // 24bit buffer size
    ...u32(0),
    // max bitrate
    ...u32(0)
    // avg bitrate
  ];
  if (trackData.info.decoderConfig.description) {
    const description = toUint8Array(trackData.info.decoderConfig.description);
    bytes2 = [
      ...bytes2,
      ...u8(5),
      // TAG(5) = DecoderSpecificInfo
      ...variableUnsignedInt(description.byteLength),
      ...description
    ];
  }
  bytes2 = [
    ...u16(1),
    // ES_ID = 1
    ...u8(0),
    // flags etc = 0
    ...u8(4),
    // TAG(4) = ES Descriptor
    ...variableUnsignedInt(bytes2.length),
    ...bytes2,
    ...u8(6),
    // TAG(6)
    ...u8(1),
    // length
    ...u8(2)
    // data
  ];
  bytes2 = [
    ...u8(3),
    // TAG(3) = Object Descriptor
    ...variableUnsignedInt(bytes2.length),
    ...bytes2
  ];
  return fullBox("esds", 0, 0, bytes2);
};
var wave = (trackData) => {
  return box("wave", void 0, [
    frma(trackData),
    enda(trackData),
    box("\0\0\0\0")
    // NULL tag at the end
  ]);
};
var frma = (trackData) => {
  return box("frma", [
    ascii(audioCodecToBoxName(trackData.track.source._codec, trackData.muxer.isQuickTime))
  ]);
};
var enda = (trackData) => {
  const { littleEndian } = parsePcmCodec(trackData.track.source._codec);
  return box("enda", [
    u16(+littleEndian)
  ]);
};
var dOps = (trackData) => {
  let outputChannelCount = trackData.info.numberOfChannels;
  let preSkip = 3840;
  let inputSampleRate = trackData.info.sampleRate;
  let outputGain = 0;
  let channelMappingFamily = 0;
  let channelMappingTable = new Uint8Array(0);
  const description = trackData.info.decoderConfig?.description;
  if (description) {
    assert(description.byteLength >= 18);
    const bytes2 = toUint8Array(description);
    const header = parseOpusIdentificationHeader(bytes2);
    outputChannelCount = header.outputChannelCount;
    preSkip = header.preSkip;
    inputSampleRate = header.inputSampleRate;
    outputGain = header.outputGain;
    channelMappingFamily = header.channelMappingFamily;
    if (header.channelMappingTable) {
      channelMappingTable = header.channelMappingTable;
    }
  }
  return box("dOps", [
    u8(0),
    // Version
    u8(outputChannelCount),
    // OutputChannelCount
    u16(preSkip),
    // PreSkip
    u32(inputSampleRate),
    // InputSampleRate
    i16(outputGain),
    // OutputGain
    u8(channelMappingFamily),
    // ChannelMappingFamily
    ...channelMappingTable
  ]);
};
var dfLa = (trackData) => {
  const description = trackData.info.decoderConfig?.description;
  assert(description);
  const bytes2 = toUint8Array(description);
  return fullBox("dfLa", 0, 0, [
    ...bytes2.subarray(4)
  ]);
};
var pcmC = (trackData) => {
  const { littleEndian, sampleSize } = parsePcmCodec(trackData.track.source._codec);
  const formatFlags = +littleEndian;
  return fullBox("pcmC", 0, 0, [
    u8(formatFlags),
    u8(8 * sampleSize)
  ]);
};
var dac3 = (trackData) => {
  const frameInfo = parseAc3SyncFrame(trackData.info.firstPacket.data);
  if (!frameInfo) {
    throw new Error("Couldn't extract AC-3 frame info from the audio packet. Ensure the packets contain valid AC-3 sync frames (as specified in ETSI TS 102 366).");
  }
  const bytes2 = new Uint8Array(3);
  const bitstream = new Bitstream(bytes2);
  bitstream.writeBits(2, frameInfo.fscod);
  bitstream.writeBits(5, frameInfo.bsid);
  bitstream.writeBits(3, frameInfo.bsmod);
  bitstream.writeBits(3, frameInfo.acmod);
  bitstream.writeBits(1, frameInfo.lfeon);
  bitstream.writeBits(5, frameInfo.bitRateCode);
  bitstream.writeBits(5, 0);
  return box("dac3", [...bytes2]);
};
var dec3 = (trackData) => {
  const frameInfo = parseEac3SyncFrame(trackData.info.firstPacket.data);
  if (!frameInfo) {
    throw new Error("Couldn't extract E-AC-3 frame info from the audio packet. Ensure the packets contain valid E-AC-3 sync frames (as specified in ETSI TS 102 366).");
  }
  let totalBits = 16;
  for (const sub of frameInfo.substreams) {
    totalBits += 23;
    if (sub.numDepSub > 0) {
      totalBits += 9;
    } else {
      totalBits += 1;
    }
  }
  const size = Math.ceil(totalBits / 8);
  const bytes2 = new Uint8Array(size);
  const bitstream = new Bitstream(bytes2);
  bitstream.writeBits(13, frameInfo.dataRate);
  bitstream.writeBits(3, frameInfo.substreams.length - 1);
  for (const sub of frameInfo.substreams) {
    bitstream.writeBits(2, sub.fscod);
    bitstream.writeBits(5, sub.bsid);
    bitstream.writeBits(1, 0);
    bitstream.writeBits(1, 0);
    bitstream.writeBits(3, sub.bsmod);
    bitstream.writeBits(3, sub.acmod);
    bitstream.writeBits(1, sub.lfeon);
    bitstream.writeBits(3, 0);
    bitstream.writeBits(4, sub.numDepSub);
    if (sub.numDepSub > 0) {
      bitstream.writeBits(9, sub.chanLoc);
    } else {
      bitstream.writeBits(1, 0);
    }
  }
  return box("dec3", [...bytes2]);
};
var subtitleSampleDescription = (compressionType, trackData) => box(compressionType, [
  Array(6).fill(0),
  // Reserved
  u16(1)
  // Data reference index
], [
  SUBTITLE_CODEC_TO_CONFIGURATION_BOX[trackData.track.source._codec](trackData)
]);
var vttC = (trackData) => box("vttC", [
  ...textEncoder.encode(trackData.info.config.description)
]);
var stts = (trackData) => {
  return fullBox("stts", 0, 0, [
    u32(trackData.timeToSampleTable.length),
    // Number of entries
    trackData.timeToSampleTable.map((x) => [
      u32(x.sampleCount),
      // Sample count
      u32(x.sampleDelta)
      // Sample duration
    ])
  ]);
};
var stss = (trackData) => {
  if (trackData.samples.every((x) => x.type === "key"))
    return null;
  const keySamples = [...trackData.samples.entries()].filter(([, sample]) => sample.type === "key");
  return fullBox("stss", 0, 0, [
    u32(keySamples.length),
    // Number of entries
    keySamples.map(([index]) => u32(index + 1))
    // Sync sample table
  ]);
};
var stsc = (trackData) => {
  return fullBox("stsc", 0, 0, [
    u32(trackData.compactlyCodedChunkTable.length),
    // Number of entries
    trackData.compactlyCodedChunkTable.map((x) => [
      u32(x.firstChunk),
      // First chunk
      u32(x.samplesPerChunk),
      // Samples per chunk
      u32(1)
      // Sample description index
    ])
  ]);
};
var stsz = (trackData) => {
  if (trackData.type === "audio" && trackData.info.requiresPcmTransformation) {
    const { sampleSize } = parsePcmCodec(trackData.track.source._codec);
    return fullBox("stsz", 0, 0, [
      u32(sampleSize * trackData.info.numberOfChannels),
      // Sample size
      u32(trackData.samples.reduce((acc, x) => acc + intoTimescale(x.duration, trackData.timescale), 0))
    ]);
  }
  return fullBox("stsz", 0, 0, [
    u32(0),
    // Sample size (0 means non-constant size)
    u32(trackData.samples.length),
    // Number of entries
    trackData.samples.map((x) => u32(x.size))
    // Sample size table
  ]);
};
var stco = (trackData) => {
  if (trackData.finalizedChunks.length > 0 && last(trackData.finalizedChunks).offset >= 2 ** 32) {
    return fullBox("co64", 0, 0, [
      u32(trackData.finalizedChunks.length),
      // Number of entries
      trackData.finalizedChunks.map((x) => u64(x.offset))
      // Chunk offset table
    ]);
  }
  return fullBox("stco", 0, 0, [
    u32(trackData.finalizedChunks.length),
    // Number of entries
    trackData.finalizedChunks.map((x) => u32(x.offset))
    // Chunk offset table
  ]);
};
var ctts = (trackData) => {
  return fullBox("ctts", 1, 0, [
    u32(trackData.compositionTimeOffsetTable.length),
    // Number of entries
    trackData.compositionTimeOffsetTable.map((x) => [
      u32(x.sampleCount),
      // Sample count
      i32(x.sampleCompositionTimeOffset)
      // Sample offset
    ])
  ]);
};
var cslg = (trackData) => {
  let leastDecodeToDisplayDelta = Infinity;
  let greatestDecodeToDisplayDelta = -Infinity;
  let compositionStartTime = Infinity;
  let compositionEndTime = -Infinity;
  assert(trackData.compositionTimeOffsetTable.length > 0);
  assert(trackData.samples.length > 0);
  for (let i = 0; i < trackData.compositionTimeOffsetTable.length; i++) {
    const entry = trackData.compositionTimeOffsetTable[i];
    leastDecodeToDisplayDelta = Math.min(leastDecodeToDisplayDelta, entry.sampleCompositionTimeOffset);
    greatestDecodeToDisplayDelta = Math.max(greatestDecodeToDisplayDelta, entry.sampleCompositionTimeOffset);
  }
  for (let i = 0; i < trackData.samples.length; i++) {
    const sample = trackData.samples[i];
    compositionStartTime = Math.min(compositionStartTime, intoTimescale(sample.timestamp, trackData.timescale));
    compositionEndTime = Math.max(compositionEndTime, intoTimescale(sample.timestamp + sample.duration, trackData.timescale));
  }
  const compositionToDtsShift = Math.max(-leastDecodeToDisplayDelta, 0);
  if (compositionEndTime >= 2 ** 31) {
    return null;
  }
  return fullBox("cslg", 0, 0, [
    i32(compositionToDtsShift),
    // Composition to DTS shift
    i32(leastDecodeToDisplayDelta),
    // Least decode to display delta
    i32(greatestDecodeToDisplayDelta),
    // Greatest decode to display delta
    i32(compositionStartTime),
    // Composition start time
    i32(compositionEndTime)
    // Composition end time
  ]);
};
var mvex = (trackDatas) => {
  return box("mvex", void 0, trackDatas.map(trex));
};
var trex = (trackData) => {
  return fullBox("trex", 0, 0, [
    u32(trackData.track.id),
    // Track ID
    u32(1),
    // Default sample description index
    u32(0),
    // Default sample duration
    u32(0),
    // Default sample size
    u32(0)
    // Default sample flags
  ]);
};
var moof = (sequenceNumber, trackDatas) => {
  return box("moof", void 0, [
    mfhd(sequenceNumber),
    ...trackDatas.map(traf)
  ]);
};
var mfhd = (sequenceNumber) => {
  return fullBox("mfhd", 0, 0, [
    u32(sequenceNumber)
    // Sequence number
  ]);
};
var fragmentSampleFlags = (sample) => {
  let byte1 = 0;
  let byte2 = 0;
  const byte3 = 0;
  const byte4 = 0;
  const sampleIsDifferenceSample = sample.type === "delta";
  byte2 |= +sampleIsDifferenceSample;
  if (sampleIsDifferenceSample) {
    byte1 |= 1;
  } else {
    byte1 |= 2;
  }
  return byte1 << 24 | byte2 << 16 | byte3 << 8 | byte4;
};
var traf = (trackData) => {
  return box("traf", void 0, [
    tfhd(trackData),
    tfdt(trackData),
    trun(trackData)
  ]);
};
var tfhd = (trackData) => {
  assert(trackData.currentChunk);
  let tfFlags = 0;
  tfFlags |= 8;
  tfFlags |= 16;
  tfFlags |= 32;
  tfFlags |= 131072;
  const referenceSample = trackData.currentChunk.samples[1] ?? trackData.currentChunk.samples[0];
  const referenceSampleInfo = {
    duration: referenceSample.timescaleUnitsToNextSample,
    size: referenceSample.size,
    flags: fragmentSampleFlags(referenceSample)
  };
  return fullBox("tfhd", 0, tfFlags, [
    u32(trackData.track.id),
    // Track ID
    u32(referenceSampleInfo.duration),
    // Default sample duration
    u32(referenceSampleInfo.size),
    // Default sample size
    u32(referenceSampleInfo.flags)
    // Default sample flags
  ]);
};
var tfdt = (trackData) => {
  assert(trackData.currentChunk);
  return fullBox("tfdt", 1, 0, [
    u64(intoTimescale(trackData.currentChunk.startTimestamp, trackData.timescale))
    // Base Media Decode Time
  ]);
};
var trun = (trackData) => {
  assert(trackData.currentChunk);
  const allSampleDurations = trackData.currentChunk.samples.map((x) => x.timescaleUnitsToNextSample);
  const allSampleSizes = trackData.currentChunk.samples.map((x) => x.size);
  const allSampleFlags = trackData.currentChunk.samples.map(fragmentSampleFlags);
  const allSampleCompositionTimeOffsets = trackData.currentChunk.samples.map((x) => intoTimescale(x.timestamp - x.decodeTimestamp, trackData.timescale));
  const uniqueSampleDurations = new Set(allSampleDurations);
  const uniqueSampleSizes = new Set(allSampleSizes);
  const uniqueSampleFlags = new Set(allSampleFlags);
  const uniqueSampleCompositionTimeOffsets = new Set(allSampleCompositionTimeOffsets);
  const firstSampleFlagsPresent = uniqueSampleFlags.size === 2 && allSampleFlags[0] !== allSampleFlags[1];
  const sampleDurationPresent = uniqueSampleDurations.size > 1;
  const sampleSizePresent = uniqueSampleSizes.size > 1;
  const sampleFlagsPresent = !firstSampleFlagsPresent && uniqueSampleFlags.size > 1;
  const sampleCompositionTimeOffsetsPresent = uniqueSampleCompositionTimeOffsets.size > 1 || [...uniqueSampleCompositionTimeOffsets].some((x) => x !== 0);
  let flags = 0;
  flags |= 1;
  flags |= 4 * +firstSampleFlagsPresent;
  flags |= 256 * +sampleDurationPresent;
  flags |= 512 * +sampleSizePresent;
  flags |= 1024 * +sampleFlagsPresent;
  flags |= 2048 * +sampleCompositionTimeOffsetsPresent;
  return fullBox("trun", 1, flags, [
    u32(trackData.currentChunk.samples.length),
    // Sample count
    u32(trackData.currentChunk.offset - trackData.currentChunk.moofOffset || 0),
    // Data offset
    firstSampleFlagsPresent ? u32(allSampleFlags[0]) : [],
    trackData.currentChunk.samples.map((_, i) => [
      sampleDurationPresent ? u32(allSampleDurations[i]) : [],
      // Sample duration
      sampleSizePresent ? u32(allSampleSizes[i]) : [],
      // Sample size
      sampleFlagsPresent ? u32(allSampleFlags[i]) : [],
      // Sample flags
      // Sample composition time offsets
      sampleCompositionTimeOffsetsPresent ? i32(allSampleCompositionTimeOffsets[i]) : []
    ])
  ]);
};
var mfra = (trackDatas) => {
  return box("mfra", void 0, [
    ...trackDatas.map(tfra),
    mfro()
  ]);
};
var tfra = (trackData, trackIndex) => {
  const version = 1;
  return fullBox("tfra", version, 0, [
    u32(trackData.track.id),
    // Track ID
    u32(63),
    // This specifies that traf number, trun number and sample number are 32-bit ints
    u32(trackData.finalizedChunks.length),
    // Number of entries
    trackData.finalizedChunks.map((chunk) => [
      u64(intoTimescale(chunk.samples[0].timestamp, trackData.timescale)),
      // Time (in presentation time)
      u64(chunk.moofOffset),
      // moof offset
      u32(trackIndex + 1),
      // traf number
      u32(1),
      // trun number
      u32(1)
      // Sample number
    ])
  ]);
};
var mfro = () => {
  return fullBox("mfro", 0, 0, [
    // This value needs to be overwritten manually from the outside, where the actual size of the enclosing mfra box
    // is known
    u32(0)
    // Size
  ]);
};
var vtte = () => box("vtte");
var vttc = (payload, timestamp, identifier, settings, sourceId) => box("vttc", void 0, [
  sourceId !== null ? box("vsid", [i32(sourceId)]) : null,
  identifier !== null ? box("iden", [...textEncoder.encode(identifier)]) : null,
  timestamp !== null ? box("ctim", [...textEncoder.encode(formatSubtitleTimestamp(timestamp))]) : null,
  settings !== null ? box("sttg", [...textEncoder.encode(settings)]) : null,
  box("payl", [...textEncoder.encode(payload)])
]);
var vtta = (notes) => box("vtta", [...textEncoder.encode(notes)]);
var udta = (muxer) => {
  const boxes = [];
  const metadataFormat = muxer.format._options.metadataFormat ?? "auto";
  const metadataTags = muxer.output._metadataTags;
  if (metadataFormat === "mdir" || metadataFormat === "auto" && !muxer.isQuickTime) {
    const metaBox = metaMdir(metadataTags);
    if (metaBox)
      boxes.push(metaBox);
  } else if (metadataFormat === "mdta") {
    const metaBox = metaMdta(metadataTags);
    if (metaBox)
      boxes.push(metaBox);
  } else if (metadataFormat === "udta" || metadataFormat === "auto" && muxer.isQuickTime) {
    addQuickTimeMetadataTagBoxes(boxes, muxer.output._metadataTags);
  }
  if (boxes.length === 0) {
    return null;
  }
  return box("udta", void 0, boxes);
};
var addQuickTimeMetadataTagBoxes = (boxes, tags) => {
  for (const { key, value } of keyValueIterator(tags)) {
    switch (key) {
      case "title":
        {
          boxes.push(metadataTagStringBoxShort("\xA9nam", value));
        }
        ;
        break;
      case "description":
        {
          boxes.push(metadataTagStringBoxShort("\xA9des", value));
        }
        ;
        break;
      case "artist":
        {
          boxes.push(metadataTagStringBoxShort("\xA9ART", value));
        }
        ;
        break;
      case "album":
        {
          boxes.push(metadataTagStringBoxShort("\xA9alb", value));
        }
        ;
        break;
      case "albumArtist":
        {
          boxes.push(metadataTagStringBoxShort("albr", value));
        }
        ;
        break;
      case "genre":
        {
          boxes.push(metadataTagStringBoxShort("\xA9gen", value));
        }
        ;
        break;
      case "date":
        {
          boxes.push(metadataTagStringBoxShort("\xA9day", value.toISOString().slice(0, 10)));
        }
        ;
        break;
      case "comment":
        {
          boxes.push(metadataTagStringBoxShort("\xA9cmt", value));
        }
        ;
        break;
      case "lyrics":
        {
          boxes.push(metadataTagStringBoxShort("\xA9lyr", value));
        }
        ;
        break;
      case "raw":
        {
        }
        ;
        break;
      case "discNumber":
      case "discsTotal":
      case "trackNumber":
      case "tracksTotal":
      case "images":
        {
        }
        ;
        break;
      default:
        assertNever(key);
    }
  }
  if (tags.raw) {
    for (const key in tags.raw) {
      const value = tags.raw[key];
      if (value == null || key.length !== 4 || boxes.some((x) => x.type === key)) {
        continue;
      }
      if (typeof value === "string") {
        boxes.push(metadataTagStringBoxShort(key, value));
      } else if (value instanceof Uint8Array) {
        boxes.push(box(key, Array.from(value)));
      }
    }
  }
};
var metadataTagStringBoxShort = (name, value) => {
  const encoded = textEncoder.encode(value);
  return box(name, [
    u16(encoded.length),
    u16(getLanguageCodeInt("und")),
    Array.from(encoded)
  ]);
};
var DATA_BOX_MIME_TYPE_MAP = {
  "image/jpeg": 13,
  "image/png": 14,
  "image/bmp": 27
};
var generateMetadataPairs = (tags, isMdta) => {
  const pairs = [];
  for (const { key, value } of keyValueIterator(tags)) {
    switch (key) {
      case "title":
        {
          pairs.push({ key: isMdta ? "title" : "\xA9nam", value: dataStringBoxLong(value) });
        }
        ;
        break;
      case "description":
        {
          pairs.push({ key: isMdta ? "description" : "\xA9des", value: dataStringBoxLong(value) });
        }
        ;
        break;
      case "artist":
        {
          pairs.push({ key: isMdta ? "artist" : "\xA9ART", value: dataStringBoxLong(value) });
        }
        ;
        break;
      case "album":
        {
          pairs.push({ key: isMdta ? "album" : "\xA9alb", value: dataStringBoxLong(value) });
        }
        ;
        break;
      case "albumArtist":
        {
          pairs.push({ key: isMdta ? "album_artist" : "aART", value: dataStringBoxLong(value) });
        }
        ;
        break;
      case "comment":
        {
          pairs.push({ key: isMdta ? "comment" : "\xA9cmt", value: dataStringBoxLong(value) });
        }
        ;
        break;
      case "genre":
        {
          pairs.push({ key: isMdta ? "genre" : "\xA9gen", value: dataStringBoxLong(value) });
        }
        ;
        break;
      case "lyrics":
        {
          pairs.push({ key: isMdta ? "lyrics" : "\xA9lyr", value: dataStringBoxLong(value) });
        }
        ;
        break;
      case "date":
        {
          pairs.push({
            key: isMdta ? "date" : "\xA9day",
            value: dataStringBoxLong(value.toISOString().slice(0, 10))
          });
        }
        ;
        break;
      case "images":
        {
          for (const image of value) {
            if (image.kind !== "coverFront") {
              continue;
            }
            pairs.push({ key: "covr", value: box("data", [
              u32(DATA_BOX_MIME_TYPE_MAP[image.mimeType] ?? 0),
              // Type indicator
              u32(0),
              // Locale indicator
              Array.from(image.data)
              // Kinda slow, hopefully temp
            ]) });
          }
        }
        ;
        break;
      case "trackNumber":
        {
          if (isMdta) {
            const string = tags.tracksTotal !== void 0 ? `${value}/${tags.tracksTotal}` : value.toString();
            pairs.push({ key: "track", value: dataStringBoxLong(string) });
          } else {
            pairs.push({ key: "trkn", value: box("data", [
              u32(0),
              // 8 bytes empty
              u32(0),
              u16(0),
              // Empty
              u16(value),
              u16(tags.tracksTotal ?? 0),
              u16(0)
              // Empty
            ]) });
          }
        }
        ;
        break;
      case "discNumber":
        {
          if (!isMdta) {
            pairs.push({ key: "disc", value: box("data", [
              u32(0),
              // 8 bytes empty
              u32(0),
              u16(0),
              // Empty
              u16(value),
              u16(tags.discsTotal ?? 0),
              u16(0)
              // Empty
            ]) });
          }
        }
        ;
        break;
      case "tracksTotal":
      case "discsTotal":
        {
        }
        ;
        break;
      case "raw":
        {
        }
        ;
        break;
      default:
        assertNever(key);
    }
  }
  if (tags.raw) {
    for (const key in tags.raw) {
      const value = tags.raw[key];
      if (value == null || !isMdta && key.length !== 4 || pairs.some((x) => x.key === key)) {
        continue;
      }
      if (typeof value === "string") {
        pairs.push({ key, value: dataStringBoxLong(value) });
      } else if (value instanceof Uint8Array) {
        pairs.push({ key, value: box("data", [
          u32(0),
          // Type indicator
          u32(0),
          // Locale indicator
          Array.from(value)
        ]) });
      } else if (value instanceof RichImageData) {
        pairs.push({ key, value: box("data", [
          u32(DATA_BOX_MIME_TYPE_MAP[value.mimeType] ?? 0),
          // Type indicator
          u32(0),
          // Locale indicator
          Array.from(value.data)
          // Kinda slow, hopefully temp
        ]) });
      }
    }
  }
  return pairs;
};
var metaMdir = (tags) => {
  const pairs = generateMetadataPairs(tags, false);
  if (pairs.length === 0) {
    return null;
  }
  return fullBox("meta", 0, 0, void 0, [
    hdlr(false, "mdir", "", "appl"),
    // mdir handler
    box("ilst", void 0, pairs.map((pair) => box(pair.key, void 0, [pair.value])))
    // Item list without keys box
  ]);
};
var metaMdta = (tags) => {
  const pairs = generateMetadataPairs(tags, true);
  if (pairs.length === 0) {
    return null;
  }
  return box("meta", void 0, [
    hdlr(false, "mdta", ""),
    // mdta handler
    fullBox("keys", 0, 0, [
      u32(pairs.length)
    ], pairs.map((pair) => box("mdta", [
      ...textEncoder.encode(pair.key)
    ]))),
    box("ilst", void 0, pairs.map((pair, i) => {
      const boxName = String.fromCharCode(...u32(i + 1));
      return box(boxName, void 0, [pair.value]);
    }))
  ]);
};
var dataStringBoxLong = (value) => {
  return box("data", [
    u32(1),
    // Type indicator (UTF-8)
    u32(0),
    // Locale indicator
    ...textEncoder.encode(value)
  ]);
};
var videoCodecToBoxName = (codec, fullCodecString) => {
  switch (codec) {
    case "avc":
      return fullCodecString.startsWith("avc3") ? "avc3" : "avc1";
    case "hevc":
      return "hvc1";
    case "vp8":
      return "vp08";
    case "vp9":
      return "vp09";
    case "av1":
      return "av01";
  }
};
var VIDEO_CODEC_TO_CONFIGURATION_BOX = {
  avc: avcC,
  hevc: hvcC,
  vp8: vpcC,
  vp9: vpcC,
  av1: av1C
};
var audioCodecToBoxName = (codec, isQuickTime) => {
  switch (codec) {
    case "aac":
      return "mp4a";
    case "mp3":
      return "mp4a";
    case "opus":
      return "Opus";
    case "vorbis":
      return "mp4a";
    case "flac":
      return "fLaC";
    case "ulaw":
      return "ulaw";
    case "alaw":
      return "alaw";
    case "pcm-u8":
      return "raw ";
    case "pcm-s8":
      return "sowt";
    case "ac3":
      return "ac-3";
    case "eac3":
      return "ec-3";
  }
  if (isQuickTime) {
    switch (codec) {
      case "pcm-s16":
        return "sowt";
      case "pcm-s16be":
        return "twos";
      case "pcm-s24":
        return "in24";
      case "pcm-s24be":
        return "in24";
      case "pcm-s32":
        return "in32";
      case "pcm-s32be":
        return "in32";
      case "pcm-f32":
        return "fl32";
      case "pcm-f32be":
        return "fl32";
      case "pcm-f64":
        return "fl64";
      case "pcm-f64be":
        return "fl64";
    }
  } else {
    switch (codec) {
      case "pcm-s16":
        return "ipcm";
      case "pcm-s16be":
        return "ipcm";
      case "pcm-s24":
        return "ipcm";
      case "pcm-s24be":
        return "ipcm";
      case "pcm-s32":
        return "ipcm";
      case "pcm-s32be":
        return "ipcm";
      case "pcm-f32":
        return "fpcm";
      case "pcm-f32be":
        return "fpcm";
      case "pcm-f64":
        return "fpcm";
      case "pcm-f64be":
        return "fpcm";
    }
  }
};
var audioCodecToConfigurationBox = (codec, isQuickTime) => {
  switch (codec) {
    case "aac":
      return esds;
    case "mp3":
      return esds;
    case "opus":
      return dOps;
    case "vorbis":
      return esds;
    case "flac":
      return dfLa;
    case "ac3":
      return dac3;
    case "eac3":
      return dec3;
  }
  if (isQuickTime) {
    switch (codec) {
      case "pcm-s24":
        return wave;
      case "pcm-s24be":
        return wave;
      case "pcm-s32":
        return wave;
      case "pcm-s32be":
        return wave;
      case "pcm-f32":
        return wave;
      case "pcm-f32be":
        return wave;
      case "pcm-f64":
        return wave;
      case "pcm-f64be":
        return wave;
    }
  } else {
    switch (codec) {
      case "pcm-s16":
        return pcmC;
      case "pcm-s16be":
        return pcmC;
      case "pcm-s24":
        return pcmC;
      case "pcm-s24be":
        return pcmC;
      case "pcm-s32":
        return pcmC;
      case "pcm-s32be":
        return pcmC;
      case "pcm-f32":
        return pcmC;
      case "pcm-f32be":
        return pcmC;
      case "pcm-f64":
        return pcmC;
      case "pcm-f64be":
        return pcmC;
    }
  }
  return null;
};
var SUBTITLE_CODEC_TO_BOX_NAME = {
  webvtt: "wvtt"
};
var SUBTITLE_CODEC_TO_CONFIGURATION_BOX = {
  webvtt: vttC
};
var getLanguageCodeInt = (code) => {
  assert(code.length === 3);
  ;
  let language = 0;
  for (let i = 0; i < 3; i++) {
    language <<= 5;
    language += code.charCodeAt(i) - 96;
  }
  return language;
};

// node_modules/mediabunny/dist/modules/src/writer.js
var Writer = class {
  constructor() {
    this.ensureMonotonicity = false;
    this.trackedWrites = null;
    this.trackedStart = -1;
    this.trackedEnd = -1;
  }
  start() {
  }
  maybeTrackWrites(data) {
    if (!this.trackedWrites) {
      return;
    }
    let pos = this.getPos();
    if (pos < this.trackedStart) {
      if (pos + data.byteLength <= this.trackedStart) {
        return;
      }
      data = data.subarray(this.trackedStart - pos);
      pos = 0;
    }
    const neededSize = pos + data.byteLength - this.trackedStart;
    let newLength = this.trackedWrites.byteLength;
    while (newLength < neededSize) {
      newLength *= 2;
    }
    if (newLength !== this.trackedWrites.byteLength) {
      const copy = new Uint8Array(newLength);
      copy.set(this.trackedWrites, 0);
      this.trackedWrites = copy;
    }
    this.trackedWrites.set(data, pos - this.trackedStart);
    this.trackedEnd = Math.max(this.trackedEnd, pos + data.byteLength);
  }
  startTrackingWrites() {
    this.trackedWrites = new Uint8Array(2 ** 10);
    this.trackedStart = this.getPos();
    this.trackedEnd = this.trackedStart;
  }
  stopTrackingWrites() {
    if (!this.trackedWrites) {
      throw new Error("Internal error: Can't get tracked writes since nothing was tracked.");
    }
    const slice = this.trackedWrites.subarray(0, this.trackedEnd - this.trackedStart);
    const result = {
      data: slice,
      start: this.trackedStart,
      end: this.trackedEnd
    };
    this.trackedWrites = null;
    return result;
  }
};
var ARRAY_BUFFER_INITIAL_SIZE = 2 ** 16;
var ARRAY_BUFFER_MAX_SIZE = 2 ** 32;
var BufferTargetWriter = class extends Writer {
  constructor(target) {
    super();
    this.pos = 0;
    this.maxPos = 0;
    this.target = target;
    this.supportsResize = "resize" in new ArrayBuffer(0);
    if (this.supportsResize) {
      try {
        this.buffer = new ArrayBuffer(ARRAY_BUFFER_INITIAL_SIZE, { maxByteLength: ARRAY_BUFFER_MAX_SIZE });
      } catch {
        this.buffer = new ArrayBuffer(ARRAY_BUFFER_INITIAL_SIZE);
        this.supportsResize = false;
      }
    } else {
      this.buffer = new ArrayBuffer(ARRAY_BUFFER_INITIAL_SIZE);
    }
    this.bytes = new Uint8Array(this.buffer);
  }
  ensureSize(size) {
    let newLength = this.buffer.byteLength;
    while (newLength < size)
      newLength *= 2;
    if (newLength === this.buffer.byteLength)
      return;
    if (newLength > ARRAY_BUFFER_MAX_SIZE) {
      throw new Error(`ArrayBuffer exceeded maximum size of ${ARRAY_BUFFER_MAX_SIZE} bytes. Please consider using another target.`);
    }
    if (this.supportsResize) {
      this.buffer.resize(newLength);
    } else {
      const newBuffer = new ArrayBuffer(newLength);
      const newBytes = new Uint8Array(newBuffer);
      newBytes.set(this.bytes, 0);
      this.buffer = newBuffer;
      this.bytes = newBytes;
    }
  }
  write(data) {
    this.maybeTrackWrites(data);
    this.ensureSize(this.pos + data.byteLength);
    this.bytes.set(data, this.pos);
    this.target.onwrite?.(this.pos, this.pos + data.byteLength);
    this.pos += data.byteLength;
    this.maxPos = Math.max(this.maxPos, this.pos);
  }
  seek(newPos) {
    this.pos = newPos;
  }
  getPos() {
    return this.pos;
  }
  async flush() {
  }
  async finalize() {
    this.ensureSize(this.pos);
    this.target.buffer = this.buffer.slice(0, Math.max(this.maxPos, this.pos));
  }
  async close() {
  }
  getSlice(start, end) {
    return this.bytes.slice(start, end);
  }
};
var DEFAULT_CHUNK_SIZE = 2 ** 24;
var MAX_CHUNKS_AT_ONCE = 2;
var StreamTargetWriter = class extends Writer {
  constructor(target) {
    super();
    this.pos = 0;
    this.sections = [];
    this.lastWriteEnd = 0;
    this.lastFlushEnd = 0;
    this.writer = null;
    this.writeError = null;
    this.chunks = [];
    this.target = target;
    this.chunked = target._options.chunked ?? false;
    this.chunkSize = target._options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  }
  start() {
    this.writer = this.target._writable.getWriter();
  }
  write(data) {
    if (this.pos > this.lastWriteEnd) {
      const paddingBytesNeeded = this.pos - this.lastWriteEnd;
      this.pos = this.lastWriteEnd;
      this.write(new Uint8Array(paddingBytesNeeded));
    }
    this.maybeTrackWrites(data);
    this.sections.push({
      data: data.slice(),
      start: this.pos
    });
    this.target.onwrite?.(this.pos, this.pos + data.byteLength);
    this.pos += data.byteLength;
    this.lastWriteEnd = Math.max(this.lastWriteEnd, this.pos);
  }
  seek(newPos) {
    this.pos = newPos;
  }
  getPos() {
    return this.pos;
  }
  async flush() {
    if (this.writeError !== null) {
      throw this.writeError;
    }
    if (this.pos > this.lastWriteEnd) {
      const paddingBytesNeeded = this.pos - this.lastWriteEnd;
      this.pos = this.lastWriteEnd;
      this.write(new Uint8Array(paddingBytesNeeded));
    }
    assert(this.writer);
    if (this.sections.length === 0)
      return;
    const chunks = [];
    const sorted = [...this.sections].sort((a, b) => a.start - b.start);
    chunks.push({
      start: sorted[0].start,
      size: sorted[0].data.byteLength
    });
    for (let i = 1; i < sorted.length; i++) {
      const lastChunk = chunks[chunks.length - 1];
      const section = sorted[i];
      if (section.start <= lastChunk.start + lastChunk.size) {
        lastChunk.size = Math.max(lastChunk.size, section.start + section.data.byteLength - lastChunk.start);
      } else {
        chunks.push({
          start: section.start,
          size: section.data.byteLength
        });
      }
    }
    for (const chunk of chunks) {
      chunk.data = new Uint8Array(chunk.size);
      for (const section of this.sections) {
        if (chunk.start <= section.start && section.start < chunk.start + chunk.size) {
          chunk.data.set(section.data, section.start - chunk.start);
        }
      }
      if (this.writer.desiredSize !== null && this.writer.desiredSize <= 0) {
        await this.writer.ready;
      }
      if (this.chunked) {
        this.writeDataIntoChunks(chunk.data, chunk.start);
        this.tryToFlushChunks();
      } else {
        if (this.ensureMonotonicity && chunk.start !== this.lastFlushEnd) {
          throw new Error("Internal error: Monotonicity violation.");
        }
        void this.writer.write({
          type: "write",
          data: chunk.data,
          position: chunk.start
        }).catch((error) => {
          this.writeError ??= error;
        });
        this.lastFlushEnd = chunk.start + chunk.data.byteLength;
      }
    }
    this.sections.length = 0;
  }
  writeDataIntoChunks(data, position) {
    let chunkIndex = this.chunks.findIndex((x) => x.start <= position && position < x.start + this.chunkSize);
    if (chunkIndex === -1)
      chunkIndex = this.createChunk(position);
    const chunk = this.chunks[chunkIndex];
    const relativePosition = position - chunk.start;
    const toWrite = data.subarray(0, Math.min(this.chunkSize - relativePosition, data.byteLength));
    chunk.data.set(toWrite, relativePosition);
    const section = {
      start: relativePosition,
      end: relativePosition + toWrite.byteLength
    };
    this.insertSectionIntoChunk(chunk, section);
    if (chunk.written[0].start === 0 && chunk.written[0].end === this.chunkSize) {
      chunk.shouldFlush = true;
    }
    if (this.chunks.length > MAX_CHUNKS_AT_ONCE) {
      for (let i = 0; i < this.chunks.length - 1; i++) {
        this.chunks[i].shouldFlush = true;
      }
      this.tryToFlushChunks();
    }
    if (toWrite.byteLength < data.byteLength) {
      this.writeDataIntoChunks(data.subarray(toWrite.byteLength), position + toWrite.byteLength);
    }
  }
  insertSectionIntoChunk(chunk, section) {
    let low = 0;
    let high = chunk.written.length - 1;
    let index = -1;
    while (low <= high) {
      const mid = Math.floor(low + (high - low + 1) / 2);
      if (chunk.written[mid].start <= section.start) {
        low = mid + 1;
        index = mid;
      } else {
        high = mid - 1;
      }
    }
    chunk.written.splice(index + 1, 0, section);
    if (index === -1 || chunk.written[index].end < section.start)
      index++;
    while (index < chunk.written.length - 1 && chunk.written[index].end >= chunk.written[index + 1].start) {
      chunk.written[index].end = Math.max(chunk.written[index].end, chunk.written[index + 1].end);
      chunk.written.splice(index + 1, 1);
    }
  }
  createChunk(includesPosition) {
    const start = Math.floor(includesPosition / this.chunkSize) * this.chunkSize;
    const chunk = {
      start,
      data: new Uint8Array(this.chunkSize),
      written: [],
      shouldFlush: false
    };
    this.chunks.push(chunk);
    this.chunks.sort((a, b) => a.start - b.start);
    return this.chunks.indexOf(chunk);
  }
  tryToFlushChunks(force = false) {
    assert(this.writer);
    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i];
      if (!chunk.shouldFlush && !force)
        continue;
      for (const section of chunk.written) {
        const position = chunk.start + section.start;
        if (this.ensureMonotonicity && position !== this.lastFlushEnd) {
          throw new Error("Internal error: Monotonicity violation.");
        }
        void this.writer.write({
          type: "write",
          data: chunk.data.subarray(section.start, section.end),
          position
        }).catch((error) => {
          this.writeError ??= error;
        });
        this.lastFlushEnd = chunk.start + section.end;
      }
      this.chunks.splice(i--, 1);
    }
  }
  async finalize() {
    if (this.chunked) {
      this.tryToFlushChunks(true);
    }
    if (this.writeError !== null) {
      throw this.writeError;
    }
    assert(this.writer);
    await this.writer.ready;
    return this.writer.close();
  }
  async close() {
    return this.writer?.close();
  }
};

// node_modules/mediabunny/dist/modules/src/target.js
var Target = class {
  constructor() {
    this._output = null;
    this.onwrite = null;
  }
};
var BufferTarget = class extends Target {
  constructor() {
    super(...arguments);
    this.buffer = null;
  }
  /** @internal */
  _createWriter() {
    return new BufferTargetWriter(this);
  }
};
var StreamTarget = class extends Target {
  /** Creates a new {@link StreamTarget} which writes to the specified `writable`. */
  constructor(writable, options = {}) {
    super();
    if (!(writable instanceof WritableStream)) {
      throw new TypeError("StreamTarget requires a WritableStream instance.");
    }
    if (options != null && typeof options !== "object") {
      throw new TypeError("StreamTarget options, when provided, must be an object.");
    }
    if (options.chunked !== void 0 && typeof options.chunked !== "boolean") {
      throw new TypeError("options.chunked, when provided, must be a boolean.");
    }
    if (options.chunkSize !== void 0 && (!Number.isInteger(options.chunkSize) || options.chunkSize < 1024)) {
      throw new TypeError("options.chunkSize, when provided, must be an integer and not smaller than 1024.");
    }
    this._writable = writable;
    this._options = options;
  }
  /** @internal */
  _createWriter() {
    return new StreamTargetWriter(this);
  }
};

// node_modules/mediabunny/dist/modules/src/isobmff/isobmff-muxer.js
var GLOBAL_TIMESCALE = 1e3;
var TIMESTAMP_OFFSET = 2082844800;
var getTrackMetadata = (trackData) => {
  const metadata = {};
  const track = trackData.track;
  if (track.metadata.name !== void 0) {
    metadata.name = track.metadata.name;
  }
  return metadata;
};
var intoTimescale = (timeInSeconds, timescale, round = true) => {
  const value = timeInSeconds * timescale;
  return round ? Math.round(value) : value;
};
var IsobmffMuxer = class extends Muxer {
  constructor(output, format) {
    super(output);
    this.auxTarget = new BufferTarget();
    this.auxWriter = this.auxTarget._createWriter();
    this.auxBoxWriter = new IsobmffBoxWriter(this.auxWriter);
    this.mdat = null;
    this.ftypSize = null;
    this.trackDatas = [];
    this.allTracksKnown = promiseWithResolvers();
    this.creationTime = Math.floor(Date.now() / 1e3) + TIMESTAMP_OFFSET;
    this.finalizedChunks = [];
    this.nextFragmentNumber = 1;
    this.maxWrittenTimestamp = -Infinity;
    this.format = format;
    this.writer = output._writer;
    this.boxWriter = new IsobmffBoxWriter(this.writer);
    this.isQuickTime = format instanceof MovOutputFormat;
    const fastStartDefault = this.writer instanceof BufferTargetWriter ? "in-memory" : false;
    this.fastStart = format._options.fastStart ?? fastStartDefault;
    this.isFragmented = this.fastStart === "fragmented";
    if (this.fastStart === "in-memory" || this.isFragmented) {
      this.writer.ensureMonotonicity = true;
    }
    this.minimumFragmentDuration = format._options.minimumFragmentDuration ?? 1;
  }
  async start() {
    const release = await this.mutex.acquire();
    const holdsAvc = this.output._tracks.some((x) => x.type === "video" && x.source._codec === "avc");
    {
      if (this.format._options.onFtyp) {
        this.writer.startTrackingWrites();
      }
      this.boxWriter.writeBox(ftyp({
        isQuickTime: this.isQuickTime,
        holdsAvc,
        fragmented: this.isFragmented
      }));
      if (this.format._options.onFtyp) {
        const { data, start } = this.writer.stopTrackingWrites();
        this.format._options.onFtyp(data, start);
      }
    }
    this.ftypSize = this.writer.getPos();
    if (this.fastStart === "in-memory") {
    } else if (this.fastStart === "reserve") {
      for (const track of this.output._tracks) {
        if (track.metadata.maximumPacketCount === void 0) {
          throw new Error("All tracks must specify maximumPacketCount in their metadata when using fastStart: 'reserve'.");
        }
      }
    } else if (this.isFragmented) {
    } else {
      if (this.format._options.onMdat) {
        this.writer.startTrackingWrites();
      }
      this.mdat = mdat(true);
      this.boxWriter.writeBox(this.mdat);
    }
    await this.writer.flush();
    release();
  }
  allTracksAreKnown() {
    for (const track of this.output._tracks) {
      if (!track.source._closed && !this.trackDatas.some((x) => x.track === track)) {
        return false;
      }
    }
    return true;
  }
  async getMimeType() {
    await this.allTracksKnown.promise;
    const codecStrings = this.trackDatas.map((trackData) => {
      if (trackData.type === "video") {
        return trackData.info.decoderConfig.codec;
      } else if (trackData.type === "audio") {
        return trackData.info.decoderConfig.codec;
      } else {
        const map = {
          webvtt: "wvtt"
        };
        return map[trackData.track.source._codec];
      }
    });
    return buildIsobmffMimeType({
      isQuickTime: this.isQuickTime,
      hasVideo: this.trackDatas.some((x) => x.type === "video"),
      hasAudio: this.trackDatas.some((x) => x.type === "audio"),
      codecStrings
    });
  }
  getVideoTrackData(track, packet, meta) {
    const existingTrackData = this.trackDatas.find((x) => x.track === track);
    if (existingTrackData) {
      return existingTrackData;
    }
    validateVideoChunkMetadata(meta);
    assert(meta);
    assert(meta.decoderConfig);
    const decoderConfig = { ...meta.decoderConfig };
    assert(decoderConfig.codedWidth !== void 0);
    assert(decoderConfig.codedHeight !== void 0);
    let requiresAnnexBTransformation = false;
    if (track.source._codec === "avc" && !decoderConfig.description) {
      const decoderConfigurationRecord = extractAvcDecoderConfigurationRecord(packet.data);
      if (!decoderConfigurationRecord) {
        throw new Error("Couldn't extract an AVCDecoderConfigurationRecord from the AVC packet. Make sure the packets are in Annex B format (as specified in ITU-T-REC-H.264) when not providing a description, or provide a description (must be an AVCDecoderConfigurationRecord as specified in ISO 14496-15) and ensure the packets are in AVCC format.");
      }
      decoderConfig.description = serializeAvcDecoderConfigurationRecord(decoderConfigurationRecord);
      requiresAnnexBTransformation = true;
    } else if (track.source._codec === "hevc" && !decoderConfig.description) {
      const decoderConfigurationRecord = extractHevcDecoderConfigurationRecord(packet.data);
      if (!decoderConfigurationRecord) {
        throw new Error("Couldn't extract an HEVCDecoderConfigurationRecord from the HEVC packet. Make sure the packets are in Annex B format (as specified in ITU-T-REC-H.265) when not providing a description, or provide a description (must be an HEVCDecoderConfigurationRecord as specified in ISO 14496-15) and ensure the packets are in HEVC format.");
      }
      decoderConfig.description = serializeHevcDecoderConfigurationRecord(decoderConfigurationRecord);
      requiresAnnexBTransformation = true;
    }
    const timescale = computeRationalApproximation(1 / (track.metadata.frameRate ?? 57600), 1e6).denominator;
    const displayAspectWidth = decoderConfig.displayAspectWidth;
    const displayAspectHeight = decoderConfig.displayAspectHeight;
    const pixelAspectRatio = displayAspectWidth === void 0 || displayAspectHeight === void 0 ? { num: 1, den: 1 } : simplifyRational({
      num: displayAspectWidth * decoderConfig.codedHeight,
      den: displayAspectHeight * decoderConfig.codedWidth
    });
    const newTrackData = {
      muxer: this,
      track,
      type: "video",
      info: {
        width: decoderConfig.codedWidth,
        height: decoderConfig.codedHeight,
        pixelAspectRatio,
        decoderConfig,
        requiresAnnexBTransformation
      },
      timescale,
      samples: [],
      sampleQueue: [],
      timestampProcessingQueue: [],
      timeToSampleTable: [],
      compositionTimeOffsetTable: [],
      lastTimescaleUnits: null,
      lastSample: null,
      finalizedChunks: [],
      currentChunk: null,
      compactlyCodedChunkTable: []
    };
    this.trackDatas.push(newTrackData);
    this.trackDatas.sort((a, b) => a.track.id - b.track.id);
    if (this.allTracksAreKnown()) {
      this.allTracksKnown.resolve();
    }
    return newTrackData;
  }
  getAudioTrackData(track, packet, meta) {
    const existingTrackData = this.trackDatas.find((x) => x.track === track);
    if (existingTrackData) {
      return existingTrackData;
    }
    validateAudioChunkMetadata(meta);
    assert(meta);
    assert(meta.decoderConfig);
    const decoderConfig = { ...meta.decoderConfig };
    let requiresAdtsStripping = false;
    if (track.source._codec === "aac" && !decoderConfig.description) {
      const adtsFrame = readAdtsFrameHeader(FileSlice.tempFromBytes(packet.data));
      if (!adtsFrame) {
        throw new Error("Couldn't parse ADTS header from the AAC packet. Make sure the packets are in ADTS format (as specified in ISO 13818-7) when not providing a description, or provide a description (must be an AudioSpecificConfig as specified in ISO 14496-3) and ensure the packets are raw AAC data.");
      }
      const sampleRate = aacFrequencyTable[adtsFrame.samplingFrequencyIndex];
      const numberOfChannels = aacChannelMap[adtsFrame.channelConfiguration];
      if (sampleRate === void 0 || numberOfChannels === void 0) {
        throw new Error("Invalid ADTS frame header.");
      }
      decoderConfig.description = buildAacAudioSpecificConfig({
        objectType: adtsFrame.objectType,
        sampleRate,
        numberOfChannels
      });
      requiresAdtsStripping = true;
    }
    const newTrackData = {
      muxer: this,
      track,
      type: "audio",
      info: {
        numberOfChannels: meta.decoderConfig.numberOfChannels,
        sampleRate: meta.decoderConfig.sampleRate,
        decoderConfig,
        requiresPcmTransformation: !this.isFragmented && PCM_AUDIO_CODECS.includes(track.source._codec),
        requiresAdtsStripping,
        firstPacket: packet
      },
      timescale: decoderConfig.sampleRate,
      samples: [],
      sampleQueue: [],
      timestampProcessingQueue: [],
      timeToSampleTable: [],
      compositionTimeOffsetTable: [],
      lastTimescaleUnits: null,
      lastSample: null,
      finalizedChunks: [],
      currentChunk: null,
      compactlyCodedChunkTable: []
    };
    this.trackDatas.push(newTrackData);
    this.trackDatas.sort((a, b) => a.track.id - b.track.id);
    if (this.allTracksAreKnown()) {
      this.allTracksKnown.resolve();
    }
    return newTrackData;
  }
  getSubtitleTrackData(track, meta) {
    const existingTrackData = this.trackDatas.find((x) => x.track === track);
    if (existingTrackData) {
      return existingTrackData;
    }
    validateSubtitleMetadata(meta);
    assert(meta);
    assert(meta.config);
    const newTrackData = {
      muxer: this,
      track,
      type: "subtitle",
      info: {
        config: meta.config
      },
      timescale: 1e3,
      // Reasonable
      samples: [],
      sampleQueue: [],
      timestampProcessingQueue: [],
      timeToSampleTable: [],
      compositionTimeOffsetTable: [],
      lastTimescaleUnits: null,
      lastSample: null,
      finalizedChunks: [],
      currentChunk: null,
      compactlyCodedChunkTable: [],
      lastCueEndTimestamp: 0,
      cueQueue: [],
      nextSourceId: 0,
      cueToSourceId: /* @__PURE__ */ new WeakMap()
    };
    this.trackDatas.push(newTrackData);
    this.trackDatas.sort((a, b) => a.track.id - b.track.id);
    if (this.allTracksAreKnown()) {
      this.allTracksKnown.resolve();
    }
    return newTrackData;
  }
  async addEncodedVideoPacket(track, packet, meta) {
    const release = await this.mutex.acquire();
    try {
      const trackData = this.getVideoTrackData(track, packet, meta);
      let packetData = packet.data;
      if (trackData.info.requiresAnnexBTransformation) {
        const nalUnits = [...iterateNalUnitsInAnnexB(packetData)].map((loc) => packetData.subarray(loc.offset, loc.offset + loc.length));
        if (nalUnits.length === 0) {
          throw new Error("Failed to transform packet data. Make sure all packets are provided in Annex B format, as specified in ITU-T-REC-H.264 and ITU-T-REC-H.265.");
        }
        packetData = concatNalUnitsInLengthPrefixed(nalUnits, 4);
      }
      const timestamp = this.validateAndNormalizeTimestamp(trackData.track, packet.timestamp, packet.type === "key");
      const internalSample = this.createSampleForTrack(trackData, packetData, timestamp, packet.duration, packet.type);
      await this.registerSample(trackData, internalSample);
    } finally {
      release();
    }
  }
  async addEncodedAudioPacket(track, packet, meta) {
    const release = await this.mutex.acquire();
    try {
      const trackData = this.getAudioTrackData(track, packet, meta);
      let packetData = packet.data;
      if (trackData.info.requiresAdtsStripping) {
        const adtsFrame = readAdtsFrameHeader(FileSlice.tempFromBytes(packetData));
        if (!adtsFrame) {
          throw new Error("Expected ADTS frame, didn't get one.");
        }
        const headerLength = adtsFrame.crcCheck === null ? MIN_ADTS_FRAME_HEADER_SIZE : MAX_ADTS_FRAME_HEADER_SIZE;
        packetData = packetData.subarray(headerLength);
      }
      const timestamp = this.validateAndNormalizeTimestamp(trackData.track, packet.timestamp, packet.type === "key");
      const internalSample = this.createSampleForTrack(trackData, packetData, timestamp, packet.duration, packet.type);
      if (trackData.info.requiresPcmTransformation) {
        await this.maybePadWithSilence(trackData, timestamp);
      }
      await this.registerSample(trackData, internalSample);
    } finally {
      release();
    }
  }
  async maybePadWithSilence(trackData, untilTimestamp) {
    const lastSample = last(trackData.samples);
    const lastEndTimestamp = lastSample ? lastSample.timestamp + lastSample.duration : 0;
    const delta = untilTimestamp - lastEndTimestamp;
    const deltaInTimescale = intoTimescale(delta, trackData.timescale);
    if (deltaInTimescale > 0) {
      const { sampleSize, silentValue } = parsePcmCodec(trackData.info.decoderConfig.codec);
      const samplesNeeded = deltaInTimescale * trackData.info.numberOfChannels;
      const data = new Uint8Array(sampleSize * samplesNeeded).fill(silentValue);
      const paddingSample = this.createSampleForTrack(trackData, new Uint8Array(data.buffer), lastEndTimestamp, delta, "key");
      await this.registerSample(trackData, paddingSample);
    }
  }
  async addSubtitleCue(track, cue, meta) {
    const release = await this.mutex.acquire();
    try {
      const trackData = this.getSubtitleTrackData(track, meta);
      this.validateAndNormalizeTimestamp(trackData.track, cue.timestamp, true);
      if (track.source._codec === "webvtt") {
        trackData.cueQueue.push(cue);
        await this.processWebVTTCues(trackData, cue.timestamp);
      } else {
      }
    } finally {
      release();
    }
  }
  async processWebVTTCues(trackData, until) {
    while (trackData.cueQueue.length > 0) {
      const timestamps = /* @__PURE__ */ new Set([]);
      for (const cue of trackData.cueQueue) {
        assert(cue.timestamp <= until);
        assert(trackData.lastCueEndTimestamp <= cue.timestamp + cue.duration);
        timestamps.add(Math.max(cue.timestamp, trackData.lastCueEndTimestamp));
        timestamps.add(cue.timestamp + cue.duration);
      }
      const sortedTimestamps = [...timestamps].sort((a, b) => a - b);
      const sampleStart = sortedTimestamps[0];
      const sampleEnd = sortedTimestamps[1] ?? sampleStart;
      if (until < sampleEnd) {
        break;
      }
      if (trackData.lastCueEndTimestamp < sampleStart) {
        this.auxWriter.seek(0);
        const box2 = vtte();
        this.auxBoxWriter.writeBox(box2);
        const body2 = this.auxWriter.getSlice(0, this.auxWriter.getPos());
        const sample2 = this.createSampleForTrack(trackData, body2, trackData.lastCueEndTimestamp, sampleStart - trackData.lastCueEndTimestamp, "key");
        await this.registerSample(trackData, sample2);
        trackData.lastCueEndTimestamp = sampleStart;
      }
      this.auxWriter.seek(0);
      for (let i = 0; i < trackData.cueQueue.length; i++) {
        const cue = trackData.cueQueue[i];
        if (cue.timestamp >= sampleEnd) {
          break;
        }
        inlineTimestampRegex.lastIndex = 0;
        const containsTimestamp = inlineTimestampRegex.test(cue.text);
        const endTimestamp = cue.timestamp + cue.duration;
        let sourceId = trackData.cueToSourceId.get(cue);
        if (sourceId === void 0 && sampleEnd < endTimestamp) {
          sourceId = trackData.nextSourceId++;
          trackData.cueToSourceId.set(cue, sourceId);
        }
        if (cue.notes) {
          const box3 = vtta(cue.notes);
          this.auxBoxWriter.writeBox(box3);
        }
        const box2 = vttc(cue.text, containsTimestamp ? sampleStart : null, cue.identifier ?? null, cue.settings ?? null, sourceId ?? null);
        this.auxBoxWriter.writeBox(box2);
        if (endTimestamp === sampleEnd) {
          trackData.cueQueue.splice(i--, 1);
        }
      }
      const body = this.auxWriter.getSlice(0, this.auxWriter.getPos());
      const sample = this.createSampleForTrack(trackData, body, sampleStart, sampleEnd - sampleStart, "key");
      await this.registerSample(trackData, sample);
      trackData.lastCueEndTimestamp = sampleEnd;
    }
  }
  createSampleForTrack(trackData, data, timestamp, duration, type) {
    const sample = {
      timestamp,
      decodeTimestamp: timestamp,
      // This may be refined later
      duration,
      data,
      size: data.byteLength,
      type,
      timescaleUnitsToNextSample: intoTimescale(duration, trackData.timescale)
      // Will be refined
    };
    return sample;
  }
  processTimestamps(trackData, nextSample) {
    if (trackData.timestampProcessingQueue.length === 0) {
      return;
    }
    if (trackData.type === "audio" && trackData.info.requiresPcmTransformation) {
      let totalDuration = 0;
      for (let i = 0; i < trackData.timestampProcessingQueue.length; i++) {
        const sample = trackData.timestampProcessingQueue[i];
        const duration = intoTimescale(sample.duration, trackData.timescale);
        totalDuration += duration;
      }
      if (trackData.timeToSampleTable.length === 0) {
        trackData.timeToSampleTable.push({
          sampleCount: totalDuration,
          sampleDelta: 1
        });
      } else {
        const lastEntry = last(trackData.timeToSampleTable);
        lastEntry.sampleCount += totalDuration;
      }
      trackData.timestampProcessingQueue.length = 0;
      return;
    }
    const sortedTimestamps = trackData.timestampProcessingQueue.map((x) => x.timestamp).sort((a, b) => a - b);
    for (let i = 0; i < trackData.timestampProcessingQueue.length; i++) {
      const sample = trackData.timestampProcessingQueue[i];
      sample.decodeTimestamp = sortedTimestamps[i];
      if (!this.isFragmented && trackData.lastTimescaleUnits === null) {
        sample.decodeTimestamp = 0;
      }
      const sampleCompositionTimeOffset = intoTimescale(sample.timestamp - sample.decodeTimestamp, trackData.timescale);
      const durationInTimescale = intoTimescale(sample.duration, trackData.timescale);
      if (trackData.lastTimescaleUnits !== null) {
        assert(trackData.lastSample);
        const timescaleUnits = intoTimescale(sample.decodeTimestamp, trackData.timescale, false);
        const delta = Math.round(timescaleUnits - trackData.lastTimescaleUnits);
        assert(delta >= 0);
        trackData.lastTimescaleUnits += delta;
        trackData.lastSample.timescaleUnitsToNextSample = delta;
        if (!this.isFragmented) {
          let lastTableEntry = last(trackData.timeToSampleTable);
          assert(lastTableEntry);
          if (lastTableEntry.sampleCount === 1) {
            lastTableEntry.sampleDelta = delta;
            const entryBefore = trackData.timeToSampleTable[trackData.timeToSampleTable.length - 2];
            if (entryBefore && entryBefore.sampleDelta === delta) {
              entryBefore.sampleCount++;
              trackData.timeToSampleTable.pop();
              lastTableEntry = entryBefore;
            }
          } else if (lastTableEntry.sampleDelta !== delta) {
            lastTableEntry.sampleCount--;
            trackData.timeToSampleTable.push(lastTableEntry = {
              sampleCount: 1,
              sampleDelta: delta
            });
          }
          if (lastTableEntry.sampleDelta === durationInTimescale) {
            lastTableEntry.sampleCount++;
          } else {
            trackData.timeToSampleTable.push({
              sampleCount: 1,
              sampleDelta: durationInTimescale
            });
          }
          const lastCompositionTimeOffsetTableEntry = last(trackData.compositionTimeOffsetTable);
          assert(lastCompositionTimeOffsetTableEntry);
          if (lastCompositionTimeOffsetTableEntry.sampleCompositionTimeOffset === sampleCompositionTimeOffset) {
            lastCompositionTimeOffsetTableEntry.sampleCount++;
          } else {
            trackData.compositionTimeOffsetTable.push({
              sampleCount: 1,
              sampleCompositionTimeOffset
            });
          }
        }
      } else {
        trackData.lastTimescaleUnits = intoTimescale(sample.decodeTimestamp, trackData.timescale, false);
        if (!this.isFragmented) {
          trackData.timeToSampleTable.push({
            sampleCount: 1,
            sampleDelta: durationInTimescale
          });
          trackData.compositionTimeOffsetTable.push({
            sampleCount: 1,
            sampleCompositionTimeOffset
          });
        }
      }
      trackData.lastSample = sample;
    }
    trackData.timestampProcessingQueue.length = 0;
    assert(trackData.lastSample);
    assert(trackData.lastTimescaleUnits !== null);
    if (nextSample !== void 0 && trackData.lastSample.timescaleUnitsToNextSample === 0) {
      assert(nextSample.type === "key");
      const timescaleUnits = intoTimescale(nextSample.timestamp, trackData.timescale, false);
      const delta = Math.round(timescaleUnits - trackData.lastTimescaleUnits);
      trackData.lastSample.timescaleUnitsToNextSample = delta;
    }
  }
  async registerSample(trackData, sample) {
    if (sample.type === "key") {
      this.processTimestamps(trackData, sample);
    }
    trackData.timestampProcessingQueue.push(sample);
    if (this.isFragmented) {
      trackData.sampleQueue.push(sample);
      await this.interleaveSamples();
    } else if (this.fastStart === "reserve") {
      await this.registerSampleFastStartReserve(trackData, sample);
    } else {
      await this.addSampleToTrack(trackData, sample);
    }
  }
  async addSampleToTrack(trackData, sample) {
    if (!this.isFragmented) {
      trackData.samples.push(sample);
      if (this.fastStart === "reserve") {
        const maximumPacketCount = trackData.track.metadata.maximumPacketCount;
        assert(maximumPacketCount !== void 0);
        if (trackData.samples.length > maximumPacketCount) {
          throw new Error(`Track #${trackData.track.id} has already reached the maximum packet count (${maximumPacketCount}). Either add less packets or increase the maximum packet count.`);
        }
      }
    }
    let beginNewChunk = false;
    if (!trackData.currentChunk) {
      beginNewChunk = true;
    } else {
      trackData.currentChunk.startTimestamp = Math.min(trackData.currentChunk.startTimestamp, sample.timestamp);
      const currentChunkDuration = sample.timestamp - trackData.currentChunk.startTimestamp;
      if (this.isFragmented) {
        const keyFrameQueuedEverywhere = this.trackDatas.every((otherTrackData) => {
          if (trackData === otherTrackData) {
            return sample.type === "key";
          }
          const firstQueuedSample = otherTrackData.sampleQueue[0];
          if (firstQueuedSample) {
            return firstQueuedSample.type === "key";
          }
          return otherTrackData.track.source._closed;
        });
        if (currentChunkDuration >= this.minimumFragmentDuration && keyFrameQueuedEverywhere && sample.timestamp > this.maxWrittenTimestamp) {
          beginNewChunk = true;
          await this.finalizeFragment();
        }
      } else {
        beginNewChunk = currentChunkDuration >= 0.5;
      }
    }
    if (beginNewChunk) {
      if (trackData.currentChunk) {
        await this.finalizeCurrentChunk(trackData);
      }
      trackData.currentChunk = {
        startTimestamp: sample.timestamp,
        samples: [],
        offset: null,
        moofOffset: null
      };
    }
    assert(trackData.currentChunk);
    trackData.currentChunk.samples.push(sample);
    if (this.isFragmented) {
      this.maxWrittenTimestamp = Math.max(this.maxWrittenTimestamp, sample.timestamp);
    }
  }
  async finalizeCurrentChunk(trackData) {
    assert(!this.isFragmented);
    if (!trackData.currentChunk)
      return;
    trackData.finalizedChunks.push(trackData.currentChunk);
    this.finalizedChunks.push(trackData.currentChunk);
    let sampleCount = trackData.currentChunk.samples.length;
    if (trackData.type === "audio" && trackData.info.requiresPcmTransformation) {
      sampleCount = trackData.currentChunk.samples.reduce((acc, sample) => acc + intoTimescale(sample.duration, trackData.timescale), 0);
    }
    if (trackData.compactlyCodedChunkTable.length === 0 || last(trackData.compactlyCodedChunkTable).samplesPerChunk !== sampleCount) {
      trackData.compactlyCodedChunkTable.push({
        firstChunk: trackData.finalizedChunks.length,
        // 1-indexed
        samplesPerChunk: sampleCount
      });
    }
    if (this.fastStart === "in-memory") {
      trackData.currentChunk.offset = 0;
      return;
    }
    trackData.currentChunk.offset = this.writer.getPos();
    for (const sample of trackData.currentChunk.samples) {
      assert(sample.data);
      this.writer.write(sample.data);
      sample.data = null;
    }
    await this.writer.flush();
  }
  async interleaveSamples(isFinalCall = false) {
    assert(this.isFragmented);
    if (!isFinalCall && !this.allTracksAreKnown()) {
      return;
    }
    outer: while (true) {
      let trackWithMinTimestamp = null;
      let minTimestamp = Infinity;
      for (const trackData of this.trackDatas) {
        if (!isFinalCall && trackData.sampleQueue.length === 0 && !trackData.track.source._closed) {
          break outer;
        }
        if (trackData.sampleQueue.length > 0 && trackData.sampleQueue[0].timestamp < minTimestamp) {
          trackWithMinTimestamp = trackData;
          minTimestamp = trackData.sampleQueue[0].timestamp;
        }
      }
      if (!trackWithMinTimestamp) {
        break;
      }
      const sample = trackWithMinTimestamp.sampleQueue.shift();
      await this.addSampleToTrack(trackWithMinTimestamp, sample);
    }
  }
  async finalizeFragment(flushWriter = true) {
    assert(this.isFragmented);
    const fragmentNumber = this.nextFragmentNumber++;
    if (fragmentNumber === 1) {
      if (this.format._options.onMoov) {
        this.writer.startTrackingWrites();
      }
      const movieBox = moov(this);
      this.boxWriter.writeBox(movieBox);
      if (this.format._options.onMoov) {
        const { data, start } = this.writer.stopTrackingWrites();
        this.format._options.onMoov(data, start);
      }
    }
    const tracksInFragment = this.trackDatas.filter((x) => x.currentChunk);
    const moofBox = moof(fragmentNumber, tracksInFragment);
    const moofOffset = this.writer.getPos();
    const mdatStartPos = moofOffset + this.boxWriter.measureBox(moofBox);
    let currentPos = mdatStartPos + MIN_BOX_HEADER_SIZE;
    let fragmentStartTimestamp = Infinity;
    for (const trackData of tracksInFragment) {
      trackData.currentChunk.offset = currentPos;
      trackData.currentChunk.moofOffset = moofOffset;
      for (const sample of trackData.currentChunk.samples) {
        currentPos += sample.size;
      }
      fragmentStartTimestamp = Math.min(fragmentStartTimestamp, trackData.currentChunk.startTimestamp);
    }
    const mdatSize = currentPos - mdatStartPos;
    const needsLargeMdatSize = mdatSize >= 2 ** 32;
    if (needsLargeMdatSize) {
      for (const trackData of tracksInFragment) {
        trackData.currentChunk.offset += MAX_BOX_HEADER_SIZE - MIN_BOX_HEADER_SIZE;
      }
    }
    if (this.format._options.onMoof) {
      this.writer.startTrackingWrites();
    }
    const newMoofBox = moof(fragmentNumber, tracksInFragment);
    this.boxWriter.writeBox(newMoofBox);
    if (this.format._options.onMoof) {
      const { data, start } = this.writer.stopTrackingWrites();
      this.format._options.onMoof(data, start, fragmentStartTimestamp);
    }
    assert(this.writer.getPos() === mdatStartPos);
    if (this.format._options.onMdat) {
      this.writer.startTrackingWrites();
    }
    const mdatBox = mdat(needsLargeMdatSize);
    mdatBox.size = mdatSize;
    this.boxWriter.writeBox(mdatBox);
    this.writer.seek(mdatStartPos + (needsLargeMdatSize ? MAX_BOX_HEADER_SIZE : MIN_BOX_HEADER_SIZE));
    for (const trackData of tracksInFragment) {
      for (const sample of trackData.currentChunk.samples) {
        this.writer.write(sample.data);
        sample.data = null;
      }
    }
    if (this.format._options.onMdat) {
      const { data, start } = this.writer.stopTrackingWrites();
      this.format._options.onMdat(data, start);
    }
    for (const trackData of tracksInFragment) {
      trackData.finalizedChunks.push(trackData.currentChunk);
      this.finalizedChunks.push(trackData.currentChunk);
      trackData.currentChunk = null;
    }
    if (flushWriter) {
      await this.writer.flush();
    }
  }
  async registerSampleFastStartReserve(trackData, sample) {
    if (this.allTracksAreKnown()) {
      if (!this.mdat) {
        const moovBox = moov(this);
        const moovSize = this.boxWriter.measureBox(moovBox);
        const reservedSize = moovSize + this.computeSampleTableSizeUpperBound() + 4096;
        assert(this.ftypSize !== null);
        this.writer.seek(this.ftypSize + reservedSize);
        if (this.format._options.onMdat) {
          this.writer.startTrackingWrites();
        }
        this.mdat = mdat(true);
        this.boxWriter.writeBox(this.mdat);
        for (const trackData2 of this.trackDatas) {
          for (const sample2 of trackData2.sampleQueue) {
            await this.addSampleToTrack(trackData2, sample2);
          }
          trackData2.sampleQueue.length = 0;
        }
      }
      await this.addSampleToTrack(trackData, sample);
    } else {
      trackData.sampleQueue.push(sample);
    }
  }
  computeSampleTableSizeUpperBound() {
    assert(this.fastStart === "reserve");
    let upperBound = 0;
    for (const trackData of this.trackDatas) {
      const n = trackData.track.metadata.maximumPacketCount;
      assert(n !== void 0);
      upperBound += (4 + 4) * Math.ceil(2 / 3 * n);
      upperBound += 4 * n;
      upperBound += (4 + 4) * Math.ceil(2 / 3 * n);
      upperBound += (4 + 4 + 4) * Math.ceil(2 / 3 * n);
      upperBound += 4 * n;
      upperBound += 8 * n;
    }
    return upperBound;
  }
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  async onTrackClose(track) {
    const release = await this.mutex.acquire();
    const trackData = this.trackDatas.find((x) => x.track === track);
    if (trackData) {
      if (trackData.type === "subtitle" && track.source._codec === "webvtt") {
        await this.processWebVTTCues(trackData, Infinity);
      }
      this.processTimestamps(trackData);
    }
    if (this.allTracksAreKnown()) {
      this.allTracksKnown.resolve();
    }
    if (this.isFragmented) {
      await this.interleaveSamples();
    }
    release();
  }
  /** Finalizes the file, making it ready for use. Must be called after all video and audio chunks have been added. */
  async finalize() {
    const release = await this.mutex.acquire();
    this.allTracksKnown.resolve();
    for (const trackData of this.trackDatas) {
      if (trackData.type === "subtitle" && trackData.track.source._codec === "webvtt") {
        await this.processWebVTTCues(trackData, Infinity);
      }
      this.processTimestamps(trackData);
    }
    if (this.isFragmented) {
      await this.interleaveSamples(true);
      await this.finalizeFragment(false);
    } else {
      for (const trackData of this.trackDatas) {
        await this.finalizeCurrentChunk(trackData);
      }
    }
    if (this.fastStart === "in-memory") {
      this.mdat = mdat(false);
      let mdatSize;
      for (let i = 0; i < 2; i++) {
        const movieBox2 = moov(this);
        const movieBoxSize = this.boxWriter.measureBox(movieBox2);
        mdatSize = this.boxWriter.measureBox(this.mdat);
        let currentChunkPos = this.writer.getPos() + movieBoxSize + mdatSize;
        for (const chunk of this.finalizedChunks) {
          chunk.offset = currentChunkPos;
          for (const { data } of chunk.samples) {
            assert(data);
            currentChunkPos += data.byteLength;
            mdatSize += data.byteLength;
          }
        }
        if (currentChunkPos < 2 ** 32)
          break;
        if (mdatSize >= 2 ** 32)
          this.mdat.largeSize = true;
      }
      if (this.format._options.onMoov) {
        this.writer.startTrackingWrites();
      }
      const movieBox = moov(this);
      this.boxWriter.writeBox(movieBox);
      if (this.format._options.onMoov) {
        const { data, start } = this.writer.stopTrackingWrites();
        this.format._options.onMoov(data, start);
      }
      if (this.format._options.onMdat) {
        this.writer.startTrackingWrites();
      }
      this.mdat.size = mdatSize;
      this.boxWriter.writeBox(this.mdat);
      for (const chunk of this.finalizedChunks) {
        for (const sample of chunk.samples) {
          assert(sample.data);
          this.writer.write(sample.data);
          sample.data = null;
        }
      }
      if (this.format._options.onMdat) {
        const { data, start } = this.writer.stopTrackingWrites();
        this.format._options.onMdat(data, start);
      }
    } else if (this.isFragmented) {
      const startPos = this.writer.getPos();
      const mfraBox = mfra(this.trackDatas);
      this.boxWriter.writeBox(mfraBox);
      const mfraBoxSize = this.writer.getPos() - startPos;
      this.writer.seek(this.writer.getPos() - 4);
      this.boxWriter.writeU32(mfraBoxSize);
    } else {
      assert(this.mdat);
      const mdatPos = this.boxWriter.offsets.get(this.mdat);
      assert(mdatPos !== void 0);
      const mdatSize = this.writer.getPos() - mdatPos;
      this.mdat.size = mdatSize;
      this.mdat.largeSize = mdatSize >= 2 ** 32;
      this.boxWriter.patchBox(this.mdat);
      if (this.format._options.onMdat) {
        const { data, start } = this.writer.stopTrackingWrites();
        this.format._options.onMdat(data, start);
      }
      const movieBox = moov(this);
      if (this.fastStart === "reserve") {
        assert(this.ftypSize !== null);
        this.writer.seek(this.ftypSize);
        if (this.format._options.onMoov) {
          this.writer.startTrackingWrites();
        }
        this.boxWriter.writeBox(movieBox);
        const remainingSpace = this.boxWriter.offsets.get(this.mdat) - this.writer.getPos();
        this.boxWriter.writeBox(free(remainingSpace));
      } else {
        if (this.format._options.onMoov) {
          this.writer.startTrackingWrites();
        }
        this.boxWriter.writeBox(movieBox);
      }
      if (this.format._options.onMoov) {
        const { data, start } = this.writer.stopTrackingWrites();
        this.format._options.onMoov(data, start);
      }
    }
    release();
  }
};

// node_modules/mediabunny/dist/modules/src/matroska/matroska-muxer.js
var MIN_CLUSTER_TIMESTAMP_MS = -(2 ** 15);
var MAX_CLUSTER_TIMESTAMP_MS = 2 ** 15 - 1;
var APP_NAME = "Mediabunny";
var SEGMENT_SIZE_BYTES = 6;
var CLUSTER_SIZE_BYTES = 5;
var TRACK_TYPE_MAP = {
  video: 1,
  audio: 2,
  subtitle: 17
};
var MatroskaMuxer = class extends Muxer {
  constructor(output, format) {
    super(output);
    this.trackDatas = [];
    this.allTracksKnown = promiseWithResolvers();
    this.segment = null;
    this.segmentInfo = null;
    this.seekHead = null;
    this.tracksElement = null;
    this.tagsElement = null;
    this.attachmentsElement = null;
    this.segmentDuration = null;
    this.cues = null;
    this.currentCluster = null;
    this.currentClusterStartMsTimestamp = null;
    this.currentClusterMaxMsTimestamp = null;
    this.trackDatasInCurrentCluster = /* @__PURE__ */ new Map();
    this.duration = 0;
    this.writer = output._writer;
    this.format = format;
    this.ebmlWriter = new EBMLWriter(this.writer);
    if (this.format._options.appendOnly) {
      this.writer.ensureMonotonicity = true;
    }
  }
  async start() {
    const release = await this.mutex.acquire();
    this.writeEBMLHeader();
    this.createSegmentInfo();
    this.createCues();
    await this.writer.flush();
    release();
  }
  writeEBMLHeader() {
    if (this.format._options.onEbmlHeader) {
      this.writer.startTrackingWrites();
    }
    const ebmlHeader = { id: EBMLId.EBML, data: [
      { id: EBMLId.EBMLVersion, data: 1 },
      { id: EBMLId.EBMLReadVersion, data: 1 },
      { id: EBMLId.EBMLMaxIDLength, data: 4 },
      { id: EBMLId.EBMLMaxSizeLength, data: 8 },
      { id: EBMLId.DocType, data: this.format instanceof WebMOutputFormat ? "webm" : "matroska" },
      { id: EBMLId.DocTypeVersion, data: 2 },
      { id: EBMLId.DocTypeReadVersion, data: 2 }
    ] };
    this.ebmlWriter.writeEBML(ebmlHeader);
    if (this.format._options.onEbmlHeader) {
      const { data, start } = this.writer.stopTrackingWrites();
      this.format._options.onEbmlHeader(data, start);
    }
  }
  /**
   * Creates a SeekHead element which is positioned near the start of the file and allows the media player to seek to
   * relevant sections more easily. Since we don't know the positions of those sections yet, we'll set them later.
   */
  maybeCreateSeekHead(writeOffsets) {
    if (this.format._options.appendOnly) {
      return;
    }
    const kaxCues = new Uint8Array([28, 83, 187, 107]);
    const kaxInfo = new Uint8Array([21, 73, 169, 102]);
    const kaxTracks = new Uint8Array([22, 84, 174, 107]);
    const kaxAttachments = new Uint8Array([25, 65, 164, 105]);
    const kaxTags = new Uint8Array([18, 84, 195, 103]);
    const seekHead = { id: EBMLId.SeekHead, data: [
      { id: EBMLId.Seek, data: [
        { id: EBMLId.SeekID, data: kaxCues },
        {
          id: EBMLId.SeekPosition,
          size: 5,
          data: writeOffsets ? this.ebmlWriter.offsets.get(this.cues) - this.segmentDataOffset : 0
        }
      ] },
      { id: EBMLId.Seek, data: [
        { id: EBMLId.SeekID, data: kaxInfo },
        {
          id: EBMLId.SeekPosition,
          size: 5,
          data: writeOffsets ? this.ebmlWriter.offsets.get(this.segmentInfo) - this.segmentDataOffset : 0
        }
      ] },
      { id: EBMLId.Seek, data: [
        { id: EBMLId.SeekID, data: kaxTracks },
        {
          id: EBMLId.SeekPosition,
          size: 5,
          data: writeOffsets ? this.ebmlWriter.offsets.get(this.tracksElement) - this.segmentDataOffset : 0
        }
      ] },
      this.attachmentsElement ? { id: EBMLId.Seek, data: [
        { id: EBMLId.SeekID, data: kaxAttachments },
        {
          id: EBMLId.SeekPosition,
          size: 5,
          data: writeOffsets ? this.ebmlWriter.offsets.get(this.attachmentsElement) - this.segmentDataOffset : 0
        }
      ] } : null,
      this.tagsElement ? { id: EBMLId.Seek, data: [
        { id: EBMLId.SeekID, data: kaxTags },
        {
          id: EBMLId.SeekPosition,
          size: 5,
          data: writeOffsets ? this.ebmlWriter.offsets.get(this.tagsElement) - this.segmentDataOffset : 0
        }
      ] } : null
    ] };
    this.seekHead = seekHead;
  }
  createSegmentInfo() {
    const segmentDuration = { id: EBMLId.Duration, data: new EBMLFloat64(0) };
    this.segmentDuration = segmentDuration;
    const segmentInfo = { id: EBMLId.Info, data: [
      { id: EBMLId.TimestampScale, data: 1e6 },
      { id: EBMLId.MuxingApp, data: APP_NAME },
      { id: EBMLId.WritingApp, data: APP_NAME },
      !this.format._options.appendOnly ? segmentDuration : null
    ] };
    this.segmentInfo = segmentInfo;
  }
  createTracks() {
    const tracksElement = { id: EBMLId.Tracks, data: [] };
    this.tracksElement = tracksElement;
    for (const trackData of this.trackDatas) {
      const codecId = CODEC_STRING_MAP[trackData.track.source._codec];
      assert(codecId);
      let seekPreRollNs = 0;
      if (trackData.type === "audio" && trackData.track.source._codec === "opus") {
        seekPreRollNs = 1e6 * 80;
        const description = trackData.info.decoderConfig.description;
        if (description) {
          const bytes2 = toUint8Array(description);
          const header = parseOpusIdentificationHeader(bytes2);
          seekPreRollNs = Math.round(1e9 * (header.preSkip / OPUS_SAMPLE_RATE));
        }
      }
      tracksElement.data.push({ id: EBMLId.TrackEntry, data: [
        { id: EBMLId.TrackNumber, data: trackData.track.id },
        { id: EBMLId.TrackUID, data: trackData.track.id },
        { id: EBMLId.TrackType, data: TRACK_TYPE_MAP[trackData.type] },
        trackData.track.metadata.disposition?.default === false ? { id: EBMLId.FlagDefault, data: 0 } : null,
        trackData.track.metadata.disposition?.forced ? { id: EBMLId.FlagForced, data: 1 } : null,
        trackData.track.metadata.disposition?.hearingImpaired ? { id: EBMLId.FlagHearingImpaired, data: 1 } : null,
        trackData.track.metadata.disposition?.visuallyImpaired ? { id: EBMLId.FlagVisualImpaired, data: 1 } : null,
        trackData.track.metadata.disposition?.original ? { id: EBMLId.FlagOriginal, data: 1 } : null,
        trackData.track.metadata.disposition?.commentary ? { id: EBMLId.FlagCommentary, data: 1 } : null,
        { id: EBMLId.FlagLacing, data: 0 },
        { id: EBMLId.Language, data: trackData.track.metadata.languageCode ?? UNDETERMINED_LANGUAGE },
        { id: EBMLId.CodecID, data: codecId },
        { id: EBMLId.CodecDelay, data: 0 },
        { id: EBMLId.SeekPreRoll, data: seekPreRollNs },
        trackData.track.metadata.name !== void 0 ? { id: EBMLId.Name, data: new EBMLUnicodeString(trackData.track.metadata.name) } : null,
        trackData.type === "video" ? this.videoSpecificTrackInfo(trackData) : null,
        trackData.type === "audio" ? this.audioSpecificTrackInfo(trackData) : null,
        trackData.type === "subtitle" ? this.subtitleSpecificTrackInfo(trackData) : null
      ] });
    }
  }
  videoSpecificTrackInfo(trackData) {
    const { frameRate, rotation } = trackData.track.metadata;
    const elements = [
      trackData.info.decoderConfig.description ? {
        id: EBMLId.CodecPrivate,
        data: toUint8Array(trackData.info.decoderConfig.description)
      } : null,
      frameRate ? {
        id: EBMLId.DefaultDuration,
        data: 1e9 / frameRate
      } : null
    ];
    const flippedRotation = rotation ? normalizeRotation(-rotation) : 0;
    const hasNonSquarePixelAspectRatio = !!trackData.info.aspectRatio && trackData.info.aspectRatio.num * trackData.info.height !== trackData.info.aspectRatio.den * trackData.info.width;
    const colorSpace = trackData.info.decoderConfig.colorSpace;
    const videoElement = { id: EBMLId.Video, data: [
      { id: EBMLId.PixelWidth, data: trackData.info.width },
      { id: EBMLId.PixelHeight, data: trackData.info.height },
      hasNonSquarePixelAspectRatio ? { id: EBMLId.DisplayWidth, data: trackData.info.aspectRatio.num } : null,
      hasNonSquarePixelAspectRatio ? { id: EBMLId.DisplayHeight, data: trackData.info.aspectRatio.den } : null,
      hasNonSquarePixelAspectRatio ? { id: EBMLId.DisplayUnit, data: 3 } : null,
      // 3 = display aspect ratio
      trackData.info.alphaMode ? { id: EBMLId.AlphaMode, data: 1 } : null,
      colorSpaceIsComplete(colorSpace) ? {
        id: EBMLId.Colour,
        data: [
          {
            id: EBMLId.MatrixCoefficients,
            data: MATRIX_COEFFICIENTS_MAP[colorSpace.matrix]
          },
          {
            id: EBMLId.TransferCharacteristics,
            data: TRANSFER_CHARACTERISTICS_MAP[colorSpace.transfer]
          },
          {
            id: EBMLId.Primaries,
            data: COLOR_PRIMARIES_MAP[colorSpace.primaries]
          },
          {
            id: EBMLId.Range,
            data: colorSpace.fullRange ? 2 : 1
          }
        ]
      } : null,
      flippedRotation ? {
        id: EBMLId.Projection,
        data: [
          {
            id: EBMLId.ProjectionType,
            data: 0
            // rectangular
          },
          {
            id: EBMLId.ProjectionPoseRoll,
            data: new EBMLFloat32((flippedRotation + 180) % 360 - 180)
            // [0, 270] -> [-180, 90]
          }
        ]
      } : null
    ] };
    elements.push(videoElement);
    return elements;
  }
  audioSpecificTrackInfo(trackData) {
    const pcmInfo = PCM_AUDIO_CODECS.includes(trackData.track.source._codec) ? parsePcmCodec(trackData.track.source._codec) : null;
    return [
      trackData.info.decoderConfig.description ? {
        id: EBMLId.CodecPrivate,
        data: toUint8Array(trackData.info.decoderConfig.description)
      } : null,
      { id: EBMLId.Audio, data: [
        { id: EBMLId.SamplingFrequency, data: new EBMLFloat32(trackData.info.sampleRate) },
        { id: EBMLId.Channels, data: trackData.info.numberOfChannels },
        pcmInfo ? { id: EBMLId.BitDepth, data: 8 * pcmInfo.sampleSize } : null
      ] }
    ];
  }
  subtitleSpecificTrackInfo(trackData) {
    return [
      { id: EBMLId.CodecPrivate, data: textEncoder.encode(trackData.info.config.description) }
    ];
  }
  maybeCreateTags() {
    const simpleTags = [];
    const addSimpleTag = (key, value) => {
      simpleTags.push({ id: EBMLId.SimpleTag, data: [
        { id: EBMLId.TagName, data: new EBMLUnicodeString(key) },
        typeof value === "string" ? { id: EBMLId.TagString, data: new EBMLUnicodeString(value) } : { id: EBMLId.TagBinary, data: value }
      ] });
    };
    const metadataTags = this.output._metadataTags;
    const writtenTags = /* @__PURE__ */ new Set();
    for (const { key, value } of keyValueIterator(metadataTags)) {
      switch (key) {
        case "title":
          {
            addSimpleTag("TITLE", value);
            writtenTags.add("TITLE");
          }
          ;
          break;
        case "description":
          {
            addSimpleTag("DESCRIPTION", value);
            writtenTags.add("DESCRIPTION");
          }
          ;
          break;
        case "artist":
          {
            addSimpleTag("ARTIST", value);
            writtenTags.add("ARTIST");
          }
          ;
          break;
        case "album":
          {
            addSimpleTag("ALBUM", value);
            writtenTags.add("ALBUM");
          }
          ;
          break;
        case "albumArtist":
          {
            addSimpleTag("ALBUM_ARTIST", value);
            writtenTags.add("ALBUM_ARTIST");
          }
          ;
          break;
        case "genre":
          {
            addSimpleTag("GENRE", value);
            writtenTags.add("GENRE");
          }
          ;
          break;
        case "comment":
          {
            addSimpleTag("COMMENT", value);
            writtenTags.add("COMMENT");
          }
          ;
          break;
        case "lyrics":
          {
            addSimpleTag("LYRICS", value);
            writtenTags.add("LYRICS");
          }
          ;
          break;
        case "date":
          {
            addSimpleTag("DATE", value.toISOString().slice(0, 10));
            writtenTags.add("DATE");
          }
          ;
          break;
        case "trackNumber":
          {
            const string = metadataTags.tracksTotal !== void 0 ? `${value}/${metadataTags.tracksTotal}` : value.toString();
            addSimpleTag("PART_NUMBER", string);
            writtenTags.add("PART_NUMBER");
          }
          ;
          break;
        case "discNumber":
          {
            const string = metadataTags.discsTotal !== void 0 ? `${value}/${metadataTags.discsTotal}` : value.toString();
            addSimpleTag("DISC", string);
            writtenTags.add("DISC");
          }
          ;
          break;
        case "tracksTotal":
        case "discsTotal":
          {
          }
          ;
          break;
        case "images":
        case "raw":
          {
          }
          ;
          break;
        default:
          assertNever(key);
      }
    }
    if (metadataTags.raw) {
      for (const key in metadataTags.raw) {
        const value = metadataTags.raw[key];
        if (value == null || writtenTags.has(key)) {
          continue;
        }
        if (typeof value === "string" || value instanceof Uint8Array) {
          addSimpleTag(key, value);
        }
      }
    }
    if (simpleTags.length === 0) {
      return;
    }
    this.tagsElement = {
      id: EBMLId.Tags,
      data: [{ id: EBMLId.Tag, data: [
        { id: EBMLId.Targets, data: [
          { id: EBMLId.TargetTypeValue, data: 50 },
          { id: EBMLId.TargetType, data: "MOVIE" }
        ] },
        ...simpleTags
      ] }]
    };
  }
  maybeCreateAttachments() {
    const metadataTags = this.output._metadataTags;
    const elements = [];
    const existingFileUids = /* @__PURE__ */ new Set();
    const images = metadataTags.images ?? [];
    for (const image of images) {
      let imageName = image.name;
      if (imageName === void 0) {
        const baseName = image.kind === "coverFront" ? "cover" : image.kind === "coverBack" ? "back" : "image";
        imageName = baseName + (imageMimeTypeToExtension(image.mimeType) ?? "");
      }
      let fileUid;
      while (true) {
        fileUid = 0n;
        for (let i = 0; i < 8; i++) {
          fileUid <<= 8n;
          fileUid |= BigInt(Math.floor(Math.random() * 256));
        }
        if (fileUid !== 0n && !existingFileUids.has(fileUid)) {
          break;
        }
      }
      existingFileUids.add(fileUid);
      elements.push({
        id: EBMLId.AttachedFile,
        data: [
          image.description !== void 0 ? { id: EBMLId.FileDescription, data: new EBMLUnicodeString(image.description) } : null,
          { id: EBMLId.FileName, data: new EBMLUnicodeString(imageName) },
          { id: EBMLId.FileMediaType, data: image.mimeType },
          { id: EBMLId.FileData, data: image.data },
          { id: EBMLId.FileUID, data: fileUid }
        ]
      });
    }
    for (const [key, value] of Object.entries(metadataTags.raw ?? {})) {
      if (!(value instanceof AttachedFile)) {
        continue;
      }
      const keyIsNumeric = /^\d+$/.test(key);
      if (!keyIsNumeric) {
        continue;
      }
      if (images.find((x) => x.mimeType === value.mimeType && uint8ArraysAreEqual(x.data, value.data))) {
        continue;
      }
      elements.push({
        id: EBMLId.AttachedFile,
        data: [
          value.description !== void 0 ? { id: EBMLId.FileDescription, data: new EBMLUnicodeString(value.description) } : null,
          { id: EBMLId.FileName, data: new EBMLUnicodeString(value.name ?? "") },
          { id: EBMLId.FileMediaType, data: value.mimeType ?? "" },
          { id: EBMLId.FileData, data: value.data },
          { id: EBMLId.FileUID, data: BigInt(key) }
        ]
      });
    }
    if (elements.length === 0) {
      return;
    }
    this.attachmentsElement = { id: EBMLId.Attachments, data: elements };
  }
  createSegment() {
    this.createTracks();
    this.maybeCreateTags();
    this.maybeCreateAttachments();
    this.maybeCreateSeekHead(false);
    const segment = {
      id: EBMLId.Segment,
      size: this.format._options.appendOnly ? -1 : SEGMENT_SIZE_BYTES,
      data: [
        this.seekHead,
        // null if append-only
        this.segmentInfo,
        this.tracksElement,
        // Matroska spec says put this at the end of the file, but I think placing it before the first cluster
        // makes more sense, and FFmpeg agrees (argumentum ad ffmpegum fallacy)
        this.attachmentsElement,
        this.tagsElement
      ]
    };
    this.segment = segment;
    if (this.format._options.onSegmentHeader) {
      this.writer.startTrackingWrites();
    }
    this.ebmlWriter.writeEBML(segment);
    if (this.format._options.onSegmentHeader) {
      const { data, start } = this.writer.stopTrackingWrites();
      this.format._options.onSegmentHeader(data, start);
    }
  }
  createCues() {
    this.cues = { id: EBMLId.Cues, data: [] };
  }
  get segmentDataOffset() {
    assert(this.segment);
    return this.ebmlWriter.dataOffsets.get(this.segment);
  }
  allTracksAreKnown() {
    for (const track of this.output._tracks) {
      if (!track.source._closed && !this.trackDatas.some((x) => x.track === track)) {
        return false;
      }
    }
    return true;
  }
  async getMimeType() {
    await this.allTracksKnown.promise;
    const codecStrings = this.trackDatas.map((trackData) => {
      if (trackData.type === "video") {
        return trackData.info.decoderConfig.codec;
      } else if (trackData.type === "audio") {
        return trackData.info.decoderConfig.codec;
      } else {
        const map = {
          webvtt: "wvtt"
        };
        return map[trackData.track.source._codec];
      }
    });
    return buildMatroskaMimeType({
      isWebM: this.format instanceof WebMOutputFormat,
      hasVideo: this.trackDatas.some((x) => x.type === "video"),
      hasAudio: this.trackDatas.some((x) => x.type === "audio"),
      codecStrings
    });
  }
  getVideoTrackData(track, packet, meta) {
    const existingTrackData = this.trackDatas.find((x) => x.track === track);
    if (existingTrackData) {
      return existingTrackData;
    }
    validateVideoChunkMetadata(meta);
    assert(meta);
    assert(meta.decoderConfig);
    assert(meta.decoderConfig.codedWidth !== void 0);
    assert(meta.decoderConfig.codedHeight !== void 0);
    const displayAspectWidth = meta.decoderConfig.displayAspectWidth;
    const displayAspectHeight = meta.decoderConfig.displayAspectHeight;
    const aspectRatio = displayAspectWidth === void 0 || displayAspectHeight === void 0 ? null : simplifyRational({
      num: displayAspectWidth,
      den: displayAspectHeight
    });
    const newTrackData = {
      track,
      type: "video",
      info: {
        width: meta.decoderConfig.codedWidth,
        height: meta.decoderConfig.codedHeight,
        aspectRatio,
        decoderConfig: meta.decoderConfig,
        alphaMode: !!packet.sideData.alpha
        // The first packet determines if this track has alpha or not
      },
      chunkQueue: [],
      lastWrittenMsTimestamp: null
    };
    if (track.source._codec === "vp9") {
      newTrackData.info.decoderConfig = {
        ...newTrackData.info.decoderConfig,
        description: new Uint8Array(generateVp9CodecConfigurationFromCodecString(newTrackData.info.decoderConfig.codec))
      };
    } else if (track.source._codec === "av1") {
      newTrackData.info.decoderConfig = {
        ...newTrackData.info.decoderConfig,
        description: new Uint8Array(generateAv1CodecConfigurationFromCodecString(newTrackData.info.decoderConfig.codec))
      };
    }
    this.trackDatas.push(newTrackData);
    this.trackDatas.sort((a, b) => a.track.id - b.track.id);
    if (this.allTracksAreKnown()) {
      this.allTracksKnown.resolve();
    }
    return newTrackData;
  }
  getAudioTrackData(track, packet, meta) {
    const existingTrackData = this.trackDatas.find((x) => x.track === track);
    if (existingTrackData) {
      return existingTrackData;
    }
    validateAudioChunkMetadata(meta);
    assert(meta);
    assert(meta.decoderConfig);
    const decoderConfig = { ...meta.decoderConfig };
    let requiresAdtsStripping = false;
    if (track.source._codec === "aac" && !decoderConfig.description) {
      const adtsFrame = readAdtsFrameHeader(FileSlice.tempFromBytes(packet.data));
      if (!adtsFrame) {
        throw new Error("Couldn't parse ADTS header from the AAC packet. Make sure the packets are in ADTS format (as specified in ISO 13818-7) when not providing a description, or provide a description (must be an AudioSpecificConfig as specified in ISO 14496-3) and ensure the packets are raw AAC data.");
      }
      const sampleRate = aacFrequencyTable[adtsFrame.samplingFrequencyIndex];
      const numberOfChannels = aacChannelMap[adtsFrame.channelConfiguration];
      if (sampleRate === void 0 || numberOfChannels === void 0) {
        throw new Error("Invalid ADTS frame header.");
      }
      decoderConfig.description = buildAacAudioSpecificConfig({
        objectType: adtsFrame.objectType,
        sampleRate,
        numberOfChannels
      });
      requiresAdtsStripping = true;
    }
    const newTrackData = {
      track,
      type: "audio",
      info: {
        numberOfChannels: meta.decoderConfig.numberOfChannels,
        sampleRate: meta.decoderConfig.sampleRate,
        decoderConfig,
        requiresAdtsStripping
      },
      chunkQueue: [],
      lastWrittenMsTimestamp: null
    };
    this.trackDatas.push(newTrackData);
    this.trackDatas.sort((a, b) => a.track.id - b.track.id);
    if (this.allTracksAreKnown()) {
      this.allTracksKnown.resolve();
    }
    return newTrackData;
  }
  getSubtitleTrackData(track, meta) {
    const existingTrackData = this.trackDatas.find((x) => x.track === track);
    if (existingTrackData) {
      return existingTrackData;
    }
    validateSubtitleMetadata(meta);
    assert(meta);
    assert(meta.config);
    const newTrackData = {
      track,
      type: "subtitle",
      info: {
        config: meta.config
      },
      chunkQueue: [],
      lastWrittenMsTimestamp: null
    };
    this.trackDatas.push(newTrackData);
    this.trackDatas.sort((a, b) => a.track.id - b.track.id);
    if (this.allTracksAreKnown()) {
      this.allTracksKnown.resolve();
    }
    return newTrackData;
  }
  async addEncodedVideoPacket(track, packet, meta) {
    const release = await this.mutex.acquire();
    try {
      const trackData = this.getVideoTrackData(track, packet, meta);
      const isKeyFrame = packet.type === "key";
      let timestamp = this.validateAndNormalizeTimestamp(trackData.track, packet.timestamp, isKeyFrame);
      let duration = packet.duration;
      if (track.metadata.frameRate !== void 0) {
        timestamp = roundToMultiple(timestamp, 1 / track.metadata.frameRate);
        duration = roundToMultiple(duration, 1 / track.metadata.frameRate);
      }
      const additions = trackData.info.alphaMode ? packet.sideData.alpha ?? null : null;
      const videoChunk = this.createInternalChunk(packet.data, timestamp, duration, packet.type, additions);
      if (track.source._codec === "vp9")
        this.fixVP9ColorSpace(trackData, videoChunk);
      trackData.chunkQueue.push(videoChunk);
      await this.interleaveChunks();
    } finally {
      release();
    }
  }
  async addEncodedAudioPacket(track, packet, meta) {
    const release = await this.mutex.acquire();
    try {
      const trackData = this.getAudioTrackData(track, packet, meta);
      let packetData = packet.data;
      if (trackData.info.requiresAdtsStripping) {
        const adtsFrame = readAdtsFrameHeader(FileSlice.tempFromBytes(packetData));
        if (!adtsFrame) {
          throw new Error("Expected ADTS frame, didn't get one.");
        }
        const headerLength = adtsFrame.crcCheck === null ? MIN_ADTS_FRAME_HEADER_SIZE : MAX_ADTS_FRAME_HEADER_SIZE;
        packetData = packetData.subarray(headerLength);
      }
      const isKeyFrame = packet.type === "key";
      const timestamp = this.validateAndNormalizeTimestamp(trackData.track, packet.timestamp, isKeyFrame);
      const audioChunk = this.createInternalChunk(packetData, timestamp, packet.duration, packet.type);
      trackData.chunkQueue.push(audioChunk);
      await this.interleaveChunks();
    } finally {
      release();
    }
  }
  async addSubtitleCue(track, cue, meta) {
    const release = await this.mutex.acquire();
    try {
      const trackData = this.getSubtitleTrackData(track, meta);
      const timestamp = this.validateAndNormalizeTimestamp(trackData.track, cue.timestamp, true);
      let bodyText = cue.text;
      const timestampMs = Math.round(timestamp * 1e3);
      inlineTimestampRegex.lastIndex = 0;
      bodyText = bodyText.replace(inlineTimestampRegex, (match) => {
        const time = parseSubtitleTimestamp(match.slice(1, -1));
        const offsetTime = time - timestampMs;
        return `<${formatSubtitleTimestamp(offsetTime)}>`;
      });
      const body = textEncoder.encode(bodyText);
      const additions = `${cue.settings ?? ""}
${cue.identifier ?? ""}
${cue.notes ?? ""}`;
      const subtitleChunk = this.createInternalChunk(body, timestamp, cue.duration, "key", additions.trim() ? textEncoder.encode(additions) : null);
      trackData.chunkQueue.push(subtitleChunk);
      await this.interleaveChunks();
    } finally {
      release();
    }
  }
  async interleaveChunks(isFinalCall = false) {
    if (!isFinalCall && !this.allTracksAreKnown()) {
      return;
    }
    outer: while (true) {
      let trackWithMinTimestamp = null;
      let minTimestamp = Infinity;
      for (const trackData of this.trackDatas) {
        if (!isFinalCall && trackData.chunkQueue.length === 0 && !trackData.track.source._closed) {
          break outer;
        }
        if (trackData.chunkQueue.length > 0 && trackData.chunkQueue[0].timestamp < minTimestamp) {
          trackWithMinTimestamp = trackData;
          minTimestamp = trackData.chunkQueue[0].timestamp;
        }
      }
      if (!trackWithMinTimestamp) {
        break;
      }
      const chunk = trackWithMinTimestamp.chunkQueue.shift();
      this.writeBlock(trackWithMinTimestamp, chunk);
    }
    if (!isFinalCall) {
      await this.writer.flush();
    }
  }
  /**
   * Due to [a bug in Chromium](https://bugs.chromium.org/p/chromium/issues/detail?id=1377842), VP9 streams often
   * lack color space information. This method patches in that information.
   */
  fixVP9ColorSpace(trackData, chunk) {
    if (chunk.type !== "key")
      return;
    if (!trackData.info.decoderConfig.colorSpace || !trackData.info.decoderConfig.colorSpace.matrix)
      return;
    const bitstream = new Bitstream(chunk.data);
    bitstream.skipBits(2);
    const profileLowBit = bitstream.readBits(1);
    const profileHighBit = bitstream.readBits(1);
    const profile = (profileHighBit << 1) + profileLowBit;
    if (profile === 3)
      bitstream.skipBits(1);
    const showExistingFrame = bitstream.readBits(1);
    if (showExistingFrame)
      return;
    const frameType = bitstream.readBits(1);
    if (frameType !== 0)
      return;
    bitstream.skipBits(2);
    const syncCode = bitstream.readBits(24);
    if (syncCode !== 4817730)
      return;
    if (profile >= 2)
      bitstream.skipBits(1);
    const colorSpaceID = {
      rgb: 7,
      bt709: 2,
      bt470bg: 1,
      smpte170m: 3
    }[trackData.info.decoderConfig.colorSpace.matrix];
    writeBits(chunk.data, bitstream.pos, bitstream.pos + 3, colorSpaceID);
  }
  /** Converts a read-only external chunk into an internal one for easier use. */
  createInternalChunk(data, timestamp, duration, type, additions = null) {
    const internalChunk = {
      data,
      type,
      timestamp,
      duration,
      additions
    };
    return internalChunk;
  }
  /** Writes a block containing media data to the file. */
  writeBlock(trackData, chunk) {
    if (!this.segment) {
      this.createSegment();
    }
    const msTimestamp = Math.round(1e3 * chunk.timestamp);
    const keyFrameQueuedEverywhere = this.trackDatas.every((otherTrackData) => {
      if (trackData === otherTrackData) {
        return chunk.type === "key";
      }
      const firstQueuedSample = otherTrackData.chunkQueue[0];
      if (firstQueuedSample) {
        return firstQueuedSample.type === "key";
      }
      return otherTrackData.track.source._closed;
    });
    let shouldCreateNewCluster = false;
    if (!this.currentCluster) {
      shouldCreateNewCluster = true;
    } else {
      assert(this.currentClusterStartMsTimestamp !== null);
      assert(this.currentClusterMaxMsTimestamp !== null);
      const relativeTimestamp2 = msTimestamp - this.currentClusterStartMsTimestamp;
      shouldCreateNewCluster = keyFrameQueuedEverywhere && msTimestamp > this.currentClusterMaxMsTimestamp && relativeTimestamp2 >= 1e3 * (this.format._options.minimumClusterDuration ?? 1) || relativeTimestamp2 > MAX_CLUSTER_TIMESTAMP_MS;
    }
    if (shouldCreateNewCluster) {
      this.createNewCluster(msTimestamp);
    }
    const relativeTimestamp = msTimestamp - this.currentClusterStartMsTimestamp;
    if (relativeTimestamp < MIN_CLUSTER_TIMESTAMP_MS) {
      return;
    }
    const prelude = new Uint8Array(4);
    const view2 = new DataView(prelude.buffer);
    view2.setUint8(0, 128 | trackData.track.id);
    view2.setInt16(1, relativeTimestamp, false);
    const msDuration = Math.round(1e3 * chunk.duration);
    if (!chunk.additions) {
      view2.setUint8(3, Number(chunk.type === "key") << 7);
      const simpleBlock = { id: EBMLId.SimpleBlock, data: [
        prelude,
        chunk.data
      ] };
      this.ebmlWriter.writeEBML(simpleBlock);
    } else {
      const blockGroup = { id: EBMLId.BlockGroup, data: [
        { id: EBMLId.Block, data: [
          prelude,
          chunk.data
        ] },
        chunk.type === "delta" ? {
          id: EBMLId.ReferenceBlock,
          data: new EBMLSignedInt(trackData.lastWrittenMsTimestamp - msTimestamp)
        } : null,
        chunk.additions ? { id: EBMLId.BlockAdditions, data: [
          { id: EBMLId.BlockMore, data: [
            { id: EBMLId.BlockAddID, data: 1 },
            // Some players expect BlockAddID to come first
            { id: EBMLId.BlockAdditional, data: chunk.additions }
          ] }
        ] } : null,
        msDuration > 0 ? { id: EBMLId.BlockDuration, data: msDuration } : null
      ] };
      this.ebmlWriter.writeEBML(blockGroup);
    }
    this.duration = Math.max(this.duration, msTimestamp + msDuration);
    trackData.lastWrittenMsTimestamp = msTimestamp;
    if (!this.trackDatasInCurrentCluster.has(trackData)) {
      this.trackDatasInCurrentCluster.set(trackData, {
        firstMsTimestamp: msTimestamp
      });
    }
    this.currentClusterMaxMsTimestamp = Math.max(this.currentClusterMaxMsTimestamp, msTimestamp);
  }
  /** Creates a new Cluster element to contain media chunks. */
  createNewCluster(msTimestamp) {
    if (this.currentCluster) {
      this.finalizeCurrentCluster();
    }
    if (this.format._options.onCluster) {
      this.writer.startTrackingWrites();
    }
    this.currentCluster = {
      id: EBMLId.Cluster,
      size: this.format._options.appendOnly ? -1 : CLUSTER_SIZE_BYTES,
      data: [
        { id: EBMLId.Timestamp, data: msTimestamp }
      ]
    };
    this.ebmlWriter.writeEBML(this.currentCluster);
    this.currentClusterStartMsTimestamp = msTimestamp;
    this.currentClusterMaxMsTimestamp = msTimestamp;
    this.trackDatasInCurrentCluster.clear();
  }
  finalizeCurrentCluster() {
    assert(this.currentCluster);
    if (!this.format._options.appendOnly) {
      const clusterSize = this.writer.getPos() - this.ebmlWriter.dataOffsets.get(this.currentCluster);
      const endPos = this.writer.getPos();
      this.writer.seek(this.ebmlWriter.offsets.get(this.currentCluster) + 4);
      this.ebmlWriter.writeVarInt(clusterSize, CLUSTER_SIZE_BYTES);
      this.writer.seek(endPos);
    }
    if (this.format._options.onCluster) {
      assert(this.currentClusterStartMsTimestamp !== null);
      const { data, start } = this.writer.stopTrackingWrites();
      this.format._options.onCluster(data, start, this.currentClusterStartMsTimestamp / 1e3);
    }
    const clusterOffsetFromSegment = this.ebmlWriter.offsets.get(this.currentCluster) - this.segmentDataOffset;
    const groupedByTimestamp = /* @__PURE__ */ new Map();
    for (const [trackData, { firstMsTimestamp }] of this.trackDatasInCurrentCluster) {
      if (!groupedByTimestamp.has(firstMsTimestamp)) {
        groupedByTimestamp.set(firstMsTimestamp, []);
      }
      groupedByTimestamp.get(firstMsTimestamp).push(trackData);
    }
    const groupedAndSortedByTimestamp = [...groupedByTimestamp.entries()].sort((a, b) => a[0] - b[0]);
    for (const [msTimestamp, trackDatas] of groupedAndSortedByTimestamp) {
      assert(this.cues);
      this.cues.data.push({ id: EBMLId.CuePoint, data: [
        { id: EBMLId.CueTime, data: msTimestamp },
        // Create CueTrackPositions for each track that starts at this timestamp
        ...trackDatas.map((trackData) => {
          return { id: EBMLId.CueTrackPositions, data: [
            { id: EBMLId.CueTrack, data: trackData.track.id },
            { id: EBMLId.CueClusterPosition, data: clusterOffsetFromSegment }
          ] };
        })
      ] });
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  async onTrackClose() {
    const release = await this.mutex.acquire();
    if (this.allTracksAreKnown()) {
      this.allTracksKnown.resolve();
    }
    await this.interleaveChunks();
    release();
  }
  /** Finalizes the file, making it ready for use. Must be called after all media chunks have been added. */
  async finalize() {
    const release = await this.mutex.acquire();
    this.allTracksKnown.resolve();
    if (!this.segment) {
      this.createSegment();
    }
    await this.interleaveChunks(true);
    if (this.currentCluster) {
      this.finalizeCurrentCluster();
    }
    assert(this.cues);
    this.ebmlWriter.writeEBML(this.cues);
    if (!this.format._options.appendOnly) {
      const endPos = this.writer.getPos();
      const segmentSize = this.writer.getPos() - this.segmentDataOffset;
      this.writer.seek(this.ebmlWriter.offsets.get(this.segment) + 4);
      this.ebmlWriter.writeVarInt(segmentSize, SEGMENT_SIZE_BYTES);
      this.segmentDuration.data = new EBMLFloat64(this.duration);
      this.writer.seek(this.ebmlWriter.offsets.get(this.segmentDuration));
      this.ebmlWriter.writeEBML(this.segmentDuration);
      assert(this.seekHead);
      this.writer.seek(this.ebmlWriter.offsets.get(this.seekHead));
      this.maybeCreateSeekHead(true);
      this.ebmlWriter.writeEBML(this.seekHead);
      this.writer.seek(endPos);
    }
    release();
  }
};

// node_modules/mediabunny/dist/modules/src/output-format.js
var OutputFormat = class {
  /** Returns a list of video codecs that this output format can contain. */
  getSupportedVideoCodecs() {
    return this.getSupportedCodecs().filter((codec) => VIDEO_CODECS.includes(codec));
  }
  /** Returns a list of audio codecs that this output format can contain. */
  getSupportedAudioCodecs() {
    return this.getSupportedCodecs().filter((codec) => AUDIO_CODECS.includes(codec));
  }
  /** Returns a list of subtitle codecs that this output format can contain. */
  getSupportedSubtitleCodecs() {
    return this.getSupportedCodecs().filter((codec) => SUBTITLE_CODECS.includes(codec));
  }
  /** @internal */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _codecUnsupportedHint(codec) {
    return "";
  }
};
var IsobmffOutputFormat = class extends OutputFormat {
  /** Internal constructor. */
  constructor(options = {}) {
    if (!options || typeof options !== "object") {
      throw new TypeError("options must be an object.");
    }
    if (options.fastStart !== void 0 && ![false, "in-memory", "reserve", "fragmented"].includes(options.fastStart)) {
      throw new TypeError("options.fastStart, when provided, must be false, 'in-memory', 'reserve', or 'fragmented'.");
    }
    if (options.minimumFragmentDuration !== void 0 && (!Number.isFinite(options.minimumFragmentDuration) || options.minimumFragmentDuration < 0)) {
      throw new TypeError("options.minimumFragmentDuration, when provided, must be a non-negative number.");
    }
    if (options.onFtyp !== void 0 && typeof options.onFtyp !== "function") {
      throw new TypeError("options.onFtyp, when provided, must be a function.");
    }
    if (options.onMoov !== void 0 && typeof options.onMoov !== "function") {
      throw new TypeError("options.onMoov, when provided, must be a function.");
    }
    if (options.onMdat !== void 0 && typeof options.onMdat !== "function") {
      throw new TypeError("options.onMdat, when provided, must be a function.");
    }
    if (options.onMoof !== void 0 && typeof options.onMoof !== "function") {
      throw new TypeError("options.onMoof, when provided, must be a function.");
    }
    if (options.metadataFormat !== void 0 && !["mdir", "mdta", "udta", "auto"].includes(options.metadataFormat)) {
      throw new TypeError("options.metadataFormat, when provided, must be either 'auto', 'mdir', 'mdta', or 'udta'.");
    }
    super();
    this._options = options;
  }
  getSupportedTrackCounts() {
    const max = 2 ** 32 - 1;
    return {
      video: { min: 0, max },
      audio: { min: 0, max },
      subtitle: { min: 0, max },
      total: { min: 1, max }
    };
  }
  get supportsVideoRotationMetadata() {
    return true;
  }
  get supportsTimestampedMediaData() {
    return true;
  }
  /** @internal */
  _createMuxer(output) {
    return new IsobmffMuxer(output, this);
  }
};
var Mp4OutputFormat = class extends IsobmffOutputFormat {
  /** Creates a new {@link Mp4OutputFormat} configured with the specified `options`. */
  constructor(options) {
    super(options);
  }
  /** @internal */
  get _name() {
    return "MP4";
  }
  get fileExtension() {
    return ".mp4";
  }
  get mimeType() {
    return "video/mp4";
  }
  getSupportedCodecs() {
    return [
      ...VIDEO_CODECS,
      ...NON_PCM_AUDIO_CODECS,
      // These are supported via ISO/IEC 23003-5:
      "pcm-s16",
      "pcm-s16be",
      "pcm-s24",
      "pcm-s24be",
      "pcm-s32",
      "pcm-s32be",
      "pcm-f32",
      "pcm-f32be",
      "pcm-f64",
      "pcm-f64be",
      ...SUBTITLE_CODECS
    ];
  }
  /** @internal */
  _codecUnsupportedHint(codec) {
    if (new MovOutputFormat().getSupportedCodecs().includes(codec)) {
      return " Switching to MOV will grant support for this codec.";
    }
    return "";
  }
};
var MovOutputFormat = class extends IsobmffOutputFormat {
  /** Creates a new {@link MovOutputFormat} configured with the specified `options`. */
  constructor(options) {
    super(options);
  }
  /** @internal */
  get _name() {
    return "MOV";
  }
  get fileExtension() {
    return ".mov";
  }
  get mimeType() {
    return "video/quicktime";
  }
  getSupportedCodecs() {
    return [
      ...VIDEO_CODECS,
      ...AUDIO_CODECS
    ];
  }
  /** @internal */
  _codecUnsupportedHint(codec) {
    if (new Mp4OutputFormat().getSupportedCodecs().includes(codec)) {
      return " Switching to MP4 will grant support for this codec.";
    }
    return "";
  }
};
var MkvOutputFormat = class extends OutputFormat {
  /** Creates a new {@link MkvOutputFormat} configured with the specified `options`. */
  constructor(options = {}) {
    if (!options || typeof options !== "object") {
      throw new TypeError("options must be an object.");
    }
    if (options.appendOnly !== void 0 && typeof options.appendOnly !== "boolean") {
      throw new TypeError("options.appendOnly, when provided, must be a boolean.");
    }
    if (options.minimumClusterDuration !== void 0 && (!Number.isFinite(options.minimumClusterDuration) || options.minimumClusterDuration < 0)) {
      throw new TypeError("options.minimumClusterDuration, when provided, must be a non-negative number.");
    }
    if (options.onEbmlHeader !== void 0 && typeof options.onEbmlHeader !== "function") {
      throw new TypeError("options.onEbmlHeader, when provided, must be a function.");
    }
    if (options.onSegmentHeader !== void 0 && typeof options.onSegmentHeader !== "function") {
      throw new TypeError("options.onHeader, when provided, must be a function.");
    }
    if (options.onCluster !== void 0 && typeof options.onCluster !== "function") {
      throw new TypeError("options.onCluster, when provided, must be a function.");
    }
    super();
    this._options = options;
  }
  /** @internal */
  _createMuxer(output) {
    return new MatroskaMuxer(output, this);
  }
  /** @internal */
  get _name() {
    return "Matroska";
  }
  getSupportedTrackCounts() {
    const max = 127;
    return {
      video: { min: 0, max },
      audio: { min: 0, max },
      subtitle: { min: 0, max },
      total: { min: 1, max }
    };
  }
  get fileExtension() {
    return ".mkv";
  }
  get mimeType() {
    return "video/x-matroska";
  }
  getSupportedCodecs() {
    return [
      ...VIDEO_CODECS,
      ...NON_PCM_AUDIO_CODECS,
      ...PCM_AUDIO_CODECS.filter((codec) => !["pcm-s8", "pcm-f32be", "pcm-f64be", "ulaw", "alaw"].includes(codec)),
      ...SUBTITLE_CODECS
    ];
  }
  get supportsVideoRotationMetadata() {
    return false;
  }
  get supportsTimestampedMediaData() {
    return true;
  }
};
var WebMOutputFormat = class extends MkvOutputFormat {
  /** Creates a new {@link WebMOutputFormat} configured with the specified `options`. */
  constructor(options) {
    super(options);
  }
  getSupportedCodecs() {
    return [
      ...VIDEO_CODECS.filter((codec) => ["vp8", "vp9", "av1"].includes(codec)),
      ...AUDIO_CODECS.filter((codec) => ["opus", "vorbis"].includes(codec)),
      ...SUBTITLE_CODECS
    ];
  }
  /** @internal */
  get _name() {
    return "WebM";
  }
  get fileExtension() {
    return ".webm";
  }
  get mimeType() {
    return "video/webm";
  }
  /** @internal */
  _codecUnsupportedHint(codec) {
    if (new MkvOutputFormat().getSupportedCodecs().includes(codec)) {
      return " Switching to MKV will grant support for this codec.";
    }
    return "";
  }
};

// node_modules/mediabunny/dist/modules/src/media-source.js
var MediaSource = class {
  constructor() {
    this._connectedTrack = null;
    this._closingPromise = null;
    this._closed = false;
    this._timestampOffset = 0;
  }
  /** @internal */
  _ensureValidAdd() {
    if (!this._connectedTrack) {
      throw new Error("Source is not connected to an output track.");
    }
    if (this._connectedTrack.output.state === "canceled") {
      throw new Error("Output has been canceled.");
    }
    if (this._connectedTrack.output.state === "finalizing" || this._connectedTrack.output.state === "finalized") {
      throw new Error("Output has been finalized.");
    }
    if (this._connectedTrack.output.state === "pending") {
      throw new Error("Output has not started.");
    }
    if (this._closed) {
      throw new Error("Source is closed.");
    }
  }
  /** @internal */
  async _start() {
  }
  /** @internal */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async _flushAndClose(forceClose) {
  }
  /**
   * Closes this source. This prevents future samples from being added and signals to the output file that no further
   * samples will come in for this track. Calling `.close()` is optional but recommended after adding the
   * last sample - for improved performance and reduced memory usage.
   */
  close() {
    if (this._closingPromise) {
      return;
    }
    const connectedTrack = this._connectedTrack;
    if (!connectedTrack) {
      throw new Error("Cannot call close without connecting the source to an output track.");
    }
    if (connectedTrack.output.state === "pending") {
      throw new Error("Cannot call close before output has been started.");
    }
    this._closingPromise = (async () => {
      await this._flushAndClose(false);
      this._closed = true;
      if (connectedTrack.output.state === "finalizing" || connectedTrack.output.state === "finalized") {
        return;
      }
      connectedTrack.output._muxer.onTrackClose(connectedTrack);
    })();
  }
  /** @internal */
  async _flushOrWaitForOngoingClose(forceClose) {
    return this._closingPromise ??= (async () => {
      await this._flushAndClose(forceClose);
      this._closed = true;
    })();
  }
};
var VideoSource = class extends MediaSource {
  /** Internal constructor. */
  constructor(codec) {
    super();
    this._connectedTrack = null;
    if (!VIDEO_CODECS.includes(codec)) {
      throw new TypeError(`Invalid video codec '${codec}'. Must be one of: ${VIDEO_CODECS.join(", ")}.`);
    }
    this._codec = codec;
  }
};
var EncodedVideoPacketSource = class extends VideoSource {
  /** Creates a new {@link EncodedVideoPacketSource} whose packets are encoded using `codec`. */
  constructor(codec) {
    super(codec);
  }
  /**
   * Adds an encoded packet to the output video track. Packets must be added in *decode order*, while a packet's
   * timestamp must be its *presentation timestamp*. B-frames are handled automatically.
   *
   * @param meta - Additional metadata from the encoder. You should pass this for the first call, including a valid
   * decoder config.
   *
   * @returns A Promise that resolves once the output is ready to receive more samples. You should await this Promise
   * to respect writer and encoder backpressure.
   */
  add(packet, meta) {
    if (!(packet instanceof EncodedPacket)) {
      throw new TypeError("packet must be an EncodedPacket.");
    }
    if (packet.isMetadataOnly) {
      throw new TypeError("Metadata-only packets cannot be added.");
    }
    if (meta !== void 0 && (!meta || typeof meta !== "object")) {
      throw new TypeError("meta, when provided, must be an object.");
    }
    this._ensureValidAdd();
    return this._connectedTrack.output._muxer.addEncodedVideoPacket(this._connectedTrack, packet, meta);
  }
};
var AudioSource = class extends MediaSource {
  /** Internal constructor. */
  constructor(codec) {
    super();
    this._connectedTrack = null;
    if (!AUDIO_CODECS.includes(codec)) {
      throw new TypeError(`Invalid audio codec '${codec}'. Must be one of: ${AUDIO_CODECS.join(", ")}.`);
    }
    this._codec = codec;
  }
};
var SubtitleSource = class extends MediaSource {
  /** Internal constructor. */
  constructor(codec) {
    super();
    this._connectedTrack = null;
    if (!SUBTITLE_CODECS.includes(codec)) {
      throw new TypeError(`Invalid subtitle codec '${codec}'. Must be one of: ${SUBTITLE_CODECS.join(", ")}.`);
    }
    this._codec = codec;
  }
};

// node_modules/mediabunny/dist/modules/src/output.js
var ALL_TRACK_TYPES = ["video", "audio", "subtitle"];
var validateBaseTrackMetadata = (metadata) => {
  if (!metadata || typeof metadata !== "object") {
    throw new TypeError("metadata must be an object.");
  }
  if (metadata.languageCode !== void 0 && !isIso639Dash2LanguageCode(metadata.languageCode)) {
    throw new TypeError("metadata.languageCode, when provided, must be a three-letter, ISO 639-2/T language code.");
  }
  if (metadata.name !== void 0 && typeof metadata.name !== "string") {
    throw new TypeError("metadata.name, when provided, must be a string.");
  }
  if (metadata.disposition !== void 0) {
    validateTrackDisposition(metadata.disposition);
  }
  if (metadata.maximumPacketCount !== void 0 && (!Number.isInteger(metadata.maximumPacketCount) || metadata.maximumPacketCount < 0)) {
    throw new TypeError("metadata.maximumPacketCount, when provided, must be a non-negative integer.");
  }
};
var Output = class {
  /**
   * Creates a new instance of {@link Output} which can then be used to create a new media file according to the
   * specified {@link OutputOptions}.
   */
  constructor(options) {
    this.state = "pending";
    this._tracks = [];
    this._startPromise = null;
    this._cancelPromise = null;
    this._finalizePromise = null;
    this._mutex = new AsyncMutex();
    this._metadataTags = {};
    if (!options || typeof options !== "object") {
      throw new TypeError("options must be an object.");
    }
    if (!(options.format instanceof OutputFormat)) {
      throw new TypeError("options.format must be an OutputFormat.");
    }
    if (!(options.target instanceof Target)) {
      throw new TypeError("options.target must be a Target.");
    }
    if (options.target._output) {
      throw new Error("Target is already used for another output.");
    }
    options.target._output = this;
    this.format = options.format;
    this.target = options.target;
    this._writer = options.target._createWriter();
    this._muxer = options.format._createMuxer(this);
  }
  /** Adds a video track to the output with the given source. Can only be called before the output is started. */
  addVideoTrack(source, metadata = {}) {
    if (!(source instanceof VideoSource)) {
      throw new TypeError("source must be a VideoSource.");
    }
    validateBaseTrackMetadata(metadata);
    if (metadata.rotation !== void 0 && ![0, 90, 180, 270].includes(metadata.rotation)) {
      throw new TypeError(`Invalid video rotation: ${metadata.rotation}. Has to be 0, 90, 180 or 270.`);
    }
    if (!this.format.supportsVideoRotationMetadata && metadata.rotation) {
      throw new Error(`${this.format._name} does not support video rotation metadata.`);
    }
    if (metadata.frameRate !== void 0 && (!Number.isFinite(metadata.frameRate) || metadata.frameRate <= 0)) {
      throw new TypeError(`Invalid video frame rate: ${metadata.frameRate}. Must be a positive number.`);
    }
    this._addTrack("video", source, metadata);
  }
  /** Adds an audio track to the output with the given source. Can only be called before the output is started. */
  addAudioTrack(source, metadata = {}) {
    if (!(source instanceof AudioSource)) {
      throw new TypeError("source must be an AudioSource.");
    }
    validateBaseTrackMetadata(metadata);
    this._addTrack("audio", source, metadata);
  }
  /** Adds a subtitle track to the output with the given source. Can only be called before the output is started. */
  addSubtitleTrack(source, metadata = {}) {
    if (!(source instanceof SubtitleSource)) {
      throw new TypeError("source must be a SubtitleSource.");
    }
    validateBaseTrackMetadata(metadata);
    this._addTrack("subtitle", source, metadata);
  }
  /**
   * Sets descriptive metadata tags about the media file, such as title, author, date, or cover art. When called
   * multiple times, only the metadata from the last call will be used.
   *
   * Can only be called before the output is started.
   */
  setMetadataTags(tags) {
    validateMetadataTags(tags);
    if (this.state !== "pending") {
      throw new Error("Cannot set metadata tags after output has been started or canceled.");
    }
    this._metadataTags = tags;
  }
  /** @internal */
  _addTrack(type, source, metadata) {
    if (this.state !== "pending") {
      throw new Error("Cannot add track after output has been started or canceled.");
    }
    if (source._connectedTrack) {
      throw new Error("Source is already used for a track.");
    }
    const supportedTrackCounts = this.format.getSupportedTrackCounts();
    const presentTracksOfThisType = this._tracks.reduce((count, track2) => count + (track2.type === type ? 1 : 0), 0);
    const maxCount = supportedTrackCounts[type].max;
    if (presentTracksOfThisType === maxCount) {
      throw new Error(maxCount === 0 ? `${this.format._name} does not support ${type} tracks.` : `${this.format._name} does not support more than ${maxCount} ${type} track${maxCount === 1 ? "" : "s"}.`);
    }
    const maxTotalCount = supportedTrackCounts.total.max;
    if (this._tracks.length === maxTotalCount) {
      throw new Error(`${this.format._name} does not support more than ${maxTotalCount} tracks${maxTotalCount === 1 ? "" : "s"} in total.`);
    }
    const track = {
      id: this._tracks.length + 1,
      output: this,
      type,
      source,
      metadata
    };
    if (track.type === "video") {
      const supportedVideoCodecs = this.format.getSupportedVideoCodecs();
      if (supportedVideoCodecs.length === 0) {
        throw new Error(`${this.format._name} does not support video tracks.` + this.format._codecUnsupportedHint(track.source._codec));
      } else if (!supportedVideoCodecs.includes(track.source._codec)) {
        throw new Error(`Codec '${track.source._codec}' cannot be contained within ${this.format._name}. Supported video codecs are: ${supportedVideoCodecs.map((codec) => `'${codec}'`).join(", ")}.` + this.format._codecUnsupportedHint(track.source._codec));
      }
    } else if (track.type === "audio") {
      const supportedAudioCodecs = this.format.getSupportedAudioCodecs();
      if (supportedAudioCodecs.length === 0) {
        throw new Error(`${this.format._name} does not support audio tracks.` + this.format._codecUnsupportedHint(track.source._codec));
      } else if (!supportedAudioCodecs.includes(track.source._codec)) {
        throw new Error(`Codec '${track.source._codec}' cannot be contained within ${this.format._name}. Supported audio codecs are: ${supportedAudioCodecs.map((codec) => `'${codec}'`).join(", ")}.` + this.format._codecUnsupportedHint(track.source._codec));
      }
    } else if (track.type === "subtitle") {
      const supportedSubtitleCodecs = this.format.getSupportedSubtitleCodecs();
      if (supportedSubtitleCodecs.length === 0) {
        throw new Error(`${this.format._name} does not support subtitle tracks.` + this.format._codecUnsupportedHint(track.source._codec));
      } else if (!supportedSubtitleCodecs.includes(track.source._codec)) {
        throw new Error(`Codec '${track.source._codec}' cannot be contained within ${this.format._name}. Supported subtitle codecs are: ${supportedSubtitleCodecs.map((codec) => `'${codec}'`).join(", ")}.` + this.format._codecUnsupportedHint(track.source._codec));
      }
    }
    this._tracks.push(track);
    source._connectedTrack = track;
  }
  /**
   * Starts the creation of the output file. This method should be called after all tracks have been added. Only after
   * the output has started can media samples be added to the tracks.
   *
   * @returns A promise that resolves when the output has successfully started and is ready to receive media samples.
   */
  async start() {
    const supportedTrackCounts = this.format.getSupportedTrackCounts();
    for (const trackType of ALL_TRACK_TYPES) {
      const presentTracksOfThisType = this._tracks.reduce((count, track) => count + (track.type === trackType ? 1 : 0), 0);
      const minCount = supportedTrackCounts[trackType].min;
      if (presentTracksOfThisType < minCount) {
        throw new Error(minCount === supportedTrackCounts[trackType].max ? `${this.format._name} requires exactly ${minCount} ${trackType} track${minCount === 1 ? "" : "s"}.` : `${this.format._name} requires at least ${minCount} ${trackType} track${minCount === 1 ? "" : "s"}.`);
      }
    }
    const totalMinCount = supportedTrackCounts.total.min;
    if (this._tracks.length < totalMinCount) {
      throw new Error(totalMinCount === supportedTrackCounts.total.max ? `${this.format._name} requires exactly ${totalMinCount} track${totalMinCount === 1 ? "" : "s"}.` : `${this.format._name} requires at least ${totalMinCount} track${totalMinCount === 1 ? "" : "s"}.`);
    }
    if (this.state === "canceled") {
      throw new Error("Output has been canceled.");
    }
    if (this._startPromise) {
      console.warn("Output has already been started.");
      return this._startPromise;
    }
    return this._startPromise = (async () => {
      this.state = "started";
      this._writer.start();
      const release = await this._mutex.acquire();
      await this._muxer.start();
      const promises = this._tracks.map((track) => track.source._start());
      await Promise.all(promises);
      release();
    })();
  }
  /**
   * Resolves with the full MIME type of the output file, including track codecs.
   *
   * The returned promise will resolve only once the precise codec strings of all tracks are known.
   */
  getMimeType() {
    return this._muxer.getMimeType();
  }
  /**
   * Cancels the creation of the output file, releasing internal resources like encoders and preventing further
   * samples from being added.
   *
   * @returns A promise that resolves once all internal resources have been released.
   */
  async cancel() {
    if (this._cancelPromise) {
      console.warn("Output has already been canceled.");
      return this._cancelPromise;
    } else if (this.state === "finalizing" || this.state === "finalized") {
      console.warn("Output has already been finalized.");
      return;
    }
    return this._cancelPromise = (async () => {
      this.state = "canceled";
      const release = await this._mutex.acquire();
      const promises = this._tracks.map((x) => x.source._flushOrWaitForOngoingClose(true));
      await Promise.all(promises);
      await this._writer.close();
      release();
    })();
  }
  /**
   * Finalizes the output file. This method must be called after all media samples across all tracks have been added.
   * Once the Promise returned by this method completes, the output file is ready.
   */
  async finalize() {
    if (this.state === "pending") {
      throw new Error("Cannot finalize before starting.");
    }
    if (this.state === "canceled") {
      throw new Error("Cannot finalize after canceling.");
    }
    if (this._finalizePromise) {
      console.warn("Output has already been finalized.");
      return this._finalizePromise;
    }
    return this._finalizePromise = (async () => {
      this.state = "finalizing";
      const release = await this._mutex.acquire();
      const promises = this._tracks.map((x) => x.source._flushOrWaitForOngoingClose(false));
      await Promise.all(promises);
      await this._muxer.finalize();
      await this._writer.flush();
      await this._writer.finalize();
      this.state = "finalized";
      release();
    })();
  }
};

// node_modules/mediabunny/dist/modules/src/index.js
var MEDIABUNNY_LOADED_SYMBOL = /* @__PURE__ */ Symbol.for("mediabunny loaded");
if (globalThis[MEDIABUNNY_LOADED_SYMBOL]) {
  console.error("[WARNING]\nMediabunny was loaded twice. This will likely cause Mediabunny not to work correctly. Check if multiple dependencies are importing different versions of Mediabunny, or if something is being bundled incorrectly.");
}
globalThis[MEDIABUNNY_LOADED_SYMBOL] = true;

// node_modules/media-codecs/src/vp.js
var vp_exports = {};
__export(vp_exports, {
  VP_BIT_DEPTH: () => VP_BIT_DEPTH,
  VP_CODECS: () => VP_CODECS,
  VP_LEVELS: () => VP_LEVELS,
  VP_PROFILES: () => VP_PROFILES,
  formatCodec: () => formatCodec,
  formatLevel: () => formatLevel,
  getAllItems: () => getAllItems,
  getCodec: () => getCodec,
  getCodecName: () => getCodecName
});
var VP_CODECS = [
  { name: "VP8", cccc: "vp08" },
  { name: "VP9", cccc: "vp09" }
  // { name: "VP10", cccc: "vp10" },
];
var VP_PROFILES = [0, 1, 2, 3];
var VP_LEVELS = [
  "1",
  "1.1",
  "2",
  "2.1",
  "3",
  "3.1",
  "4",
  "4.1",
  "5",
  "5.1",
  "5.2",
  "6",
  "6.1",
  "6.2"
];
var VP_BIT_DEPTH = [8, 10, 12];
var formatProfile = (profile) => String(profile).padStart(2, "0");
var formatLevel = (level) => String(parseFloat(level) * 10).padStart(2, "0");
var formatBitDepth = (bitDepth) => String(bitDepth).padStart(2, "0");
var formatCodec = (cccc2, PP, LL, DD) => `${cccc2}.${PP}.${LL}.${DD}`;
var getAllItems = () => VP_CODECS.map(
  (codec) => VP_PROFILES.map(
    (profile) => VP_LEVELS.map(
      (level) => VP_BIT_DEPTH.map((bitDepth) => ({
        name: `${codec.name} Profile ${profile} Level ${level} BitDepth ${bitDepth}`,
        codec: formatCodec(
          codec.cccc,
          formatProfile(profile),
          formatLevel(level),
          formatBitDepth(bitDepth)
        )
      }))
    )
  )
).flat(4);
var getCodec = ({ name, profile, level, bitDepth }) => {
  const codec = VP_CODECS.find((codec2) => codec2.name === name);
  if (!codec) throw new Error(`Unknown VP Codec "${name}"`);
  if (!VP_PROFILES.includes(profile)) {
    throw new Error(`Unknown VP Profile "${profile}"`);
  }
  if (!VP_LEVELS.includes(level)) {
    throw new Error(`Unknown VP Level "${level}"`);
  }
  if (!VP_BIT_DEPTH.includes(bitDepth)) {
    throw new Error(`Unknown VP BitDepth "${bitDepth}"`);
  }
  return formatCodec(
    codec.cccc,
    formatProfile(profile),
    formatLevel(level),
    formatBitDepth(bitDepth)
  );
};
var getCodecName = (codec) => getAllItems().find((item) => item.codec === codec)?.name;

// node_modules/media-codecs/src/avc.js
var avc_exports = {};
__export(avc_exports, {
  AVC_LEVELS: () => AVC_LEVELS,
  AVC_PROFILES: () => AVC_PROFILES,
  formatCodec: () => formatCodec2,
  formatLevel: () => formatLevel2,
  getAllItems: () => getAllItems2,
  getCodec: () => getCodec2,
  getCodecName: () => getCodecName2
});
var AVC_PROFILES = [
  { name: "Constrained Baseline", PP: "42", CC: "40" },
  { name: "Baseline", PP: "42", CC: "00" },
  { name: "Extended", PP: "58", CC: "00" },
  { name: "Main", PP: "4d", CC: "00" },
  { name: "High", PP: "64", CC: "00" },
  { name: "Progressive High", PP: "64", CC: "08" },
  { name: "Constrained High", PP: "64", CC: "0c" },
  { name: "High 10", PP: "6e", CC: "00" },
  { name: "High 4:2:2", PP: "7a", CC: "00" },
  { name: "High 4:4:4 Predictive", PP: "f4", CC: "00" },
  { name: "High 10 Intra", PP: "6e", CC: "10" },
  { name: "High 4:2:2 Intra", PP: "7a", CC: "10" },
  { name: "High 4:4:4 Intra", PP: "f4", CC: "10" },
  { name: "CAVLC 4:4:4 Intra", PP: "44", CC: "00" },
  { name: "Scalable Baseline", PP: "53", CC: "00" },
  { name: "Scalable Constrained Baseline", PP: "53", CC: "04" },
  { name: "Scalable High", PP: "56", CC: "00" },
  { name: "Scalable Constrained High", PP: "56", CC: "04" },
  { name: "Scalable High Intra", PP: "56", CC: "20" },
  { name: "Stereo High", PP: "80", CC: "00" },
  { name: "Multiview High", PP: "76", CC: "00" },
  { name: "Multiview Depth High", PP: "8a", CC: "00" }
];
var cccc = "avc1";
var AVC_LEVELS = [
  "1",
  "1.1",
  "1.2",
  "1.3",
  "2",
  "2.1",
  "2.2",
  "3",
  "3.1",
  "3.2",
  "4",
  "4.1",
  "4.2",
  "5",
  "5.1",
  "5.2",
  "6",
  "6.1",
  "6.2"
];
var formatLevel2 = (level) => (parseFloat(level) * 10).toString(16).padStart(2, "0");
var formatCodec2 = (cccc2, { PP, CC }, LL) => `${cccc2}.${PP}${CC}${LL}`;
var getAllItems2 = () => AVC_PROFILES.map(
  (profile) => AVC_LEVELS.map((level) => ({
    name: `AVC ${profile.name} Profile Level ${level}`,
    codec: formatCodec2(cccc, profile, formatLevel2(level))
  }))
).flat();
var getCodec2 = ({ profile: profileName, level }) => {
  if (!AVC_LEVELS.includes(level))
    throw new Error(`Unknown AVC Level "${level}"`);
  const profile = AVC_PROFILES.find((profile2) => profile2.name === profileName);
  if (!profile) throw new Error(`Unknown AVC Profile "${profileName}"`);
  return formatCodec2(cccc, profile, formatLevel2(level));
};
var getCodecName2 = (codec) => getAllItems2().find((item) => item.codec === codec)?.name;

// node_modules/canvas-record/src/encoders/Encoder.js
var Encoder = class _Encoder {
  /**
   * The extension the encoder supports
   * @type {Extensions[]}
   */
  static supportedExtensions = ["mp4", "webm"];
  /**
   * The target to download the file to.
   * @type {EncoderTarget[]}
   */
  static supportedTargets = ["in-browser"];
  static defaultOptions = {
    frameMethod: "blob",
    extension: _Encoder.supportedExtensions[0],
    target: _Encoder.supportedTargets[0]
  };
  /**
   * Base Encoder class. All Encoders extend it and its methods are called by the Recorder.
   * @class Encoder
   * @param {object} options
   *
   * @property {EncoderTarget} target
   * @property {EncoderExtensions} extension
   * @property {object} [encoderOptions]
   * @property {object} [muxerOptions]
   */
  constructor(options) {
    Object.assign(this, options);
  }
  /**
   * Setup the encoder: load binary, instantiate muxers, setup file system target...
   * @param {object} options
   */
  async init(options) {
    Object.assign(this, options);
  }
  // File System API
  async getDirectory() {
    if (!("showDirectoryPicker" in window)) return;
    return await window.showDirectoryPicker();
  }
  async getDirectoryHandle(directory, name) {
    return await directory.getDirectoryHandle(name, { create: true });
  }
  async getFileHandle(name, options) {
    if (this.directoryHandle) {
      return await this.directoryHandle.getFileHandle(name, { create: true });
    }
    if (!("showSaveFilePicker" in window)) return;
    return await window.showSaveFilePicker({
      suggestedName: name,
      ...options
    });
  }
  async getWritableFileStream(fileHandle) {
    if (await fileHandle.queryPermission({ mode: "readwrite" }) === "granted") {
      return await fileHandle.createWritable();
    }
  }
  // Override methods
  /**
   * Encode a single frame. The frameNumber is usually used for GOP (Group Of Pictures).
   * @param {number} frame
   * @param {number} [frameNumber]
   */
  async encode() {
  }
  /**
   * Stop the encoding process and cleanup the temporary data.
   * @returns {(ArrayBuffer|Uint8Array|Blob[]|undefined)}
   */
  async stop() {
  }
  /**
   * Clean up the encoder
   */
  dispose() {
  }
};
var Encoder_default = Encoder;

// node_modules/canvas-record/src/utils.js
var isWebCodecsSupported = typeof window !== "undefined" && typeof window.VideoEncoder === "function";
var estimateBitRate = (width, height, frameRate = 30, motionRank = 4, bitrateMode = "variable") => {
  const bitrate = width * height * frameRate * motionRank * 0.07 * (bitrateMode === "variable" ? 0.75 : 1);
  const roundingFactor = bitrate < 1e6 ? 1e3 : 1e6;
  return Math.round(bitrate / roundingFactor) * roundingFactor;
};

// node_modules/canvas-record/src/encoders/WebCodecsEncoder.js
var extensionToOutputFormat = {
  mp4: Mp4OutputFormat,
  mov: MovOutputFormat,
  webm: WebMOutputFormat,
  mkv: MkvOutputFormat
};
var WebCodecsEncoder = class _WebCodecsEncoder extends Encoder_default {
  static supportedExtensions = ["mp4", "mov", "webm", "mkv"];
  static supportedTargets = ["in-browser", "file-system"];
  static defaultOptions = {
    extension: _WebCodecsEncoder.supportedExtensions[0],
    groupOfPictures: 20,
    flushFrequency: 10
  };
  get frameMethod() {
    return "videoFrame";
  }
  /**
   * @param {WebCodecsEncoderOptions} [options]
   */
  constructor(options) {
    super({ ..._WebCodecsEncoder.defaultOptions, ...options });
  }
  async init(options) {
    super.init(options);
    if (this.target === "file-system") {
      const fileHandle = await this.getFileHandle(this.filename, {
        types: [
          {
            description: "Video File",
            accept: { [this.mimeType.split(";")[0]]: [`.${this.extension}`] }
          }
        ]
      });
      this.writableFileStream = await this.getWritableFileStream(fileHandle);
    }
    const format = new extensionToOutputFormat[this.extension]({
      fastStart: this.writableFileStream ? false : "in-memory"
    });
    const codec = this.encoderOptions?.codec || (["mp4", "mov"].includes(this.extension) ? avc_exports.getCodec({ profile: "High", level: "5.2" }) : vp_exports.getCodec({ name: "VP9", profile: 0, level: "1", bitDepth: 8 }));
    const [CCCC] = codec.split(".");
    this.muxer = new Output({
      format,
      target: this.writableFileStream ? new StreamTarget(this.writableFileStream) : new BufferTarget(),
      ...this.muxerOptions
    });
    let videoCodec;
    if (CCCC.startsWith("hev") || CCCC.startsWith("hvc")) {
      videoCodec = "hevc";
    } else if (CCCC.startsWith("avc1")) {
      videoCodec = "avc";
    } else if (CCCC.startsWith("av01")) {
      videoCodec = "av1";
    } else if (CCCC.startsWith("vp")) {
      videoCodec = vp_exports.VP_CODECS.find(
        (codec2) => codec2.cccc === CCCC
      ).name.toLowerCase();
    }
    const videoSource = new EncodedVideoPacketSource(videoCodec);
    this.muxer.addVideoTrack(videoSource, { frameRate: this.frameRate });
    this.encoder = new VideoEncoder({
      output: async (chunk, meta) => {
        await videoSource.add(EncodedPacket.fromEncodedChunk(chunk), meta);
      },
      error: (e) => console.error(e)
    });
    const config = {
      width: this.width,
      height: this.height,
      framerate: this.frameRate,
      bitrate: estimateBitRate(
        this.width,
        this.height,
        this.frameRate,
        this.encoderOptions.bitrateMode
      ),
      // bitrate: 1e6,
      // alpha: "discard", // "keep"
      // bitrateMode: "variable", // "constant"
      // latencyMode: "quality", // "realtime" (faster encoding)
      // hardwareAcceleration: "no-preference", // "prefer-hardware" "prefer-software"
      ...this.encoderOptions,
      codec
    };
    this.encoder.configure(config);
    if (!(await VideoEncoder.isConfigSupported(config)).supported) {
      throw new Error(
        `canvas-record: Unsupported VideoEncoder config
 ${JSON.stringify(
          config
        )}`
      );
    }
  }
  async encode(frame, number) {
    if (number === 0) await this.muxer.start();
    const keyFrame = number % this.groupOfPictures === 0;
    this.encoder.encode(frame, { keyFrame });
    frame.close();
    if (this.flushFrequency && (number + 1) % this.flushFrequency === 0) {
      await this.encoder.flush();
    }
  }
  async stop() {
    await this.encoder.flush();
    await this.muxer.finalize();
    return this.muxer.target?.buffer;
  }
  async dispose() {
    this.encoder = null;
  }
};
var WebCodecsEncoder_default = WebCodecsEncoder;
export {
  vp_exports as VP,
  WebCodecsEncoder_default as WebCodecsEncoder
};
/*! Bundled license information:

mediabunny/dist/modules/src/misc.js:
mediabunny/dist/modules/src/metadata.js:
mediabunny/dist/modules/shared/bitstream.js:
mediabunny/dist/modules/shared/aac-misc.js:
mediabunny/dist/modules/src/codec.js:
mediabunny/dist/modules/shared/ac3-misc.js:
mediabunny/dist/modules/src/codec-data.js:
mediabunny/dist/modules/src/packet.js:
mediabunny/dist/modules/src/isobmff/isobmff-misc.js:
mediabunny/dist/modules/src/isobmff/isobmff-reader.js:
mediabunny/dist/modules/src/matroska/ebml.js:
mediabunny/dist/modules/src/matroska/matroska-misc.js:
mediabunny/dist/modules/src/adts/adts-reader.js:
mediabunny/dist/modules/src/reader.js:
mediabunny/dist/modules/src/muxer.js:
mediabunny/dist/modules/src/subtitles.js:
mediabunny/dist/modules/src/isobmff/isobmff-boxes.js:
mediabunny/dist/modules/src/writer.js:
mediabunny/dist/modules/src/target.js:
mediabunny/dist/modules/src/isobmff/isobmff-muxer.js:
mediabunny/dist/modules/src/matroska/matroska-muxer.js:
mediabunny/dist/modules/src/output-format.js:
mediabunny/dist/modules/src/media-source.js:
mediabunny/dist/modules/src/output.js:
mediabunny/dist/modules/src/index.js:
  (*!
   * Copyright (c) 2026-present, Vanilagy and contributors
   *
   * This Source Code Form is subject to the terms of the Mozilla Public
   * License, v. 2.0. If a copy of the MPL was not distributed with this
   * file, You can obtain one at https://mozilla.org/MPL/2.0/.
   *)
*/
