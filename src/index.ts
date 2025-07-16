// Planet B Wireframe Loading Screen
import './index.css';

// Create the wireframe planet scene
function createWireframePlanet() {
  // Import Three.js
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r152/three.min.js';
  script.onload = () => {
    initializePlanet();
  };
  document.head.appendChild(script);
}

function initializePlanet() {
  // Set dark space background
  document.body.style.background = 'radial-gradient(circle, #0a0f1a 0%, #000408 100%)';
  document.body.style.margin = '0';
  document.body.style.overflow = 'hidden';

  const scene = new (window as any).THREE.Scene();
  const camera = new (window as any).THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new (window as any).THREE.WebGLRenderer({ antialias: true, alpha: true });
  
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  document.body.appendChild(renderer.domElement);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Subtle ambient light
  scene.add(new (window as any).THREE.AmbientLight(0x0a4d2a, 0.3));

  // Create icosphere geometry (subdivided icosahedron)
  const icosphereGeo = new (window as any).THREE.IcosahedronGeometry(3, 2);
  
  // Main wireframe sphere
  const wireframeMat = new (window as any).THREE.MeshBasicMaterial({ 
    color: 0x2ecc71,
    wireframe: true,
    transparent: true,
    opacity: 0.8
  });
  const wireframeSphere = new (window as any).THREE.Mesh(icosphereGeo, wireframeMat);
  scene.add(wireframeSphere);

  // Glow effect sphere (slightly larger)
  const glowGeo = new (window as any).THREE.IcosahedronGeometry(3.1, 1);
  const glowMat = new (window as any).THREE.MeshBasicMaterial({
    color: 0x27ae60,
    transparent: true,
    opacity: 0.15,
    side: (window as any).THREE.BackSide
  });
  const glowSphere = new (window as any).THREE.Mesh(glowGeo, glowMat);
  scene.add(glowSphere);

  // Inner core glow
  const coreGeo = new (window as any).THREE.IcosahedronGeometry(2.8, 1);
  const coreMat = new (window as any).THREE.MeshBasicMaterial({
    color: 0x58d68d,
    transparent: true,
    opacity: 0.1,
    side: (window as any).THREE.FrontSide
  });
  const coreSphere = new (window as any).THREE.Mesh(coreGeo, coreMat);
  scene.add(coreSphere);

  // Add some vertex highlights
  const vertices = icosphereGeo.attributes.position;
  const particleGeo = new (window as any).THREE.BufferGeometry();
  particleGeo.setAttribute('position', vertices);
  
  const particleMat = new (window as any).THREE.PointsMaterial({
    color: 0x7dffaa,
    size: 4,
    transparent: true,
    opacity: 0.6,
    blending: (window as any).THREE.AdditiveBlending
  });
  
  const particles = new (window as any).THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  camera.position.set(0, 0, 8);
  camera.lookAt(0, 0, 0);

  // Animation variables
  let time = 0;

  function animate() {
    requestAnimationFrame(animate);
    
    time += 0.01;
    
    // Gentle rotation
    wireframeSphere.rotation.y += 0.005;
    wireframeSphere.rotation.x += 0.002;
    
    glowSphere.rotation.y -= 0.003;
    glowSphere.rotation.x -= 0.001;
    
    coreSphere.rotation.y += 0.007;
    coreSphere.rotation.x += 0.003;
    
    particles.rotation.y += 0.002;
    particles.rotation.x += 0.001;
    
    // Gentle pulsing glow
    const pulse = Math.sin(time) * 0.1 + 0.9;
    glowMat.opacity = 0.15 * pulse;
    coreMat.opacity = 0.1 * pulse;
    particleMat.opacity = 0.6 * pulse;
    
    // Subtle floating motion
    const float = Math.sin(time * 0.5) * 0.1;
    wireframeSphere.position.y = float;
    glowSphere.position.y = float;
    coreSphere.position.y = float;
    particles.position.y = float;
    
    renderer.render(scene, camera);
  }

  animate();
}

// Initialize when page loads
window.addEventListener('load', () => {
  console.log('Loading Planet B...');
  createWireframePlanet();
});