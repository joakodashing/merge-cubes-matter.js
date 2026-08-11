// ---------- INICIALIZACIÓN DEL MOTOR RIGIDO (REPARADO ANTI 0X0) ----------
const engine = Engine.create({ gravity: { y: 1.4 } }); 
const world = engine.world;

// 🌟 SOLUCIÓN: Esperamos 100ms para asegurar que el contenedor HTML mida su tamaño real
setTimeout(() => {
  const contenedorJuego = document.getElementById("game-container") || document.body;

  const render = Render.create({
    element: contenedorJuego,
    engine: engine,
    options: {
      width: WIDTH,
      height: HEIGHT,
      wireframes: false, 
      background: '#0d1117'
    }
  });

  Render.run(render);
  const runner = Runner.create();
  Runner.run(runner, engine);

  // Mover los límites aquí dentro asegura que se acoplén al tamaño real
  const suelo = Bodies.rectangle(WIDTH / 2, HEIGHT + 30, WIDTH, 60, { isStatic: true, friction: 0.1 });
  const paredIzquierda = Bodies.rectangle(-30, HEIGHT / 2, 60, HEIGHT, { isStatic: true, friction: 0.1 });
  const paredDerecha = Bodies.rectangle(WIDTH + 30, HEIGHT / 2, 60, HEIGHT, { isStatic: true, friction: 0.1 });
  Composite.add(world, [suelo, paredIzquierda, paredDerecha]);

  // Reubicamos el escuchador del mouse aquí adentro para que se vincule al lienzo real ya creado
  render.canvas.addEventListener('mousemove', (e) => {
    const rect = render.canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) * (WIDTH / rect.width);
    const size = CUBE_SIZES[nextLevel];
    currentSpawnX = Math.max(size / 2, Math.min(clickX, WIDTH - size / 2));
    isAiming = true;
  });

  render.canvas.addEventListener('click', () => {
    const size = CUBE_SIZES[nextLevel];
    const nuevoCubo = Bodies.rectangle(currentSpawnX, 80, size, size, {
      restitution: 0.1, 
      friction: 0.1,
      render: getCubeRenderOptions(nextLevel),
      plugin: { level: nextLevel, id: Math.random(), spawnTime: Date.now() }
    });
    Composite.add(world, nuevoCubo);
    playSound(soundClick);
    nextLevel = randomSpawnLevel();
    actualizarPreview();
    isAiming = false;
  });
}, 100);

// ---------- MOTOR DE COLISIONES SÓLIDAS Y FUSIONES (MATTER.JS) ----------
Events.on(engine, 'collisionStart', (event) => {
  event.pairs.forEach((pair) => {
    const { bodyA, bodyB } = pair;

    if (bodyA.plugin && bodyB.plugin && bodyA.plugin.level && bodyB.plugin.level) {
      if (bodyA.plugin.level === bodyB.plugin.level) {
        const nivelActual = bodyA.plugin.level;
        const nuevoNivel = nivelActual + 1;

        const todosLosCuerpos = Composite.allBodies(world);
        if (!todosLosCuerpos.includes(bodyA) || !todosLosCuerpos.includes(bodyB)) {
          return; 
        }

        // Cooldown de 150ms para evitar bucles de fusión en el mismo fotograma
        const tiempoA = Date.now() - (bodyA.plugin.spawnTime || 0);
        const tiempoB = Date.now() - (bodyB.plugin.spawnTime || 0);
        if (tiempoA < 150 || tiempoB < 150) return;

        // Remover del mundo físico de forma limpia
        Composite.remove(world, bodyA);
        Composite.remove(world, bodyB);

        const midX = (bodyA.position.x + bodyB.position.x) / 2;
        const midY = (bodyA.position.y + bodyB.position.y) / 2;

        if (nuevoNivel <= MAX_LEVEL) {
          const nuevoTamaño = CUBE_SIZES[nuevoNivel];
          
          const cuboFusionado = Bodies.rectangle(midX, midY, nuevoTamaño, nuevoTamaño, {
            restitution: 0.1,
            friction: 0.1,
            render: getCubeRenderOptions(nuevoNivel),
            plugin: { level: nuevoNivel, id: Math.random(), spawnTime: Date.now() }
          });

          // Un pequeño salto físico vertical muy satisfactorio
          Body.setVelocity(cuboFusionado, { x: (Math.random() - 0.5) * 2, y: -3 });
          Composite.add(world, cuboFusionado);
          playSound(soundMerge);
        }
      }
    }
  });
});

// ---------- BOTONES DE CONTROL DE INTERFAZ ----------
function resetearJuego() {
  const todosLosCuerpos = Composite.allBodies(world);
  todosLosCuerpos.forEach(body => {
    if (!body.isStatic) Composite.remove(world, body);
  });
  nextLevel = randomSpawnLevel();
  actualizarPreview();
}

const botonReset = document.getElementById("btnReset");
if (botonReset) botonReset.addEventListener("click", resetearJuego);

const btnMusica = document.getElementById("btnMusica");
if (btnMusica) {
  btnMusica.addEventListener("click", () => {
    if (musicaFondo.paused) {
      musicaFondo.play();
      btnMusica.textContent = "🔊 Música: ON";
      btnMusica.classList.add("encendida");
    } else {
      musicaFondo.pause();
      btnMusica.textContent = "🎵 Música: OFF";
      btnMusica.classList.remove("encendida");
    }
  });
}
