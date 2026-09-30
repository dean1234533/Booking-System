const XML_ATTRIBUTE_ESCAPES = {
  "&": "&amp;",
  '"': "&quot;",
  "<": "&lt;",
  ">": "&gt;",
};

function escapeXmlAttribute(value) {
  return String(value).replace(/[&"<>]/g, char => XML_ATTRIBUTE_ESCAPES[char]);
}

export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return btoa(binary);
}

export function createSquareFaviconSvg({ imageDataUrl, backgroundColor = "#ffffff" }) {
  const safeImageDataUrl = escapeXmlAttribute(imageDataUrl);
  const safeBackground = escapeXmlAttribute(backgroundColor);

  // Keep the whole uploaded logo visible while placing it inside a genuinely
  // square canvas. The 10% safe area also makes this suitable for maskable
  // PWA icons without changing the stable URL Google indexes.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="64" fill="${safeBackground}"/>
  <image href="${safeImageDataUrl}" x="52" y="52" width="408" height="408" preserveAspectRatio="xMidYMid meet"/>
</svg>`;
}
