import * as THREE from 'three';

export const mobile = matchMedia('(max-width:760px)').matches;

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
scene.fog = new THREE.Fog(0x86bfe3, 80, 175);

export const hemi = new THREE.HemisphereLight(0xffffff, 0x6a8f5a, 0.6);
export const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.castShadow = true;
const ms = mobile ? 1024 : 2048;
sun.shadow.mapSize.set(ms, ms);
Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, far: 160 });
scene.add(hemi, sun, sun.target);
