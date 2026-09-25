/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    primary: '#1D4ED8',   // Royal Blue
                    secondary: '#2563EB', // Blue Accent
                    light: '#EFF6FF',     // Soft Blue Background
                    card: '#FFFFFF',      // White Container
                    dark: '#172554',      // Dark Blue Text
                },
                kds: {
                    free: '#2E7D32',      // Kosong (Hijau)
                    cooking: '#E65100',   // Dapur Memasak (Oranye)
                    ready: '#1565C0',     // Siap Bayar (Biru)
                    addition: '#D32F2F', // Tambahan Pesanan (Merah)
                }
            }
        },
    },
    plugins: [],
}