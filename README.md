# Mis Finanzas

Proyecto convertido desde un Claude Artifact a Vite + React.

## Incluye
- React + Vite
- Tailwind CSS
- `localStorage` para guardar movimientos y presupuestos en el dispositivo
- PWA mediante `manifest.json`
- Icono de aplicación
- Exportación CSV

## Ejecutar
```bash
npm install
npm run dev
```

## Generar versión de producción
```bash
npm run build
```

La carpeta `dist/` es la que posteriormente puede empaquetarse con Capacitor para generar un APK.
