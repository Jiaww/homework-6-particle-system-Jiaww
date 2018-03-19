import { vec3 } from 'gl-matrix';
class Particle {
    constructor(pos, vel, acc) {
        this.pos = pos;
        this.vel = vel;
        this.acc = acc;
    }
    updateEuler(deltaTime) {
        vec3.scaleAndAdd(this.pos, this.pos, this.vel, deltaTime);
        vec3.scaleAndAdd(this.vel, this.vel, this.acc, deltaTime);
    }
}
export class ParticleSystem {
    constructor(numPars, offsets, bboxMinX, bboxMinY, bboxMaxX, bboxMaxY) {
        this.offsets = [];
        this.vels = [];
        this.accs = [];
        this.masses = [];
        this.maxVel = 20;
        this.numParticles = numPars;
        let offsetsArray = Array.from(offsets);
        for (let i = 0; i < offsetsArray.length; i += 3) {
            this.offsets.push(offsetsArray[i], offsetsArray[i + 1], offsetsArray[i + 2]);
            this.vels.push(vec3.create());
            this.accs.push(vec3.create());
            this.masses.push((0.8 + 0.4 * Math.random()) * 10);
        }
    }
    updateEuler(deltaTime) {
        for (let i = 0; i < this.numParticles; i++) {
            let newOffset = vec3.create();
            vec3.scaleAndAdd(newOffset, vec3.fromValues(this.offsets[3 * i], this.offsets[3 * i + 1], this.offsets[3 * i + 2]), this.vels[i], deltaTime);
            vec3.scaleAndAdd(this.vels[i], this.vels[i], this.accs[i], deltaTime);
            if (vec3.length(this.vels[i]) > this.maxVel) {
                vec3.normalize(this.vels[i], this.vels[i]);
                vec3.scale(this.vels[i], this.vels[i], this.maxVel);
            }
            this.offsets[3 * i] = newOffset[0];
            this.offsets[3 * i + 1] = newOffset[1];
            this.offsets[3 * i + 2] = newOffset[2];
            this.accs[i] = vec3.create();
        }
    }
    dumpOffsets() {
        return new Float32Array(this.offsets);
    }
    addForce(force, i) {
        vec3.scaleAndAdd(this.accs[i], this.accs[i], force, 1 / this.masses[i]);
    }
    addAttractor(pos) {
        for (let i = 0; i < this.numParticles; i++) {
            let force = vec3.create();
            vec3.subtract(force, pos, vec3.fromValues(this.offsets[3 * i], this.offsets[3 * i + 1], this.offsets[3 * i + 2]));
            let distance = vec3.length(force);
            let strength = 0;
            strength = 0.4 * 20 * this.masses[i] * 1 / (distance * distance);
            vec3.scale(force, force, strength);
            this.addForce(force, i);
        }
    }
    addRepeller(pos) {
        for (let i = 0; i < this.numParticles; i++) {
            let force = vec3.create();
            vec3.subtract(force, pos, vec3.fromValues(this.offsets[3 * i], this.offsets[3 * i + 1], this.offsets[3 * i + 2]));
            let distance = vec3.length(force);
            let strength = 0;
            strength = 0.4 * 20 * this.masses[i] * 1 / (distance * distance);
            vec3.scale(force, force, -strength);
            this.addForce(force, i);
        }
    }
    addForceField(dir, strength) {
        for (let i = 0; i < this.numParticles; i++) {
            let force = vec3.create();
            vec3.scale(force, dir, strength * (0.8 + 0.4 * Math.random()));
            this.addForce(force, i);
        }
    }
}
//# sourceMappingURL=Particle.js.map