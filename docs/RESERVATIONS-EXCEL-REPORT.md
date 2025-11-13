# Reporte Excel de Reservas

## Descripción General

Este documento describe el funcionamiento del reporte Excel de reservas (`generateReservationsExcelReport`), una funcionalidad crítica del sistema PMS que genera reportes detallados de check-ins con información financiera y de facturación.

## Endpoint

```
GET /reservations/reports/excel
```

### Query Parameters

- `startDate` (required): Fecha de inicio en formato `YYYY-MM-DD`
- `endDate` (required): Fecha de fin en formato `YYYY-MM-DD`

### Response

Archivo Excel descargable con nombre: `reservas_YYYY-MM-DD_YYYY-MM-DD.xlsx`

## Funcionalidad Principal

El reporte agrupa todas las reservas por día de check-in y muestra información detallada de cada una, incluyendo:
- Datos del huésped
- Información de habitación
- Métodos de pago
- Montos (facturados o totales)
- Datos de facturación (RUC, empresa, boleta/factura)
- Consumos POS (productos, servicios extras)

## Lógica de Filtrado

### Zona Horaria

**Zona horaria base:** `America/Lima` (UTC-5)

### Conversión de Fechas para Filtrado

El sistema convierte las fechas proporcionadas a formato UTC para consultar la base de datos:

```typescript
// Entrada del usuario: "2025-11-12" (startDate)
// Se convierte a: "2025-11-12T05:00:00.000Z" en UTC
// Equivale a: 2025-11-12 00:00:00 en hora Perú

// Entrada del usuario: "2025-11-30" (endDate)  
// Se convierte a: "2025-11-30T04:59:59.999Z" en UTC
// Equivale a: 2025-11-30 23:59:59.999 en hora Perú
```

**Razón:** PostgreSQL almacena timestamps en UTC en la columna `checkInTime`. Esta conversión garantiza que se filtren correctamente los check-ins realizados en horario peruano.

### Columna de Filtrado

**Columna utilizada:** `checkInTime` (tipo `timestamptz`)

**Importante:** 
- Solo se incluyen reservas con `checkInTime` no nulo (check-ins reales)
- No se filtra por `checkInDate` (fecha estimada) sino por `checkInTime` (timestamp real del check-in)
- Esto asegura que solo se reporten huéspedes que efectivamente hicieron check-in en el rango de fechas

## Estructura del Reporte

### Agrupación por Día

Las reservas se agrupan por día usando la fecha del `checkInTime` convertida a hora Perú:

```typescript
// Ejemplo de agrupación:
// checkInTime en BD: "2025-11-12T15:30:00.000Z" (UTC)
// Convertido a Perú: "2025-11-12 10:30:00" (UTC-5)
// dayKey: "2025-11-12"
```

### Encabezados de Día

Formato: `"DD de mes de YYYY"` (español)

Ejemplo: `"12 de noviembre de 2025"`

### Columnas del Reporte (13 total)

| # | Columna | Descripción | Ancho |
|---|---------|-------------|-------|
| A | Fecha | Fecha del check-in (dd/MM/yyyy) | 15 |
| B | Check-In | Hora de entrada (HH:mm) | 12 |
| C | Check-Out | Hora de salida (HH:mm) | 12 |
| D | Documento | Tipo y número de documento del huésped | 15 |
| E | Nombres y Apellidos | Nombre completo del huésped | 35 |
| F | Habitación | Número de habitación | 12 |
| G | Método de Pago | Métodos de pago utilizados (traducidos) | 25 |
| H | Monto | Monto facturado o total de reserva | 12 |
| I | RUC | RUC del cliente (si tiene factura) | 15 |
| J | EMPRESA | Razón social (si tiene factura) | 30 |
| K | Boleta | Número de serie-correlativo de boleta/factura | 18 |
| L | OBS | Observaciones (actualmente vacío) | 20 |
| M | POS | Consumos adicionales agrupados | 30 |

## Lógicas Especiales

### 1. Lógica de Monto (Columna H)

**Regla crítica:** El monto depende de si existe facturación o no.

```typescript
if (tiene invoice - factura o boleta) {
  monto = total del invoice
} else {
  monto = totalAmount de la reserva
}
```

**Razón:** Cuando se declara/factura, puede que no se facturen todos los cargos del folio (ejemplo: solo se factura la habitación pero no el minibar). El campo `includedInInvoice` en `FolioCharge` indica qué cargos se facturaron.

### 2. Traducción de Métodos de Pago (Columna G)

Traducciones aplicadas:
- `cash` → "Efectivo"
- `card` → "Tarjeta"
- `transfer` → "Transferencia"
- `yape` → "Yape"
- `plin` → "Plin"

**Formato:** Si hay múltiples métodos se concatenan con ` | `

Ejemplo: `"Efectivo | Tarjeta"`

### 3. Columna POS (Columna M)

**Propósito:** Mostrar consumos adicionales (no habitación) del huésped.

**Lógica de Agrupación:**

```typescript
// Se agrupan los folio charges que NO son de tipo ROOM
// Se cuenta cuántas veces aparece cada producto/servicio

// Ejemplo de salida:
"3 uds Cerveza Pilsen | 2 uds Gaseosa Inka Kola | Servicio de Lavandería"
```

**Reglas:**
- Solo incluye `FolioCharge` con `chargeType !== ROOM`
- Si un item aparece 1 vez: solo se muestra el nombre
- Si un item aparece más de 1 vez: se muestra `"N uds Descripción"`
- Items separados con ` | `

### 4. Búsqueda de Factura/Boleta (Columnas I, J, K)

**Prioridad de búsqueda:**
1. Busca primero FACTURA en todos los folios
2. Si encuentra FACTURA, detiene búsqueda y usa esos datos
3. Si no hay FACTURA, busca BOLETA
4. Si no hay ninguno, campos quedan vacíos

**Datos extraídos:**
- **RUC:** `customerDocumentNumber` (solo en facturas)
- **EMPRESA:** `customerName` (solo en facturas)
- **Boleta:** `series-number` (formato: "B001-0000123" o "F001-0000456")

## Sistema de Colores (Codificación Visual)

### Colores de Encabezados

- **Cabecera de día:** `#509A95` (verde-aqua) con texto blanco
- **Cabecera de columnas:** `#509A95` (verde-aqua) con texto blanco
- **Fila de totales:** `#E7E6E6` (gris claro)

### Coloración Condicional: Columna "Nombres y Apellidos" (E)

**Propósito:** Identificar visualmente el tipo de pago usado.

| Condición | Color | Código | Significado |
|-----------|-------|--------|-------------|
| Tiene efectivo Y otros métodos | Café/Marrón | `#C19A6B` | Pago mixto |
| Solo otros métodos (NO efectivo) | Verde claro | `#90EE90` | Pago electrónico/bancario |
| Solo efectivo o sin pagos | Sin color | Blanco | Pago en efectivo únicamente |

### Coloración Condicional: Columna "Boleta" (K)

**Propósito:** Identificar tipo de comprobante y método de pago.

**Matriz de decisión (6 resultados posibles):**

| Prioridad | Tipo Invoice | Métodos de Pago | Color | Código | Significado |
|-----------|--------------|-----------------|-------|--------|-------------|
| **1** | Cualquiera | Efectivo + Otros | Café/Marrón | `#C19A6B` | **Pago mixto** (máxima prioridad) |
| 2 | FACTURA | Solo otros (no efectivo) | Azul | `#4169E1` | Factura con pago electrónico |
| 3 | FACTURA | Solo efectivo | Plomo/Gris | `#A9A9A9` | Factura con pago en efectivo |
| 4 | BOLETA | Solo otros (no efectivo) | Celeste | `#87CEEB` | Boleta con pago electrónico |
| 5 | BOLETA | Solo efectivo | Verde claro | `#90EE90` | Boleta con pago en efectivo |
| 6 | Sin invoice | N/A | Sin color | Blanco | No se emitió comprobante |

**Nota:** La columna solo se colorea si existe un número de boleta/factura.

## Totales Diarios

Cada día incluye una fila de totales al final con:
- Texto **"TOTAL"** en celdas A-G (merged)
- Suma de montos en celda H
- Formato numérico: `#,##0.00`
- Color de fondo gris extendido de A-M
- Texto en negrita

## Datos de Origen (Relaciones TypeORM)

El reporte carga las siguientes relaciones:

```typescript
relations: [
  'guest',                    // Datos del huésped
  'room',                     // Número de habitación
  'folios',                   // Folios de la reserva
  'folios.payments',          // Pagos realizados
  'folios.invoices',          // Facturas/Boletas emitidas
  'folios.folioCharges',      // Cargos del folio (habitación, POS)
]
```

## Consideraciones Técnicas

### Timezone Management

- **Base de datos:** Todos los `timestamptz` se almacenan en UTC
- **Display:** Todas las fechas/horas se muestran en hora Perú (UTC-5)
- **Conversión:** Se usa `date-fns-tz` con `toZonedTime()` para conversiones precisas
- **Agrupación:** Se agrupa por fecha Perú, no por fecha UTC

### Ordenamiento

1. **Por día:** Cronológico ascendente (más antiguo primero)
2. **Dentro del día:** Por `checkInTime` ascendente (orden de llegada)

### Performance

- **Una sola consulta** para obtener todas las reservas con relaciones
- **Procesamiento en memoria** para agrupación y cálculos
- **Generación de Excel en streaming** usando ExcelJS

## Ejemplo de Uso

### Request

```http
GET /reservations/reports/excel?startDate=2025-11-12&endDate=2025-11-30
Authorization: Bearer {token}
```

### Response

```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="reservas_2025-11-12_2025-11-30.xlsx"
```

## Casos Especiales

### 1. Reserva sin Check-In

**Escenario:** Reserva con `checkInTime = null`

**Resultado:** No aparece en el reporte (filtrado en consulta SQL)

### 2. Reserva sin Pagos

**Escenario:** Folio sin payments

**Resultado:** 
- Columna "Método de Pago" queda vacía
- Celda "Nombres" sin color (blanco)
- Celda "Boleta" sin color (blanco)

### 3. Reserva con Múltiples Folios

**Escenario:** Una reserva puede tener varios folios

**Resultado:**
- Se recorren todos los folios para:
  - Agregar todos los métodos de pago encontrados
  - Buscar factura/boleta en cualquier folio
  - Sumar todos los cargos POS

### 4. Factura Parcial

**Escenario:** Se factura solo la habitación, no el minibar

**Resultado:**
- **Monto:** Total de la factura (solo habitación)
- **POS:** Muestra el minibar (porque viene del folioCharges)
- Esto permite identificar consumos no facturados

### 5. Check-In a Medianoche

**Escenario:** Check-in a las 00:15 del 13/11

**Resultado:** Aparece en el grupo del día 13 de noviembre (correcto)

**Antes del fix:** Aparecía en el día 12 (incorrecto por problema de timezone)

## Validaciones

### Backend

- `startDate` debe ser una fecha válida (ISO 8601)
- `endDate` debe ser una fecha válida (ISO 8601)
- Autenticación JWT requerida
- TenantId extraído del token para multi-tenant isolation

### Frontend (recomendado)

- Validar que `endDate >= startDate`
- Limitar rango máximo (ej: 365 días)
- Mostrar loading durante generación
- Manejar errores de descarga

## Troubleshooting

### Problema: Reporte muestra día anterior

**Causa:** Problema de zona horaria en filtrado

**Solución:** Verificar que las fechas UTC se generen correctamente:
- `startDate`: Debe agregar `T05:00:00.000Z`
- `endDate`: Debe agregar `T04:59:59.999Z`

### Problema: Monto no coincide con lo facturado

**Causa:** Puede ser correcto si hay cargos no facturados

**Solución:** 
1. Verificar columna POS para ver consumos adicionales
2. Si no hay invoice, monto es el totalAmount de la reserva
3. Si hay invoice, monto es el total del invoice (puede ser menor)

### Problema: Colores no aparecen correctamente

**Causa:** Puede ser conflicto con bordes o merge cells

**Solución:** El código aplica colores solo a índices específicos (4 y 10) y después de aplicar bordes

### Problema: Reserva no aparece

**Checklist:**
1. ¿Tiene `checkInTime` no nulo?
2. ¿El checkInTime está dentro del rango (en hora Perú)?
3. ¿Pertenece al tenant correcto?

## Mejoras Futuras Sugeridas

1. **Columna OBS:** Implementar lógica para mostrar notas relevantes
2. **Subtotales:** Agregar totales por tipo de comprobante (facturas vs boletas)
3. **Filtros adicionales:** Por habitación, por método de pago, por estado de facturación
4. **Formato PDF:** Opción para generar PDF además de Excel
5. **Programación:** Permitir programar reportes automáticos
6. **Gráficos:** Agregar hoja con gráficos de resumen
7. **Export CSV:** Opción más ligera para datasets grandes

## Referencias

- **Archivo fuente:** `src/reservations/reservations.service.ts`
- **Controlador:** `src/reservations/reservations.controller.ts`
- **DTOs:** `src/reservations/dto/filter-reservations-report.dto.ts`
- **Entidades:** 
  - `src/reservations/entities/reservation.entity.ts`
  - `src/folios/entities/folio.entity.ts`
  - `src/invoices/entities/invoice.entity.ts`
  - `src/folio-charges/entities/folio-charge.entity.ts`
  - `src/payments/entities/payment.entity.ts`

## Changelog

### Versión Actual
- ✅ Filtrado por `checkInTime` con conversión correcta de timezone
- ✅ Lógica de monto: facturado vs total de reserva
- ✅ Traducción de métodos de pago a español
- ✅ Agrupación inteligente de items POS
- ✅ Coloración condicional de nombres (3 estados)
- ✅ Coloración condicional de boleta (6 estados)
- ✅ 13 columnas con toda la información financiera

### Historial de Cambios
1. **Fix timezone:** Cambio de filtrado por `checkInDate` a `checkInTime` con conversión UTC correcta
2. **Fix monto:** Implementación de lógica invoice.total vs reservation.totalAmount
3. **POS grouping:** Conteo de items repetidos en lugar de listar individualmente
4. **Conditional coloring:** Sistemas de colores para análisis visual rápido
