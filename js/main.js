//Importe a biblioteca THREE.js
import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";
// Para permitir a importação do arquivo .gltf
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";
import * as dat from "https://cdn.skypack.dev/dat.gui";

//Crie uma cena Three.JS
const scene = new THREE.Scene();
//crie uma nova câmera com posições e ângulos
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

//Mantenha os objetos 3D em uma matriz global para que possamos acessá-los mais tarde
let objects = [];

//Instancie um novo renderizador e defina seu tamanho
const renderer = new THREE.WebGLRenderer({ alpha: true }); //Alpha: true permite o fundo transparente
renderer.setSize(window.innerWidth, window.innerHeight);

//Adicione o renderizador ao DOM
document.getElementById("container3D").appendChild(renderer.domElement);

// Defina a distância da câmera ao modelo 3D
const defaultCameraDistance = 50;

// Variáveis de controle da câmera
let zDist = 5.0;
let rDist = defaultCameraDistance;
let theta = 2;
let phi = 1;

// Ajuste a posição inicial da câmera
camera.position.set(
  rDist * Math.sin(phi) * Math.cos(theta),
  rDist * Math.cos(phi),
  rDist * Math.sin(phi) * Math.sin(theta)
);
camera.lookAt(scene.position);

// Variáveis de controle da câmera
let isDragging = false;
let previousMousePosition = {
  x: 0,
  y: 0
};
let initialTheta = theta;
let initialPhi = phi;

// Função para criar um material Phong Shading único para cada objeto
function createPhongMaterial(child) {
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
    uniform vec4 materialColor; // Cor do material do objeto
    void main() {
      vec3 N = normalize(vNormal); // Normaliza a normal do fragmento
      vec3 L = normalize(lightPosition - vPosition); // Calcula a direção da luz
      vec3 E = normalize(-vPosition); // Calcula a direção do observador
      vec3 H = normalize(L + E); // Calcula o vetor de reflexão

      vec4 ambient = ambientProduct * materialColor; // Componente ambiente da iluminação
      float Kd = max(dot(L, N), 0.0); // Componente difusa da iluminação
      vec4 diffuse = Kd * diffuseProduct * materialColor; // Calcula a cor difusa
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
    shininess: { value: 30.0 }, // Brilho especular
    materialColor: { value: new THREE.Vector4(child.material.color.r, child.material.color.g, child.material.color.b, 1.0) } // Cor do material do objeto
  };

  return new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: uniforms
  });
}

// Função para adicionar iluminação Phong Shading à cena
function addPhongShading(object) {
  object.traverse(child => {
    if (child.isMesh) {
      const phongMaterial = createPhongMaterial(child);
      child.material = phongMaterial;
    }
  });
}

// Atualize os valores iniciais de cameraSettings com base na câmera
const cameraSettings = {
  znear: camera.near,
  zfar: camera.far,
  radius: rDist,
  theta: theta,
  phi: phi,
  fov: camera.fov,
  aspect: camera.aspect
};

// Adicione controles GUI para os parâmetros da câmera
const gui = new dat.GUI();
gui.add(cameraSettings, 'znear', 0.1, 100).onChange(updateCamera);
gui.add(cameraSettings, 'zfar', 100, 2000).onChange(updateCamera);
gui.add(cameraSettings, 'radius', 1, 1000).onChange(value => {
  rDist = value;
  updateCameraPosition();
});
gui.add(cameraSettings, 'theta', 0, 2 * Math.PI).onChange(value => {
  theta = value;
  updateCameraPosition();
});
gui.add(cameraSettings, 'phi', 0, Math.PI).onChange(value => {
  phi = value;
  updateCameraPosition();
});
gui.add(cameraSettings, 'fov', 1, 180).onChange(updateCamera);
gui.add(cameraSettings, 'aspect', 0.1, 4).onChange(updateCamera);

// Função para atualizar a câmera com base nos valores de cameraSettings
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
      console.error('Erro ao carregar o modelo:', error);
    }
  );
}

// Carregar múltiplos objetos
const scale = 0.5;
loadObject('carro_militar', { x: -10, y: -5, z: 0 }, scale);
loadObject('tanque_militar', { x: 10, y: -3, z: 0 }, scale * 3);
loadObject('eye', { x: 20, y: 0, z: 0 }, scale / 100);

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

// Função para atualizar a posição da câmera
function updateCameraPosition() {
  const eye = new THREE.Vector3(
    rDist * Math.sin(phi) * Math.cos(theta),
    rDist * Math.cos(phi),
    rDist * Math.sin(phi) * Math.sin(theta)
  );
  camera.position.copy(eye);
  camera.lookAt(scene.position);

  // Atualize os valores do GUI
  cameraSettings.theta = theta;
  cameraSettings.phi = phi;
  cameraSettings.radius = rDist;
  gui.updateDisplay();
}

// Adicione ouvintes de eventos para o movimento do mouse
document.addEventListener('mousedown', function(e) {
  isDragging = true;
  previousMousePosition = {
    x: e.clientX,
    y: e.clientY
  };
  initialTheta = theta;
  initialPhi = phi;
});

document.addEventListener('mouseup', function() {
  isDragging = false;
});

document.addEventListener('mousemove', function(e) {
  if (isDragging) {
    const deltaMove = {
      x: e.clientX - previousMousePosition.x,
      y: e.clientY - previousMousePosition.y
    };

    theta = initialTheta + deltaMove.x * 0.01;
    phi = initialPhi - deltaMove.y * 0.01;

    phi = Math.max(0, Math.min(Math.PI, phi));

    updateCameraPosition();
  }
});

// Adicione ouvinte de eventos para o scroll do mouse
document.addEventListener('wheel', function(e) {
  rDist += e.deltaY * 0.05;
  rDist = Math.max(1, rDist);
  updateCameraPosition();
});

// Verifique se os elementos existem antes de adicionar os ouvintes de eventos
const increaseZButton = document.getElementById("increaseZ");
const decreaseZButton = document.getElementById("decreaseZ");
const increaseRButton = document.getElementById("increaseR");
const decreaseRButton = document.getElementById("decreaseR");
const increaseThetaButton = document.getElementById("increaseTheta");
const decreaseThetaButton = document.getElementById("decreaseTheta");
const increasePhiButton = document.getElementById("increasePhi");
const decreasePhiButton = document.getElementById("decreasePhi");

if (increaseZButton) {
  increaseZButton.onclick = function() { zDist += 0.1; updateCameraPosition(); };
}
if (decreaseZButton) {
  decreaseZButton.onclick = function() { zDist -= 0.1; updateCameraPosition(); };
}
if (increaseRButton) {
  increaseRButton.onclick = function() { rDist += 0.1; updateCameraPosition(); };
}
if (decreaseRButton) {
  decreaseRButton.onclick = function() { rDist -= 0.1; updateCameraPosition(); };
}
if (increaseThetaButton) {
  increaseThetaButton.onclick = function() { theta = (theta + 0.1) % (2 * Math.PI); updateCameraPosition(); };
}
if (decreaseThetaButton) {
  decreaseThetaButton.onclick = function() { theta = (theta - 0.1 + 2 * Math.PI) % (2 * Math.PI); updateCameraPosition(); };
}
if (increasePhiButton) {
  increasePhiButton.onclick = function() { phi = (phi + 0.1) % (2 * Math.PI); updateCameraPosition(); };
}
if (decreasePhiButton) {
  decreasePhiButton.onclick = function() { phi = (phi - 0.1 + 2 * Math.PI) % (2 * Math.PI); updateCameraPosition(); };
}

//Inicie a renderização 3D
animate();