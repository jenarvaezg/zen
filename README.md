# zen

Un jardín de piedras que flotan, caen y responden al ratón. Sin cuentas, sin
contenido, sin más objetivo que quedarse mirando un rato.

Ajustable desde el propio sitio (icono de ajustes, abajo a la derecha):
cantidad de piedras, tamaño, gravedad, velocidad, rebote, choques entre ellas,
cómo reacciona el ratón (repeler / atraer), hilos que conectan piedras
cercanas, paleta de color y tema claro/oscuro. Los ajustes se guardan en el
navegador.

Pensado como el primer de una familia de jueguitos de relax — de ahí el
nombre genérico.

## Desarrollo local

No hay build ni dependencias: es HTML/CSS/JS estático con ES modules.

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

(Abrir `index.html` directamente con `file://` también funciona en la
mayoría de navegadores, pero un servidor local evita restricciones de CORS
con los módulos ES.)

## Despliegue

Cada push a `main` despliega automáticamente a GitHub Pages vía
`.github/workflows/deploy.yml`.
