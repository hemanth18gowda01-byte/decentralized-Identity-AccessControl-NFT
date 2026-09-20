import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js";

const container = document.getElementById("three-background");
if (!container) {
    throw new Error("three-background container not found.");
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

camera.position.set(0, 0, 5.5);

const ambient = new THREE.AmbientLight(0x9ecbff, 1.2);
scene.add(ambient);

const pointLight = new THREE.PointLight(0x6db5ff, 2, 100);
pointLight.position.set(3, 2, 5);
scene.add(pointLight);

const ringGeometry = new THREE.TorusGeometry(1.5, 0.04, 16, 120);
const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x7cc7ff, transparent: true, opacity: 0.9 });
const ring = new THREE.Mesh(ringGeometry, ringMaterial);
ring.rotation.x = 1.2;
ring.rotation.y = 0.7;
scene.add(ring);

const coreGeometry = new THREE.IcosahedronGeometry(1.0, 1);
const coreMaterial = new THREE.MeshBasicMaterial({ color: 0xb8dfff, wireframe: true, transparent: true, opacity: 0.9 });
const core = new THREE.Mesh(coreGeometry, coreMaterial);
scene.add(core);

const haloGeometry = new THREE.SphereGeometry(1.35, 30, 30);
const haloMaterial = new THREE.MeshBasicMaterial({ color: 0x4d9bff, wireframe: true, transparent: true, opacity: 0.18 });
const halo = new THREE.Mesh(haloGeometry, haloMaterial);
scene.add(halo);

const pointer = { x: 0, y: 0 };
window.addEventListener("pointermove", (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

function animate() {
    requestAnimationFrame(animate);

    ring.rotation.z += 0.008;
    core.rotation.x += 0.006;
    core.rotation.y += 0.01;
    halo.rotation.x -= 0.003;
    halo.rotation.y += 0.005;

    core.position.x = pointer.x * 0.7;
    core.position.y = pointer.y * 0.7;
    ring.position.x = pointer.x * 0.4;
    ring.position.y = pointer.y * 0.4;

    camera.position.x += (pointer.x * 0.75 - camera.position.x) * 0.05;
    camera.position.y += (pointer.y * 0.5 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});