// FULL script.js — Final Version with Velocity Advection, Curl, and Pressure
"use strict";

const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl2', { alpha: false });
if (!gl) throw new Error("WebGL2 not supported");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

gl.viewport(0, 0, canvas.width, canvas.height);

// Load all shader programs
const displayProgram = createProgram(baseVertexShader, displayShader);
const splatProgram = createProgram(baseVertexShader, splatShader);
const clearProgram = createProgram(baseVertexShader, clearShader);
const advectionProgram = createProgram(baseVertexShader, advectionShader);
const curlProgram = createProgram(baseVertexShader, curlShader);
const vorticityProgram = createProgram(baseVertexShader, vorticityShader);
const pressureProgram = createProgram(baseVertexShader, pressureShader);
const gradientSubtractProgram = createProgram(baseVertexShader, gradientSubtractShader);

// Framebuffers
const simWidth = canvas.width;
const simHeight = canvas.height;
const dye = createDoubleFBO(simWidth, simHeight, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR);
const velocity = createDoubleFBO(simWidth, simHeight, gl.RGBA, gl.RGBA, gl.FLOAT, gl.NEAREST);
const pressure = createDoubleFBO(simWidth, simHeight, gl.RGBA, gl.RGBA, gl.FLOAT, gl.NEAREST);
const divergence = createFBO(simWidth, simHeight, gl.RGBA, gl.RGBA, gl.FLOAT, gl.NEAREST);
const curl = createFBO(simWidth, simHeight, gl.RGBA, gl.RGBA, gl.FLOAT, gl.NEAREST);

// Pointer input
let pointer = { x: 0, y: 0, dx: 0, dy: 0, down: false, moved: false };
canvas.addEventListener('pointerdown', e => {
  pointer.down = true;
  pointer.x = e.offsetX;
  pointer.y = e.offsetY;
});
canvas.addEventListener('pointerup', () => pointer.down = false);
canvas.addEventListener('pointermove', e => {
  if (!pointer.down) return;
  pointer.dx = e.offsetX - pointer.x;
  pointer.dy = e.offsetY - pointer.y;
  pointer.x = e.offsetX;
  pointer.y = e.offsetY;
  pointer.moved = true;
});

function splat(target, x, y, dx, dy, r, g, b) {
  gl.viewport(0, 0, target.write.width, target.write.height);
  gl.bindFramebuffer(gl.FRAMEBUFFER, target.write.fbo);
  gl.useProgram(splatProgram);
  gl.uniform1i(gl.getUniformLocation(splatProgram, 'uTarget'), 0);
  gl.uniform1f(gl.getUniformLocation(splatProgram, 'aspectRatio'), canvas.width / canvas.height);
  gl.uniform2f(gl.getUniformLocation(splatProgram, 'point'), x / canvas.width, 1.0 - y / canvas.height);
  gl.uniform3f(gl.getUniformLocation(splatProgram, 'color'), r, g, b);
  gl.uniform1f(gl.getUniformLocation(splatProgram, 'radius'), 0.01);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, target.read.texture);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  target.swap();
}

function applyAdvection(fbo, velocityTex, sourceTex, dissipation) {
  gl.viewport(0, 0, fbo.write.width, fbo.write.height);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.write.fbo);
  gl.useProgram(advectionProgram);
  gl.uniform2f(gl.getUniformLocation(advectionProgram, 'texelSize'), 1.0 / fbo.write.width, 1.0 / fbo.write.height);
  gl.uniform1f(gl.getUniformLocation(advectionProgram, 'dt'), 0.016);
  gl.uniform1f(gl.getUniformLocation(advectionProgram, 'dissipation'), dissipation);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, velocityTex);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, sourceTex);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  fbo.swap();
}

function applyCurl() {
  gl.viewport(0, 0, curl.width, curl.height);
  gl.bindFramebuffer(gl.FRAMEBUFFER, curl.fbo);
  gl.useProgram(curlProgram);
  gl.uniform2f(gl.getUniformLocation(curlProgram, 'texelSize'), 1.0 / simWidth, 1.0 / simHeight);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, velocity.read.texture);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function applyVorticity() {
  gl.viewport(0, 0, velocity.write.width, velocity.write.height);
  gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.write.fbo);
  gl.useProgram(vorticityProgram);
  gl.uniform2f(gl.getUniformLocation(vorticityProgram, 'texelSize'), 1.0 / simWidth, 1.0 / simHeight);
  gl.uniform1f(gl.getUniformLocation(vorticityProgram, 'curl'), 30);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, velocity.read.texture);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, curl.texture);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  velocity.swap();
}

function computeDivergence() {
  gl.viewport(0, 0, divergence.width, divergence.height);
  gl.bindFramebuffer(gl.FRAMEBUFFER, divergence.fbo);
  gl.useProgram(clearProgram); // reuse clearShader for divergence calculation
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, velocity.read.texture);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function solvePressure() {
  for (let i = 0; i < 20; i++) {
    gl.viewport(0, 0, pressure.write.width, pressure.write.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, pressure.write.fbo);
    gl.useProgram(pressureProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, pressure.read.texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, divergence.texture);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    pressure.swap();
  }
}

function subtractGradient() {
  gl.viewport(0, 0, velocity.write.width, velocity.write.height);
  gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.write.fbo);
  gl.useProgram(gradientSubtractProgram);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, velocity.read.texture);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, pressure.read.texture);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  velocity.swap();
}

function render() {
  if (pointer.down && pointer.moved) {
    const [r, g, b] = [1.0, 1.0, 1.0];
    splat(velocity, pointer.x, pointer.y, pointer.dx, pointer.dy, r, g, b);
    splat(dye, pointer.x, pointer.y, pointer.dx, pointer.dy, r, g, b);
    pointer.moved = false;
  }

  applyAdvection(velocity, velocity.read.texture, velocity.read.texture, 0.99);
  applyAdvection(dye, velocity.read.texture, dye.read.texture, 0.99);
  applyCurl();
  applyVorticity();
  computeDivergence();
  solvePressure();
  subtractGradient();

  // Draw to screen
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(displayProgram);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, dye.read.texture);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  requestAnimationFrame(render);
}
render();
