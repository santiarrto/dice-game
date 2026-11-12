# 🎲 Juego de dados: sobrevivir

Juego de supervivencia para navegadores, pensado para jugar en una misma pantalla y adaptarse a celulares y computadores.

> 🚧 **Estado del proyecto:** la aplicación aún no está implementada. Por ahora el repositorio contiene las reglas y la planificación; todavía no hay comandos de instalación o ejecución disponibles.

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

Actualmente existen los siguientes archivos de documentación:

```text
dice-game/
├── README.md      # Reglas y descripción general
├── AGENTS.md      # Instrucciones y alcance para agentes
├── PLANNING.md    # Arquitectura, tecnologías y planificación
└── TASKS.md       # Tareas, dependencias y criterios de aceptación
```

### 🛠️ Estructura prevista para la aplicación

Esta estructura es una guía, **no representa archivos ya creados**. Se desarrollará progresivamente durante la implementación, creando únicamente lo que se necesite:

```text
dice-game/
├── index.html              # Entrada HTML de Vite
├── package.json            # Dependencias y comandos del proyecto
├── tsconfig.json           # Configuración de TypeScript
├── vite.config.ts          # Configuración de Vite
├── src/
│   ├── main.tsx            # Punto de entrada de React
│   ├── app/                # Composición y navegación de pantallas
│   ├── domain/             # Modelos y reglas puras del juego
│   ├── features/
│   │   ├── setup/          # Configuración de la partida
│   │   ├── game/           # Estado, tablero y flujo de la partida
│   │   └── history/        # Presentación del historial de resultados
│   ├── components/         # Componentes visuales compartidos
│   ├── persistence/        # Acceso y validación del historial local
│   └── styles/             # Estilos globales y diseño adaptable
└── tests/
    └── e2e/                # Pruebas de flujos en el navegador
```

Las pruebas unitarias y de componentes se ubicarán junto al código que prueban. Los archivos de configuración adicionales y los nombres concretos de las pruebas se definirán al crear la aplicación. La arquitectura y las tecnologías propuestas se detallan en [PLANNING.md](./PLANNING.md).

## 📚 Documentación del proyecto

- [Instrucciones para agentes](./AGENTS.md)
- [Planeación, alcance y arquitectura](./PLANNING.md)
- [Tareas de desarrollo](./TASKS.md)
