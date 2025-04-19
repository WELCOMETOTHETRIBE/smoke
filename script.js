// script.js — patched to avoid framebuffer-texture feedback loop
"use strict";

const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2", { alpha: false });
if (!gl) throw new Error("WebGL2 not supported");
gl.getExtension("EXT_color_buffer_float");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
gl.viewport(0, 0, canvas.width, canvas.height);

function compileShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

function createProgram(vSource, fSource) {
  const program = gl.createProgram();
  const vShader = compileShader(gl.VERTEX_SHADER, vSource);
  const fShader = compileShader(gl.FRAGMENT_SHADER, fSource);
  gl.attachShader(program, vShader);
  gl.attachShader(program, fShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }
  return program;
}

function getSupportedInternalFormat(type) {
  if (type === gl.FLOAT) return gl.RGBA16F;
  return gl.RGBA8;
}

function createTexture(w, h, internalFormat, format, type, param) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const sizedFormat = getSupportedInternalFormat(type);
  gl.texImage2D(gl.TEXTURE_2D, 0, sizedFormat, w, h, 0, format, type, null);
  return tex;
}

function createFBO(w, h, internalFormat, format, type, param) {
  if (w === 0 || h === 0) throw new Error("FBO dimensions must be non-zero");
  const texture = createTexture(w, h, internalFormat, format, type, param);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error("Framebuffer is incomplete: 0x" + status.toString(16));
  }
  return { fbo, texture, width: w, height: h };
}

function createDoubleFBO(w, h, internalFormat, format, type, param) {
  const fbo1 = createFBO(w, h, internalFormat, format, type, param);
  const fbo2 = createFBO(w, h, internalFormat, format, type, param);
  return {
    read: fbo1,
    write: fbo2,
    swap() { [this.read, this.write] = [this.write, this.read]; }
  };
}

const simWidth = canvas.width;
const simHeight = canvas.height;

const programs = {
  display: createProgram(baseVertexShader, displayShader),
  splat: createProgram(baseVertexShader, splatShader),
  clear: createProgram(baseVertexShader, clearShader),
  advect: createProgram(baseVertexShader, advectionShader),
  curl: createProgram(baseVertexShader, curlShader),
  vorticity: createProgram(baseVertexShader, vorticityShader),
  pressure: createProgram(baseVertexShader, pressureShader),
  gradient: createProgram(baseVertexShader, gradientSubtractShader)
};

const dye = createDoubleFBO(simWidth, simHeight, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR);
const velocity = createDoubleFBO(simWidth, simHeight, gl.RGBA, gl.RGBA, gl.FLOAT, gl.NEAREST);
const pressure = createDoubleFBO(simWidth, simHeight, gl.RGBA, gl.RGBA, gl.FLOAT, gl.NEAREST);
const divergence = createFBO(simWidth, simHeight, gl.RGBA, gl.RGBA, gl.FLOAT, gl.NEAREST);
const curl = createFBO(simWidth, simHeight, gl.RGBA, gl.RGBA, gl.FLOAT, gl.NEAREST);

const quad = new Float32Array([ -1, -1, 1, -1, -1, 1, 1, 1 ]);
const vbo = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

function bindQuad(program) {
  const loc = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
}

const pointer = { x: 0, y: 0, dx: 0, dy: 0, down: false, moved: false };
canvas.addEventListener("pointerdown", e => {
  pointer.down = true;
  pointer.x = e.offsetX;
  pointer.y = e.offsetY;
});
canvas.addEventListener("pointerup", () => pointer.down = false);
canvas.addEventListener("pointermove", e => {
  if (!pointer.down) return;
  pointer.dx = e.offsetX - pointer.x;
  pointer.dy = e.offsetY - pointer.y;
  pointer.x = e.offsetX;
  pointer.y = e.offsetY;
  pointer.moved = true;
});

function splat(target, x, y, dx, dy, r, g, b) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, target.write.fbo);
  gl.viewport(0, 0, target.write.width, target.write.height);
  gl.useProgram(programs.splat);
  gl.uniform1f(gl.getUniformLocation(programs.splat, 'aspectRatio'), canvas.width / canvas.height);
  gl.uniform2f(gl.getUniformLocation(programs.splat, 'point'), x / canvas.width, 1.0 - y / canvas.height);
  gl.uniform3f(gl.getUniformLocation(programs.splat, 'color'), r, g, b);
  gl.uniform1f(gl.getUniformLocation(programs.splat, 'radius'), 0.01);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, target.read.texture);
  bindQuad(programs.splat);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  target.swap();
}

function render() {
  if (pointer.down && pointer.moved) {
    const [r, g, b] = [1.0, 1.0, 1.0];
    splat(velocity, pointer.x, pointer.y, pointer.dx, pointer.dy, r, g, b);
    splat(dye, pointer.x, pointer.y, pointer.dx, pointer.dy, r, g, b);
    pointer.moved = false;
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(programs.display);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, dye.read.texture);
  gl.uniform1i(gl.getUniformLocation(programs.display, 'uTexture'), 0);
  bindQuad(programs.display);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  requestAnimationFrame(render);
}
render();
