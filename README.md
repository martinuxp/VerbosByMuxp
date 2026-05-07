# Verbos By Muxp


**Verbos by Muxp**, una herramienta para dominar conjugaciones de verbos en inglés.

---

## 🐀 Funciones

- **Selección de Verbos Personalizada**: Elige verbos por categoría: Regulares, Irregulares o Combinados. Selecciona verbos específicos o elige un conjunto aleatorio de 20 para una sesión rápida.
- **Formatos de Quiz Configurables**: Practica exactamente lo que necesitas. Enfócate en las formas de Infinitivo, Pasado Simple o Participio Pasado.
- **Interfaz de Quiz Interactiva**: Diseños limpios y tabulares con traducciones al español proporcionadas como pistas útiles.
- **Retroalimentación y Aprendizaje Inmediato**: Visualiza las respuestas correctas junto a las entradas incorrectas para reforzar el aprendizaje.
- **Enfocado en el diseño**: Construido con los principios de **Material 3** (aunq no se parezca en nada ahora cofcof), con sombras suaves, animaciones fluidas (Framer Motion), fondos (bgs) con musho aura de **ReactBites** y una paleta de colores bien *kiut*.

---

## 🛠️ Stack Tecnológico

| Capa           | Tecnología                                                                 |
| -------------- | -------------------------------------------------------------------------- |
| **Framework**  | [Next.js 15](https://nextjs.org/) (App Router, TypeScript)                |
| **Estilos**    | [Tailwind CSS](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/) |
| **Componentes de UI** | [Radix UI](https://www.radix-ui.com/), [Lucide React Icons](https://lucide.dev/) |
| **Hosting**    | [Firebase](https://firebase.google.com/) (App Hosting)   |
| **Base de Datos** | [SupaBase](https://supabase.com/)                   |

---

## 📦 Host manual

### Requisitos Previos

- Node.js instalado en tu máquina.
- Firebase CLI (`npm install -g firebase-tools`).

### Desarrollo Local

1.  **Instalar Dependencias**:
    ```bash
    npm install
    ```

2.  **Configuración del Entorno**:
    Asegúrate de que tu archivo `.env.local` esté configurado con tus variables de entorno para Supabase y Firebase o cambialo por lo q te guste más w

3.  **Ejecutar la App**:
    ```bash
    npm run dev
    ```
    Abre [http://localhost:9002](http://localhost:9002) en tu navegador.


---

## 🚀 Despliegue

Este proyecto está optimizado para **Firebase App Hosting**, porq? porq si.

Para desplegar la aplicación:
```bash
firebase deploy
```

> [!IMPORTANT]
> Asegúrate de que tu `firebase.json` tenga una configuración de `apphosting` válida antes de realizar el despliegue, o poco t va a funcionar.

---

## 📂 Estructura del Proyecto

- `/src/app/`: Lógica central de la aplicación y enrutamiento de páginas.
- `/src/components/`: Componentes de interfaz de usuario reutilizables construidos con Radix y Tailwind, incluyendo fondos de ReactBites.
- `/docs/`: Blueprint del proyecto y documentación interna.

---

## ✨ Desarrollado con Antigravity

Este proyecto fue migrado y mejorado utilizando **Antigravity**, IDE de IA de Google. (este proyecto es en gran parte VideCoding pero sabiendo q hacer ok, si no soy tan tonto)

