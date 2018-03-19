import {vec3, mat4} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Square from './geometry/Square';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import {ParticleSystem} from './Particle';
import ObjLoad from './geometry/ObjLoad';
import Mesh from './rendering/gl/Mesh';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  tesselations: 5,
  'Load Scene': loadScene, // A function pointer, essentially
  camera_enabled: true,
  power: 40.0,
  forceFieldActive: false,
  forceFieldDirectionX : 1.0,
  forceFieldDirectionY : 1.0,
  forceFieldDirectionZ : 1.0,
  forceFieldStrength : 5.0,
  noisePower: 20.0,
  geometry: 'plane',
  MeshShifting: true,
  MeshRotating: true,
  AddAttractor: false,
  AttractorStrength: 50.0,
  AttractorX: 0.0,
  AttractorY: 0.0,
  AttractorZ: 0.0,
  AddRepeller: false,
  RepellerStrength: 50.0,
  RepellerX: 0.0,
  RepellerY: 0.0,
  RepellerZ: 0.0,
};

let square: Square;
let time: number = 0.0;
let particleSystem: ParticleSystem;
let camera: Camera;
let mx:number, my:number;
let ldown = false, rdown = false;
let MeshDict: Map<string, Mesh>;

export let rotAngle = 0;

function loadScene() {
  square = new Square();
  square.create();

  // Set up particles here. Hard-coded example data for now
  let offsetsArray = [];
  let colorsArray = [];
  let n: number = 25;
  let length: number = 100;
  let dist = length/n;
  for(let i = 0; i < n; i++) {
    for(let j = 0; j < n; j++) {
      for(let k = 0; k < n; k++){
        offsetsArray.push((i-n/2)*dist);
        offsetsArray.push((j-n/2)*dist);
        offsetsArray.push((k-n/2)*dist);

        colorsArray.push(i / n);
        colorsArray.push(j / n);
        colorsArray.push(k / n);
        colorsArray.push(0.2); // Alpha channel
      }
    }
  }
  let offsets: Float32Array = new Float32Array(offsetsArray);
  let colors: Float32Array = new Float32Array(colorsArray);
  square.setInstanceVBOs(offsets, colors);
  square.setNumInstances(n * n * n); // 10x10 grid of "particles"

  particleSystem = new ParticleSystem(n*n*n, square.offsets);
}

function settrue(event: MouseEvent){
  if(event.button == 0)
    ldown = true;
  else if (event.button == 2)
    rdown = true;
}

function setfalse(event: MouseEvent){
  if(event.button == 0)
    ldown = false;
  else if (event.button == 2)
    rdown = false;
}

function getMousePos(event: MouseEvent){
  mx = event.clientX/window.innerWidth*2-1;
  my = event.clientY/window.innerHeight*(-2)+1;
}

function get3DPos(aabbmin: vec3, aabbmax: vec3){
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
  let finalPos = intersection (camera.position, rayDir, aabbmin, aabbmax);
  return finalPos;
}

function distance (ro: vec3, rd:vec3, aabbmin: vec3, aabbmax: vec3) {
  var lo = -Infinity;
  var hi = +Infinity;

  for (var i = 0; i < 3; i++) {
    var dimLo = (aabbmin[i] - ro[i]) / rd[i];
    var dimHi = (aabbmax[i] - ro[i]) / rd[i];

    if (dimLo > dimHi) {
      var tmp = dimLo;
      dimLo = dimHi;
      dimHi = tmp;
    }

    if (dimHi < lo || dimLo > hi) {
      return Infinity;
    }

    if (dimLo > lo) lo = dimLo;
    if (dimHi < hi) hi = dimHi;
  }
  return lo > hi ? Infinity : lo;
}

function intersection (ro: vec3, rd: vec3, aabbmin: vec3, aabbmax: vec3) {
  var d = distance(ro, rd, aabbmin, aabbmax);
  var out = vec3.create();
  if (d === Infinity) {
    return null;
  } 
  else {
    for (var i = 0; i < 3; i++) {
      out[i] = ro[i] + rd[i] * d
    }
  }
  return out
}

function changeMesh(){
  particleSystem.setDesiredMesh(MeshDict.get(controls.geometry));
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
  MO.add(controls, 'power', 0.0, 100.0);
  let FF = gui.addFolder('Force Field');
  FF.add(controls, 'forceFieldActive');
  FF.add(controls, 'forceFieldDirectionX', -1.0, 1.0).step(0.01);
  FF.add(controls, 'forceFieldDirectionY', -1.0, 1.0).step(0.01);
  FF.add(controls, 'forceFieldDirectionZ', -1.0, 1.0).step(0.01);
  FF.add(controls, 'forceFieldStrength', 0.0, 50.0).step(0.25);
  FF.add(controls, 'noisePower', 0.0, 200.0);
  let geoController = gui.add(controls, 'geometry', ['plane', 'lotus', 'suzanne', 'rose', 'baymax', 'key', 'pistol']).listen();
  geoController.onFinishChange(changeMesh);
  let AR = gui.addFolder('Attractor and Repeller'); 
  AR.add(controls, 'AddAttractor');
  AR.add(controls, 'AttractorStrength', 0.0, 100.0);
  AR.add(controls, 'AttractorX');
  AR.add(controls, 'AttractorY');
  AR.add(controls, 'AttractorZ');
  AR.add(controls, 'AddRepeller');
  AR.add(controls, 'RepellerStrength', 0.0, 100.0);
  AR.add(controls, 'RepellerX');
  AR.add(controls, 'RepellerY');
  AR.add(controls, 'RepellerZ');
  gui.add(controls, 'MeshShifting');
  gui.add(controls, 'MeshRotating');

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();

  camera = new Camera(vec3.fromValues(105, 105, 105), vec3.fromValues(0, 0, 0));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.0, 0.0, 0.0, 1);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE); // Additive blending

  const lambert = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/particle-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/particle-frag.glsl')),
  ]);

  //Animation: Iterate the meshes
  let meshesName : Array<string> = [];
  for (let [key,value] of MeshDict) {
    meshesName.push(key); 
  }
  let meshId : number = 0;
  let timeToShift = 10000;

  //Time
  var d = new Date();
  var oldTime = d.getTime();
  particleSystem.setDesiredMesh(MeshDict.get(meshesName[meshId]));
  let totalTime = 0;
  // This function will be called every frame
  function tick() {
    d = new Date();
    let deltaTime = d.getTime() - oldTime;
    oldTime = d.getTime();
    totalTime += deltaTime;
    // Particle System Operations
    // Animation
    if(controls.MeshShifting){
      if(totalTime>timeToShift){
        timeToShift += 10000;
        meshId = (meshId+1)%meshesName.length;
        controls.geometry = meshesName[meshId];
        particleSystem.setDesiredMesh(MeshDict.get(meshesName[meshId]));
      }
    }
    if(controls.camera_enabled && controls.MeshRotating){
      rotAngle += 0.005;
    }
    else{
      rotAngle = 0;
    }
    // Mouse Operations
    if (controls.camera_enabled){
      camera.update();
    }
    else{
      window.addEventListener('mousedown', settrue);
      window.addEventListener('mouseup', setfalse);
      if(ldown){
        let intersectPoint = get3DPos(MeshDict.get(controls.geometry).bboxmin, MeshDict.get(controls.geometry).bboxmax);
        if(intersectPoint !== null){
           particleSystem.addAttractor(intersectPoint, controls.power);
        }
      }
      else if(rdown){
        let intersectPoint = get3DPos(MeshDict.get(controls.geometry).bboxmin, MeshDict.get(controls.geometry).bboxmax);
        if(intersectPoint !== null){
           particleSystem.addRepeller(intersectPoint, controls.power);
        }
      }
    }
    // Attractor and Repeller
    if (controls.AddAttractor){
      particleSystem.addAttractor(vec3.fromValues(controls.AttractorX, controls.AttractorY, controls.AttractorZ), controls.AttractorStrength);
    }
    if (controls.AddRepeller){
      particleSystem.addRepeller(vec3.fromValues(controls.RepellerX, controls.RepellerY, controls.RepellerZ), controls.RepellerStrength);
    }
    particleSystem.addNoiseForce(controls.noisePower);
    //Force Field
    if (controls.forceFieldActive){
      particleSystem.addForceField(
        vec3.fromValues(
          controls.forceFieldDirectionX,
          controls.forceFieldDirectionY,
          controls.forceFieldDirectionZ),
        controls.forceFieldStrength);
    }
    particleSystem.addDesiredMeshForce();
    particleSystem.updateEuler(deltaTime*0.001);

    stats.begin();
    lambert.setTime(totalTime/1000);
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

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);
  window.addEventListener('mousemove', getMousePos);
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  // Add audio
  var bgm = new Audio("./src/audios/untitled.mp3");
  bgm.addEventListener('ended', function() {
    this.currentTime = 0;
    this.play();
  }, false);
  bgm.play();
  // Start the render loop
  tick();
}

function readTextFile(file : string) : string
{
   console.log("Download" + file + "...");
    var rawFile = new XMLHttpRequest();
    let resultText : string;
    rawFile.open("GET", file, false);
    rawFile.onreadystatechange = function ()
    {
        if(rawFile.readyState === 4)
        {
            if(rawFile.status === 200 || rawFile.status == 0)
            {
                resultText= rawFile.responseText;                
            }
        }
    }
    rawFile.send(null);

    return resultText;
}

function DownloadMeshes()
{
  MeshDict = new Map();
  // Window
  let obj = new ObjLoad(vec3.fromValues(0,0,0));
  obj.createdByLoader(readTextFile("./src/models/plane.obj"), 30);
  MeshDict.set('plane', obj);

  obj = new ObjLoad(vec3.fromValues(0,0,0));
  obj.createdByLoader(readTextFile("./src/models/lotus.obj"), 30);
  MeshDict.set('lotus', obj);

  obj = new ObjLoad(vec3.fromValues(0,0,0));
  obj.createdByLoader(readTextFile("./src/models/suzanne.obj"), 30);
  MeshDict.set('suzanne', obj);

  obj = new ObjLoad(vec3.fromValues(0,0,0));
  obj.createdByLoader(readTextFile("./src/models/rose.obj"), 30);
  MeshDict.set('rose', obj);

  obj = new ObjLoad(vec3.fromValues(0,0,0));
  obj.createdByLoader(readTextFile("./src/models/bigwhite.obj"), 30);
  MeshDict.set('baymax', obj);

  obj = new ObjLoad(vec3.fromValues(0,0,0));
  obj.createdByLoader(readTextFile("./src/models/key.obj"), 30);
  MeshDict.set('key', obj);

  obj = new ObjLoad(vec3.fromValues(0,0,0));
  obj.createdByLoader(readTextFile("./src/models/pistol.obj"), 30);
  MeshDict.set('pistol', obj);

  console.log("Downloading is complete!");

  main();  
}

DownloadMeshes();