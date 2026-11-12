# Instrucciones para agentes

## Misión

Desarrollar una aplicación web responsive del juego de dados descrito en [README.md](./README.md). Debe funcionar en navegadores de escritorio y móviles, permitir configurar y jugar una partida, y mostrar resultados recientes guardados localmente en el navegador.

## Antes de trabajar

1. Lee este archivo, [README.md](./README.md), [PLANNING.md](./PLANNING.md) y [TASKS.md](./TASKS.md).
2. Usa `README.md` como fuente canónica de las reglas del juego. Si otra instrucción o una tarea parece contradecirlo, no cambies las reglas silenciosamente: plantea la discrepancia.
3. Revisa el estado actual del repositorio y conserva los cambios de otras personas.
4. Comprueba los comandos reales de `package.json` antes de ejecutar pruebas o builds. El proyecto aún no tiene código ni manifiesto de dependencias.

## Alcance del agente

### Incluido

- Implementar el flujo de bienvenida y configuración de la partida.
- Implementar las reglas de dados, turnos, marcadores, ataques y eliminación.
- Crear una interfaz en español, mobile-first, con animaciones accesibles.
- Mantener visible el jugador actual, el siguiente jugador y quien jugó último.
- Mostrar el resultado final y guardar un historial local de partidas terminadas.
- Añadir pruebas, documentación y validaciones necesarias para las funcionalidades implementadas.

### Fuera de alcance salvo solicitud explícita

- Cuentas, autenticación, backend, sincronización entre dispositivos o multijugador en red.
- Analítica, publicidad, pagos o envío de datos a servicios externos.
- Reanudar una partida en curso después de cerrar o recargar la página.
- Cambiar reglas del juego sin aprobación.

## Reglas del juego que se deben preservar

- De 2 a 8 participantes; marcador inicial predeterminado de 20, configurable entre 10 y 50 inclusive.
- El orden puede sortearse o definirse manualmente.
- Cada turno usa seis dados normales de seis caras y permite hasta cinco lanzamientos.
- Después de cada lanzamiento se aparta al menos un dado; los dados apartados no se vuelven a lanzar.
- En el quinto lanzamiento, los valores de todos los dados que se lanzaron cuentan aunque queden sin apartar.
- Resultado menor que 30: el jugador activo pierde la diferencia. Igual a 30: no cambia ningún marcador. Mayor que 30: el excedente ataca a un único jugador activo en el sentido siguiente o anterior.
- Se saltan jugadores eliminados al avanzar turnos o buscar un objetivo. Un marcador no baja de cero; al llegar a cero, el jugador queda eliminado y cualquier pérdida excedente se descarta.
- Gana la última persona que siga activa.

## Guías de implementación

- Sigue las tecnologías, arquitectura y convenciones de [PLANNING.md](./PLANNING.md).
- Consulta la estructura prevista en [README.md](./README.md); crea archivos y carpetas al implementar cada funcionalidad, no como marcadores vacíos.
- Mantén las reglas como lógica de dominio pura y separada de React, el DOM y `localStorage`.
- Centraliza transiciones de partida y valida acciones para impedir estados inválidos, como volver a lanzar dados apartados.
- No uses `any` para evitar errores de tipos. Prefiere tipos explícitos, guardas y funciones pequeñas.
- Mantén la interfaz en español, adaptable a pantallas estrechas y operable con teclado.
- Respeta `prefers-reduced-motion`; las animaciones nunca deben ser necesarias para entender el resultado o completar una acción.
- Persiste solo resúmenes de partidas terminadas. No guardes nombres o resultados en servicios remotos.
- Valida y versiona los datos leídos de `localStorage`; presenta un mensaje claro si el historial no puede leerse o guardarse.
- Actualiza las tareas de [TASKS.md](./TASKS.md) cuando se complete o se redefina trabajo.

## Validación de cambios

- Añade pruebas enfocadas para reglas, límites y transiciones que cambies.
- Ejecuta las pruebas y el build más pequeños que cubran el cambio; informa claramente si no fue posible ejecutarlos.
- Para cambios de UI, comprueba los estados principales y un viewport móvil además del de escritorio.
- No declares una tarea completa solo porque compila: verifica sus criterios de aceptación en `TASKS.md`.
