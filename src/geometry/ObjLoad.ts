import {vec3, vec4, mat4} from 'gl-matrix';
import Mesh from '../rendering/gl/Mesh';
import {gl} from '../globals';
import * as WEBGLOBJLOADER from 'webgl-obj-loader';

class ObjLoad extends Mesh {
  constructor(center: vec3){
    super(); // Call the constructor of the super class. This is required.
    this.center = vec4.fromValues(center[0], center[1], center[2], 1);
  }
 
  create() {
    //
    this.count = 0;
  }

  onlyLoadVertices(stringParam : string , scale : number){
    let lines = stringParam.split('\n');
    for(let i = 0; i < lines.length; i++){
      if (lines[i].substr(0, 2) == 'v '){
        let datas = lines[i].split(' ');
        this.vertices.push(parseFloat(datas[1])*scale);
        this.vertices.push(parseFloat(datas[2])*scale);
        this.vertices.push(parseFloat(datas[3])*scale);
      }
    }
  }

  createdByLoader( stringParam : string , scale : number)
  {
    this.onlyLoadVertices(stringParam, scale);
    var outResult;
    let errMsg : string;
    let posArray : Array<number>;
    posArray = [];
    let indexArray : Array<number>;
    indexArray = [];



    let bLoaded = false;
    var mesh = new WEBGLOBJLOADER.Mesh(stringParam);
    posArray = mesh.vertices;
    indexArray = mesh.indices;
    for (let i = 0; i < posArray.length; i+=3){
      this.bboxmin[0] = posArray[i]   < this.bboxmin[0]?posArray[i]  : this.bboxmin[0];
      this.bboxmin[1] = posArray[i+1] < this.bboxmin[1]?posArray[i+1]: this.bboxmin[1];
      this.bboxmin[2] = posArray[i+2] < this.bboxmin[2]?posArray[i+2]: this.bboxmin[2];
      this.bboxmax[0] = posArray[i]   > this.bboxmax[0]?posArray[i]  : this.bboxmax[0];
      this.bboxmax[1] = posArray[i+1] > this.bboxmax[1]?posArray[i+1]: this.bboxmax[1];
      this.bboxmax[2] = posArray[i+2] > this.bboxmax[2]?posArray[i+2]: this.bboxmax[2];
      this.positions.push(posArray[i]*scale,posArray[i+1]*scale,posArray[i+2]*scale,1);
    }
    vec3.scale(this.bboxmin, this.bboxmin, scale);
    vec3.scale(this.bboxmax, this.bboxmax, scale);
    this.indices = indexArray;
    this.count = this.indices.length;
  }
};

export default ObjLoad;