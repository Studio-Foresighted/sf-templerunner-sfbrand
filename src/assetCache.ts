import {
  type AnimationClip,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from 'three';

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

type CachedGltf = {
  scene: Object3D;
  animations: AnimationClip[];
};

const fbxLoader = new FBXLoader();
const gltfLoader = new GLTFLoader();
const textureLoader = new TextureLoader();

const fbxCache = new Map<string, Object3D>();
const gltfCache = new Map<string, CachedGltf>();
const textureCache = new Map<string, Texture>();
const jsonCache = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

const cloneObject3D = <T extends Object3D>(source: T): T => {
  const clone = SkeletonUtils.clone(source) as T & { animations?: AnimationClip[] };
  const sourceWithAnimations = source as T & { animations?: AnimationClip[] };
  if (sourceWithAnimations.animations) {
    clone.animations = sourceWithAnimations.animations;
  }

  return clone;
};

const loadOnce = async <T>(key: string, loader: () => Promise<T>) => {
  if (inflight.has(key)) {
    return inflight.get(key) as Promise<T>;
  }

  const promise = loader().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
};

export const loadCachedFbx = async (url: string) => {
  const cached = fbxCache.get(url);
  if (cached) {
    return cloneObject3D(cached);
  }

  const loaded = await loadOnce(url, () => fbxLoader.loadAsync(url));
  fbxCache.set(url, loaded);
  return cloneObject3D(loaded);
};

export const loadCachedGltf = async (url: string) => {
  const cached = gltfCache.get(url);
  if (cached) {
    return {
      scene: cloneObject3D(cached.scene),
      animations: cached.animations,
    };
  }

  const loaded = await loadOnce(url, () => gltfLoader.loadAsync(url));
  const nextCached: CachedGltf = {
    scene: loaded.scene,
    animations: loaded.animations,
  };
  gltfCache.set(url, nextCached);
  return {
    scene: cloneObject3D(nextCached.scene),
    animations: nextCached.animations,
  };
};

export const loadCachedTexture = async (url: string, repeat: number) => {
  let cached = textureCache.get(url);
  if (!cached) {
    cached = await loadOnce(url, () => textureLoader.loadAsync(url));
    textureCache.set(url, cached);
  }

  const texture = cached.clone();
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 16;
  texture.needsUpdate = true;
  return texture;
};

export const getCachedJson = async <T>(url: string) => {
  const cached = jsonCache.get(url);
  if (cached) {
    return cached as T;
  }

  const data = await loadOnce(url, async () => {
    const response = await fetch(url);
    return response.json() as Promise<T>;
  });
  jsonCache.set(url, data);
  return data;
};