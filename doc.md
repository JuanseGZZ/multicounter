# Contador

Aplicación para registrar y acumular conteos de actividades a lo largo del tiempo. Mobile-first, pensada para usar desde el celular en la web.

## Idea general

Creás categorías (ej: "Gym") que agrupan counters (ej: "Bicep"). Cada vez que hacés una repetición apretás un botón y se suma al counter del día. Al final ponés save y se persiste.

## Clases (models.js)

Cada clase tiene `toJson()` (instancia) y `static fromJson()` para serialización/deserialización.

- **Count** — una cantidad con su fecha. Máximo uno por día por counter. Si ya existe un count para ese día, se suma a él en vez de crear uno nuevo.
- **Counter** — una cosa que querés contar (ej: "Bicep"). Tiene un array de counts que funciona como historial/calendario.
- **Category** — agrupa counters. Puede tener una categoría padre (`parentId`), lo que permite jerarquías recursivas (ej: "Fitness" > "Gym" > "Brazos"). Tiene dos atributos de estado de acordeón: `state_gestor` y `state_conteos`, cada uno `'collapsed'` o `'expanded'`. Las categorías nuevas arrancan siempre colapsadas.
- **State** — estado de UI de la app. Solo vive en localStorage (`contador-ui-state`), nunca se escribe al archivo JSON. Guarda: `currentPanel` (panel activo), `calendarYear`, `calendarMonth` (mes visible en el calendario), `calendarSelectedDay` (día seleccionado o null). Diseñada para acumular más estados de UI a futuro.

## Arquitectura de archivos

- `models.js` — clases Count, Counter, Category, State con toJson/fromJson
- `services.js` — estado global (`categories[]`, `appState`), persistencia, CRUD, `getTree()`, sistema de archivos
- `renders.js` — renderizado del DOM, recursivo para el árbol de categorías
- `events.js` — handlers de botones, navegación entre paneles, modales, init
- `style.css` — estilos mobile-first, dark mode via variables de Bootstrap
- `index.html` — estructura HTML + Bootstrap 5 CDN

## Paneles

### Conteos
Lista de categorías con sus counters. Por cada counter: botón `−`, nombre + **total histórico acumulado**, botón `+`. El número mostrado es la suma de todos los counts de toda la historia (`getTotalAllTime`), no el del día. Botón sticky **Save** abajo a la derecha.

### Gestor
CRUD de categorías y counters. Crear categoría (con padre opcional), editar nombre y padre, agregar counters, eliminar. El botón de editar (lápiz) abre el mismo modal de creación precargado con los datos actuales.

### Calendario
Dos secciones:
- **Grid del mes** — cuadrícula real de 7 columnas (Lu→Do) con el mes actualmente navegado. Días con actividad tienen un punto azul. El día de hoy tiene borde azul. Se navega con `‹` `›`. El mes y año visitado se persisten en `appState`.
- **Lista de historial** — debajo del grid, muestra **todo el historial** de todos los tiempos, del más reciente al más antiguo, con fecha completa en cada entrada. Al tocar un día del grid se filtra la lista a ese día en ese mes específico; tocarlo de nuevo vuelve al historial completo.

## Navegación
Nav fijo en la parte inferior con tres tabs: Gestor / Conteos / Calendario.

## Header
Barra superior sticky con el nombre de la app, el nombre del archivo abierto y dos botones: Nuevo (`📄`) y Abrir (`📂`).

## Jerarquía de categorías
Las categorías pueden anidarse recursivamente. El árbol se construye en `getTree()` (services.js) a partir del array plano usando `parentId`. El render es recursivo: cada categoría muestra sus counters y luego sus hijas dentro del mismo bloque colapsable. Las hijas se indentan visualmente con una barra azul a la izquierda.

## Acordeón
Cada categoría tiene un header clickeable con chevron (`▼/▲`). Por defecto colapsada. Al colapsar el padre, los hijos desaparecen con él. El header muestra debajo del nombre un resumen tipo `3 contadores · 2 subcategorías`. El estado de colapso se persiste en el objeto y en localStorage/archivo, por lo que sobrevive recargas y re-renders. Los paneles Gestor y Conteos tienen estados de colapso independientes por categoría.

## Dark mode
Siempre activo via `data-bs-theme="dark"` en el tag `<html>`. Los colores custom del CSS usan variables de Bootstrap (`--bs-body-bg`, `--bs-border-color`, etc.) para adaptarse automáticamente.

## Persistencia y sistema de archivos

Tres capas, cada una con su propia key:

| Key | Contenido | Cuándo se escribe |
|-----|-----------|-------------------|
| `contador-state` | categorías, counters, counts, estados de acordeón | en cada CRUD y en Save |
| `contador-ui-state` | panel activo (`State`) | al cambiar de panel |
| `contador-filename` | nombre del último archivo abierto | al abrir o crear archivo |

El archivo JSON solo contiene los datos (`contador-state`). El estado de UI nunca se exporta.

### Flujo de archivos
- **Abrir** (`📂`): abre un `.json` con el File System Access API. El `fileHandle` queda guardado en IndexedDB y se restaura automáticamente al recargar, sin necesidad de volver a abrir el archivo.
- **Nuevo** (`📄`): limpia el estado y borra el handle de IndexedDB. El primer Save pide nombre y ubicación.
- **Save**: si hay handle escribe directo al archivo. Si no, abre el diálogo de guardar. Si el permiso venció (puede pasar entre sesiones), lo repide al primer Save. Siempre guarda también en localStorage.
- **Exportar** (`⬇`): descarga el JSON actual. Útil en móvil donde no hay File System Access API.
- **Fallback móvil**: sin File System Access API, Save solo va a localStorage. Abrir usa `<input type="file">`. El nombre del archivo se muestra con `(local)` para indicar que no hay escritura directa al archivo.

### Restauración al recargar
Al iniciar, se restaura en orden: `appState` (panel activo) → datos de `categories` → `fileHandle` desde IndexedDB (desktop) o nombre desde localStorage (móvil) → se navega al panel donde estaba el usuario.

## Pendiente
- Editar nombre de counter existente
- Posibilidad de mover un counter entre categorías
