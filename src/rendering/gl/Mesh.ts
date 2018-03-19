import {gl} from '../../globals';
import {vec3, vec4} from 'gl-matrix';

abstract class Mesh {
  indices: Array<number> = [];
  positions: Array<number> = [];
  vertices: Array<number> = [];
  
  center: vec4;
  count: number = 0;
  bboxmin: vec3 = vec3.fromValues(10000,10000,10000);
  bboxmax: vec3 = vec3.fromValues(-10000,-10000,-10000);
  abstract create() : void;
};

export default Mesh;