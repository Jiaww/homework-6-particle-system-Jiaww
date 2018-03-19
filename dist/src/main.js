import { vec3, mat4 } from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Square from './geometry/Square';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import { setGL } from './globals';
import ShaderProgram, { Shader } from './rendering/gl/ShaderProgram';
import { ParticleSystem } from './Particle';
// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
    tesselations: 5,
    'Load Scene': loadScene,
    camera_enabled: true,
    attractor: true,
    attractorPos: 75.0,
    forceFieldActive: false,
    forceFieldDirectionX: 1.0,
    forceFieldDirectionY: 1.0,
    forceFieldDirectionZ: 1.0,
    forceFieldStrength: 5.0,
};
let square;
let time = 0.0;
let particleSystem;
let camera;
let mx, my;
let ldown = false;
function loadScene() {
    square = new Square();
    square.create();
    // Set up particles here. Hard-coded example data for now
    let offsetsArray = [];
    let colorsArray = [];
    let n = 100;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            offsetsArray.push(i - n / 2);
            offsetsArray.push(0);
            offsetsArray.push(j - n / 2);
            colorsArray.push(i / n);
            colorsArray.push(j / n);
            colorsArray.push(1.0);
            colorsArray.push(1.0); // Alpha channel
        }
    }
    let offsets = new Float32Array(offsetsArray);
    let colors = new Float32Array(colorsArray);
    square.setInstanceVBOs(offsets, colors);
    square.setNumInstances(n * n); // 10x10 grid of "particles"
    particleSystem = new ParticleSystem(n * n, square.offsets);
}
function settrue(event) {
    ldown = true;
}
function setfalse(event) {
    ldown = false;
}
function getMousePos(event) {
    mx = event.clientX / window.innerWidth * 2 - 1;
    my = event.clientY / window.innerHeight * (-2) + 1;
}
function get3DPos(radius) {
    let screenPos = vec3.fromValues(mx, my, 0.5);
    let worldPos = vec3.create();
    let inverseV = mat4.create(), inverseP = mat4.create();
    mat4.invert(inverseP, camera.projectionMatrix);
    mat4.invert(inverseV, camera.viewMatrix);
    vec3.transformMat4(worldPos, screenPos, inverseP);
    vec3.transformMat4(worldPos, worldPos, inverseV);
    let rayDir = vec3.create();
    vec3.subtract(rayDir, worldPos, camera.position);
    vec3.normalize(rayDir, rayDir);
    let finalPos = vec3.create();
    vec3.scaleAndAdd(finalPos, camera.position, rayDir, radius);
    return finalPos;
}
function main() {
    // Initial display for framerate
    const stats = Stats();
    stats.setMode(0);
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left = '0px';
    stats.domElement.style.top = '0px';
    document.body.appendChild(stats.domElement);
    // Add controls to the gui
    const gui = new DAT.GUI();
    gui.add(controls, 'Load Scene');
    let MO = gui.addFolder('Mouse Operations');
    MO.add(controls, 'camera_enabled');
    MO.add(controls, 'attractor');
    MO.add(controls, 'attractorPos', 0.0, 200.0);
    let FF = gui.addFolder('Force Field');
    FF.add(controls, 'forceFieldActive');
    FF.add(controls, 'forceFieldDirectionX', -1.0, 1.0).step(0.01);
    FF.add(controls, 'forceFieldDirectionY', -1.0, 1.0).step(0.01);
    FF.add(controls, 'forceFieldDirectionZ', -1.0, 1.0).step(0.01);
    FF.add(controls, 'forceFieldStrength', 0.0, 50.0).step(0.25);
    // get canvas and webgl context
    const canvas = document.getElementById('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) {
        alert('WebGL 2 not supported!');
    }
    // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
    // Later, we can import `gl` from `globals.ts` to access it
    setGL(gl);
    // Initial call to load scene
    loadScene();
    camera = new Camera(vec3.fromValues(50, 50, 50), vec3.fromValues(0, 0, 0));
    const renderer = new OpenGLRenderer(canvas);
    renderer.setClearColor(0.2, 0.2, 0.2, 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE); // Additive blending
    const lambert = new ShaderProgram([
        new Shader(gl.VERTEX_SHADER, require('./shaders/particle-vert.glsl')),
        new Shader(gl.FRAGMENT_SHADER, require('./shaders/particle-frag.glsl')),
    ]);
    // This function will be called every frame
    var d = new Date();
    var oldTime = d.getTime();
    function tick() {
        d = new Date();
        let deltaTime = d.getTime() - oldTime;
        oldTime = d.getTime();
        // Mouse Operations
        if (controls.camera_enabled) {
            camera.update();
        }
        else {
            window.addEventListener('mousedown', settrue);
            window.addEventListener('mouseup', setfalse);
            if (ldown) {
                if (controls.attractor)
                    particleSystem.addAttractor(get3DPos(controls.attractorPos));
                else
                    particleSystem.addRepeller(get3DPos(controls.attractorPos));
            }
        }
        //Force Field
        if (controls.forceFieldActive) {
            particleSystem.addForceField(vec3.fromValues(controls.forceFieldDirectionX, controls.forceFieldDirectionY, controls.forceFieldDirectionZ), controls.forceFieldStrength);
            particleSystem.updateEuler(deltaTime * 0.001);
        }
        stats.begin();
        lambert.setTime(oldTime);
        square.setInstanceVBOs(particleSystem.dumpOffsets(), square.colors);
        //console.log(square.offsets);
        gl.viewport(0, 0, window.innerWidth, window.innerHeight);
        renderer.clear();
        renderer.render(camera, lambert, [
            square,
        ]);
        stats.end();
        // Tell the browser to call `tick` again whenever it renders a new frame
        requestAnimationFrame(tick);
    }
    window.addEventListener('resize', function () {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.setAspectRatio(window.innerWidth / window.innerHeight);
        camera.updateProjectionMatrix();
    }, false);
    window.addEventListener('mousemove', getMousePos);
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
    // Start the render loop
    tick();
}
main();
//# sourceMappingURL=main.js.map