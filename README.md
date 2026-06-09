# Reto ICFES: Sociales y Ciudadanas - I.E.D. El Carmen de Guasca

Aplicación web tipo trivia para entrenamiento Saber 11 en Ciencias Sociales y Ciudadanas.

## Contenido

- `index.html`: interfaz principal.
- `styles.css`: estilos visuales.
- `app.js`: lógica del juego, ranking y conexión a Firebase.
- `firebase-config.js`: archivo donde se pega la configuración de Firebase.
- `questions.js`: repositorio con 109 preguntas extraídas de los cuadernillos adjuntos.
- `assets/escudo.jpg`: escudo de la institución.
- `assets/pages/`: páginas originales de los cuadernillos para preguntas con imágenes, caricaturas o textos extensos.
- `firebase-rules.json`: reglas básicas para Realtime Database.

## Plataforma gratuita recomendada

- Publicación de la app: GitHub Pages.
- Ranking en línea: Firebase Realtime Database, plan Spark.

## Configuración rápida

1. Crea un proyecto en Firebase.
2. Crea una Web App dentro del proyecto.
3. Crea una Realtime Database.
4. Copia las reglas de `firebase-rules.json` en Realtime Database > Rules.
5. Copia la configuración de Firebase en `firebase-config.js`.
6. Sube todos los archivos a un repositorio público de GitHub.
7. Activa GitHub Pages desde Settings > Pages > Deploy from branch > main / root.
8. Comparte la URL con los estudiantes.

## Nota de uso

El banco de preguntas se preparó para fines académicos y no comerciales. Conserva los créditos institucionales del ICFES y no uses el material con fines de lucro.

Generado: 2026-06-09
