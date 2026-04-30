# Contador

Aplicación para registrar y acumular conteos de actividades a lo largo del tiempo. Mobile-first, pensada para usar desde el celular en la web.

## Idea general

Creás categorías (ej: "Gym") que agrupan counters (ej: "Bicep"). Cada vez que hacés una repetición apretás un botón y se suma al counter del día. Al final ponés save y se persiste.

## Clases (models.js)

Cada clase tiene `toJson()` (instancia) y `static fromJson()` para serialización/deserialización.

- **Count** — una cantidad con su fecha. Máximo uno por día por counter. Si ya existe un count para ese día, se suma a él en vez de crear uno nuevo.
- **Counter** — una cosa que querés contar (ej: "Bicep"). Tiene un array de counts que funciona como historial/calendario.
- **Category** — agrupa counters. Puede tener una categoría padre (`parentId`), lo que permite jerarquías recursivas (ej: "Fitness" > "Gym" > "Brazos"). Tiene dos atributos de estado de acordeón: `state_gestor` y `state_conteos`, cada uno `'collapsed'` o `'expanded'`. Las categorías nuevas arrancan siempre colapsadas.

## Arquitectura de archivos

- `models.js` — clases Count, Counter, Category con toJson/fromJson
- `services.js` — estado global (`categories[]`), persistencia, CRUD, `getTree()`, sistema de archivos
- `renders.js` — renderizado del DOM, recursivo para el árbol de categorías
- `events.js` — handlers de botones, navegación entre paneles, modales, init
- `style.css` — estilos mobile-first, dark mode via variables de Bootstrap
- `index.html` — estructura HTML + Bootstrap 5 CDN

## Paneles

### Conteos
Lista de categorías con sus counters. Por cada counter: botón `−`, nombre + número del día, botón `+`. Botón sticky **Save** abajo a la derecha.

### Gestor
CRUD de categorías y counters. Crear categoría (con padre opcional), editar nombre y padre, agregar counters, eliminar. El botón de editar (lápiz) abre el mismo modal de creación precargado con los datos actuales.

### Calendario
Historial de conteos agrupados por día, orden descendente. Muestra counter, categoría y cantidad.

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

Dos capas:

1. **localStorage** (`contador-state`) — guarda automáticamente en cada operación CRUD. Actúa como backup entre sesiones.
2. **Archivo JSON** — el botón Save escribe al archivo. Formato legible con indentación de 2 espacios.

### Flujo de archivos
- **Abrir** (`📂`): abre un `.json` existente con el File System Access API. El archivo queda asociado y cada Save escribe ahí.
- **Nuevo** (`📄`): limpia el estado y desasocia el archivo. El primer Save pide nombre y ubicación.
- **Save**: si hay archivo asociado escribe directo. Si no, abre el diálogo de guardar. Siempre guarda también en localStorage.
- **Fallback**: en navegadores sin File System Access API (ej: Firefox, iOS Safari), Abrir usa `<input type="file">` y Save descarga el JSON.

## Pendiente
- Editar nombre de counter existente
- Posibilidad de mover un counter entre categorías
