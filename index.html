<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Proception Smoke</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    html, body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #000;
    }
    canvas {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
    }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <script>
    // Minimal PavelDoGreat fluid logic for local use
    const canvas = document.getElementById('canvas');
    const gl = canvas.getContext('webgl2', { alpha: false });
    if (!gl) alert('WebGL2 not supported');

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const pointers = [{ id: -1, down: false, moved: false, x: 0, y: 0 }];
    canvas.addEventListener('pointerdown', (e) => {
      pointers[0].down = true;
      pointers[0].x = e.clientX;
      pointers[0].y = e.clientY;
    });
    canvas.addEventListener('pointermove', (e) => {
      if (pointers[0].down) {
        pointers[0].moved = true;
        pointers[0].x = e.clientX;
        pointers[0].y = e.clientY;
      }
    });
    canvas.addEventListener('pointerup', () => pointers[0].down = false);

    function drawSmokeTrail() {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (pointers[0].down && pointers[0].moved) {
        const r = 180 + Math.random() * 60;
        const g = 180 + Math.random() * 60;
        const b = 180 + Math.random() * 60;
        ctx.beginPath();
        ctx.arc(pointers[0].x, pointers[0].y, 50, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.1)`;
        ctx.fill();
      }
      requestAnimationFrame(drawSmokeTrail);
    }
    drawSmokeTrail();
  </script>
</body>
</html>
