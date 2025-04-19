// shaders.js

const baseVertexShader = `
  precision mediump float;
  attribute vec2 aPosition;
  varying vec2 vUv;
  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const displayShader = `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  void main() {
    gl_FragColor = texture2D(uTexture, vUv);
  }
`;

const splatShader = `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D uTarget;
  uniform float aspectRatio;
  uniform vec2 point;
  uniform vec3 color;
  uniform float radius;
  void main() {
    vec2 p = vUv;
    vec2 diff = p - point;
    diff.x *= aspectRatio;
    float dist = dot(diff, diff);
    float influence = exp(-dist / radius);
    vec4 base = texture2D(uTarget, vUv);
    gl_FragColor = base + vec4(color * influence, 1.0);
  }
`;

const clearShader = `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform float value;
  void main() {
    vec4 texel = texture2D(uTexture, vUv);
    gl_FragColor = texel * value;
  }
`;

const advectionShader = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2 texelSize;
  uniform float dt;
  uniform float dissipation;
  void main() {
    vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
    gl_FragColor = dissipation * texture2D(uSource, coord);
  }
`;

const curlShader = `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform vec2 texelSize;
  void main() {
    float L = texture2D(uVelocity, vUv - vec2(texelSize.x, 0)).y;
    float R = texture2D(uVelocity, vUv + vec2(texelSize.x, 0)).y;
    float T = texture2D(uVelocity, vUv + vec2(0, texelSize.y)).x;
    float B = texture2D(uVelocity, vUv - vec2(0, texelSize.y)).x;
    float curl = R - L - (T - B);
    gl_FragColor = vec4(curl, 0.0, 0.0, 1.0);
  }
`;

const vorticityShader = `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform vec2 texelSize;
  uniform float curlStrength;
  void main() {
    float L = abs(texture2D(uCurl, vUv - vec2(texelSize.x, 0)).x);
    float R = abs(texture2D(uCurl, vUv + vec2(texelSize.x, 0)).x);
    float T = abs(texture2D(uCurl, vUv + vec2(0, texelSize.y)).x);
    float B = abs(texture2D(uCurl, vUv - vec2(0, texelSize.y)).x);

    float C = abs(texture2D(uCurl, vUv).x);
    vec2 force = 0.5 * vec2(R - L, T - B);
    force /= length(force) + 0.0001;
    force *= curlStrength * C;

    vec2 velocity = texture2D(uVelocity, vUv).xy;
    gl_FragColor = vec4(velocity + force, 0.0, 1.0);
  }
`;

const pressureShader = `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;
  uniform vec2 texelSize;
  void main() {
    float L = texture2D(uPressure, vUv - vec2(texelSize.x, 0)).x;
    float R = texture2D(uPressure, vUv + vec2(texelSize.x, 0)).x;
    float T = texture2D(uPressure, vUv + vec2(0, texelSize.y)).x;
    float B = texture2D(uPressure, vUv - vec2(0, texelSize.y)).x;
    float C = texture2D(uDivergence, vUv).x;
    float pressure = (L + R + B + T - C) * 0.25;
    gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
  }
`;

const gradientSubtractShader = `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uPressure;
  uniform vec2 texelSize;
  void main() {
    float L = texture2D(uPressure, vUv - vec2(texelSize.x, 0)).x;
    float R = texture2D(uPressure, vUv + vec2(texelSize.x, 0)).x;
    float T = texture2D(uPressure, vUv + vec2(0, texelSize.y)).x;
    float B = texture2D(uPressure, vUv - vec2(0, texelSize.y)).x;
    vec2 gradient = vec2(R - L, T - B) * 0.5;
    vec2 velocity = texture2D(uVelocity, vUv).xy - gradient;
    gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`;
