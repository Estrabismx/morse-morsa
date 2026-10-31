# Morse Morsa

`-- --- .-. ... . / -- --- .-. ... .-`

Página web para **traducir código morse a español latino y viceversa**, reproducir los mensajes con **luz y/o sonido**, **aprender morse jugando** y cifrar mensajes con **claves de sustitución** de tradición scout.

Tiene estética de telégrafo antiguo y funciona sin instalar nada: es HTML, CSS y JavaScript puro, sin dependencias.

---

## Cómo usarla

1. Descarga o clona el repositorio:

   ```bash
   git clone https://github.com/Estrabismx/morse-morsa.git
   ```

2. Abre `index.html` en tu navegador.

También se puede publicar tal cual en GitHub Pages o en cualquier hosting estático.

> El sonido usa la Web Audio API, así que los navegadores solo lo activan después de que tocas la página por primera vez.

---

## Funciones

### 🎛️ Panel de reproducción

Siempre visible arriba. Permite elegir:

- **Luz** 💡 y/o **sonido** 🔊, por separado o juntos.
- **Destello a pantalla completa**, útil para enviar señales a otra persona.
- **Velocidad** (5–30 palabras por minuto), **tono** (300–1000 Hz) y **volumen**.

Estos ajustes se guardan en el navegador y también se usan en los juegos.

### 🔤 Traductor

- Traduce de **español → morse** y de **morse → español** mientras escribes; con **⇄** se invierte la dirección.
- Si escribes solo puntos y rayas, detecta que es morse y cambia de dirección solo.
- Acepta los caracteres que autocorrigen los celulares (`…`, `—`, `–`, `·`, `•`).
- Al reproducir, marca la letra que está sonando o destellando.
- **Manipulador «DICTAR»**: se mantiene presionado (corto = punto, largo = raya) y lo dictado se escribe y se traduce al momento.
- Opción para tratar **CH** como una sola letra (`----`).

**Formato del morse:** letras separadas por un espacio y palabras por ` / `.

```text
.... --- .-.. .- / -- ..- -. -.. ---   →   HOLA MUNDO
```

### 📖 Alfabeto

Tarjetas con letras (incluida la **Ñ**), números y signos. Al tocar una tarjeta, se reproduce su código.

Caracteres propios del español incluidos:

| Carácter | Código  | Carácter | Código   |
| :---: | :---: | :---: | :---: |
| Ñ        | `--.--` | ¿        | `..-.-`  |
| CH       | `----`  | ¡        | `--...-` |
| Á        | `.--.-` | É        | `..-..`  |
| Ó        | `---.`  | Ü        | `..--.`  |

La Í y la Ú no tienen código propio y se traducen como I y U.

### 🎮 Juegos

Los récords se guardan en el navegador.

| Juego | De qué se trata |
| --- | --- |
| ❓ **Quiz** | 10 preguntas de opción múltiple (morse → letra, letra → morse o mixto), con puntos extra por racha. |
| 🎧 **Escucha y escribe** | Se reproduce un mensaje con luz y/o sonido y hay que escribir qué dice. Niveles: letras, palabras y frases. |
| 📟 **Telegrafista** | Se teclea morse con el manipulador o la barra espaciadora. Modo libre o reto de palabras. |
| ⏱️ **Contrarreloj** | Lo máximo posible en 60 segundos, de morse a letra o de letra a morse. |
| 🃏 **Memoria** | Encontrar las parejas entre letra y código (6, 8 o 10 parejas). |
| 🏆 **Torneo** | De 2 a 8 jugadores por turnos, con tiempo límite y vidas configurables. Quien falla pierde una vida, la dificultad sube con cada ronda y gana el último en pie. |

### 🔐 Claves de sustitución

Antes de cifrar se quitan las tildes; la Ñ se conserva.

| Clave | Cómo funciona | Ejemplo con `HOLA` |
| --- | --- | --- |
| **Murciélago** | Las letras de MURCIÉLAGO se cambian por los números del 0 al 9. | `H967` |
| **Zenit Polar** | Se intercambian Z↔P, E↔O, N↔L, I↔A y T↔R. | `HENI` |
| **Numérica** | Cada letra se cambia por su posición en el alfabeto de 27 letras (Ñ = 15). | `8-16-12-1` |
| **Teléfono** | Como en el teclado de un celular antiguo; la tecla 6 tiene M-N-Ñ-O. | `44 6666 555 2` |
| **Gato** | Se dibuja el gato (#) con 3 letras por casilla; los puntos indican la posición de la letra. | símbolos |
| **China** | El alfabeto va en filas de 5; las rayas verticales indican la fila y las horizontales la columna. | símbolos |

En las claves Gato y China, «Cifrar» dibuja los símbolos. Para descifrar se usa un teclado de símbolos.

### ✉️ Contacto

El sobre de la esquina inferior izquierda tiene los enlaces al repositorio, a GitHub y a Instagram.

---

## Estructura

```text
morse-morsa/
├── index.html   # Estructura de la página y de todas las secciones
├── style.css    # Estilo retro de telégrafo y diseño adaptable a celulares
└── main.js      # Traductor, reproductor de luz y sonido, juegos y claves
```

En `main.js`, los datos están agrupados al inicio de cada sección, para que sea fácil modificarlos:

- `MORSE`: la tabla de códigos.
- `PALABRAS`, `FRASES` y `PALABRAS_CORTAS`: las palabras que se usan en los juegos.
- `CLAVES`: la definición de cada clave de sustitución.
- `MENSAJE_INICIAL`: el mensaje que aparece precargado en el traductor.

---

## Autoría

Hecho por **Estrabismx**:

- GitHub: [github.com/Estrabismx](https://github.com/Estrabismx)
- Instagram: [@n.arkotikk](https://www.instagram.com/n.arkotikk/)

## Licencia

Distribuido bajo la licencia [MIT](LICENSE).
