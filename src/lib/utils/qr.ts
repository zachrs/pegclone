/**
 * Issue #33: Cached QR code module import.
 * Avoids re-importing on every send after the first use.
 */

let qrcodeModule: typeof import("qrcode") | null = null;

async function getQRCode() {
  if (!qrcodeModule) {
    qrcodeModule = await import("qrcode");
  }
  return qrcodeModule;
}

export async function generateQRDataUrl(
  url: string,
  options?: { width?: number; margin?: number }
): Promise<string> {
  const QRCode = await getQRCode();
  return QRCode.toDataURL(url, {
    width: options?.width ?? 300,
    margin: options?.margin ?? 2,
  });
}
