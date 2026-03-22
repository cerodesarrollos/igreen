# iGreen — Módulo de Ventas de Equipos

> Documento técnico y de diseño. Última actualización: 22/03/2026

---

## 📌 Resumen Ejecutivo

Sistema integral para la compra, gestión y venta de iPhones usados en el local iGreen (Los Ríos 1774, CABA). Incluye catálogo de stock, cotización trade-in con IA, gestión de turnos, impresión de garantías, y atención automatizada por WhatsApp e Instagram.

**Modelo de negocio:**
- Servicio técnico → 100% iGreen (Matias), no se mezcla
- Venta de usados → negocio nuevo, potencial sociedad con Salvador (inversor de stock)

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                    CLIENTES                          │
│            WhatsApp · Instagram · Presencial         │
└──────────┬──────────────┬───────────────┬───────────┘
           │              │               │
           ▼              ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
│  WAHA/WA API │ │ Meta IG API  │ │  PWA Mobile      │
│  (Hetzner)   │ │              │ │  (Vercel)        │
└──────┬───────┘ └──────┬───────┘ └────────┬─────────┘
       │                │                   │
       ▼                ▼                   │
┌─────────────────────────┐                 │
│  n8n (ruteo mínimo)     │                 │
│  webhook → OpenClaw     │                 │
└──────────┬──────────────┘                 │
           │                                │
           ▼                                ▼
┌─────────────────────────────────────────────────────┐
│              SUPABASE (Aidaptive Core)               │
│  ig_products · ig_clients · ig_appointments          │
│  ig_sales · ig_trade_ins · ig_consignment            │
└─────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────┐
│              FRONTEND (Next.js + Vercel)              │
│  Dashboard desktop · PWA mobile · Print templates    │
└─────────────────────────────────────────────────────┘
```

---

## 🛠️ Stack Técnico

| Capa | Tecnología | Estado |
|------|-----------|--------|
| Frontend web | Next.js 14 + Tailwind CSS | ✅ Hecho |
| PWA mobile | Next.js (ruta /ventas/mobile) | ✅ Hecho |
| Impresión | HTML + @media print | ✅ Hecho |
| Base de datos | Supabase (proyecto Aidaptive Core) | ⏳ Pendiente |
| Agente IA | OpenClaw dedicado iGreen | ⏳ Pendiente |
| Ruteo mensajes | n8n (Aidaptive Core) | ⏳ Pendiente |
| WhatsApp | WAHA self-hosted (Hetzner) | ⏳ Pendiente |
| Instagram | Meta Messaging API | ⏳ Pendiente |
| Análisis fotos | GPT Vision (cotización remota) | ⏳ Pendiente |

### URLs

| Recurso | URL |
|---------|-----|
| Repo | https://github.com/cerodesarrollos/igreen |
| Vercel | https://igreen-zeta.vercel.app |
| Dashboard | /dashboard |
| Ventas desktop | /ventas |
| PWA mobile | /ventas/mobile |
| Garantía A4 | /ventas/print/garantia |
| Ticket 80mm | /ventas/print/ticket |
| Supabase | https://eacrjsuyiraaizeitfth.supabase.co |

---

## 📱 Flujo Completo de Venta

### 1. Contacto del cliente

```
Cliente ve equipo en Instagram/WhatsApp
       ↓
Escribe al número iGreen (+54 11 3577-2057) o DM de IG
       ↓
Agente IA responde:
├── Info del equipo (modelo, estado, batería, precio)
├── Envía fotos del stock
├── Cotiza trade-in si el cliente tiene equipo
└── Ofrece agendar turno para ver/comprar
```

### 2. Turno

```
IA agenda turno → equipo pasa a RESERVADO
       ↓
Recordatorio automático WA ~1 hora antes
       ↓
Cliente llega al local con ID de reserva
```

### 3. Venta presencial

```
Kennet atiende al cliente
       ↓
Muestra el equipo físicamente
       ↓
Si hay trade-in → evalúa equipo del cliente in situ
       ↓
Cobra (efectivo, transferencia, etc.)
       ↓
Imprime:
├── Certificado de Garantía (A4)
└── Ticket/Recibo (80mm térmica)
       ↓
Marca operación como COMPLETADA en el sistema
```

### 4. Post-venta

```
Equipo pasa a estado VENDIDO
Garantía queda registrada (90 días)
Rendición se actualiza si era consignación (Salvador)
```

---

## 📦 Estados de un Equipo

```
DISPONIBLE ──→ RESERVADO ──→ VENDIDO
     ↑              │
     └──────────────┘
        (no-show sin aviso)
```

| Estado | Significado | Color |
|--------|------------|-------|
| DISPONIBLE | En stock, visible para venta | 🟢 Verde |
| RESERVADO | Turno agendado, apartado | 🟡 Ámbar |
| VENDIDO | Operación completada | 🔵 Azul |

**Reglas de reserva:**
- Tolerancia: 30 minutos
- Si el cliente no viene y no avisa → vuelve a DISPONIBLE
- Si avisa que se demora → excepción manual + nuevo turno
- Si otro cliente quiere un equipo reservado → IA ofrece alternativas

---

## 💰 Modelo de Precios

### Condiciones (A/B/C)

| Estado | Descripción | Ejemplo |
|--------|------------|---------|
| **A** — Impecable | Sin marcas visibles, como nuevo | Pantalla perfecta, carcasa sin rayas |
| **B** — Detalles menores | Marcas leves de uso, no afectan funcionamiento | Micro rayas en bordes, leve desgaste |
| **C** — Uso visible | Marcas evidentes, funcional | Rayas en pantalla, golpes en esquinas |

### Tabla de Cotización Trade-in (USD)

| Modelo | Estado A | Estado B | Estado C | Batería mín. |
|--------|---------|---------|---------|-------------|
| iPhone 15 Pro Max | $380 | $320 | $250 | 80% |
| iPhone 15 Pro | $340 | $280 | $220 | 80% |
| iPhone 15 | $280 | $230 | $170 | 80% |
| iPhone 14 Pro Max | $300 | $250 | $190 | 75% |
| iPhone 14 Pro | $260 | $210 | $160 | 75% |
| iPhone 14 | $200 | $160 | $120 | 75% |
| iPhone 13 Pro Max | $220 | $180 | $130 | 70% |
| iPhone 13 Pro | $200 | $160 | $120 | 70% |
| iPhone 13 | $160 | $120 | $80 | 70% |
| iPhone 12 Pro | $120 | $90 | $60 | 65% |
| iPhone 12 | $100 | $70 | $40 | 65% |
| iPhone 11 | $70 | $50 | $30 | 60% |

> Precios editables por Matias desde el sistema. El agente IA usa esta tabla para cotizar automáticamente.

### Trade-in: reglas

- Cada operación es **independiente**: la venta tiene su ganancia y el trade-in su costo de adquisición
- El trade-in se descuenta del precio total al momento de la venta
- El equipo recibido entra como nuevo stock (estado evaluado in situ)
- Seña: **no requerida** por ahora, campo preparado en el sistema para futuro

---

## 📸 Cotización Remota (GPT Vision)

Cuando un cliente quiere cotizar su equipo sin venir al local:

```
Cliente envía fotos por WA/IG
├── Frente (pantalla)
├── Dorso
├── Laterales (bordes)
└── Screenshot de batería (Ajustes > Batería > Salud)
       ↓
GPT Vision analiza:
├── Clasificación automática: A / B / C
├── Detección de daños visibles
└── Lectura de % batería del screenshot
       ↓
Sistema cotiza según tabla de precios
       ↓
Respuesta: "Tu iPhone 13 Pro en estado B → $160 USD"
       ↓
Aclaración: "Precio sujeto a verificación presencial"
```

**Manejo de discrepancias:**
- Si al llegar la condición es peor → se recotiza con el cliente presente
- Si es mejor → se mantiene la cotización original (o se mejora a criterio)

---

## 🗄️ Base de Datos (Supabase)

### Tablas a crear

#### `ig_products` — Stock de equipos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid (PK) | |
| imei | text (unique) | IMEI del equipo |
| model | text | Ej: "iPhone 14 Pro Max" |
| capacity | text | "64GB", "128GB", "256GB", etc. |
| color | text | |
| condition | text | "A", "B", "C" |
| battery_health | int | Porcentaje (0-100) |
| defects | text | Notas de fallas/detalles |
| cost_price_usd | decimal | Precio de compra/costo |
| sale_price_usd | decimal | Precio de venta |
| status | text | "available", "reserved", "sold" |
| ownership | text | "own" o "consignment" |
| consignment_owner | text | Nombre (ej: "Salvador") |
| photos | jsonb | Array de URLs de fotos |
| listed_at | timestamptz | Fecha de carga |
| sold_at | timestamptz | Fecha de venta (nullable) |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

#### `ig_clients` — Clientes

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid (PK) | |
| name | text | Nombre completo |
| dni | text | DNI (nullable) |
| phone | text | Teléfono con código país |
| email | text | (nullable) |
| source | text | "whatsapp", "instagram", "walk_in" |
| notes | text | |
| created_at | timestamptz | |

#### `ig_appointments` — Turnos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid (PK) | |
| client_id | uuid (FK → ig_clients) | |
| product_id | uuid (FK → ig_products) | |
| scheduled_at | timestamptz | Fecha y hora del turno |
| status | text | "pending", "confirmed", "completed", "no_show", "cancelled" |
| reminder_sent | boolean | ¿Se envió recordatorio? |
| notes | text | |
| created_at | timestamptz | |

#### `ig_sales` — Ventas

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid (PK) | |
| product_id | uuid (FK → ig_products) | |
| client_id | uuid (FK → ig_clients) | |
| appointment_id | uuid (FK → ig_appointments, nullable) | |
| sale_price_usd | decimal | Precio final de venta |
| trade_in_id | uuid (FK → ig_trade_ins, nullable) | |
| trade_in_discount_usd | decimal | Descuento por trade-in |
| total_paid_usd | decimal | Lo que pagó el cliente |
| payment_method | text | "cash", "transfer", "card", "mixed" |
| warranty_number | text | Ej: "GAR-2026-0047" |
| warranty_expires_at | timestamptz | Fecha vencimiento garantía |
| sold_by | text | "kennet", "matias" |
| notes | text | |
| created_at | timestamptz | |

#### `ig_trade_ins` — Trade-ins recibidos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid (PK) | |
| sale_id | uuid (FK → ig_sales, nullable) | Venta asociada |
| client_id | uuid (FK → ig_clients) | |
| model | text | Modelo del equipo recibido |
| condition | text | "A", "B", "C" |
| battery_health | int | |
| quoted_price_usd | decimal | Precio cotizado |
| final_price_usd | decimal | Precio final acordado |
| quoted_via | text | "in_person", "gpt_vision", "manual" |
| photos | jsonb | Fotos del equipo recibido |
| entered_as_product_id | uuid (FK → ig_products, nullable) | Si entró como nuevo stock |
| created_at | timestamptz | |

#### `ig_consignment_reports` — Rendiciones Salvador

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid (PK) | |
| period_start | date | |
| period_end | date | |
| total_sold | int | Equipos vendidos del período |
| total_revenue_usd | decimal | Ingreso total |
| consignment_cost_usd | decimal | Costo de los equipos de Salvador |
| profit_usd | decimal | Ganancia |
| split_salvador_usd | decimal | Parte de Salvador |
| split_igreen_usd | decimal | Parte de iGreen |
| status | text | "draft", "sent", "confirmed" |
| notes | text | |
| created_at | timestamptz | |

#### `ig_pricing` — Tabla de precios (editable)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid (PK) | |
| model | text | "iPhone 14 Pro Max" |
| condition_a_usd | decimal | Precio estado A |
| condition_b_usd | decimal | Precio estado B |
| condition_c_usd | decimal | Precio estado C |
| min_battery | int | Batería mínima requerida |
| active | boolean | default true |
| updated_at | timestamptz | |

### Vistas útiles

#### `ig_stock_summary` — Resumen de stock

```sql
SELECT 
  status,
  COUNT(*) as count,
  SUM(sale_price_usd) as total_value
FROM ig_products 
WHERE status != 'sold'
GROUP BY status;
```

#### `ig_monthly_sales` — Ventas del mes

```sql
SELECT 
  COUNT(*) as total_sales,
  SUM(total_paid_usd) as revenue,
  SUM(sale_price_usd - cost_price_usd) as gross_profit
FROM ig_sales s
JOIN ig_products p ON s.product_id = p.id
WHERE s.created_at >= date_trunc('month', now());
```

#### `ig_consignment_pending` — Pendiente de rendir

```sql
SELECT 
  p.consignment_owner,
  COUNT(*) FILTER (WHERE p.status = 'available') as in_stock,
  COUNT(*) FILTER (WHERE p.status = 'sold') as sold,
  SUM(s.sale_price_usd) FILTER (WHERE p.status = 'sold') as to_settle
FROM ig_products p
LEFT JOIN ig_sales s ON s.product_id = p.id
WHERE p.ownership = 'consignment'
GROUP BY p.consignment_owner;
```

---

## 🖥️ Frontend — Lo que está hecho

### Desktop (/ventas)

| Sección | Descripción | Estado |
|---------|------------|--------|
| KPI Cards | Disponibles, reservados, vendidos hoy, ganancia | ✅ Hardcoded |
| Catálogo | Tabla con IMEI, modelo, estado, batería, precio | ✅ Hardcoded |
| Filtros | Stock propio / consignación | ✅ Hardcoded |
| Turnos del día | Lista de citas programadas | ✅ Hardcoded |
| Detalle equipo | Panel lateral con info completa | ✅ Hardcoded |
| Rendición Salvador | Tabla de consignación | ✅ Hardcoded |
| Cotización trade-in | Tabla 12 modelos × 3 estados | ✅ Hardcoded |

### PWA Mobile (/ventas/mobile)

| Tab | Funcionalidad | Estado |
|-----|--------------|--------|
| 📱 Equipos | Cards de stock, búsqueda, filtros, detalle expandible | ✅ Hardcoded |
| 📅 Turnos | Timeline del día, acciones WA/cancelar | ✅ Hardcoded |
| ➕ Cargar | Formulario carga equipo (IMEI, modelo, fotos, precios) | ✅ UI only |
| 💰 Cotizar | Flujo 3 pasos + tabla completa | ✅ Hardcoded |
| 📊 Resumen | KPIs, chart, rendición Salvador | ✅ Hardcoded |

### Impresión

| Documento | Formato | URL | Estado |
|-----------|---------|-----|--------|
| Certificado de Garantía | A4 | /ventas/print/garantia | ✅ Hardcoded |
| Ticket + Recibo | 80mm térmica | /ventas/print/ticket | ✅ Hardcoded |

### Otras pantallas (traducidas a español)

| Pantalla | Estado |
|----------|--------|
| Dashboard | ✅ Datos demo |
| Servicio Técnico | ✅ Datos demo |
| Stock | ✅ Datos demo |
| Finanzas | ✅ Datos demo |
| Inbox/CRM | ✅ Datos demo |
| Facturación | ✅ Datos demo |
| Settings | ✅ Datos demo |

---

## 🤖 Agente IA — Diseño

### Personalidad

- Nombre: "iGreen" (no tiene nombre propio, habla como el local)
- Tono: profesional pero cercano, argentino
- Responde rápido, con info concreta
- No inventa datos — si no tiene info, escala a humano

### Capacidades

| Función | Descripción | Prioridad |
|---------|------------|-----------|
| Responder consultas | Info de equipos en stock, precios, disponibilidad | P1 |
| Enviar fotos | Manda fotos del equipo consultado | P1 |
| Cotizar trade-in | Lee tabla de precios, da cotización | P1 |
| Cotización por fotos | GPT Vision analiza fotos del cliente | P2 |
| Agendar turnos | Consulta disponibilidad, crea turno | P1 |
| Recordatorios | Envía WA 1h antes del turno | P2 |
| Escalamiento | Si no puede resolver → notifica a Kennet/Matias | P1 |

### Canales

| Canal | Entrada | Salida | Estado |
|-------|---------|--------|--------|
| WhatsApp | WAHA webhook → n8n → OpenClaw | OpenClaw → n8n → WAHA | ⏳ |
| Instagram | Meta API webhook → n8n → OpenClaw | OpenClaw → n8n → Meta API | ⏳ |
| Dashboard Inbox | UI → Supabase → OpenClaw | OpenClaw → Supabase → UI | ⏳ |

### Flujo de conversación tipo

```
CLIENTE: Hola, tenés iPhone 14 Pro?
IA: ¡Hola! Sí, tenemos un iPhone 14 Pro de 128GB en color Morado, 
    estado impecable, batería al 92%. Precio: $380 USD. 
    ¿Querés que te mande fotos?

CLIENTE: Sí dale
IA: [envía 3 fotos del equipo]
    Acá lo tenés. ¿Te interesa? Podemos coordinar 
    un turno para que lo veas en el local.

CLIENTE: Tengo un iPhone 12, me lo tomás?
IA: ¡Claro! ¿Podés mandarme fotos? Necesito:
    📱 Frente (pantalla)
    🔄 Dorso  
    📐 Laterales
    🔋 Screenshot de Ajustes > Batería > Salud

CLIENTE: [envía fotos]
IA: Gracias. Según las fotos, tu iPhone 12 está en estado B 
    (detalles menores). Cotización: $70 USD.
    
    iPhone 14 Pro: $380
    Trade-in iPhone 12: -$70
    Total: $310 USD
    
    ¿Agendamos turno? El precio final se confirma 
    cuando revisemos el equipo en el local.

CLIENTE: Dale, mañana puedo
IA: Perfecto. ¿Te va bien a las 15:00? Estamos en 
    Los Ríos 1774, CABA.

CLIENTE: Sí
IA: ✅ Turno confirmado: Lunes 24/03 a las 15:00
    Te voy a mandar un recordatorio una hora antes.
    ¡Te esperamos!
```

---

## 🖨️ Impresión — Especificaciones

### Certificado de Garantía (A4)

**Impresora:** Cualquier impresora A4
**Formato:** HTML → window.print()
**Contenido:**
- Datos del equipo (modelo, IMEI, estado, batería)
- Datos del cliente (nombre, DNI, teléfono)
- Cobertura: 90 días desde fecha de venta
- Cubre: defectos de funcionamiento bajo uso normal
- No cubre: daño físico, líquidos, terceros no autorizados, desgaste batería, accesorios
- Firmas: cliente + iGreen
- Footer: dirección y contacto del local

**Generación:** automática al completar venta → `/ventas/print/garantia?sale_id=XXX`

### Ticket/Recibo (80mm)

**Impresora:** Térmica 80mm
**Formato:** HTML monospace → window.print() con `@page { size: 80mm auto }`
**Contenido:**
- Header local (nombre, dirección, teléfono)
- Número de garantía + fecha/hora
- Equipo vendido (modelo, capacidad, IMEI parcial, batería, estado)
- Cliente (nombre, DNI)
- Garantía (90 días, fecha vencimiento)
- Detalle de pago (precio, trade-in, total, forma de pago)

**Generación:** automática al completar venta → `/ventas/print/ticket?sale_id=XXX`

---

## 📱 Carga de Stock (Mobile)

### Flujo en la PWA (tab "Cargar")

1. **IMEI** — Input con botón de cámara para escanear código de barras
2. **Modelo** — Dropdown (iPhone 11 a 15 Pro Max)
3. **Capacidad** — Chips seleccionables (64/128/256/512GB/1TB)
4. **Color** — Input texto
5. **Estado** — 3 cards grandes: A (Impecable) / B (Detalles) / C (Uso visible)
6. **Batería** — Slider 0-100%
7. **Detalles/Fallas** — Textarea
8. **Precio costo** — Input USD
9. **Precio venta** — Input USD
10. **Propiedad** — Toggle: Stock Propio / Consignación
11. **Fotos** — Grid 2×2 con cámara (3-5 fotos estándar)
12. **Botón** — "Cargar Equipo" (full width, verde)

### Fotos estándar

Las fotos se toman al cargar stock (normalmente jueves/viernes) y sirven para:
- Dashboard de ventas
- Envío por WhatsApp/Instagram cuando un cliente pregunta
- Publicación en Instagram
- Agente IA muestra al cliente

**Formato sugerido:**
1. Frente completo (pantalla encendida)
2. Dorso
3. Lateral izquierdo + derecho (una foto o dos)
4. Detalle de defectos (si aplica)

---

## 🤝 Modelo Salvador (Consignación)

### Propuesta de sociedad

| Aporte | Matias | Salvador |
|--------|--------|----------|
| Local físico | ✅ | |
| Sistema/tecnología | ✅ | |
| Operación diaria | ✅ (Kennet) | |
| Adquisición clientes | ✅ (IA + redes) | |
| Capital de stock | | ✅ (~$15k USD) |

**Split propuesto:** 50/50 ganancia (o 60/40 a favor Matias)
**Rendición:** semanal o quincenal
**Estado:** pendiente de formalizar

### Cómo funciona en el sistema

- Equipos de Salvador → `ownership = "consignment"`, `consignment_owner = "Salvador"`
- Se distinguen visualmente en el catálogo (badge "Consignación")
- La rendición se genera desde el tab "Resumen" de la PWA
- Incluye: equipos vendidos del período, ingresos, costo, ganancia, split

---

## ✅ Lo que está hecho

| # | Componente | Estado |
|---|-----------|--------|
| 1 | Frontend desktop completo (7 pantallas) | ✅ Deploy |
| 2 | Traducción completa a español | ✅ Deploy |
| 3 | Página de Ventas desktop | ✅ Deploy |
| 4 | Tabla de cotización trade-in | ✅ Deploy |
| 5 | PWA mobile (5 tabs) | ✅ Deploy |
| 6 | Garantía A4 imprimible | ✅ Deploy |
| 7 | Ticket 80mm imprimible | ✅ Deploy |
| 8 | Manifest PWA + meta tags | ✅ Deploy |
| 9 | Repo en GitHub | ✅ github.com/cerodesarrollos/igreen |
| 10 | Deploy automático en Vercel | ✅ igreen-zeta.vercel.app |

---

## ⏳ Próximos Pasos (por orden)

### Fase 1 — Base de datos + conexión (para tener sistema funcional)

| # | Tarea | Estimación | Dependencia |
|---|-------|-----------|-------------|
| 1.1 | Crear tablas en Supabase (ig_*) | 30 min | — |
| 1.2 | Crear vistas y triggers | 30 min | 1.1 |
| 1.3 | Conectar frontend → Supabase (reemplazar datos hardcoded) | 2-3 hs | 1.1 |
| 1.4 | CRUD de productos desde PWA (tab Cargar funcional) | 1-2 hs | 1.3 |
| 1.5 | Registro de ventas + generación automática de garantía | 1-2 hs | 1.3 |
| 1.6 | Gestión de turnos (crear, confirmar, completar) | 1-2 hs | 1.3 |

**Resultado:** sistema operativo, Kennet puede cargar stock y registrar ventas.

### Fase 2 — Agente IA + canales

| # | Tarea | Estimación | Dependencia |
|---|-------|-----------|-------------|
| 2.1 | Configurar WAHA en Hetzner (Docker) | 1 h | — |
| 2.2 | Vincular número iGreen a WAHA | 30 min | 2.1 |
| 2.3 | Configurar OpenClaw agent para iGreen | 1-2 hs | — |
| 2.4 | Webhook n8n: WA → OpenClaw → respuesta | 1 h | 2.1, 2.3 |
| 2.5 | Configurar Instagram Messaging API | 1-2 hs | IG Business |
| 2.6 | Webhook n8n: IG → OpenClaw → respuesta | 1 h | 2.5 |
| 2.7 | Inbox unificado en dashboard (WA + IG) | 2-3 hs | 2.4, 2.6 |

**Resultado:** clientes escriben por WA/IG, IA responde, escala si necesita.

### Fase 3 — Inteligencia

| # | Tarea | Estimación | Dependencia |
|---|-------|-----------|-------------|
| 3.1 | Cotización GPT Vision (análisis de fotos) | 2-3 hs | 2.3 |
| 3.2 | Recordatorios automáticos de turnos (WA) | 1 h | 2.4, 1.6 |
| 3.3 | Publicación automática en IG (fotos de stock nuevo) | 2-3 hs | 2.5 |
| 3.4 | Rendición automática Salvador (generación de reporte) | 1-2 hs | 1.5 |

### Fase 4 — Optimización

| # | Tarea | Estimación | Dependencia |
|---|-------|-----------|-------------|
| 4.1 | Scan IMEI con cámara (real, no placeholder) | 1-2 hs | 1.4 |
| 4.2 | Auto-completar modelo por IMEI (API lookup) | 1 h | 4.1 |
| 4.3 | Subida real de fotos a Supabase Storage | 1-2 hs | 1.4 |
| 4.4 | Métricas y analytics (dashboard de ventas real) | 2-3 hs | 1.5 |
| 4.5 | ROAS por canal (WA vs IG vs walk-in) | 1-2 hs | 4.4 |

---

## 💰 Costo Operativo Estimado

| Servicio | Costo/mes |
|----------|-----------|
| Supabase (free tier) | $0 |
| Vercel (free tier) | $0 |
| WAHA (self-hosted Hetzner) | $0 |
| n8n (self-hosted Hetzner) | $0 |
| Hetzner server (compartido) | ya pagado |
| LLM tokens (Sonnet, ~500 msg/mes) | ~$5-15 |
| GPT Vision (cotizaciones, ~50/mes) | ~$2-5 |
| Meta API (WA + IG) | $0 |
| **Total** | **~$7-20/mes** |

---

## 📁 Estructura del Proyecto

```
igreen/
├── public/
│   └── manifest.json              # PWA manifest
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout (Sidebar + Header)
│   │   ├── dashboard/page.tsx     # Dashboard principal
│   │   ├── servicio-tecnico/page.tsx
│   │   ├── stock/page.tsx
│   │   ├── finanzas/page.tsx
│   │   ├── inbox/page.tsx         # Inbox/CRM (futuro: WA + IG unificado)
│   │   ├── facturacion/page.tsx
│   │   ├── settings/page.tsx
│   │   └── ventas/
│   │       ├── page.tsx           # Desktop ventas + cotización
│   │       ├── mobile/
│   │       │   ├── layout.tsx     # Overlay mobile (no sidebar/header)
│   │       │   └── page.tsx       # PWA 5 tabs
│   │       └── print/
│   │           ├── layout.tsx     # Overlay print
│   │           ├── garantia/page.tsx  # A4 warranty
│   │           └── ticket/page.tsx    # 80mm receipt
│   └── components/
│       ├── Header.tsx
│       └── Sidebar.tsx
├── docs/
│   └── VENTAS-MODULE.md           # Este documento
├── package.json
└── next.config.js
```

---

## 📞 Contactos Clave

| Persona | Rol | Contacto |
|---------|-----|----------|
| Matias | Dueño, arquitectura, decisiones | — |
| Kennet | Operación diaria, atención presencial | — |
| Salvador | Inversor stock (potencial socio) | Pendiente formalizar |

---

*Documento generado por Pulso · 22/03/2026*
