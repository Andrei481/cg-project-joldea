import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import * as CANNON from 'cannon-es'
import cannonDebugger from 'cannon-es-debugger'
import Guify from 'guify'
import Stats from 'stats.js';
import {Car} from './world/car';

const loader = document.querySelector('.loader');

var stats = new Stats();
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( stats.dom );

/**
 * Base
 */
// Canvas
const gui = new Guify({align: 'right', theme: 'dark', width: '400px', barMode: 'none'})
gui.Register({type: 'folder', label: 'Vehicle', open: true})
gui.Register({type: 'folder', label: 'Chassis', open: true})
gui.Register({type: 'folder', label: 'Wheels', open: true})

gui.Register({folder: 'Chassis', type: 'folder', label: 'Chassis Helper', open: true})
gui.Register({folder: 'Chassis', type: 'folder', label: 'Chassis Model', open: true})
gui.Register({folder: 'Chassis Helper', type: 'folder', label: 'Chassis Helper Dimension', open: true})
gui.Register({folder: 'Chassis Model', type: 'folder', label: 'Chassis Model Position', open: true})
gui.Register({folder: 'Wheels', type: 'folder', label: 'Wheels Helper', open: true})
gui.Register({folder: 'Wheels Helper', type: 'folder', label: 'Wheel Helper Position', open: false})

const loadingManager = new THREE.LoadingManager();
const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()
const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0), // m/s²
})
world.broadphase = new CANNON.SAPBroadphase(world);
// cannonDebugger(scene, world.bodies, {color: 0x00ff00})

const car = new Car(scene, world, gui, loadingManager);
loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
    loader.textContent = `${Math.round(itemsLoaded / itemsTotal * 100)}% Loading...`;
    if(itemsLoaded === itemsTotal) {
      setTimeout(() => {
        loader.style.opacity = '0';
      }, 2000);
    }
}
loadingManager.onLoad = () => {
    car.init();
}

const bodyMaterial = new CANNON.Material();
const groundMaterial = new CANNON.Material();
const bodyGroundContactMaterial = new CANNON.ContactMaterial(
    bodyMaterial,
    groundMaterial,
    {
        friction: 0.1,
        restitution: 0.3
    }
)
world.addContactMaterial(bodyGroundContactMaterial)

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
const spotLight = new THREE.SpotLight( 0x29dfff, 2, 0, 0.9, 1, 0 );
spotLight.position.set( 7, 1.291, -6 );
const spotLight2 = new THREE.SpotLight( 0x943dff, 2, 0, 0.9, 1, 0 );
spotLight2.position.set( -7, 1.291, -6 );
const spotLight3 = new THREE.SpotLight( 0xd5f8ff, 2, 0, 0.9, 1, 0 );
spotLight3.position.set( 0, 1.291, 7 );
scene.add(spotLight, spotLight2, spotLight3);

/**
 * Cube Texture Loader
 */
const cubeTextureLoader = new THREE.CubeTextureLoader()
const cubeEnvironmentMapTexture = cubeTextureLoader.load([
    "/textures/environmentMaps/2/px.jpg",
    "/textures/environmentMaps/2/nx.jpg",
    "/textures/environmentMaps/2/py.jpg",
    "/textures/environmentMaps/2/ny.jpg",
    "/textures/environmentMaps/2/pz.jpg",
    "/textures/environmentMaps/2/nz.jpg",
])
const textureLoader = new THREE.TextureLoader();
const backgroundTexture = textureLoader.load('nightsky.png');
scene.background = backgroundTexture;

// scene.background = cubeEnvironmentMapTexture
scene.environment = cubeEnvironmentMapTexture

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Floor
 */
const floorGeo = new THREE.PlaneBufferGeometry(100, 100);
const floorMirror = new Reflector( floorGeo, {
    clipBias: 0.003,
    textureWidth: window.innerWidth * window.devicePixelRatio,
    textureHeight: window.innerHeight * window.devicePixelRatio,
    color: 0xffffff
});
const floorMesh = new THREE.Mesh(
    floorGeo,
    new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.5,
        metalness: 0,
        emissive: 0xffffff,
        emissiveIntensity: -0.36,
        transparent: true,
        opacity: 0.7
    })
)
floorMirror.rotation.x = -Math.PI * 0.5;
floorMesh.rotation.x = -Math.PI * 0.5;
floorMesh.position.y = 0.001;
scene.add(floorMirror, floorMesh)

const floorS = new CANNON.Plane();
const floorB = new CANNON.Body();
floorB.mass = 0;

floorB.addShape(floorS);
world.addBody(floorB);

floorB.quaternion.setFromAxisAngle(
    new CANNON.Vec3(-1, 0, 0),
    Math.PI * 0.5
);

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height, 0.1, 10000)
camera.position.set(0, 4, 6)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */
const timeStep = 1 / 60 // seconds
let lastCallTime

const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
// Create an array to hold the cubes
const cubes = [];

// Loop through 50 times to create 50 cubes
for (let i = 0; i < 150; i++) {
  // Create a new cube
  const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
  const cubeMaterial = new THREE.MeshLambertMaterial({ 
    color: colors[Math.floor(Math.random() * colors.length)],
    transparent: true,
    opacity: 0.5
    });
  const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
  // Set the position of the cube randomly within a range
  cube.position.x = Math.random() * 20 - 10;
  cube.position.y = Math.random() * 40 + 1;
  cube.position.z = Math.random() * 20 - 10;
  scene.add(cube);

  // Add the cube to the array of cubes
  cubes.push(cube);
}


const tick = () =>
{
    stats.begin();
    // Update controls
    controls.update()

    const time = performance.now() / 1000 // seconds
    if (!lastCallTime) {
        world.step(timeStep)
    } else {
        const dt = time - lastCallTime
        world.step(timeStep, dt)
    }
    lastCallTime = time
    cubes.forEach((cube) => {
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.02;
      });
    // Render
    renderer.render(scene, camera)
    stats.end();
    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
