// script.js
fetch('https://cdn.jsdelivr.net/gh/PavelDoGreat/WebGL-Fluid-Simulation/script.js')
  .then(res => res.text())
  .then(code => {
    const script = document.createElement('script');
    script.innerHTML = code;
    document.body.appendChild(script);

    const configScript = document.createElement('script');
    configScript.innerHTML = `
      setTimeout(() => {
        config.SIM_RESOLUTION = 128;
        config.DYE_RESOLUTION = 512;
        config.SHADING = true;
        config.BLOOM = true;
        config.TRANSPARENT = false;
        config.BACK_COLOR = { r: 0, g: 0, b: 0 };
        multipleSplats(24);
      }, 1000);
    `;
    document.body.appendChild(configScript);
  });
