import QRCode from "qrcode";

/**
 * Génère un QR code en PNG haute résolution encodant uniquement
 * l'URL de scan (token de course + point de contrôle).
 * Aucune donnée personnelle n'est jamais encodée dans le QR code.
 */
export async function generateQrCodePngDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "H",
    margin: 2,
    scale: 12, // haute résolution pour impression
    color: {
      dark: "#0B1410",
      light: "#FFFFFF",
    },
  });
}

export function buildScanUrl(
  baseUrl: string,
  token: string,
  checkpoint: "start" | "finish"
) {
  return `${baseUrl.replace(/\/$/, "")}/scan/${token}/${checkpoint}`;
}
