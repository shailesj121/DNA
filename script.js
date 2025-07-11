import { RenderPass } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/postprocessing/UnrealBloomPass.js";
import { EffectComposer } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/postprocessing/EffectComposer.js";
import { RGBShiftShader } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/shaders/RGBShiftShader.js";
import { ShaderPass } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/postprocessing/ShaderPass.js";
import { BokehPass } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/postprocessing/BokehPass.js";
import { BrightnessContrastShader } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/shaders/BrightnessContrastShader.js";
import { HueSaturationShader } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/shaders/HueSaturationShader.js";

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 1);
const body = document.getElementById("dna");
body.appendChild(renderer.domElement);

camera.position.set(-2, 0, 3.3);

// Add OrbitControls
// const controls = new THREE.OrbitControls(camera, renderer.domElement);
// controls.enableDamping = true;
// controls.dampingFactor = 0.05;
// controls.screenSpacePanning = false;
// controls.maxPolarAngle = Math.PI / 2;

// Vertex Shader
const vertexShader = `
 uniform float time;
 varying vec2 vUv;
 varying vec3 vPosition;
 uniform sampler2D texturel;
 float PI = 3.141592653589793238;
 attribute float random;
 attribute float colorRandom;
 varying float vColorRandom;

 void main() {
     vUv = uv;
     vPosition = position;
     vColorRandom = colorRandom;
     vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
     gl_PointSize = (20.5 * random) * (1. / - mvPosition.z);
     gl_Position = projectionMatrix * mvPosition;
 }
`;

// Fragment Shader
const fragmentShader = `
 uniform float time;
//  uniform float progress;
 uniform sampler2D texturel;
 uniform vec4 resolution;
 varying vec2 vUv;
 varying vec3 vPosition;
  float PI = 3.141592653589793238;
 uniform vec3 uColor1;
 uniform vec3 uColor2;
 uniform vec3 uColor3;
 varying float vColorRandom;
 uniform float uGradient;
 
 void main() {
vec3 finalColor = uColor1;
if(vColorRandom > 0.33 && vColorRandom < 0.66 ){
finalColor = uColor2;
}
if(vColorRandom > 0.66 ){
finalColor = uColor3;
}
 float alpha = 1. - smoothstep(-0.2, 0.5, length(gl_PointCoord - vec2(0.5)));
 float gradient = smoothstep(uGradient, 1., vUv.y);

gl_FragColor = vec4(finalColor, alpha*gradient);
}
`;

// Shader Material
const material = new THREE.ShaderMaterial({
  uniforms: {
    uColor1: { value: new THREE.Color(0x5266ff) },
    uColor2: { value: new THREE.Color(0x612574 ) },
    uColor3: { value: new THREE.Color(0x1954ec) },
    uGradient: { value: 0.4},
    time: { value: 0 },
    resolution: { value: new THREE.Vector4() },
  },
  side: THREE.DoubleSide,   
  transparent: true,
  vertexShader,
  fragmentShader,
  depthTest: false,
  depthWrite: false,
  // blending: THREE.AdditiveBlending,
});

let plane;
let time = 0;

// Load GLB Model
// Load GLB Model with DRACOLoader
const loader = new THREE.GLTFLoader();
const dracoLoader = new THREE.DRACOLoader();
dracoLoader.setDecoderPath(
  "https://www.gstatic.com/draco/versioned/decoders/1.5.7/"
); // Use Google's hosted decoder
loader.setDRACOLoader(dracoLoader);

loader.load(
  "dna.glb",
  (gltf) => {
    const model = gltf.scene.children[0].geometry;
    // console.log(gltf.scene);
    const number = model.attributes.position.array.length;
    let random = new Float32Array(number / 3);
    let colorRandom = new Float32Array(number / 3);
    let i;
    for (i = 0; i < number / 3; i++) {
      random.set([Math.random()], i);
      colorRandom.set([Math.random()], i);
    }
    model.setAttribute("random", new THREE.BufferAttribute(random, 1));
    model.setAttribute(
      "colorRandom",
      new THREE.BufferAttribute(colorRandom, 1)
    );
    model.center();
    plane = new THREE.Points(model, material);
    scene.add(plane);
  },
  undefined,
  (error) => {
    console.error("Error loading GLB model:", error);
  }
);

scene.position.set(0, -4, -2);

const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5,
  0.9,
  0.85
);
const composer = new EffectComposer(renderer);
bloomPass.strength = 1.5;
bloomPass.threshold = 0.2;
bloomPass.radius = 0.8;
composer.addPass(renderScene);
composer.addPass(bloomPass);
const chromaticAberration = new ShaderPass(RGBShiftShader);
chromaticAberration.uniforms["amount"].value = 0.0003; // Subtle RGB shift
composer.addPass(chromaticAberration);
const bokehPass = new BokehPass(scene, camera, {
  focus: 1, // Focus distance (closer to 0 = blurry)
  aperture: 0.9, // How much blur is applied
  maxblur: 0.002, // Maximum blur intensity
});
const hueSaturationPass = new ShaderPass(HueSaturationShader);
hueSaturationPass.uniforms["hue"].value = 0.1;  // Slightly shift hue
hueSaturationPass.uniforms["saturation"].value = 0.2; // Increase saturation
composer.addPass(hueSaturationPass);
const brightnessContrastPass = new ShaderPass(BrightnessContrastShader);
brightnessContrastPass.uniforms["brightness"].value = 0.12; // Increase brightness
brightnessContrastPass.uniforms["contrast"].value = -0.1; // Reduce contrast for faded effect
composer.addPass(brightnessContrastPass);
composer.addPass(bokehPass);

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  time -= 0.05;
  plane? plane.rotation.y = time / 45 : null;
  composer.render();
}

// Handle window resize
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});


// console.log(scene)
// gsap code
gsap.registerPlugin(ScrollTrigger);
// console.log("gsap triggered")

gsap.to(scene.rotation, {
    y: -Math.PI * 1, // Full rotation
    // stagger: 0.3, // Delayed animation for multiple elements
    scrollTrigger: {
        trigger: "#dna",
        start: "top top", // Start animation when box reaches 80% of viewport
        end: "bottom bottom",   // Optional: end animation point
        markers: true, // Set to true to debug positions
        scrub: 2,
    }
});
gsap.to(material.uniforms.uGradient  , {
  value: 0.9, // Full rotation
  // stagger: 0.3, // Delayed animation for multiple elements
  scrollTrigger: {
      trigger: "#dna",
      start: "50% center", // Start animation when box reaches 80% of viewport
      end: "bottom bottom",   // Optional: end animation point
      markers: true, // Set to true to debug positions
      scrub: 2,
  }
});

animate();
