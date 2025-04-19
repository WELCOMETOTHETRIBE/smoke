// script.js
"use strict";

const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl2', { alpha: false });
if (!gl) {
  alert("WebGL2 not supported");
  throw new Error("WebGL2 not supported");
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function compileShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(vertexSource, fragmentSource) {
  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

function createTexture(width, height, internalFormat, format, type, param) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);
  return texture;
}

function createFBO(width, height, internalFormat, format, type, param) {
  const fbo = gl.createFramebuffer();
  const texture = createTexture(width, height, internalFormat, format, type, param);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.viewport(0, 0, width, height);
  gl.clear(gl.COLOR_BUFFER_BIT);
  return { fbo, texture, width, height };
}

const quadVertices = new Float32Array([ -1, -1, 1, -1, -1, 1, 1, 1 ]);
const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

const displayProgram = createProgram(baseVertexShader, displayShader);
const splatProgram = createProgram(baseVertexShader, splatShader);

const displayUniforms = {
  uTexture: gl.getUniformLocation(displayProgram, 'uTexture')
};

const splatUniforms = {
  uTarget: gl.getUniformLocation(splatProgram, 'uTarget'),
  aspectRatio: gl.getUniformLocation(splatProgram, 'aspectRatio'),
  point: gl.getUniformLocation(splatProgram, 'point'),
  color: gl.getUniformLocation(splatProgram, 'color'),
  radius: gl.getUniformLocation(splatProgram, 'radius')
};

const simWidth = canvas.width;
const simHeight = canvas.height;
const dye = createFBO(simWidth, simHeight, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR);

const pointer = { x: 0, y: 0, down: false };
canvas.addEventListener('pointerdown', e => { pointer.down = true; pointer.x = e.offsetX; pointer.y = e.offsetY; });
canvas.addEventListener('pointerup', () => pointer.down = false);
canvas.addEventListener('pointermove', e => { if (pointer.down) { pointer.x = e.offsetX; pointer.y = e.offsetY; } });

function splat(fbo, x, y, dx, dy, r, g, b) {
  gl.viewport(0, 0, fbo.width, fbo.height);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.fbo);
  gl.useProgram(splatProgram);
  gl.uniform1i(splatUniforms.uTarget, 0);
  gl.uniform1f(splatUniforms.aspectRatio, canvas.width / canvas.height);
  gl.uniform2f(splatUniforms.point, x / canvas.width, 1.0 - y / canvas.height);
  gl.uniform3f(splatUniforms.color, r, g, b);
  gl.uniform1f(splatUniforms.radius, 0.01);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function render() {
  if (pointer.down) {
    splat(dye, pointer.x, pointer.y, 0, 0, 1.0, 1.0, 1.0);
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(displayProgram);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, dye.texture);
  gl.uniform1i(displayUniforms.uTexture, 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  requestAnimationFrame(render);
}
render();
