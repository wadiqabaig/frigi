// On laptops, browsers can't open the camera from a file picker, so we suggest the phone
// instead and show a QR code that opens this site there.
import QRCode from 'qrcode'
import { Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'

/** True on phones and tablets (touch screen as the main pointer). */
export const hasTouchCamera = () => {
  try { return window.matchMedia('(pointer: coarse)').matches } catch { return false }
}

export function PhoneQr() {
  const [src, setSrc] = useState<string | null>(null)
  const url = window.location.origin
  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: '#31170E', light: '#FFFFFF' } })
      .then(setSrc)
      .catch(() => setSrc(null))
  }, [url])
  return (
    <div className="mt-5 flex flex-col items-center gap-4 rounded-4xl bg-sun-50 p-4 text-left sm:flex-row">
      {src && <img src={src} alt={`QR code that opens ${url}`} className="h-28 w-28 shrink-0 rounded-2xl bg-white p-1.5 shadow-soft" />}
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-bold text-brown"><Smartphone size={17} /> Want to use your camera?</p>
        <p className="mt-1 text-sm text-brown-70">Scan this code with your phone to open Frigi there, log in, and take the photos directly. Your fridge list syncs back to this computer.</p>
      </div>
    </div>
  )
}
