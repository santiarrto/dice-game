# Tareas de desarrollo

Las tareas están ordenadas por prerrequisitos, no necesariamente por el orden en que deben ejecutarse. Marca una tarea como completa cuando se cumplan todos sus criterios de aceptación y se hayan ejecutado las validaciones pertinentes.

## Estados

- ⚪ **No asignada:** la tarea aún no tiene responsable ni se ha iniciado.
- 🔵 **En progreso:** hay una persona o agente trabajando en la tarea.
- ✅ **Completada:** se cumplieron los criterios de aceptación y se realizaron las validaciones pertinentes.
- 🔴 **Bloqueada:** no se puede continuar; indica la causa y qué se necesita para resolverla junto al estado.

Actualiza el estado al iniciar, bloquear, reanudar o completar una tarea. Una tarea no asignada puede tener dependencias pendientes: compruébalas antes de comenzar.

## T01 — Inicializar la aplicación

**Estado:** ✅ Completada.

**Dependencias:** ninguna.

- Crear una aplicación SPA con Vite, React y TypeScript.
- Configurar TypeScript en modo estricto, scripts de desarrollo/build y una estructura inicial pequeña.
- Usar la estructura prevista en [README.md](./README.md) y [PLANNING.md](./PLANNING.md); crear carpetas y archivos a medida que hagan falta.
- Configurar Vitest y Testing Library para pruebas unitarias y de componentes.
- Añadir linting/formato si se adopta una herramienta concreta; evitar reglas duplicadas o una configuración excesiva.
- Crear la entrada de la aplicación y una pantalla inicial funcional.

**Aceptación:** la aplicación inicia en local, el build de producción termina correctamente y se pueden ejecutar pruebas.

## T02 — Modelar las reglas del juego

**Estado:** ✅ Completada.

**Dependencias:** T01.

- Definir tipos para partida, participante, dado, turno, orden de juego y resumen final.
- Implementar funciones puras para crear/sortear el orden, calcular sumas, resolver el resultado contra 30, elegir el objetivo activo en una dirección y aplicar pérdidas/eliminaciones.
- Implementar el avance al siguiente jugador activo y la detección de victoria.
- Inyectar la fuente aleatoria para poder probar los lanzamientos y sorteos de forma determinista.
- Modelar explícitamente los seis dados, el máximo de cinco lanzamientos y la regla de los dados restantes en el quinto.

**Aceptación:** las reglas no dependen de componentes, estado del navegador ni `localStorage`; las entradas inválidas se rechazan de forma explícita.

## T03 — Probar reglas y casos límite

**Estado:** ✅ Completada.

**Dependencias:** T02.

- Cubrir sumas menores, iguales y mayores que 30, incluido el daño máximo de 6.
- Cubrir lanzamiento con dados restantes en el quinto intento y selección de al menos un dado por lanzamiento.
- Cubrir marcador inicial mínimo, predeterminado y máximo.
- Cubrir objetivo anterior/siguiente, jugadores eliminados, pérdida que llega exactamente a cero y excedente descartado.
- Cubrir avance de turno, una sola persona superviviente y creación/sorteo del orden.

**Aceptación:** las pruebas son deterministas, cubren los límites del reglamento y detectan cambios accidentales de las reglas.

## T04 — Implementar historial local

**Estado:** ✅ Completada. El guardado automático al finalizar una partida se conectó en T08.

**Dependencias:** T02.

- Definir un formato versionado de resumen de partida con fecha, nombres, orden, marcador inicial, resultado final, ganador y datos breves de la partida.
- Implementar un adaptador aislado para leer, validar, guardar y listar resúmenes en `localStorage`.
- Mantener como máximo las **10 partidas más recientes** en este MVP; tratar este límite como decisión de producto ajustable.
- Manejar datos antiguos, JSON inválido o almacenamiento no disponible sin bloquear una nueva partida; informar al usuario si no se puede conservar el historial.
- No guardar el estado de una partida en curso.

**Aceptación:** las partidas terminadas aparecen tras recargar el navegador; datos malformados no causan un fallo de la aplicación.

## T05 — Crear la bienvenida y configuración

**Estado:** ✅ Completada.

**Dependencias:** T01 para iniciar; T04 para completar la sección de historial.

- Permitir elegir entre 2 y 8 jugadores.
- Mostrar un campo para el nombre de cada participante; ofrecer nombres predeterminados y normalizar entradas vacías.
- Permitir configurar el marcador inicial entre 10 y 50, con valor predeterminado 20 y validación visible.
- Permitir sortear el orden o definirlo manualmente.
- Mostrar las partidas recientes guardadas localmente, con ganador y marcadores finales.
- Incluir una acción clara para comenzar la partida y errores de configuración comprensibles.

**Aceptación:** no se inicia una partida con datos fuera de los límites; el orden elegido/sorteado es el que recibe la partida.

## T06 — Implementar el flujo y estado de partida

**Estado:** ✅ Completada. La interfaz del tablero se implementará en T07.

**Dependencias:** T02 y T05.

- Crear el controlador de estado de partida y las acciones para lanzar, apartar dados, resolver el turno, elegir dirección de ataque y avanzar.
- Evitar que se lancen dados apartados, que se omitan turnos o que se resuelva dos veces el mismo turno.
- Mantener el jugador activo, el último jugador que completó un turno y el siguiente jugador activo.
- En el quinto lanzamiento, finalizar el turno contando también los dados que salieron pero no se apartaron.
- Al resolver un ataque, presentar la dirección/objetivo elegible; si el jugador de esa dirección está eliminado, avanzar hasta el más cercano activo.
- Terminar la partida cuando quede una sola persona activa.

**Aceptación:** una partida completa puede jugarse a través del controlador sin depender de elementos visuales; las transiciones respetan las reglas.

## T07 — Construir la mesa de juego

**Estado:** ✅ Completada. La pantalla final con guardado se completó en T08; la animación 3D corresponde a T09.

**Dependencias:** T06.

- Mostrar los seis dados, el número de lanzamiento, dados apartados y suma acumulada en todo momento.
- Permitir seleccionar dados con controles claros y distinguir visualmente dados disponibles, apartados y dados del último lanzamiento.
- Añadir un botón de lanzamiento con estados habilitado/deshabilitado según las reglas.
- Mostrar los resultados de turno y, cuando corresponda, pedir la dirección del ataque y confirmar el objetivo.
- Mostrar la lista ordenada de jugadores con sus marcadores y estados: siguiente, jugador activo, último en jugar y eliminado.
- Asegurar que perder puntos o ser eliminado sea evidente, sin depender únicamente del color.

**Aceptación:** el jugador entiende qué dados puede elegir, cuál es la suma y qué acción sigue sin consultar la consola ni instrucciones externas.

## T08 — Mostrar victoria y resultados

**Estado:** ✅ Completada.

**Dependencias:** T04, T06 y T07.

- Mostrar una ventana/pantalla de felicitaciones con el ganador.
- Incluir un resumen legible: participantes, marcador inicial y final, orden/resultado y cantidad de turnos jugados.
- Guardar el resumen al finalizar una sola vez y ofrecer un botón para iniciar una nueva partida.
- Permitir consultar los resultados recientes desde la bienvenida.
- Si no hay historial disponible, mostrar un estado vacío amable; si el guardado falla, mostrar el resultado de la partida de todos modos.

**Aceptación:** la victoria se muestra correctamente, el historial no duplica partidas y comenzar otra partida reinicia el estado de juego.

## T09 — Adaptabilidad, animación y accesibilidad

**Estado:** ✅ Completada.

**Dependencias:** T05, T07 y T08.

- Diseñar primero para móvil; adaptar la lista de jugadores y el tablero a tablet y escritorio sin perder información.
- Animar los dados lanzados con apariencia tridimensional y movimiento orgánico: giros, desplazamiento y desaceleración que sugieran un lanzamiento natural.
- Mostrar al detenerse la cara correspondiente al valor generado por el controlador; no volver a animar ni alterar los dados apartados.
- Mantener la animación fluida en celular y escritorio, sin impedir la lectura de los resultados ni afectar las reglas del juego.
- Añadir transiciones de marcador/eliminación y una alternativa sin movimiento no esencial para `prefers-reduced-motion`, mostrando directamente los valores finales.
- Añadir etiquetas accesibles, foco visible, navegación por teclado y anuncios de cambios importantes para tecnologías de asistencia.
- Comprobar contraste, tamaño táctil y que los mensajes no dependan solo de iconos o color.

**Aceptación:** los lanzamientos se perciben naturales y con profundidad en móvil y escritorio; cada cara final coincide con el resultado del controlador y los dados apartados permanecen sin cambios. Las pantallas se pueden usar con teclado y en un viewport móvil estrecho; con movimiento reducido se muestran los resultados sin animaciones no esenciales.

## T10 — Validación integral y entrega

**Estado:** ✅ Completada.

**Dependencias:** T03, T04, T05, T06, T07, T08 y T09.

- Añadir pruebas de integración del flujo de configuración, partida, victoria e historial.
- Añadir pruebas de navegador en `tests/e2e/` para una partida ganada y una partida con eliminación, con al menos un viewport móvil.
- Ejecutar lint, pruebas y build; corregir errores introducidos por el proyecto.
- Actualizar `README.md` con instalación, comandos, alcance y límites conocidos.

**Aceptación:** los comandos documentados funcionan, los escenarios críticos pasan y no hay errores bloqueantes en consola durante los flujos principales.
