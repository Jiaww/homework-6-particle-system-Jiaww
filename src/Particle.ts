import {vec3, mat4} from 'gl-matrix';
import Mesh from './rendering/gl/Mesh';

function shuffle(a: Array<number>) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
}

class Particle{
	pos: vec3;
	vel: vec3;
	acc: vec3;

	constructor(pos:vec3, vel:vec3, acc:vec3){
		this.pos = pos;
		this.vel = vel;
		this.acc = acc;
	}

	updateEuler(deltaTime: number){
		vec3.scaleAndAdd(this.pos, this.pos, this.vel, deltaTime);
		vec3.scaleAndAdd(this.vel, this.vel, this.acc, deltaTime);
	}
}

export class ParticleSystem{
	numParticles: number;
	offsets: Array<number> = [];
	offsetsDesired: Array<number> = [];
	vels: Array<vec3> = [];
	accs: Array<vec3> = [];
	masses: Array<number> = [];
	maxVel: number = 20;

	constructor(numPars:number, offsets:Float32Array){
		this.numParticles = numPars;
		let offsetsArray = Array.from(offsets);
		for(let i = 0; i < offsetsArray.length; i+=3){
			this.offsets.push(offsetsArray[i], offsetsArray[i+1], offsetsArray[i+2]);

			this.offsetsDesired.push(offsetsArray[i], offsetsArray[i+1], offsetsArray[i+2]);

			this.vels.push(vec3.create());
			this.accs.push(vec3.create());
			this.masses.push((0.8 + 0.4*Math.random()));
		}
	}

	updateEuler(deltaTime: number){		
		for(let i = 0; i < this.numParticles; i++){
			let newOffset = vec3.create();
			vec3.scaleAndAdd(newOffset, vec3.fromValues(this.offsets[3*i], this.offsets[3*i+1], this.offsets[3*i+2]), this.vels[i], deltaTime);

			vec3.scaleAndAdd(this.vels[i], this.vels[i], this.accs[i], deltaTime);
			if(vec3.length(this.vels[i])>this.maxVel){
				vec3.normalize(this.vels[i], this.vels[i]);
				vec3.scale(this.vels[i], this.vels[i], this.maxVel);
			}
			this.offsets[3*i] = newOffset[0];
			this.offsets[3*i+1] = newOffset[1];
			this.offsets[3*i+2] = newOffset[2];
			this.accs[i] = vec3.create();
		}
	}

	dumpOffsets(){
		return new Float32Array(this.offsets);
	}

	addForce(force:vec3, i:number){
		vec3.scaleAndAdd(this.accs[i], this.accs[i], force, 1/this.masses[i]); 
	}

	addAttractor(pos: vec3, power: number){
		for(let i = 0; i < this.numParticles; i++){
			let force = vec3.create();
			vec3.subtract(force, pos, vec3.fromValues(this.offsets[3*i],this.offsets[3*i+1],this.offsets[3*i+2]));
			let distance = vec3.length(force);
			let strength = 0;
			strength = power*0.4*40*this.masses[i]*1/(distance*distance);
			vec3.scale(force, force, strength);

			this.addForce(force, i);
		}
	}

	addRepeller(pos: vec3, power: number){
		for(let i = 0; i < this.numParticles; i++){
			let force = vec3.create();
			vec3.subtract(force, pos, vec3.fromValues(this.offsets[3*i],this.offsets[3*i+1],this.offsets[3*i+2]));
			let distance = vec3.length(force);
			let strength = 0;
			strength = power*0.4*40*this.masses[i]*1/(distance*distance);
			vec3.scale(force, force, -strength);

			this.addForce(force, i);
		}
	}

	addForceField(dir: vec3, strength: number){
		for(let i = 0; i < this.numParticles; i++){
			let force = vec3.create();
			vec3.scale(force, dir, strength * (0.5 + 1.0 * Math.random()));
			this.addForce(force, i);
		}
	}

	addDesiredMeshForce(){
		for(let i = 0; i < this.numParticles; i++){
			let force = vec3.create();
			let desiredVel = vec3.fromValues(this.offsetsDesired[3*i]-this.offsets[3*i], this.offsetsDesired[3*i+1]-this.offsets[3*i+1], this.offsetsDesired[3*i+2]-this.offsets[3*i+2])
			let desiredAcc = vec3.create();
			vec3.subtract(desiredAcc, desiredVel, this.vels[i]);
			vec3.scale(desiredAcc, desiredAcc, 0.8);
			vec3.scale(force, desiredAcc, this.masses[i]);

			this.addForce(force, i);
		}
	} 

	addNoiseForce(strength: number){
		for(let i = 0; i < this.numParticles; i++){
			let force = vec3.fromValues((Math.random()*2-1), (Math.random()*2-1), (Math.random()*2-1));
			vec3.scale(force, force, strength);

			this.addForce(force, i);
		}
	}

	setDesiredMesh(mesh: Mesh){
		let VertsSeq = [];
		for(let i = 0; i < this.offsets.length/3; i++){
			VertsSeq.push(i);
		}
		shuffle(VertsSeq);
		let count = 0;
		let vertCount = mesh.vertices.length/3;
		for(let i = 0; i < mesh.vertices.length; i+=3){
			this.offsetsDesired[3*VertsSeq[count]] = mesh.vertices[i];
			this.offsetsDesired[3*VertsSeq[count]+1] = mesh.vertices[i+1];
			this.offsetsDesired[3*VertsSeq[count]+2] = mesh.vertices[i+2];
			count++;
		}
		//Randomly distribute rest particles to vertices
		// for(let i = count; i<VertsSeq.length; i++){
		// 	let k = Math.floor(Math.random()*vertCount);
		// 	this.offsetsDesired[3*VertsSeq[i]] = mesh.vertices[3*k];
		// 	this.offsetsDesired[3*VertsSeq[i]+1] = mesh.vertices[3*k+1];
		// 	this.offsetsDesired[3*VertsSeq[i]+2] = mesh.vertices[3*k+2];
		// }
		//Randomly distribute rest particles to triangles
		for(let i = count; i<VertsSeq.length; i++){
			let triCount = mesh.indices.length/3;
			let k = Math.floor(Math.random()*triCount);
			let index0 = mesh.indices[3*k], index1 = mesh.indices[3*k+1], index2 = mesh.indices[3*k+2];
			let u = Math.random();
			let v = Math.random()*(1-u);
			let w = Math.random()*(1-u-v);
			this.offsetsDesired[3*VertsSeq[i]] = mesh.positions[4*index0]*u + mesh.positions[4*index1]*v + mesh.positions[4*index2]*w;
			this.offsetsDesired[3*VertsSeq[i]+1] = mesh.positions[4*index0+1]*u + mesh.positions[4*index1+1]*v + mesh.positions[4*index2+1]*w;
			this.offsetsDesired[3*VertsSeq[i]+2] = mesh.positions[4*index0+2]*u + mesh.positions[4*index1+2]*v + mesh.positions[4*index2+2]*w;
		}
	}	
}