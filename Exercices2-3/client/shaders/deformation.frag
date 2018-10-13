precision mediump float;

/* Rendu du jeu */
uniform sampler2D uSampler;

/* Texture de déformation en rouge et vert */
uniform sampler2D uDeformation;

/* Texture pour contrôler l'intensité de la déformation */
uniform sampler2D uIntensity;

/* Intervalle de temps multiplié par la vitesse depuis l'activation du composant */
uniform float uTime;

/* Échelle de la déformation */
uniform float uScale;

/* Coordonnées UV du fragment */
varying vec2 vTextureCoord;

const float PI = 3.1415926;

void main(void) {
    float piTime = uTime * 2.0 * PI;
    float intensity = uScale * texture2D(uIntensity, vec2(uTime, 0.0)).x;
    vec2 direction = vec2(cos(piTime), sin(piTime));
    vec2 shift = texture2D(uDeformation, vTextureCoord).xy - vec2(0.5, 0.5);
    vec2 coord = vTextureCoord + (shift * direction) * intensity;

    gl_FragColor = texture2D(uSampler, coord);
}
