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

**Estado:** ✅ Completada. La interfaz del tablero se completó en T07.

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

## Etapa 2 — Personalización y funcionalidades ampliadas

Las tareas T11–T25 amplían el MVP sin alterar las reglas del juego. Las decisiones están detalladas en [PLANNING.md](./PLANNING.md). Los avatares repetidos están permitidos; `player1.jpg` será el predeterminado y se usará también para partidas históricas migradas. El logo de T18 fue proporcionado por el dueño del producto.

## T11 — Definir catálogo y modelo de avatares

**Estado:** ✅ Completada. Los jugadores de partidas nuevas usan `player1`; los registros históricos sin avatar se migran con ese valor predeterminado en T13.

**Dependencias:** T10.

- Crear un catálogo tipado de los veinte recursos de `src/assets/player-icons/` con IDs estables.
- Añadir al modelo del jugador el ID de avatar y definir `player1` como predeterminado.
- Resolver los IDs a recursos empaquetados sin generar rutas a partir de texto libre.
- Permitir que distintos jugadores compartan un avatar.

**Aceptación:** cada ID del catálogo corresponde a una imagen existente; tipos y valores inválidos se manejan de forma explícita y los jugadores existentes reciben el avatar predeterminado.

## T12 — Configurar avatares y participantes humanos/IA

**Estado:** ✅ Completada.

**Dependencias:** T11.

- Permitir elegir uno de los avatares para cada participante durante la configuración.
- Mostrar el avatar predeterminado inicialmente y conservar la selección al editar el orden o cantidad de jugadores.
- Permitir configurar a cada participante como persona o IA, admitiendo combinaciones de ambos tipos en una partida.
- Hacer que la galería sea operable con teclado y táctil, con etiquetas y estado seleccionado accesibles.
- Mantener la selección repetida entre participantes.

**Aceptación:** la partida comienza con el avatar y tipo de participante elegidos para cada persona; se puede completar la configuración solo con teclado y en un viewport móvil estrecho.

## T13 — Persistir avatares y preparar el historial versionado

**Estado:** ✅ Completada. El historial ahora guarda avatares en versión 2 y migra los registros de versión 1.

**Dependencias:** T11.

- Incluir el ID del avatar de cada jugador en el resumen de partida.
- Versionar el formato del historial y migrar registros actuales de versión 1 asignándoles `player1`.
- Definir el esquema versionado para almacenar la clasificación final que se añadirá en T16.
- Mantener la validación del historial: las versiones incompatibles y los datos inválidos no deben sobrescribirse silenciosamente.
- Conservar el límite actual de diez resultados recientes y el comportamiento de guardado único.

**Aceptación:** una partida nueva conserva los IDs de avatar tras recargar; los registros de versión 1 siguen siendo legibles con el avatar predeterminado; el esquema admite el ranking; los datos inválidos siguen mostrando un error recuperable.

## T14 — Mostrar avatares en resultados e historial

**Estado:** ✅ Completada.

**Dependencias:** T12 y T13.

- Mostrar los avatares junto a los participantes en el resultado final.
- Mostrar el avatar guardado en cada entrada del historial reciente.
- Usar `player1` para registros de versión 1 sin avatar y como alternativa si una imagen válida no carga, con un aviso. Los IDs inválidos en versión 2 mantienen el error recuperable de T13 y no se sobrescriben.
- Mantener los nombres y estados de jugador visibles; el avatar es complementario y no sustituye etiquetas ni texto.

**Aceptación:** el avatar correcto acompaña al jugador en la victoria e historial; la interfaz sigue siendo clara con imágenes fallidas, datos antiguos y movimiento reducido.

## T15 — Implementar tres dificultades de IA

**Estado:** ✅ Completada.

**Dependencias:** T06 y T12.

- Implementar una IA fácil que seleccione aleatoriamente entre acciones legales.
- Implementar una IA media que intente acercar la suma del turno a 30.
- Implementar una IA difícil que evalúe las jugadas y el objetivo de ataque según los marcadores y la supervivencia de los participantes.
- Usar el flujo de juego existente para validar las acciones; la IA no debe omitir reglas ni controlar el resultado de los dados.
- Inyectar azar para que las decisiones de IA puedan probarse de forma determinista.

**Aceptación:** cada nivel toma decisiones válidas según su política, responde cuando le corresponde y completa partidas mixtas persona/IA; las pruebas cubren niveles y casos límite de manera determinista.

## T16 — Crear y guardar la clasificación final

**Estado:** ✅ Completada.

**Dependencias:** T06 y T13.

- Registrar el orden de eliminación durante la partida.
- Mostrar al finalizar una clasificación completa: ganador primero y demás participantes en orden inverso al de eliminación, por lo que quien salió primero queda al final.
- Guardar y mostrar el mismo orden en el historial local, sin duplicar resúmenes ni superar diez partidas.
- Mantener la clasificación independiente del idioma de la interfaz.

**Aceptación:** una partida terminada presenta a todos los participantes exactamente una vez en el orden establecido; tras recargar, el historial conserva ese orden y los registros antiguos siguen siendo legibles.

## T17 — Añadir inglés y español

**Estado:** ✅ Completada para la interfaz existente. Las páginas informativas se crearán en ambos idiomas en T19 y T20.

**Dependencias:** T10.

- Hacer que inglés sea el idioma predeterminado y ofrecer español como alternativa.
- Traducir la interfaz completa, las páginas informativas, los errores y los anuncios accesibles.
- Guardar la preferencia de idioma en el almacenamiento local del navegador y aplicarla al volver a abrir la aplicación.
- Mantener las reglas y los datos persistidos independientes del idioma.

**Aceptación:** una primera visita muestra inglés; al seleccionar español, toda la interfaz cambia y conserva la selección tras recargar; un valor de idioma inválido vuelve al predeterminado sin corromper otros datos.

## T18 — Integrar logo y favicon

**Estado:** ✅ Completada. Se usan versiones optimizadas de `src/assets/icon.jpg`.

**Dependencias:** T10 y entrega del recurso de logo.

- Usar el nuevo logo en la aplicación y como favicon del tab del navegador.
- Asegurar que el recurso se empaquete localmente y se vea correctamente en los tamaños y fondos usados.
- Incluir nombre accesible cuando el logo transmita información y evitar texto alternativo redundante si es decorativo.

**Aceptación:** el logo actualizado aparece en la aplicación y el favicon correcto se muestra en el tab en desarrollo y en el build de producción.

## T19 — Crear páginas de contacto y sugerencias

**Estado:** ⚪ No asignada.

**Dependencias:** T10 y T17.

- Añadir una página navegable de contacto y sugerencias en inglés y español.
- Incluir un enlace `mailto:` a `santiarrto@gmail.com` que abra la aplicación de correo predeterminada.
- No guardar ni enviar sugerencias a un servidor o servicio externo.
- Hacer la página utilizable con teclado, lectores de pantalla y viewport móvil.

**Aceptación:** el enlace abre un nuevo mensaje dirigido a la dirección indicada; navegación y contenido están disponibles en ambos idiomas sin depender de un backend.

## T20 — Crear la página de preguntas frecuentes

**Estado:** ⚪ No asignada.

**Dependencias:** T10 y T17.

- Redactar las preguntas y respuestas con base en las reglas aprobadas en `README.md` y las funciones de la aplicación.
- Publicar la página en inglés y español, con navegación clara desde la aplicación.
- Usar estructura semántica y asegurar legibilidad en móvil y operación por teclado.

**Aceptación:** las respuestas coinciden con las reglas canónicas y las páginas están completas en ambos idiomas.

## T21 — Simplificar el cierre del turno cuando queda un dado

**Estado:** ⚪ No asignada.

**Dependencias:** T07 y T09.

- Cuando solo quede un dado disponible para lanzar, apartar automáticamente su resultado al terminar el lanzamiento, sin pedir una selección manual.
- En la zona de acciones del turno, reemplazar las acciones de selección/lanzamiento por una única acción explícita para confirmar el cierre, con un texto localizado como «Continuar con el siguiente jugador».
- Al confirmar, continuar la resolución normal del turno: conservar cualquier decisión de ataque que corresponda y avanzar al siguiente jugador activo solo cuando las reglas lo permitan.
- Cubrir la experiencia con pruebas de componente e integración, incluyendo la variante en que el resultado requiere elegir dirección de ataque.

**Aceptación:** en el caso descrito, el único dado restante se aparta sin interacción adicional y el jugador solo confirma el cierre del turno; no se puede volver a lanzar ese dado, se respetan ataques/eliminaciones y la acción funciona con teclado y en móvil.

## T23 — Señalar con una corona a los líderes

**Estado:** ⚪ No asignada.

**Dependencias:** T07 y T09.

- Mostrar una corona en la lista de jugadores de la mesa junto a cada participante activo con el mayor puntaje actual; mostrarla en todos los líderes si hay empate.
- Actualizar el indicador al cambiar los marcadores o al eliminar participantes; no mostrarlo junto a jugadores eliminados.
- Proporcionar una descripción accesible y localizada del liderazgo, sin depender únicamente del icono.
- Cubrir con pruebas el liderazgo único, los empates, los cambios de líder y la eliminación, además de verificar la presentación en móvil.

**Aceptación:** la corona identifica a todos y solo los participantes activos con mayor puntaje durante la partida, se actualiza al cambiar el estado y es comprensible con tecnología de asistencia. No modifica la clasificación final por orden de eliminación ni se requiere en el historial.

## T24 — Atacar automáticamente al único objetivo disponible

**Estado:** ⚪ No asignada.

**Dependencias:** T06 y T07.

- Si un ataque tiene un solo objetivo activo elegible distinto del atacante, aplicar el ataque automáticamente sin pedir que se elija una dirección; por ejemplo, cuando solo quedan dos jugadores.
- Si existen varios objetivos posibles, conservar la elección actual de dirección y seleccionar al jugador activo más cercano en esa dirección.
- Mantener intactos el cálculo del daño, la eliminación y la resolución normal del turno.
- Cubrir con pruebas el caso de objetivo único, la eliminación del objetivo y la elección de dirección cuando hay varios objetivos; comprobar la interacción en escritorio y móvil.

**Aceptación:** cuando solo hay un objetivo activo posible, el ataque se aplica una sola vez a ese jugador y el flujo continúa correctamente sin una elección redundante; con varios objetivos se mantiene la elección actual y las reglas no cambian.

## T25 — Mostrar en el tablero los avatares seleccionados

**Estado:** ⚪ No asignada.

**Dependencias:** T07 y T12.

- Mostrar junto al nombre de cada participante en la lista del tablero el avatar seleccionado durante la configuración.
- Mantener visible el nombre, el marcador y los estados de turno y eliminación; el avatar es complementario y no los sustituye.
- Usar el avatar predeterminado si el ID no se puede resolver o la imagen no carga.
- Verificar que la correspondencia entre participantes y avatares se conserva tras iniciar la partida y que la lista sigue siendo legible en móvil.

**Aceptación:** cada participante muestra en el tablero el mismo avatar que eligió en la configuración, con su nombre y estado legibles; los casos de avatar no disponible tienen un reemplazo comprensible y la vista funciona en móvil.

## T22 — Validar e integrar la Etapa 2

**Estado:** ⚪ No asignada.

**Dependencias:** T14, T15, T16, T17, T18, T19, T20, T21, T23, T24 y T25.

- Añadir pruebas unitarias y de integración para catálogo/migración de avatares, avatares en tablero/resultados/historial, configuración humana/IA, políticas de IA, ranking, indicador de líderes, traducciones, páginas nuevas, cierre automático con un dado y ataque automático al único objetivo.
- Extender las pruebas de navegador para escritorio, móvil, selección de idioma, juego mixto, ranking, historial, avatares en el tablero, confirmación de cierre de turno y ataque automático cuando solo quede un objetivo.
- Ejecutar lint, pruebas unitarias, pruebas de navegador y build; actualizar la documentación.

**Aceptación:** las funcionalidades de T11–T21 y T23–T25 cumplen sus criterios, las pruebas pasan, no hay errores de consola en flujos críticos y el archivo de logo requerido está integrado.
