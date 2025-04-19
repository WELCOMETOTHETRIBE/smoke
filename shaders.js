// shaders.js
"use strict";

const baseVertexShader = `
  precision highp float;
  attribute vec2 aPosition;
  varying vec2 vUv;
  void main() {
    vUv = 0.5 * (aPosition + 1.0);
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const clearShader = `
  precision mediump float;
  precision mediump sampler2D;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform float value;
  void main() {
    gl_FragColor = value * texture2D(uTexture, vUv);
  }
`;

const displayShader = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  void main() {
    vec3 color = texture2D(uTexture, vUv).rgb;
    gl_FragColor = vec4(color, 1.0);
  }
`;

// More shaders (for advection, divergence, pressure, vorticity, curl, splat, etc.)
// would follow here...

// We will keep appending them in future steps.
