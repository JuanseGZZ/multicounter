# skill: runit-dev

Sos un experto en crear apps para **RunIt** — un runtime iOS que ejecuta mini-apps empaquetadas como `.runit`. Cuando el usuario te pida hacer una app RunIt, seguís este skill al pie de la letra.

---

## Qué es una app RunIt

Es una web app (HTML + CSS + JS) empaquetada en un ZIP renombrado a `.runit`. El usuario la importa en RunIt (iOS) y corre al instante, sin App Store. Tenés acceso a hardware nativo de iOS via el objeto global `window.RunIt` que el runtime inyecta automáticamente antes de que tu código corra.

---

## Estructura del archivo

```
miapp.runit  (es un ZIP renombrado)
├── manifest.json     ← obligatorio
├── index.html        ← punto de entrada
├── app.js            ← opcional
├── style.css         ← opcional
└── assets/
    └── icon.png      ← ícono 512×512 (opcional)
```

---

## manifest.json

```json
{
  "id": "com.autor.nombreapp",
  "name": "Nombre de la App",
  "version": "1.0.0",
  "author": "Nombre",
  "description": "Descripción corta",
  "entry": "index.html",
  "icon": "assets/icon.png",
  "permissions": [],
  "runit_version": "1"
}
```

`id` en formato reverse-domain, solo letras/números/puntos. Ej: `com.juan.contador`.

**El `id` es permanente** — Dominus lo usa para identificar la app entre versiones. Si el usuario reimporta un `.runit` con el mismo `id`, Dominus ofrece actualizar y preserva todos los datos del usuario (storage, base de datos, archivos). Si cambiás el `id`, Dominus lo instala como app nueva y los datos anteriores se pierden. Nunca cambies el `id` entre versiones de la misma app.

### Permisos requeridos por API

Si usás una API sin declarar su permiso, la llamada se ignora silenciosamente (no tira error).

| Permiso en manifest | APIs que habilita |
|---|---|
| `"camera"` | `RunIt.camera.*` |
| `"gps"` | `RunIt.gps.*` |
| `"files"` | `RunIt.files.*` |
| `"notifications"` | `RunIt.notifications.*` |
| `"network"` | `RunIt.network.*` |
| `"haptics"` | `RunIt.haptics.*` |
| `"sensors"` | `RunIt.sensors.*` |
| `"audio"` | `RunIt.audio.*` |
| `"screen"` | `RunIt.screen.*` |
| `"clipboard"` | `RunIt.clipboard.*` |
| `"auth"` | `RunIt.auth.*` |
| `"keychain"` | `RunIt.keychain.*` |
| `"speech"` | `RunIt.speech.*` |
| `"bluetooth"` | `RunIt.bluetooth.*` |
| `"nfc"` | `RunIt.nfc.*` |
| `"health"` | `RunIt.health.*` |
| `"ml"` | `RunIt.ml.*` |
| `"ar"` | `RunIt.ar.*` |
| `"contacts"` | `RunIt.contacts.*` |
| `"calendar"` | `RunIt.calendar.*` |
| `"background"` | `RunIt.background.*` |

**Siempre libres** (sin permiso): `storage`, `db`, `ui`, `device`, `statusBar`, `vibrate`, `exit`, `share`, `openURL`

---

## Reglas del bridge — leer antes de codear

Hay dos tipos de llamadas:

**Fire-and-forget** — no retornan nada, no usar `await`:
```javascript
RunIt.vibrate()
RunIt.storage.set("k", "v")
RunIt.haptics.impact("light")
RunIt.clipboard.copy("texto")
RunIt.openURL("https://...")
RunIt.notifications.cancel("id")
```

**Async (Promise)** — siempre usar `await` o `.then()`:
```javascript
const val   = await RunIt.storage.get("k")
const rows  = await RunIt.db.query("SELECT * FROM t")
const photo = await RunIt.camera.takePhoto()
const pos   = await RunIt.gps.getCurrentPosition()
```

**Listeners (callback)** — no son Promises, reciben una función:
```javascript
RunIt.gps.watchPosition((pos) => { ... })
RunIt.sensors.accelerometer.start((data) => { ... }, { interval: 100 })
RunIt.network.onChange((status) => { ... })
```

---

## APIs disponibles — `window.RunIt`

### Device

```javascript
// Propiedades sincrónicas — disponibles al arrancar, sin await
RunIt.device.model      // "iPhone de Juan"    — nombre del dispositivo
RunIt.device.osVersion  // "18.0"              — versión de iOS
RunIt.device.language   // "es-AR"             — idioma del sistema
RunIt.device.locale     // "es_AR"             — región/locale
RunIt.device.timezone   // "America/Argentina/Buenos_Aires"
RunIt.device.uuid       // "A1B2C3D4-..."      — identifierForVendor
RunIt.device.type       // "phone" | "tablet"
RunIt.device.freeMemory // 4294967296          — bytes de RAM disponible
RunIt.device.name       // "iPhone de Juan"    — nombre asignado por el usuario

RunIt.vibrate()         // vibración básica — fire-and-forget
RunIt.exit()            // cierra la app, vuelve al catálogo
RunIt.share("texto")    // share sheet — texto
RunIt.share({ file: base64, name: "foto.jpg", mimeType: "image/jpeg" })  // share sheet — archivo

const ok = await RunIt.canOpenURL("https://ejemplo.com")  // true
const ok = await RunIt.canOpenURL("instagram://")         // true solo si Instagram está instalado
// ⚠️ Para schemes custom necesita LSApplicationQueriesSchemes en Info.plist
```

---

### Storage — clave/valor

Para preferencias, settings, flags. Persiste entre sesiones. Aislado por app.

```javascript
RunIt.storage.set("tema", "oscuro")         // fire-and-forget
RunIt.storage.set("contador", 42)

const tema = await RunIt.storage.get("tema") // "oscuro" | null
RunIt.storage.remove("tema")                 // fire-and-forget

// Listar todas las keys de esta app
const keys = await RunIt.storage.keys()      // ["tema", "contador", ...]

// Limpiar todo el storage de esta app
RunIt.storage.clear()                        // fire-and-forget

// Guardar objeto: usar JSON.stringify/parse
RunIt.storage.set("config", JSON.stringify({ lang: "es", volume: 0.8 }))
const raw    = await RunIt.storage.get("config")
const config = raw ? JSON.parse(raw) : {}
```

---

### DB — SQLite

Base de datos relacional real. Aislada por app. Persiste entre sesiones.

```javascript
// Crear tabla
await RunIt.db.run(`
  CREATE TABLE IF NOT EXISTS items (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    texto   TEXT    NOT NULL,
    fecha   TEXT    DEFAULT (datetime('now'))
  )
`)

// Insertar — siempre usar parámetros ?, nunca concatenar
await RunIt.db.run(`INSERT INTO items (texto) VALUES (?)`, ["hola"])
await RunIt.db.run(`INSERT INTO items (texto, fecha) VALUES (?, ?)`, ["hola", new Date().toISOString()])

// Consultar — retorna array de objetos
const rows = await RunIt.db.query(`SELECT * FROM items ORDER BY id DESC`)
// [{ id: 1, texto: "hola", fecha: "..." }, ...]

// Con parámetros
const uno = await RunIt.db.query(`SELECT * FROM items WHERE id = ?`, [1])

// Actualizar / borrar
await RunIt.db.run(`UPDATE items SET texto = ? WHERE id = ?`, ["nuevo", 1])
await RunIt.db.run(`DELETE FROM items WHERE id = ?`, [1])

// Contar
const [{ total }] = await RunIt.db.query(`SELECT COUNT(*) as total FROM items`)
```

`db.run` → para INSERT, UPDATE, DELETE, CREATE. Retorna `true`.
`db.query` → para SELECT. Retorna array.

---

### Camera & Galería

Requiere `"camera"` en `permissions`.

```javascript
// Sacar foto — retorna null si el usuario cancela
const photo = await RunIt.camera.takePhoto()
const photo = await RunIt.camera.takePhoto({ camera: 'front', quality: 0.9 })
// { base64: "...", mimeType: "image/jpeg", width: 1920, height: 1080 }

// Elegir foto de la galería
const photo = await RunIt.camera.pickFromLibrary()
// { base64: "...", mimeType: "image/jpeg", width: N, height: N } | null

// Grabar video
const video = await RunIt.camera.recordVideo({ camera: 'back', maxSeconds: 30 })
// { base64: "...", mimeType: "video/mp4", duration: 12.4 } | null

// Guardar en la galería del dispositivo
await RunIt.camera.saveToLibrary(photo.base64, "image/jpeg")
// retorna true

// Escanear QR o barcode (abre cámara con scanner)
const qr = await RunIt.camera.scanQR()
// { value: "https://...", type: "qr" } | null

// Usar la imagen en un <img>
img.src = `data:image/jpeg;base64,${photo.base64}`

// Dibujar en canvas
const img = new Image()
img.onload = () => ctx.drawImage(img, 0, 0)
img.src = `data:image/jpeg;base64,${photo.base64}`
```

Opciones de `takePhoto`:
| key | valores | default |
|---|---|---|
| `camera` | `'back'` \| `'front'` | `'back'` |
| `quality` | 0.0 – 1.0 | 0.8 |

---

### GPS / Ubicación

Requiere `"gps"` en `permissions`.

```javascript
// Una sola lectura
const pos = await RunIt.gps.getCurrentPosition()
// { lat: -34.6037, lng: -58.3816, accuracy: 10.0, altitude: 25.0, speed: 0.0, heading: 180.0 }

// Lectura continua (listener)
RunIt.gps.watchPosition((pos) => {
  console.log(pos.lat, pos.lng)
})

// Parar el listener
RunIt.gps.clearWatch()

// Geocodificación inversa (coordenadas → dirección)
const addr = await RunIt.gps.reverseGeocode(-34.6037, -58.3816)
// { street: "Florida", number: "100", city: "Buenos Aires", state: "CABA", country: "Argentina", postalCode: "C1005", name: "..." }

// Geocodificación directa (texto → coordenadas)
const coords = await RunIt.gps.geocode('Buenos Aires, Argentina')
// { lat: -34.6037, lng: -58.3816 }

// Abrir Apple Maps (fire-and-forget)
RunIt.gps.openMaps({ lat: -34.6037, lng: -58.3816, label: 'Obelisco' })

// Distancia entre dos puntos (metros)
const metros = await RunIt.gps.distance(
  { lat: -34.6037, lng: -58.3816 },
  { lat: -34.9205, lng: -57.9536 }
)
```

---

### Files — sistema de archivos (sandboxed)

Requiere `"files"` en `permissions`.

Cada app tiene su propio directorio aislado. No puede salir de él. Rutas relativas a la raíz del sandbox.

```javascript
// Escribir texto
await RunIt.files.write('saves/partida.json', JSON.stringify(data))

// Escribir binario (base64)
await RunIt.files.write('imagen.png', base64String, { encoding: 'base64' })

// Leer texto
const texto = await RunIt.files.read('saves/partida.json')
const data  = JSON.parse(texto)

// Leer binario
const b64 = await RunIt.files.read('imagen.png', { encoding: 'base64' })

// Listar archivos en una carpeta
const lista = await RunIt.files.list('saves/')
// [{ name: "partida.json", size: 1024, modified: "2026-01-01T00:00:00Z" }]

// Listar raíz
const todo = await RunIt.files.list('')

// Verificar existencia
const existe = await RunIt.files.exists('saves/partida.json') // true | false

// Info del archivo
const info = await RunIt.files.stat('saves/partida.json')
// { size: 1024, modified: "2026-01-01T00:00:00Z" }

// Crear directorio (con intermedios automáticamente)
await RunIt.files.mkdir('carpeta/subcarpeta')   // true

// Mover / renombrar
await RunIt.files.move('viejo.txt', 'nuevo.txt')            // true
await RunIt.files.move('archivo.txt', 'carpeta/archivo.txt') // también mueve entre dirs

// Copiar
await RunIt.files.copy('original.txt', 'copia.txt')  // true

// Borrar
await RunIt.files.delete('saves/partida.json')

// Abrir file picker — lectura única, devuelve contenido y cierra acceso
const file = await RunIt.files.pick({ types: ['json', 'txt', 'csv', 'png', 'pdf'] })
// { name: "datos.json", base64: "...", mimeType: "application/json", size: 2048 } | null

// Abrir archivo externo con acceso persistente — para editores
const file = await RunIt.files.open({ types: ['txt', 'md', 'json'] })
// { id: "uuid", name: "notas.md", content: "...", mimeType: "text/plain", size: 1024 } | null
// Archivos binarios devuelven { ..., content: "<base64>", encoding: "base64" }

// Guardar de vuelta al mismo archivo — sin picker, sin diálogo, cuantas veces quieras
await RunIt.files.save(file.id, nuevoContenido)
await RunIt.files.save(file.id, base64Data, { encoding: 'base64' })

// Liberar el acceso cuando ya no se necesita
RunIt.files.close(file.id)  // fire-and-forget

// Exportar archivo via share sheet
await RunIt.files.export('reporte.pdf', base64Data, 'application/pdf')
```

**Patrón save/load de JSON:**
```javascript
// Guardar estado completo
async function saveGame(state) {
  await RunIt.files.write('save.json', JSON.stringify(state))
}

// Cargar estado
async function loadGame() {
  const existe = await RunIt.files.exists('save.json')
  if (!existe) return null
  const raw = await RunIt.files.read('save.json')
  return JSON.parse(raw)
}
```

---

### Notifications — notificaciones locales

Requiere `"notifications"` en `permissions`.

```javascript
// Pedir permiso primero (mostrar antes de cualquier otra acción)
const ok = await RunIt.notifications.requestPermission() // true | false

// Agendar — one-shot
await RunIt.notifications.schedule({
  id:    'recordatorio-1',   // string único
  title: 'Hora de hacer algo',
  body:  'Descripción de la notificación',
  delay: 3600,               // segundos desde ahora
  badge: 1                   // número en el ícono (opcional)
})

// Agendar — con repetición
await RunIt.notifications.schedule({
  id:    'daily-reminder',
  title: 'Recordatorio diario',
  body:  'Texto',
  delay: 60,                 // define la hora del día basado en "ahora + delay"
  repeat: 'daily'            // 'daily' | 'weekly' | 'hourly' | 'minutely'
})
// 'daily'    → UNCalendarNotificationTrigger hora/minuto (se repite todos los días a esa hora)
// 'weekly'   → UNCalendarNotificationTrigger día de semana/hora/minuto
// 'hourly'   → cada 3600s
// 'minutely' → cada 60s

// Badge del ícono
RunIt.notifications.setBadge(5)   // fire-and-forget, pone el número en el ícono
RunIt.notifications.clearBadge()  // fire-and-forget, borra el badge

// Cancelar una
RunIt.notifications.cancel('recordatorio-1')

// Cancelar todas las de esta app
RunIt.notifications.cancelAll()

// Escuchar notificaciones con la app en foreground
RunIt.notifications.onReceive((notif) => {
  // { title, body, data }   — dispara tanto para locales como para push
})
```

---

### Network — estado de red

Requiere `"network"` en `permissions`.

```javascript
// Estado actual (sincrónico, se actualiza automáticamente)
console.log(RunIt.network.status)       // 'wifi' | 'cellular' | 'offline'
console.log(RunIt.network.cellularType) // '5g' | '4g' | '3g' | '2g' | 'unknown' (sincrónico)

// Via Promise
const status = await RunIt.network.getStatus()
const cell   = await RunIt.network.getCellularType()

// Listener de cambios de conectividad
RunIt.network.onChange((status) => {
  // También actualiza RunIt.network.status automáticamente
  console.log('Cambió a:', status)
})
```

### HTTP nativo — sin restricciones CORS

Requiere `"network"` en `permissions`. Usa URLSession nativo — sin CORS, sin limitaciones de Safari.

```javascript
// Request genérico
const res = await RunIt.http.request({
  url: 'https://api.ejemplo.com/data',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer token' },
  body: JSON.stringify({ key: 'value' })
})
// res = { status: 200, headers: {...}, body: '{"ok":true}' }

// Descargar archivo al sandbox (con progreso opcional)
const file = await RunIt.http.download(
  'https://ejemplo.com/archivo.pdf',
  'docs/archivo.pdf',           // ruta dentro del sandbox de files
  (progress) => console.log(Math.round(progress * 100) + '%')
)
// file = { path: 'docs/archivo.pdf', size: 102400 }
// Luego accesible con RunIt.files.read('docs/archivo.pdf')

// Subir datos base64 (con progreso opcional)
const up = await RunIt.http.upload(
  'https://api.ejemplo.com/upload',
  base64String,
  (progress) => console.log(Math.round(progress * 100) + '%')
)
// up = { status: 200, body: '{"url":"..."}' }
```

---

### Haptics — feedback táctil avanzado

Requiere `"haptics"` en `permissions`.

```javascript
// Impacto (para botones, acciones)
RunIt.haptics.impact('light')   // suave
RunIt.haptics.impact('medium')  // medio (default si no pasás nada)
RunIt.haptics.impact('heavy')   // fuerte

// Notificación (para resultados)
RunIt.haptics.notification('success') // éxito — doble toque positivo
RunIt.haptics.notification('warning') // advertencia
RunIt.haptics.notification('error')   // error — triple toque

// Selección (para pickers, sliders, cambios de valor)
RunIt.haptics.selection()
```

Todos fire-and-forget, no retornan nada.

---

### Sensors — sensores de movimiento

Requiere `"sensors"` en `permissions`.

Los sensores usan callbacks, no Promises. `interval` es en milisegundos.

```javascript
// Acelerómetro — fuerza en G en cada eje (1G = 9.8 m/s²)
RunIt.sensors.accelerometer.start((data) => {
  console.log(data.x, data.y, data.z)
}, { interval: 100 })

RunIt.sensors.accelerometer.stop()

// Giroscopio — velocidad de rotación en rad/s
RunIt.sensors.gyroscope.start((data) => {
  console.log(data.x, data.y, data.z)
}, { interval: 100 })

RunIt.sensors.gyroscope.stop()

// Orientación — ángulos del dispositivo en grados
RunIt.sensors.orientation.start((data) => {
  console.log(data.roll, data.pitch, data.yaw)
}, { interval: 100 })

RunIt.sensors.orientation.stop()

// Magnetómetro — campo magnético en microteslas
RunIt.sensors.magnetometer.start((data) => {
  console.log(data.x, data.y, data.z)
}, { interval: 100 })
RunIt.sensors.magnetometer.stop()

// Barómetro — presión atmosférica en kPa
RunIt.sensors.barometer.start((data) => {
  console.log(data.pressure) // ~101.3 kPa al nivel del mar
})
RunIt.sensors.barometer.stop()

// Altímetro — altitud relativa (m desde que arrancó) + presión
RunIt.sensors.altimeter.start((data) => {
  console.log(data.relativeAltitude, data.pressure)
})
RunIt.sensors.altimeter.stop()

// Podómetro — pasos y distancia desde que arrancó el sensor
RunIt.sensors.pedometer.start((data) => {
  console.log(data.steps, data.distance) // distance puede ser null si el dispositivo no lo soporta
})
RunIt.sensors.pedometer.stop()

// Detector de actividad física
RunIt.sensors.activity.start((data) => {
  // data.activity: 'walking' | 'running' | 'cycling' | 'automotive' | 'stationary' | 'unknown'
  // data.confidence: 'high' | 'medium' | 'low'
  console.log(data.activity, data.confidence)
})
RunIt.sensors.activity.stop()
```

**Ejemplo — detectar shake:**
```javascript
let lastMag = 0
RunIt.sensors.accelerometer.start((d) => {
  const mag = Math.sqrt(d.x*d.x + d.y*d.y + d.z*d.z)
  if (Math.abs(mag - lastMag) > 2.5) {
    RunIt.haptics.notification('success')
    console.log('shake detectado!')
  }
  lastMag = mag
}, { interval: 50 })
```

---

### Audio — grabación de micrófono

Requiere `"audio"` en `permissions`.

```javascript
// Pedir permiso primero
const ok = await RunIt.audio.requestPermission() // true | false

// Grabar
await RunIt.audio.startRecording()

// Detener y obtener el audio
const rec = await RunIt.audio.stopRecording()
// { base64: "...", mimeType: "audio/m4a", duration: 5.2 }

// Reproducir la grabación
const audio = new Audio(`data:audio/m4a;base64,${rec.base64}`)
audio.play()

// O subir a un servidor
await fetch('https://api.com/upload', {
  method: 'POST',
  body: JSON.stringify({ audio: rec.base64 })
})

// Volumen del sistema
const vol = await RunIt.audio.getVolume()  // 0.0 – 1.0
RunIt.audio.setVolume(0.8)                  // fire-and-forget

// Ruta de audio
await RunIt.audio.setOutput('speaker')    // altavoz externo
await RunIt.audio.setOutput('earpiece')   // auricular del teléfono
```

---

### Screen — pantalla

Requiere `"screen"` en `permissions`.

```javascript
// Brillo
const brillo = await RunIt.screen.getBrightness()  // 0.0 a 1.0
RunIt.screen.setBrightness(0.8)                     // fire-and-forget

// Keep awake
RunIt.screen.keepAwake(true)   // impedir que la pantalla se apague
RunIt.screen.keepAwake(false)  // volver al comportamiento normal

// Orientación — propiedad sync que se actualiza en tiempo real al rotar
RunIt.screen.orientation       // 'portrait' | 'landscape'

// Bloquear orientación — fire-and-forget
RunIt.screen.lock('portrait')   // fuerza portrait
RunIt.screen.lock('landscape')  // fuerza landscape
RunIt.screen.lock('all')        // libera el bloqueo

// Captura de pantalla
const shot = await RunIt.screen.screenshot()
// { base64: "...", mimeType: "image/jpeg", width: N, height: N }

// Safe area insets — objeto estático inyectado al iniciar
RunIt.screen.safeArea  // { top: 59, bottom: 34, left: 0, right: 0 }  (pts)

// Resolución física — objeto estático inyectado al iniciar
RunIt.screen.resolution  // { width: 390, height: 844, scale: 3 }
// píxeles físicos = width * scale × height * scale
```

---

### Clipboard — portapapeles

Requiere `"clipboard"` en `permissions`.

```javascript
RunIt.clipboard.copy('texto a copiar')   // fire-and-forget

const texto = await RunIt.clipboard.paste() // string | null

RunIt.clipboard.copyImage(base64)  // copia imagen al portapapeles, fire-and-forget
// base64: string sin prefijo data:URL (solo los bytes en base64)
```

---

### openURL / canOpenURL — abrir y verificar URLs externas

```javascript
// Abrir URL (fire-and-forget)
RunIt.openURL('https://ejemplo.com')           // abre Safari
RunIt.openURL('tel:+5491112345678')            // llama
RunIt.openURL('mailto:hola@ejemplo.com')       // email
RunIt.openURL('maps://?q=Buenos+Aires')        // Maps

// Verificar si un scheme está disponible
const puedeAbrir = await RunIt.canOpenURL('https://ejemplo.com')  // siempre true
const tieneIG    = await RunIt.canOpenURL('instagram://')         // true si IG instalado
// ⚠️ Schemes custom requieren LSApplicationQueriesSchemes en Info.plist del host
```

`canOpenURL` es libre (no requiere permiso en manifest). `http://` y `https://` siempre retornan `true`.

### share — share sheet nativo

```javascript
// Compartir texto
RunIt.share('Mirá esto: https://ejemplo.com')

// Compartir archivo (base64)
const foto = await RunIt.camera.takePhoto()
RunIt.share({ file: foto.base64, name: 'foto.jpg', mimeType: 'image/jpeg' })

// Compartir archivo del sandbox
const contenido = await RunIt.files.read('reporte.pdf', { encoding: 'base64' })
RunIt.share({ file: contenido, name: 'reporte.pdf', mimeType: 'application/pdf' })
```

Ambas variantes son fire-and-forget. El archivo temporal se elimina automáticamente al cerrar el share sheet.

---

### UI — diálogos nativos

```javascript
// Alert nativo con botones personalizados
const boton = await RunIt.ui.alert({
  title: '¿Estás seguro?',
  message: 'Esta acción no se puede deshacer',
  buttons: ['Cancelar', 'Eliminar']
})
// retorna: 'Cancelar' | 'Eliminar'

// Prompt nativo (input de texto)
const nombre = await RunIt.ui.prompt({
  title: 'Tu nombre',
  placeholder: 'Escribí acá',
  defaultValue: ''
})
// retorna: string | null (null si canceló)
```

---

### Auth — biometría

Requiere `"auth"` en `permissions`.

```javascript
// Verificar si hay biometría disponible (sin pedir autenticación)
const type = await RunIt.auth.canUseBiometric()
// "faceId" | "touchId" | "none"

// Face ID o Touch ID (lo que tenga el dispositivo)
const ok = await RunIt.auth.biometric('Confirmá tu identidad')
// true | false
```

---

### Keychain — almacenamiento seguro

Requiere `"keychain"` en `permissions`.

Distinto de `RunIt.storage`. Encriptado por iOS, sobrevive reinstalaciones. Para tokens, contraseñas, secretos.

```javascript
await RunIt.keychain.set('token', 'eyJhbGciOiJIUzI1NiJ9...')
// retorna: true | false

const token = await RunIt.keychain.get('token')
// retorna: string | null

RunIt.keychain.remove('token') // fire-and-forget
```

---

### iCloud — sincronización entre dispositivos

Sin permiso en manifest (libre). Requiere sesión de iCloud activa en el dispositivo.

```javascript
// Key-Value store — sincroniza automáticamente entre dispositivos del mismo usuario
RunIt.icloud.set('última_sesión', new Date().toISOString())   // fire-and-forget
const val = await RunIt.icloud.get('última_sesión')            // string | number | null

// Documents — archivos en iCloud Drive
await RunIt.icloud.saveFile('notas.txt', 'contenido del archivo')
await RunIt.icloud.saveFile('datos.bin', base64String, { encoding: 'base64' })

const texto = await RunIt.icloud.readFile('notas.txt')
const b64   = await RunIt.icloud.readFile('datos.bin', { encoding: 'base64' })
```

Diferencia con `RunIt.storage`:
- `storage` → UserDefaults local, instantáneo, sin internet
- `icloud.set/get` → NSUbiquitousKeyValueStore, se sincroniza a iCloud en background
- `icloud.saveFile/readFile` → archivos en iCloud Drive, accesibles desde otros dispositivos/apps

---

## APIs web nativas — sin bridge, funcionan igual que en Safari

```javascript
// HTTP (sin restricciones CORS dentro de RunIt)
const data = await fetch('https://api.com/endpoint').then(r => r.json())
await fetch('https://api.com/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'value' })
})

// WebSockets
const ws = new WebSocket('wss://...')
ws.onmessage = (e) => console.log(e.data)
ws.send('mensaje')

// Canvas 2D
const ctx = canvas.getContext('2d')

// WebGL2 — Three.js, Phaser, PixiJS, Babylon.js funcionan directo
const gl = canvas.getContext('webgl2')

// Web Audio API
const audioCtx = new AudioContext()

// Animaciones
requestAnimationFrame(loop)

// Timers
setTimeout(() => {}, 1000)
setInterval(() => {}, 1000)
```

---

### Speech — TTS y reconocimiento de voz

Requiere `"speech"` en `permissions`.

```javascript
// Text-to-Speech — fire-and-forget
RunIt.speech.speak('Hola mundo', { lang: 'es-AR', rate: 0.5 })
// lang: código BCP-47 ('es-AR', 'en-US', 'fr-FR', etc.) — default: 'en-US'
// rate: 0.0 (muy lento) a 1.0 (muy rápido) — default: 0.5

RunIt.speech.stop()  // detiene el TTS inmediatamente

// Speech-to-text one-shot — escucha hasta detectar silencio
const texto = await RunIt.speech.recognize({ lang: 'es-AR' })
// retorna: string con la transcripción final | rechaza si no hay autorización

// Speech-to-text continuo — recibe resultados parciales y finales
RunIt.speech.startRecognition((result) => {
  console.log(result.text)      // transcripción acumulada
  console.log(result.isFinal)   // true cuando el motor detecta pausa/fin
}, { lang: 'es-AR' })

RunIt.speech.stopRecognition()  // detiene el reconocimiento continuo
```

**Nota:** `recognize` y `startRecognition` piden permiso de micrófono + reconocimiento de voz al usuario automáticamente (no hay que llamar nada antes). Si el idioma no está disponible offline, iOS lo descarga en background.

---

### Bluetooth BLE

Requiere `"bluetooth"` en `permissions`.

```javascript
// Verificar si Bluetooth está activado (sin pedir permiso adicional)
const on = await RunIt.bluetooth.isEnabled() // true | false

// Obtener periféricos actualmente conectados (de sesiones anteriores)
const connected = await RunIt.bluetooth.getConnected()
// [{ id: "uuid", name: "Mi Dispositivo" }]

const devices = await RunIt.bluetooth.scan({ duration: 5000 })
// [{ id: "uuid", name: "Mi Dispositivo", rssi: -60 }]

await RunIt.bluetooth.connect(devices[0].id)

const data = await RunIt.bluetooth.read(deviceId, serviceUUID, charUUID)
// { bytes: [0x01, 0x02], hex: "0102" }

await RunIt.bluetooth.write(deviceId, serviceUUID, charUUID, [0x01, 0x02])

RunIt.bluetooth.onData(deviceId, charUUID, (data) => {
  console.log(data.hex)
})

await RunIt.bluetooth.disconnect(deviceId)
```

---

### NFC

Requiere `"nfc"` en `permissions`.

```javascript
// Verificar si el dispositivo tiene NFC (no requiere permiso)
const ok = await RunIt.nfc.isSupported() // true | false

const tag = await RunIt.nfc.read()
// { type: 'ndef', records: [{ type: 'text', value: 'hola' }, { type: 'url', value: 'https://...' }] } | null

await RunIt.nfc.write([
  { type: 'text', value: 'hola mundo' },
  { type: 'url',  value: 'https://ejemplo.com' }
])
// retorna: true
```

---

### HealthKit

Requiere `"health"` en `permissions`.

```javascript
const ok = await RunIt.health.requestPermission(['steps', 'heartRate', 'sleep', 'calories', 'distance', 'oxygenSaturation'])
// true | false — pide permisos de lectura Y escritura

// steps, calories, distance → suma diaria
const steps = await RunIt.health.query('steps', { from: '2026-01-01', to: '2026-01-31' })
// [{ date: '2026-01-01T00:00:00Z', value: 8432 }, ...]

// heartRate, oxygenSaturation → muestras individuales
const hr = await RunIt.health.query('heartRate', { limit: 10 })
// [{ date: '2026-05-01T10:00:00Z', value: 72 }, ...]

const spo2 = await RunIt.health.query('oxygenSaturation', { limit: 5 })
// [{ date: '2026-05-01T10:00:00Z', value: 0.98 }, ...]  ← valor en 0.0–1.0 (porcentaje)

// sleep → duración en horas por período
const sleep = await RunIt.health.query('sleep', { from: '2026-05-01', to: '2026-05-07' })
// [{ date: '2026-05-01T23:00:00Z', value: 7.5 }, ...]

// Escribir datos de salud
await RunIt.health.write('steps', { value: 1000 })                          // ahora
await RunIt.health.write('steps', { value: 1000, date: '2026-05-19' })      // fecha pasada
await RunIt.health.write('heartRate', { value: 72, date: new Date().toISOString() })
// Requiere permiso de escritura (incluido en requestPermission)
```

Tipos soportados: `steps`, `heartRate`, `sleep`, `calories`, `distance`, `oxygenSaturation`
- `steps`, `calories`, `distance` → query devuelve suma diaria; unidades: count / kcal / metros
- `heartRate` → bpm; `oxygenSaturation` → porcentaje 0.0–1.0; ambos devuelven muestras individuales
- `sleep` → duración en horas (HKCategoryType, solo lectura)

---

### CoreML

Requiere `"ml"` en `permissions`.

Los modelos van bundleados en el `.runit` como cualquier asset.

```javascript
// Cargar modelo (.mlmodelc precompilado o .mlmodel — se compila automático)
const model = await RunIt.ml.load('models/classifier.mlmodelc')

// Clasificar imagen (base64)
const result = await model.predict({ image: base64Image })
// [{ label: 'cat', confidence: 0.97 }, { label: 'dog', confidence: 0.02 }]

// Clasificar texto
const result = await model.predict({ text: 'Este producto es excelente' })
// [{ label: 'positive', confidence: 0.95 }]

// Input genérico (para modelos tabulares)
const result = await model.predict({ age: 25, income: 50000 })

// Detección de objetos con bounding boxes (modelo YOLO-style)
const detections = await model.detect({ image: base64Image })
// [{ label: 'person', confidence: 0.92, rect: {x, y, width, height} }]
// rect en coordenadas normalizadas Vision (origin bottom-left, 0–1)

// OCR — reconocimiento de texto en imagen (sin modelo externo, Vision nativo)
const text = await RunIt.ml.recognizeText(base64Image)  // string con saltos de línea

// Detección de rostros + landmarks (sin modelo externo, Vision nativo)
const faces = await RunIt.ml.detectFaces(base64Image)
// [{ rect: {x,y,width,height}, landmarks: { leftEye:[{x,y}], rightEye, nose, outerLips, ... } }]
// Landmarks disponibles: leftEye, rightEye, leftEyebrow, rightEyebrow, nose, noseCrest,
//                        outerLips, innerLips, leftPupil, rightPupil, faceContour

// Traducción on-device (iOS 17.4+, requiere idiomas instalados en el dispositivo)
const translated = await RunIt.ml.translate('Hello world', { from: 'en', to: 'es' })
// "Hola mundo"
// Lanza error si los idiomas no están instalados en Ajustes → General → Idioma
```

---

### ARKit

Requiere `"ar"` en `permissions`.

```javascript
// Iniciar sesión AR (fullscreen sobre el WebView)
await RunIt.ar.start({ planeDetection: 'horizontal' }) // 'horizontal' | 'vertical' | 'none'

// Escuchar planos detectados
RunIt.ar.onPlaneDetected((plane) => {
  // { id, position: {x,y,z}, extent: {width,height}, alignment: 'horizontal'|'vertical' }
})

// Colocar objeto 3D (.usdz bundleado en el .runit)
await RunIt.ar.placeObject({ model: 'assets/box.usdz', position: { x: 0, y: 0, z: -1 } })

// Rastrear imagen física en el mundo
// image: base64 de la imagen de referencia, size: ancho físico real en metros
RunIt.ar.trackImage({ image: base64, size: 0.1 }, (data) => {
  // { name, isTracked, position: {x,y,z}, size: {width,height} }
})
// ⚠️ Requiere que ar.start() ya esté activo. No retorna Promise — el callback se dispara al detectar/actualizar.

// Face tracking (usa cámara frontal — incompatible con ar.start())
await RunIt.ar.startFaceTracking((frame) => {
  // { position: {x,y,z}, blendShapes: { jawOpen: 0.12, eyeBlinkLeft: 0.03, ... } }
  // ~52 blend shapes de ARKit. Valores 0.0–1.0.
})
// Solo disponible en iPhone con TrueDepth (Face ID), no en iPad.

// Medir distancia entre dos puntos de pantalla → metros
// Hace raycast desde cada punto hacia superficies detectadas
const meters = await RunIt.ar.measure(
  { x: 160, y: 300 },   // punto 1 en coordenadas de pantalla (px)
  { x: 320, y: 500 }    // punto 2
)
// Retorna número (ej: 0.342). Error si no hay superficie detectada en algún punto.

// Cerrar AR
await RunIt.ar.stop()
```

El usuario puede cerrar la vista AR con el botón ✕ aunque no se llame `stop()`.

---

### Contacts

Requiere `"contacts"` en `permissions`.

```javascript
// Pedir permiso
const granted = await RunIt.contacts.requestPermission()

// Abrir picker nativo (el usuario elige un contacto)
const contact = await RunIt.contacts.pick()
// { name: 'Juan López', phones: ['+54911...'], emails: ['juan@...'] }
// null si cancela

// Obtener todos los contactos
const all = await RunIt.contacts.getAll()
// [{ name, phones, emails }, ...]

// Buscar por nombre
const results = await RunIt.contacts.search('Juan')
// [{ id, name, phones, emails }, ...]

// Obtener un contacto por ID
const contact = await RunIt.contacts.get(id)
// { id, name, phones, emails }

// Crear un contacto nuevo
const created = await RunIt.contacts.create({ name: 'María García', phone: '+54911...', email: 'maria@...' })
// { id: 'ABC-123-...' }
```

---

### Calendar

Requiere `"calendar"` en `permissions`.

```javascript
// Pedir permiso
const granted = await RunIt.calendar.requestPermission()

// Crear evento
const { id } = await RunIt.calendar.createEvent({
  title: 'Reunión RunIt',
  startDate: '2026-06-01T10:00:00',
  endDate:   '2026-06-01T11:00:00',
  notes:    'Opcional',
  location: 'Opcional'
})

// Listar eventos en un rango
const events = await RunIt.calendar.getEvents({
  from: '2026-06-01T00:00:00',
  to:   '2026-06-30T23:59:59'
})
// [{ id, title, startDate, endDate, notes?, location? }, ...]

// Eliminar evento
await RunIt.calendar.deleteEvent(id)

// Abrir la app Calendario nativa en una fecha (fire-and-forget)
RunIt.calendar.open()                          // abre en hoy
RunIt.calendar.open('2026-06-01T10:00:00')    // abre en esa fecha
RunIt.calendar.open(new Date(2026, 5, 1))     // también acepta Date object
```

---

### UI — Action Sheet

```javascript
const opcion = await RunIt.ui.actionSheet({
  title: '¿Qué querés hacer?',
  options: ['Editar', 'Compartir', 'Eliminar'],
  destructive: ['Eliminar'],
  cancel: 'Cancelar'
})
// 'Editar' | 'Compartir' | 'Eliminar' | null (si cancela)
```

---

### UI — Toast

```javascript
RunIt.ui.toast('Guardado correctamente', { duration: 2000, type: 'success' })
// type: 'success' | 'error' | 'warning' | 'default'
// duration: ms (default 2000)
```

---

### UI — Loading spinner nativo

```javascript
// Muestra overlay semitransparente con spinner centrado (fire-and-forget)
RunIt.ui.showLoading()              // sin texto
RunIt.ui.showLoading('Cargando...') // con texto opcional debajo del spinner
// No-op si ya hay un spinner visible (previene duplicados)

// Oculta el spinner con animación fade (fire-and-forget)
RunIt.ui.hideLoading()
```

---

### Status Bar

```javascript
RunIt.statusBar.setStyle('light')  // 'light' | 'dark'
RunIt.statusBar.hide()
RunIt.statusBar.show()
```

---

### Device Info

```javascript
const info = await RunIt.device.getInfo()
// {
//   model: 'iPhone de Juan',
//   osVersion: '18.4',
//   battery: 0.87,       // 0.0 – 1.0
//   charging: true,
//   diskFree: 12345678,  // bytes
//   diskTotal: 64000000
// }

// Escuchar cambios de batería
RunIt.device.onBatteryChange((info) => {
  // { battery: 0.85, charging: false }
})
```

---

### Push Notifications remotas (APNs)

Requiere entitlement APNs en el host app. El token llega cuando el OS lo otorga.

```javascript
// Registrar y obtener token APNs
const token = await RunIt.notifications.registerPush()
// Enviar token a tu servidor para enviar pushes

// Escuchar pushes recibidos (mientras la app está en primer plano)
RunIt.notifications.onPush((payload) => {
  // { title: '...', body: '...', data: {...} }
})
```

---

### Background Tasks

Ejecuta un script JS periódicamente aunque Dominus esté cerrado. iOS decide cuándo correr (~30 segundos disponibles, aprende del patrón de uso del usuario).

Requiere permiso `"background"` en el manifest.

```javascript
// Registrar tarea periódica (llamar desde foreground mientras la app está abierta)
await RunIt.background.registerFetch({
  minInterval: 3600,   // segundos mínimos entre ejecuciones (iOS puede demorar más)
  script: 'bg-task.js' // archivo JS empaquetado en el .runit que iOS ejecuta headless
})

// Cancelar
RunIt.background.cancelFetch()  // fire-and-forget
```

**El archivo `bg-task.js`** corre en un WKWebView headless sin UI. Solo están disponibles:
`storage`, `db`, `http`, `notifications`, `background`. **No disponibles:** cámara, GPS, sensores, UI, Bluetooth, etc.

```javascript
// bg-task.js — ejemplo: fetch datos y guardar en storage
const resp = await RunIt.http.request({ url: 'https://api.ejemplo.com/datos', method: 'GET' })
const data = JSON.parse(resp.body)
RunIt.storage.set('cache_datos', JSON.stringify(data))

// Opcional: notificar al usuario con el resultado
await RunIt.notifications.schedule({
  id: 'bg-result',
  title: 'Datos actualizados',
  body: `${data.items.length} items nuevos`,
  delay: 1
})

// SIEMPRE llamar complete() cuando terminás — iOS corta a los 25s si no
RunIt.background.complete()
```

**Notas importantes:**
- iOS no garantiza periodicidad exacta — aprende del uso del usuario
- Si la app nunca se abre, iOS ejecuta con menos frecuencia
- `complete()` debe llamarse siempre o el timeout de 25s mata la tarea igual

---

### Dev Tools (consola in-app)

Solo disponible cuando el manifest tiene `"devMode": true`. En producción (sin ese flag) todas las llamadas se ignoran silenciosamente. **No requiere permiso.**

```json
{
  "devMode": true
}
```

Con `devMode: true`, agitar el dispositivo abre la consola automáticamente. Desde JS podés controlarlo:

```javascript
// Abrir/cerrar la consola programáticamente
RunIt.devtools.open()
RunIt.devtools.close()

// Habilitar o deshabilitar shake como trigger
RunIt.devtools.enableShake()   // activa shake → abre consola (default en devMode)
RunIt.devtools.disableShake()  // desactiva shake (si tu app usa shake para otra cosa)
```

Todas son fire-and-forget (no retornan Promise).

**La consola muestra:**
- Todos los `console.log` / `console.warn` / `console.error` del JS (color-coded, buffer de 200 msgs)
- Input para ejecutar JS arbitrario en vivo sobre el webView
- Botón "Clear" para limpiar el buffer

**Ejemplo — abrir con triple tap:**
```javascript
// Solo activo en dev — el shake también abre, esto es un gesto alternativo
let taps = 0
document.querySelector('#header').addEventListener('click', () => {
  if (++taps === 3) { RunIt.devtools.open(); taps = 0 }
  setTimeout(() => taps = 0, 800)
})

// Si tu app usa shake para otra cosa, deshabilitarlo
RunIt.devtools.disableShake()
window.addEventListener('devicemotion', handleShakeForUndo)
```

---

### Deep Linking

Cualquier link con el scheme `runit://` abre Dominus directamente en la app indicada, desde Safari, otra app, o un SMS.

**Formatos de URL:**
```
runit://app/{appId}                          → abre la app directamente
runit://app/{appId}?data={"key":"value"}     → abre la app con datos de lanzamiento
runit://catalog                              → va al catálogo (pantalla principal)
```

**Recibir los datos de lanzamiento en JS:**
```javascript
// window.__runitLaunchData se inyecta antes de que tu código corra
// Es null si la app fue abierta sin datos
const launchData = window.__runitLaunchData

if (launchData) {
  console.log(launchData.key)  // "value"
  // por ej: abrir un registro específico, pre-llenar un formulario, etc.
}
```

**Ejemplo — link en una web externa:**
```html
<!-- En tu web, un botón que abre la app directamente -->
<a href="runit://app/com.juan.miapp">Abrir en RunIt</a>

<!-- Con datos para abrir en un item específico -->
<a href="runit://app/com.juan.miapp?data=%7B%22itemId%22%3A42%7D">
  Ver item 42
</a>
```

**Notas:**
- Si la app no está instalada, Dominus muestra un error "App not installed"
- Los datos en `?data=` deben ser un JSON válido (URL-encoded)
- `window.__runitLaunchData` solo está disponible en el lanzamiento — guardalo en una variable si lo necesitás después

---

## Qué NO existe todavía

```javascript
// ❌ NO IMPLEMENTADO — no llamar

// Apple Watch
RunIt.watch.*

// Pagos
RunIt.pay.*
RunIt.iap.*

// Sensores — no implementados
// Sensores — implementado ✓

// Auth — implementado ✓

// Portapapeles — implementado ✓

// Contactos — no implementados
// Contactos — implementado ✓

// Calendario — no implementado
// Calendario — implementado ✓

// Bluetooth — implementado ✓

// NFC — implementado ✓

// HealthKit — implementado ✓

// CoreML — no implementados
// ML — implementado ✓

// ARKit — implementado ✓

// Network — implementado ✓

// Notificaciones — implementado ✓

// Background Tasks — implementado ✓

// Dev Tools (consola in-app) — implementado ✓

// Deep Linking runit:// — implementado ✓
```

---

## Estilo visual obligatorio

Dark mode siempre. Estas variables CSS en todas las apps:

```css
:root {
  --bg:      #080a0f;
  --surface: #0d1117;
  --border:  #1e2530;
  --accent:  #00ff88;
  --accent2: #0088ff;
  --accent3: #ff4466;
  --text:    #e2e8f0;
  --muted:   #4a5568;
}

* { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

html, body {
  height: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, 'SF Pro Display', sans-serif;
  overflow: hidden;
}
```

Tipografía: `-apple-system` para texto UI, `monospace` para datos/código/labels.
Touch feedback: `:active { opacity: 0.7; }` en todos los elementos interactivos.
Safe area siempre: `padding-bottom: env(safe-area-inset-bottom)` en el tab bar o footer.

---

## Patrones comunes

### App con tabs

```html
<div id="app">
  <div id="pages">
    <div class="page active" id="home"></div>
    <div class="page"        id="lista"></div>
  </div>
  <div id="tabbar">
    <div class="tab active" onclick="goTo('home', this)">Home</div>
    <div class="tab"        onclick="goTo('lista', this)">Lista</div>
  </div>
</div>
```

```css
#app    { display: flex; flex-direction: column; height: 100%; }
#pages  { flex: 1; overflow: hidden; position: relative; }
.page   { position: absolute; inset: 0; overflow-y: auto; -webkit-overflow-scrolling: touch;
          opacity: 0; pointer-events: none; transition: opacity .2s; }
.page.active { opacity: 1; pointer-events: auto; }
#tabbar { display: flex; background: var(--surface); border-top: 1px solid var(--border);
          padding-bottom: env(safe-area-inset-bottom); }
.tab    { flex: 1; padding: 12px; text-align: center; opacity: 0.4; cursor: pointer; font-size: 12px; }
.tab.active { opacity: 1; color: var(--accent); }
```

```javascript
function goTo(pageId, tab) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
  document.getElementById(pageId).classList.add('active')
  tab.classList.add('active')
}
```

### Init de DB al arrancar

```javascript
async function init() {
  await RunIt.db.run(`
    CREATE TABLE IF NOT EXISTS notas (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      texto TEXT NOT NULL,
      fecha TEXT DEFAULT (datetime('now'))
    )
  `)
  await renderLista()
}

window.addEventListener('load', init)
```

### Manejo de errores

```javascript
async function guardar(texto) {
  try {
    await RunIt.db.run(`INSERT INTO notas (texto) VALUES (?)`, [texto])
    RunIt.haptics.notification('success')
  } catch (err) {
    RunIt.haptics.notification('error')
    console.error(err)
  }
}
```

### Verificar RunIt disponible

```javascript
window.addEventListener('load', () => {
  if (!window.RunIt) {
    // Corriendo en browser normal — deshabilitar features nativas
    console.warn('RunIt no disponible')
  }
})
```

---

## Template mínimo

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Mi App</title>
  <style>
    :root {
      --bg: #080a0f; --surface: #0d1117; --border: #1e2530;
      --accent: #00ff88; --accent2: #0088ff; --accent3: #ff4466;
      --text: #e2e8f0; --muted: #4a5568;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body { height: 100%; background: var(--bg); color: var(--text); font-family: -apple-system, sans-serif; overflow: hidden; }
    #app  { display: flex; flex-direction: column; height: 100%; }
    main  { flex: 1; overflow-y: auto; padding: 24px 20px; -webkit-overflow-scrolling: touch;
            padding-top: max(24px, env(safe-area-inset-top)); }
  </style>
</head>
<body>
<div id="app">
  <main id="main"></main>
</div>
<script>
window.addEventListener('load', async () => {
  // init acá
})
</script>
</body>
</html>
```

---

## Checklist antes de entregar una app

- [ ] `manifest.json` con todos los campos requeridos
- [ ] `permissions` en manifest incluye todas las APIs usadas (ver tabla de permisos)
- [ ] Variables CSS de RunIt (`--bg`, `--accent`, etc.)
- [ ] `env(safe-area-inset-*)` en tab bar / footer
- [ ] `overflow: hidden` en `body`, scroll en los contenedores internos
- [ ] Todos los `await` donde corresponde (get, query, camera, gps, files, etc.)
- [ ] Sensores y listeners usan callbacks, no `await`
- [ ] Sensores se detienen cuando ya no hacen falta (evita calentamiento del dispositivo)
- [ ] SQL usa parámetros `?`, nunca concatenación
- [ ] `:active { opacity: 0.7 }` en elementos táctiles
- [ ] Solo APIs de la lista de disponibles (no llamar a "Qué NO existe todavía")
- [ ] try/catch en operaciones que pueden fallar (DB, camera, files, auth)
