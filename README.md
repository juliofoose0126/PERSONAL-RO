# Nómina de Obra

Aplicación web para control de asistencia y generación de nómina semanal de
obra, con cuadrillas organizadas por Cabo/Encargado.

## Funcionalidades

- **Pase de lista semanal** (Lun-Sáb) con valores 1.0 / 0.5 / 0 / Permiso,
  agrupado por obra con subtotales. Un toque marca "Día completo" desde el
  estado por defecto.
- **Cabos y Cuadrillas**: cada trabajador puede marcarse como Cabo/Encargado
  o asignarse a la cuadrilla de un cabo; el resumen de Nómina permite ver el
  total por Obra o por Cabo (con el total a entregarle para que reparta).
- **Sueldo semanal**: se captura el sueldo semanal y la app lo divide entre
  los 6 días laborales para calcular el sueldo diario.
- **Cálculos automáticos**: sueldo base, extras, vales/anticipos y total neto.
- **Exportación a Excel** (.xlsx) con encabezado, orden alfabético por
  obra/nombre, formato de moneda, totales con fórmulas `SUM` y hoja de resumen
  por obra.
- **Respaldo y restauración**: descarga/carga un `.json` con todos los datos,
  útil porque la app persiste en `localStorage` (atado al dominio exacto
  desde el que se abre).
- **Persistencia** en `localStorage` (obras, trabajadores y semanas
  históricas).
- Botón **"Cargar datos de ejemplo"** con 3 obras y 6 trabajadores.

## Stack

React 19 + Vite + Tailwind CSS v4 + Lucide Icons + ExcelJS + file-saver.

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run lint     # oxlint
```
