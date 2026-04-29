import { WebGLRenderer, PerspectiveCamera, type Scene as ThreeScene } from 'three';

import MainMenuScene from './scenes/MainMenuScene';

type SceneController = ThreeScene & {
  loaded?: boolean;
  loadingOffset?: number;
  loadingScale?: number;
  showProgressInUI?: boolean;
  update: () => void;
  load?: () => Promise<void>;
  initialize: () => void;
  hide: () => void;
  warmUp?: (renderer: WebGLRenderer, camera: PerspectiveCamera) => void;
};

const width = window.innerWidth;
const height = window.innerHeight;

const renderer = new WebGLRenderer({
  canvas: document.getElementById('app') as HTMLCanvasElement,
  antialias: true,
  alpha: false,
  precision: 'mediump',
  powerPreference: 'high-performance',
  stencil: false,
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(width, height);

let currentScene: SceneController;

const mainCamera = new PerspectiveCamera(60, width / height, 0.1, 1000);

function onWindowResize() {
  mainCamera.aspect = window.innerWidth / window.innerHeight;
  mainCamera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize);

const mainMenuScene = new MainMenuScene();
let runningScene: SceneController | null = null;
let runningScenePromise: Promise<SceneController> | null = null;
let characterSelectionScene: SceneController | null = null;
let characterSelectionScenePromise: Promise<SceneController> | null = null;
let freshScene: SceneController | null = null;
let freshScenePromise: Promise<SceneController> | null = null;

// Expose for texture updates
const gameScenes: Record<string, SceneController> = {
  mainMenu: mainMenuScene,
};

(window as any).gameScenes = gameScenes;

const getLoader = () => document.querySelector('.loading-container') as HTMLElement | null;

const ensureRunningScene = async () => {
  if (runningScene) return runningScene;
  if (!runningScenePromise) {
    runningScenePromise = import('./scenes/RunningScene').then(({ default: RunningScene }) => {
      const scene = new RunningScene() as SceneController;
      scene.loadingOffset = 0;
      scene.loadingScale = 1;
      scene.showProgressInUI = true;
      runningScene = scene;
      gameScenes.running = scene;
      return scene;
    });
  }

  return runningScenePromise;
};

const ensureCharacterSelectionScene = async () => {
  if (characterSelectionScene) return characterSelectionScene;
  if (!characterSelectionScenePromise) {
    characterSelectionScenePromise = import('./scenes/CharacterSelectionScene').then(({ default: CharacterSelectionScene }) => {
      const scene = new CharacterSelectionScene() as SceneController;
      scene.loadingOffset = 0;
      scene.loadingScale = 1;
      scene.showProgressInUI = true;
      characterSelectionScene = scene;
      return scene;
    });
  }

  return characterSelectionScenePromise;
};

const ensureFreshScene = async () => {
  if (freshScene) return freshScene;
  if (!freshScenePromise) {
    freshScenePromise = import('./scenes/FreshScene').then(({ default: FreshScene }) => {
      const scene = new FreshScene() as SceneController;
      scene.loadingOffset = 0;
      scene.loadingScale = 1;
      scene.showProgressInUI = true;
      freshScene = scene;
      gameScenes.fresh = scene;
      return scene;
    });
  }

  return freshScenePromise;
};

const switchToRunningScene = async () => {
  const scene = await ensureRunningScene();

  // Ensure loaded before switching
  if (!scene.loaded && scene.load) {
      console.log('⏳ Waiting for RunningScene to finish loading...');
      const loader = getLoader();
      if (loader) loader.style.display = 'flex';

      scene.showProgressInUI = true;
      await scene.load();

      if (loader) loader.style.display = 'none';
  }
  currentScene.hide();
  currentScene = scene;
  currentScene.initialize();
  const exitFsBtn = document.getElementById('exit-fullscreen-button');
  if (exitFsBtn) exitFsBtn.style.display = 'flex';
};

const switchToMainMenuScene = () => {
  currentScene.hide();
  currentScene = mainMenuScene;
  currentScene.initialize();
  const exitFsBtn = document.getElementById('exit-fullscreen-button');
  if (exitFsBtn) exitFsBtn.style.display = 'none';
};

const switchToCharacterSelectionScene = async () => {
  const scene = await ensureCharacterSelectionScene();

  if (!scene.loaded && scene.load) {
      const loader = getLoader();
      if (loader) loader.style.display = 'flex';

      scene.showProgressInUI = true;
      await scene.load();

      if (loader) loader.style.display = 'none';
  }
  currentScene.hide();
  currentScene = scene;
  currentScene.initialize();
};

const switchToFreshScene = async () => {
  const scene = await ensureFreshScene();

  if (!scene.loaded && scene.load) {
      console.log('⏳ Waiting for FreshScene to finish loading...');
      const loader = getLoader();
      if (loader) {
          loader.style.display = 'flex';
          loader.classList.add('fresh-mode');
      }

      scene.showProgressInUI = true;
      await scene.load();

      if (loader) {
          loader.style.display = 'none';
          loader.classList.remove('fresh-mode');
      }
  }
  currentScene.hide();
  currentScene = scene;
  currentScene.initialize();
};

const requestFullscreenSafe = () => {
  const el = document.documentElement as any;
  try {
    if (el.requestFullscreen) {
      el.requestFullscreen().catch((e: any) => console.log('Fullscreen error:', e));
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    } else if (el.mozRequestFullScreen) {
      el.mozRequestFullScreen();
    } else if (el.msRequestFullscreen) {
      el.msRequestFullscreen();
    }
  } catch (e) {
    console.log('Fullscreen request failed:', e);
  }
};

const exitFullscreenSafe = () => {
  const doc = document as any;
  try {
    if (doc.exitFullscreen) {
      doc.exitFullscreen().catch((e: any) => console.log('Exit fullscreen error:', e));
    } else if (doc.webkitExitFullscreen) {
      doc.webkitExitFullscreen();
    } else if (doc.mozCancelFullScreen) {
      doc.mozCancelFullScreen();
    } else if (doc.msExitFullscreen) {
      doc.msExitFullscreen();
    }
  } catch (e) {
    console.log('Exit fullscreen failed:', e);
  }
};

// (document.getElementById('play-game-button')as HTMLInputElement).onclick = () => {
//   requestFullscreenSafe();
//   runningScene.setDemoModeEnabled(false);
//   switchToRunningScene();
// };

// (document.getElementById('demo-game-button')as HTMLInputElement).onclick = () => {
//   // requestFullscreenSafe(); // Disabled for Demo Mode
//   runningScene.setDemoModeEnabled(true);
//   switchToRunningScene();
// };

(document.getElementById('exit-fullscreen-button')as HTMLInputElement).onclick = () => {
  exitFullscreenSafe();
};

(document.querySelector('#quit-button')as HTMLInputElement).onclick = () => {
  (document.getElementById('game-paused-modal')as HTMLInputElement).style.display = 'none'; // Fix: Hide paused modal, not game over
  switchToMainMenuScene();
};

(document.querySelector('#game-over-quit-button')as HTMLInputElement).onclick = () => {
  (document.getElementById('game-over-modal')as HTMLInputElement).style.display = 'none';
  switchToMainMenuScene();
};

currentScene = mainMenuScene;

let hasWarmedUp = false;
let warmUpFrame = 0;

const render = (time: number = 0) => {
  currentScene.update();
  // TWEEN.update(time); // Moved to scene update for better control
  renderer.render(currentScene, mainCamera);

  requestAnimationFrame(render);
};

// (document.querySelector('#Characters-selection-button')as HTMLInputElement).onclick = () => {
//   switchToCharacterSelectionScene();
// };

const freshBtn = document.getElementById('fresh-mode-button');
if (freshBtn) {
  freshBtn.onclick = () => {
    switchToFreshScene();
  };
}

(document.querySelector('.home-menu')as HTMLInputElement).onclick = () => {
  switchToMainMenuScene();
};

window.addEventListener('returnToMainMenu', () => {
  switchToMainMenuScene();
});

const main = async () => {
  // Keep the startup path focused on the first visible menu scene.
  mainMenuScene.loadingOffset = 0;
  mainMenuScene.loadingScale = 1;

  // Load only the initial scene before first paint.
  await mainMenuScene.load();

  // Hide the loader as soon as the startup scene is ready.
  (document.querySelector('.loading-container') as HTMLInputElement).style.display = 'none';
  currentScene.initialize();
  render();

  // Kick off non-blocking warmup after the first scene is interactive.
  startBackgroundLoading();
};

const startBackgroundLoading = async () => {
    const scheduleWarmup = window.requestIdleCallback
      ? window.requestIdleCallback.bind(window)
      : (cb: IdleRequestCallback) => window.setTimeout(() => cb({
        didTimeout: false,
        timeRemaining: () => 0,
      } as IdleDeadline), 0);

    scheduleWarmup(async () => {
      const scene = await ensureRunningScene();
      console.log('✅ Background loading complete. Triggering WarmUp.');
      scene.warmUp?.(renderer, mainCamera);
    });
};

main();
