//Importe a biblioteca THREE.js
import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";
// Para permitir que a câmera se mova ao redor da cena
import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js";
// Para permitir a importação do arquivo .gltf
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";
import * as dat from "https://cdn.skypack.dev/dat.gui";

//Crie uma cena Three.JS
const scene = new THREE.Scene();
//crie uma nova câmera com posições e ângulos
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);


//Mantenha os objetos 3D em uma matriz global para que possamos acessá-los mais tarde
let objects = [];

//OrbitControls permitem que a câmera se mova ao redor da cena
let controls;

//Instancie um novo renderizador e defina seu tamanho
const renderer = new THREE.WebGLRenderer({ alpha: true }); //Alpha: true permite o fundo transparente
renderer.setSize(window.innerWidth, window.innerHeight);

//Adicione o renderizador ao DOM
document.getElementById("container3D").appendChild(renderer.domElement);

// Defina a distância da câmera ao modelo 3D
const defaultCameraDistance = 24;
camera.position.z = defaultCameraDistance;

// Função para adicionar iluminação Phong Shading à cena
function addPhongShading(object) {
  // Vertex Shader: calcula as normais e posições dos vértices
  const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal); // Calcula a normal do vértice
      vPosition = vec3(modelViewMatrix * vec4(position, 1.0)); // Calcula a posição do vértice
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); // Calcula a posição final do vértice
    }
  `;

  // Fragment Shader: calcula a cor do fragmento com base na iluminação Phong
  const fragmentShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform vec3 lightPosition;
    uniform vec4 ambientProduct, diffuseProduct, specularProduct;
    uniform float shininess;
    void main() {
      vec3 N = normalize(vNormal); // Normaliza a normal do fragmento
      vec3 L = normalize(lightPosition - vPosition); // Calcula a direção da luz
      vec3 E = normalize(-vPosition); // Calcula a direção do observador
      vec3 H = normalize(L + E); // Calcula o vetor de reflexão

      vec4 ambient = ambientProduct; // Componente ambiente da iluminação
      float Kd = max(dot(L, N), 0.0); // Componente difusa da iluminação
      vec4 diffuse = Kd * diffuseProduct; // Calcula a cor difusa
      float Ks = pow(max(dot(N, H), 0.0), shininess); // Componente especular da iluminação
      vec4 specular = Ks * specularProduct; // Calcula a cor especular

      if (dot(L, N) < 0.0) {
        specular = vec4(0.0, 0.0, 0.0, 1.0); // Remove o brilho especular se a luz estiver atrás do vértice
      }

      gl_FragColor = ambient + diffuse + specular; // Combina as componentes de iluminação
      gl_FragColor.a = 1.0; // Define a opacidade do fragmento
    }
  `;

  // Uniforms que influenciam os cálculos no fragment shader
  const uniforms = {
    lightPosition: { value: new THREE.Vector3(100, 100, 100) }, // Posição da luz
    ambientProduct: { value: new THREE.Vector4(0.1, 0.1, 0.1, 1.0) }, // Componente ambiente
    diffuseProduct: { value: new THREE.Vector4(1.0, 1.0, 1.0, 1.0) }, // Componente difusa (branca para mostrar a cor do objeto)
    specularProduct: { value: new THREE.Vector4(0.9, 0.9, 0.9, 1.0) }, // Componente especular
    shininess: { value: 30.0 } // Brilho especular
  };

  const phongMaterial = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: uniforms
  });

  object.traverse(child => {
    if (child.isMesh) {
      child.material = phongMaterial;
    }
  });
}

//Isso adiciona controles à câmera, para que possamos girar / dar zoom com o mouse
controls = new OrbitControls(camera, renderer.domElement);
controls.addEventListener('change', () => {
  const radius = Math.sqrt(camera.position.x ** 2 + camera.position.y ** 2 + camera.position.z ** 2);
  const phi = Math.acos(camera.position.y / radius);
  const theta = Math.atan2(camera.position.z, camera.position.x);
  cameraSettings.radius = radius;
  cameraSettings.phi = phi;
  cameraSettings.theta = theta;
  gui.updateDisplay();
});

const gui = new dat.GUI();
const cameraSettings = {
  znear: 0.1,
  zfar: 1000,
  radius: 500,
  theta: 0,
  phi: 0,
  fov: 120,
  aspect: window.innerWidth / window.innerHeight
};

gui.add(cameraSettings, 'znear', 0.1, 100).onChange(updateCamera);
gui.add(cameraSettings, 'zfar', 100, 2000).onChange(updateCamera);
gui.add(cameraSettings, 'radius', 100, 1000).onChange(updateCamera);
gui.add(cameraSettings, 'theta', 0, 2 * Math.PI).onChange(updateCamera);
gui.add(cameraSettings, 'phi', 0, Math.PI).onChange(updateCamera);
gui.add(cameraSettings, 'fov', 1, 180).onChange(updateCamera);
gui.add(cameraSettings, 'aspect', 0.1, 4).onChange(updateCamera);

function updateCamera() {
  camera.near = cameraSettings.znear;
  camera.far = cameraSettings.zfar;
  const radius = cameraSettings.radius;
  const phi = cameraSettings.phi;
  const theta = cameraSettings.theta;
  camera.position.x = radius * Math.sin(phi) * Math.cos(theta);
  camera.position.y = radius * Math.cos(phi);
  camera.position.z = radius * Math.sin(phi) * Math.sin(theta);
  camera.lookAt(scene.position);
  camera.fov = cameraSettings.fov;
  camera.aspect = cameraSettings.aspect;
  camera.updateProjectionMatrix();
}

// Função para carregar e adicionar um objeto à cena
function loadObject(objToRender, position, scale) {
  const loader = new GLTFLoader();
  loader.load(
    `./models/${objToRender}/scene.gltf`,
    function (gltf) {
      const object = gltf.scene;
      object.position.set(position.x, position.y, position.z);
      object.scale.set(scale, scale, scale); // Defina a escala do objeto
      scene.add(object);
      objects.push(object);
      addPhongShading(object); // Adicione iluminação Phong Shading ao objeto
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
      console.error(error);
    }
  );
}

// Carregar múltiplos objetos
const scale = 0.5;
loadObject('carro_militar', { x: -10, y: -5, z: 0 }, scale);
loadObject('tanque_militar', { x: 10, y: -3, z: 0 }, scale * 3);
loadObject('eye', { x: 20, y: 0, z: 0 }, scale/100);

//Renderize a cena
function animate() {
  requestAnimationFrame(animate);
 
  renderer.render(scene, camera);
}

//Adicione um ouvinte à janela, para que possamos redimensionar a janela e a câmera
window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});



// Defina a distância da câmera ao modelo 3D com base nos objetos
function setCameraPosition() {
  camera.position.z = defaultCameraDistance;
}

//Inicie a renderização 3D
animate();