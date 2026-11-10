export function encodeBase64(bytes: Uint8Array) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let encoded = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    encoded += alphabet[Math.floor(first / 4)];
    encoded += alphabet[(first % 4) * 16 + Math.floor((second ?? 0) / 16)];
    encoded += second === undefined
      ? '=='
      : `${alphabet[(second % 16) * 4 + Math.floor((third ?? 0) / 64)]}${third === undefined ? '=' : alphabet[third % 64]}`;
  }

  return encoded;
}

export function createImageDataUri(data: ArrayBuffer, contentType: string) {
  return `data:${contentType};base64,${encodeBase64(new Uint8Array(data))}`;
}
