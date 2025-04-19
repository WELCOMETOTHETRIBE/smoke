// script.js
"use strict";

const canvas = document.getElementById('canvas');
const { gl } = getWebGLContext(canvas);
resizeCanvas();

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
}

window.addEventListener('resize', resizeCanvas);

let pointer = {
  id: -1,
  down: false,
  moved: false,
  x: 0,
  y: 0,
  dx: 0,
  dy: 0,
  color: [1.0, 1.0, 1.0]
};

canvas.addEventListener('pointerdown', e => {
  pointer.down = true;
  pointer.x = e.offsetX;
  pointer.y = canvas.height - e.offsetY;
  pointer.moved = false;
});

canvas.addEventListener('pointermove', e => {
  if (!pointer.down) return;
  pointer.dx = e.offsetX - pointer.x;
  pointer.dy = (canvas.height - e.offsetY) - pointer.y;
  pointer.x = e.offsetX;
  pointer.y = canvas.height - e.offsetY;
  pointer.moved = Math.abs(pointer.dx) > 0 || Math.abs(pointer.dy) > 0;
});

canvas.addEventListener('pointerup', () => {
  pointer.down = false;
});

const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
  gl.STATIC_DRAW
);

const displayProgram = createProgram(gl, baseVertexShader, displayShader);
const displayUniforms = {
  uTexture: gl.getUniformLocation(displayProgram, 'uTexture')
};

function render() {
  gl.useProgram(displayProgram);

  const position = gl.getAttribLocation(displayProgram, 'aPosition');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  gl.uniform1i(displayUniforms.uTexture, 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  requestAnimationFrame(render);
}

render();
