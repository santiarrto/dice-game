# 🎲 Juego de dados: sobrevivir

Juego de supervivencia para navegadores, pensado para jugar en una misma pantalla y adaptarse a celulares y computadores.

> ✅ **Estado del proyecto:** MVP validado. Se puede jugar una partida, consultar el resultado final, guardar el historial y usar el tablero adaptable con animaciones accesibles.

## 🚀 Desarrollo

Se necesita Node.js 20.19 o posterior de la rama 20, o Node.js 22.12 o posterior, y npm. Desde la raíz del proyecto:

```bash
npm ci
npm run dev
```

Abre en el navegador la dirección que muestra Vite. Otros comandos disponibles:

```bash
npm test                    # Ejecutar pruebas unitarias, de componentes e integración
npm run build               # Comprobar tipos y generar la versión de producción
npm run lint                # Revisar el código con ESLint
npx playwright install chromium # Instalar Chromium para pruebas de navegador (una vez)
npm run test:e2e            # Probar partidas completas en escritorio y móvil
npm run preview             # Previsualizar el build generado
```

## 💾 Historial local

La bienvenida muestra hasta **10 partidas terminadas** guardadas en el navegador, con su ganador y marcadores finales. Los datos no se sincronizan entre dispositivos y pueden borrarse al limpiar el almacenamiento del navegador. La partida en curso no se guarda.

El historial utiliza un formato versionado. Si los datos están dañados, la versión no es compatible o el almacenamiento no está disponible, se muestra un aviso y se puede seguir configurando una partida; los datos existentes no se sobrescriben.

Al finalizar una partida se muestra el ganador y el resumen, y se intenta guardar el resultado automáticamente. Si no se puede guardar, el resumen permanece visible y se informa del error.

## 🏁 Objetivo

Sobrevive mientras los demás jugadores pierden sus puntos. Gana la última persona que permanezca en la partida.

## 🧰 Preparación

- 👥 Pueden jugar de **2 a 8 personas**.
- 🔀 El orden de los turnos se determina al azar al comenzar. Si se prefiere, se puede acordar y configurar manualmente.
- ❤️ Cada jugador comienza con un marcador de puntos de vida. El valor predeterminado es **20** y se puede configurar entre **10 y 50**, inclusive.
- 🎲 Se necesitan **6 dados**.

## 🔄 Cómo se juega

En su turno, cada jugador lanza los seis dados y puede hacer hasta **5 lanzamientos**:

1. Después de cada lanzamiento, el jugador elige uno o más dados y aparta los valores elegidos.
2. En el siguiente lanzamiento solo tira los dados que aún no ha apartado.
3. Hay que apartar al menos un dado después de cada lanzamiento; no se puede terminar el turno voluntariamente antes de usar los dados.
4. Continúa hasta apartar los seis dados o alcanzar el límite de cinco lanzamientos. Si el quinto lanzamiento deja dados sin apartar, sus valores de ese lanzamiento también cuentan para la suma final y no se vuelven a tirar.
5. Se suman los valores de los seis dados para determinar el resultado del turno.

Cada dado se cuenta una sola vez. Apartar un dado significa que ya no se vuelve a lanzar durante ese turno.

## ⚖️ Resultado del turno

Compara la suma de los dados con **30**:

- 📉 **Menos de 30:** el jugador pierde la diferencia de su propio marcador.
- 🤝 **Exactamente 30:** no cambia ningún marcador.
- ⚔️ **Más de 30:** el excedente sobre 30 se usa para atacar. El jugador elige como objetivo a la persona activa más cercana que siga en la partida, en el sentido siguiente o anterior al orden de turnos. El objetivo pierde esa cantidad de puntos.

Los puntos de vida no bajan de cero. Quien llega a cero queda eliminado y ya no toma turnos ni puede ser objetivo. Si la pérdida supera los puntos que le quedaban, el excedente se descarta. Después de una eliminación, la ronda continúa con el siguiente jugador activo en el orden establecido, saltando a quienes hayan sido eliminados.

## 📊 Valores posibles

Con seis dados normales de seis caras, la suma de un turno puede ir de **6 a 36**:

- 📉 Una suma de **6 a 29** causa una pérdida de entre **24 y 1 punto**, respectivamente, al jugador que lanzó.
- 🤝 Una suma de **30** no cambia los marcadores.
- ⚔️ Una suma de **31 a 36** causa un ataque de entre **1 y 6 puntos**, respectivamente.

## 🧪 Ejemplos

### 🤝 Resultado exacto: 30

Al terminar de apartar los seis dados, sus valores suman **30**. Como el resultado coincide con el objetivo, nadie pierde ni gana puntos; todos los marcadores se mantienen igual.

### 📉 Resultado menor que 30: 25

Los dados suman **25**. La diferencia es `30 - 25 = 5`, así que quien lanzó pierde **5 puntos**. Si tenía 20, se queda con 15.

Una posible secuencia de lanzamientos:

| Lanzamiento | Dados obtenidos | Dados apartados | Suma apartada |
|---|---|---|---:|
| 1 | 1, 4, 5, 2, 6, 3 | 6 y 5 | 11 |
| 2 | 2, 3, 4, 1 | 4 | 15 |
| 3 | 3, 2, 2 | 3 y 2 | 20 |
| 4 | 5 | 5 | 25 |

Se usaron cuatro lanzamientos y los seis dados quedaron apartados. La suma final es 25.

### ⚔️ Resultado mayor que 30: 34

Los dados suman **34**. El excedente es `34 - 30 = 4`, por lo que el jugador elige atacar a la persona activa más cercana que esté antes o después de él en el orden. Esa persona pierde **4 puntos**. Si tenía 12, se queda con 8.

### 💀 Eliminación

Un jugador tiene 3 puntos y recibe un ataque de 4. Pierde los 3 puntos que le quedaban y queda eliminado; el punto sobrante no se transfiere a otro jugador.

### ⏱️ Agotar los cinco lanzamientos

Si al quinto lanzamiento todavía quedan dados por tirar, el turno termina allí. Se suman los valores que el jugador ya había apartado más los valores que salieron en ese último lanzamiento. Por ejemplo, si había apartado dados que suman 18 y los dados restantes muestran 9 en el quinto lanzamiento, el resultado del turno es **27**.

## 🏆 Fin de la partida

La partida termina cuando solo queda una persona sin eliminar. Esa persona es la ganadora.

## 🗂️ Estructura del proyecto

Estructura actual (sin incluir dependencias instaladas ni el build generado):

```text
dice-game/
├── README.md             # Reglas y descripción general
├── AGENTS.md             # Instrucciones para agentes
├── PLANNING.md           # Arquitectura y planificación
├── TASKS.md              # Tareas y criterios de aceptación
├── eslint.config.js      # Reglas de lint
├── index.html            # Entrada HTML
├── package.json          # Dependencias y comandos
├── package-lock.json     # Versiones exactas de dependencias
├── playwright.config.ts   # Configuración de pruebas de navegador
├── tsconfig.json         # Configuración de TypeScript
├── vite.config.ts        # Configuración de Vite y Vitest
├── tests/
│   └── e2e/
│       └── game.spec.ts   # Flujos de victoria y eliminación en navegador
└── src/
    ├── main.tsx          # Entrada de React
    ├── test-setup.ts     # Configuración de pruebas
    ├── app/              # Composición de la aplicación y su prueba
    ├── domain/           # Reglas y pruebas del juego
    ├── features/game/    # Mesa, controlador de partida y sus pruebas
    ├── features/history/ # Presentación del historial
    ├── features/setup/   # Configuración de jugadores y sus pruebas
    ├── persistence/      # Lectura, validación y guardado del historial
    └── styles/           # Estilos globales
```

Las pruebas unitarias y de componentes se ubican junto al código que prueban. La arquitectura y las tecnologías se detallan en [PLANNING.md](./PLANNING.md).

## 📚 Documentación del proyecto

- [Instrucciones para agentes](./AGENTS.md)
- [Planeación, alcance y arquitectura](./PLANNING.md)
- [Tareas de desarrollo](./TASKS.md)
