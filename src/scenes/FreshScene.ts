/* eslint-disable class-methods-use-this */
import {
  Scene, Object3D, AmbientLight, DirectionalLight, Clock, AnimationMixer, AnimationAction, TextureLoader, SRGBColorSpace, RepeatWrapping, MeshStandardMaterial, Box3, Box3Helper, Vector3, Color, MeshBasicMaterial, ShaderMaterial, BackSide, AdditiveBlending, BufferGeometry, Float32BufferAttribute, Points, PointsMaterial, CatmullRomCurve3, TubeGeometry, Mesh, DoubleSide, SkinnedMesh, Skeleton, AnimationClip, LoopOnce, WebGLRenderer, PerspectiveCamera, WebGLRenderTarget
} from 'three';

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

import allCharacters from '../allCharacters';
import { loadCachedFbx, loadCachedGltf, loadCachedTexture } from '../assetCache';
import { IallGameCharacters } from '../types';
import { FreshObstacleManager } from './FreshObstacleManager';

export default class FreshScene extends Scene {
  public loaded = false;
  public showProgressInUI = false;
  private fbxLoader = new FBXLoader();
  private glbLoader = new GLTFLoader();
  private obstacleManager: FreshObstacleManager;
  private woodenCave = new Object3D();
  private clock = new Clock();
  private animationMixer!: AnimationMixer;
  private activeCharacter = new Object3D();
  private allGameCharacters: IallGameCharacters[] = [];
  private delta = 0;
  // private animationSpeed = 1.0; // Removed duplicate
  
  // Speed Sequence
  private isSpeedSequenceActive = false;
  private speedSequenceTimer = 0;
  private sprintClip: AnimationClip | null = null;
  private crashClip: AnimationClip | null = null;
  private runClip: AnimationClip | null = null;
  private slideClip: AnimationClip | null = null;
  private jumpClips: AnimationClip[] = [];
  private sprintAction: AnimationAction | null = null;
  private crashAction: AnimationAction | null = null;
  private runAction: AnimationAction | null = null;
  private jumpAction: AnimationAction | null = null;
  private slideAction: AnimationAction | null = null;
  private currentAction: AnimationAction | null = null;

  private woodenCaveClone = new Object3D();
  private speed = 220;
  private caveSize = 3000; // Approximate size, need to verify
  private animationSpeed = 1.2; // Default 1.2x
  
  // Lightning / Aura Effects
  private activeEffect = 0; 
  private effect1Aura!: Object3D;
  private effect2Outline!: Object3D;
  private effect3Bolts: Mesh[] = [];
  private boltTimer = 0;
  private effect4Bloom!: Object3D; // Fake bloom sprite
  private effectTime = 0;
  
  // Color Palettes
  private lightningColor = 0x00ffff; // Default Cyan
  private bluePalette = [0x00ffff, 0x0088ff, 0x0000ff, 0xaaddff];
  private yellowPalette = [0xffff00, 0xffd700, 0xffaa00, 0xffffee];
  private turnPalette = [0xcc0000, 0xffaa00]; // Red/Orange from MainMenu
  private colorIndex = 0;

  private scores = 0;
  private coins = 0;
  private distance = 0;
  private elapsedTime = 0;
  
  // Movement
  private targetX = 0;
  private currentX = 0;
  private laneStep = 20; // Standard lane width

  // Jump Physics
  private verticalVelocity = 0;
  private gravity = -833; // Reduced from -1500 for slower jump
  private jumpForce = 204; // Reduced from 245 for +25% height with lower gravity
  private isJumping = false;
  private groundY = -35;

  // Slide Physics
  private isSliding = false;
  private slideTimer = 0;
  private slideDuration = 1.0; // Seconds
  private baseRotationY = 3.132; // Default Y rotation (spin)
  private baseRotationX = 0.050;
  private baseRotationZ = 0.010;

  // Game State
  private isInvulnerable = false;
  private isGameOver = false;
  private isPaused = false;
  private turnEffectTimer = 0;

  private loadingPromise: Promise<void> | null = null;

    private scoreEl: HTMLElement | null = null;

    private coinsEl: HTMLElement | null = null;

    private timerEl: HTMLElement | null = null;

    private metersEl: HTMLElement | null = null;

    private lastScoreText = '';

    private lastCoinsText = '';

    private lastTimerText = '';

    private lastMetersText = '';

  constructor() {
    super();
    this.obstacleManager = new FreshObstacleManager(this);
  }

    private cacheHudElements() {
        this.scoreEl ??= document.querySelector('.scores-count') as HTMLElement | null;
        this.coinsEl ??= document.querySelector('.coins-count') as HTMLElement | null;
        this.timerEl ??= document.getElementById('timer-display');
        this.metersEl ??= document.getElementById('meters-display');
    }

    private setScoreText(value: string) {
        this.cacheHudElements();
        if (this.scoreEl && this.lastScoreText !== value) {
            this.scoreEl.innerHTML = value;
            this.lastScoreText = value;
        }
    }

    private setCoinsText(value: string) {
        this.cacheHudElements();
        if (this.coinsEl && this.lastCoinsText !== value) {
            this.coinsEl.innerHTML = value;
            this.lastCoinsText = value;
        }
    }

    private setTimerText(value: string) {
        this.cacheHudElements();
        if (this.timerEl && this.lastTimerText !== value) {
            this.timerEl.innerText = value;
            this.lastTimerText = value;
        }
    }

    private setMetersText(value: string) {
        this.cacheHudElements();
        if (this.metersEl && this.lastMetersText !== value) {
            this.metersEl.innerText = value;
            this.lastMetersText = value;
        }
    }

  async load() {
    if (this.loaded) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = (async () => {
    this.updateLoading(5);
    this.background = await loadCachedTexture('./assets/mainbackdrop-2.png', 1);

    // Load Obstacles
    this.obstacleManager.loadAssets(this.fbxLoader);
    this.updateLoading(15);

    // 1. Load Environment (Cave)
    // Reuse texture logic from MainMenu or just load default
    let selectedTexture = localStorage.getItem('selectedCaveTexture') || 'cyberpunk-metal-2.jpeg';
    
    // Fix for old/broken texture references
    if (selectedTexture.includes('unsplash') || selectedTexture.includes('malik')) {
        console.warn('⚠️ [FreshScene] Detected broken texture reference, resetting to default.');
        selectedTexture = 'wooden-1.jpg';
        localStorage.setItem('selectedCaveTexture', selectedTexture);
    }

    const savedRepeat = parseFloat(localStorage.getItem('textureRepeat') || '22.5');
    const caveTexture = await loadCachedTexture(`./assets/models/textures/${selectedTexture}`, savedRepeat);

    this.woodenCave = await loadCachedFbx('./assets/models/wooden-cave.fbx');
    this.woodenCave.traverse((child: any) => {
      if (child.isMesh) {
        child.geometry.deleteAttribute('color');
        child.geometry.computeVertexNormals();
        child.material = new MeshStandardMaterial({
          map: caveTexture,
          color: 0xffffff,
          roughness: 1,
          metalness: 0,
        });
      }
    });
    this.woodenCave.position.set(0, 0, -500);
    this.woodenCave.scale.set(0.055, 0.055, 0.055);
    this.add(this.woodenCave);

    // Calculate exact size
    const caveBox = new Box3().setFromObject(this.woodenCave);
    this.caveSize = caveBox.max.z - caveBox.min.z - 1;

    // Clone for infinite scrolling
    this.woodenCaveClone = this.woodenCave.clone();
    this.woodenCaveClone.position.z = this.woodenCave.position.z - this.caveSize;
    this.add(this.woodenCaveClone);

    // 2. Lighting (Standard)
    const ambient = new AmbientLight(0xFFFFFF, 1.25);
    this.add(ambient);

    const light = new DirectionalLight(0xFFFFFF, 1.25);
    light.position.set(0, 40, -10);
    this.add(light);

    // 3. Load Character (Flash/Default)
    this.allGameCharacters = allCharacters;
    const char0 = this.allGameCharacters[0]; // Flash
    
    console.log('✨ [FreshScene] Loading character:', char0.name);
    
    if (char0.isGlb) {
            const gltf = await loadCachedGltf(char0.model);
      this.activeCharacter = gltf.scene;
      
      // Animation
      if (gltf.animations.length > 0) {
        this.animationMixer = new AnimationMixer(this.activeCharacter);
        // Try to find 'dance' or 'idle' or 'run'
        const anims = gltf.animations;
        let clip = anims[0];
        const findClip = (term: string) => anims.find(c => c.name.toLowerCase().includes(term));
        const danceClip = findClip('dance');
        const idleClip = findClip('idle');
        const runClip = findClip('run');
        
        // Prefer RUN for Fresh Mode
        if (runClip) clip = runClip;
        else if (danceClip) clip = danceClip;
        else if (idleClip) clip = idleClip;

        this.runClip = clip;
        this.runAction = this.animationMixer.clipAction(clip);
        this.runAction.play();
        this.currentAction = this.runAction;
        console.log(`✨ [FreshScene] Playing animation: ${clip.name}`);
      }
    } else {
      // FBX Fallback
      this.activeCharacter = await this.fbxLoader.loadAsync(char0.model);
      // Load RUN animation for FBX if available, otherwise dance
      const animGroup = await this.fbxLoader.loadAsync(char0.runAnimation || char0.danceAnimation);
      this.animationMixer = new AnimationMixer(this.activeCharacter);
      this.runClip = animGroup.animations[0];
      this.runAction = this.animationMixer.clipAction(this.runClip);
      this.runAction.play();
      this.currentAction = this.runAction;
    }
    
    // Set Initial Speed
    this.animationSpeed = 1.2;
    if (this.animationMixer) this.animationMixer.timeScale = 1.2;

    // Load Sprint Animation (Preload)
    try {
        const sprintGltf = await loadCachedGltf('./assets/characters/2025/flash-sprint-2.glb');
        if (sprintGltf.animations.length > 0) {
            this.sprintClip = sprintGltf.animations[0];
            this.sprintClip.name = 'sprint-2';
            console.log('🏃 [FreshScene] Loaded Sprint Animation');
        }
    } catch (e) {
        console.warn('⚠️ [FreshScene] Failed to load sprint animation:', e);
    }

    // Load Jump Animations (Preload)
    try {
        const jumpGltf = await loadCachedGltf('./assets/characters/2025/flash-jumps.glb');
        if (jumpGltf.animations.length > 0) {
            this.jumpClips = jumpGltf.animations;
            console.log(`🦘 [FreshScene] Loaded ${this.jumpClips.length} Jump Animations`);
        }
    } catch (e) {
        console.warn('⚠️ [FreshScene] Failed to load jump animations:', e);
    }

    // Load Slide Animation (Preload)
    try {
        const slideGltf = await loadCachedGltf('./assets/characters/2025/flash-slide.glb');
        if (slideGltf.animations.length > 0) {
            this.slideClip = slideGltf.animations[0];
            this.slideClip.name = 'slide';
            console.log('📉 [FreshScene] Loaded Slide Animation');
        }
    } catch (e) {
        console.warn('⚠️ [FreshScene] Failed to load slide animation:', e);
    }

    // Load Crash Animation (Preload)
    try {
        const crashGltf = await loadCachedGltf('./assets/characters/2025/flash-crash.glb');
        if (crashGltf.animations.length > 0) {
            this.crashClip = crashGltf.animations[0];
            this.crashClip.name = 'crash';
            console.log('💥 [FreshScene] Loaded Crash Animation');
        }
    } catch (e) {
        console.warn('⚠️ [FreshScene] Failed to load crash animation:', e);
    }

    // 4. Apply Start Screen Transforms (Position/Scale/Rotation)
    // Copied from MainMenuScene.ts initialize()
    this.activeCharacter.scale.set(0.1, 0.1, 0.1);
    // Move back a bit (Z was -110, user requested +20 offset -> -90)
    this.activeCharacter.position.set(0, -35, -90);

    if (char0.isGlb) {
        // Default rotation for Flash
        const defaultRotZ = 0.12; 
        const defaultRotY = 3.232; 
        
        this.activeCharacter.rotation.set(0, defaultRotY, defaultRotZ);
        this.activeCharacter.position.y = -35; 
        
        // Apply saved adjustments if any
        const savedRotZ = localStorage.getItem('glbRotationZ');
        const savedRotY = localStorage.getItem('glbRotationY');
        if (savedRotZ) this.activeCharacter.rotation.z = parseFloat(savedRotZ);
        if (savedRotY) this.activeCharacter.rotation.y = parseFloat(savedRotY);
    }

    this.add(this.activeCharacter);
    
    // Apply Default Unlit Mode (Bright)
    this.makeCharacterUnlit();

    // 5. Modern Dynamic Hitbox (Yellow-Green Wireframe)
    // We use Box3 to get the precise bounds of the model in its current pose
    const box = new Box3();
    
    // Force update matrix world before measuring
    this.activeCharacter.updateMatrixWorld(true);
    box.setFromObject(this.activeCharacter);
    
    const size = new Vector3();
    box.getSize(size);
    console.log('📏 [FreshScene] Model Dimensions:', {
        width: size.x.toFixed(2),
        height: size.y.toFixed(2),
        depth: size.z.toFixed(2)
    });
    console.log('📦 [FreshScene] Hitbox Bounds:', {
        min: { x: box.min.x.toFixed(2), y: box.min.y.toFixed(2), z: box.min.z.toFixed(2) },
        max: { x: box.max.x.toFixed(2), y: box.max.y.toFixed(2), z: box.max.z.toFixed(2) }
    });

    const helper = new Box3Helper(box, new Color(0x9ACD32)); // YellowGreen
    helper.name = 'debug-hitbox';
    helper.visible = false; // Hidden by default
    this.add(helper);
    
    // Store helper for updates
    (this as any).hitboxHelper = helper;

    this.updateLoading(100);
    this.loaded = true;
    })();
    return this.loadingPromise;
  }

  private updateLoading(percent: number) {
    if (!this.showProgressInUI) return;
    const pctEl = document.querySelector('.loading-percentage') as HTMLElement;
    if (pctEl) pctEl.innerHTML = `${percent}%`;
    
    const barEl = document.querySelector('#loading-bar-fill') as HTMLElement;
    if (barEl) barEl.style.width = `${percent}%`;
  }

  public warmUp(renderer: WebGLRenderer, camera: PerspectiveCamera) {
    if (!this.loaded) return;
    
    // Temporarily make everything visible
    const wasVisible = this.visible;
    this.visible = true;
    if (this.activeCharacter) this.activeCharacter.visible = true;
    
    // Force full render to offscreen target
    const renderTarget = new WebGLRenderTarget(128, 128);
    const originalTarget = renderer.getRenderTarget();
    
    renderer.setRenderTarget(renderTarget);
    renderer.render(this, camera);
    renderer.setRenderTarget(originalTarget);
    
    renderTarget.dispose();
    
    // Restore state
    this.visible = wasVisible;
    if (!wasVisible && this.activeCharacter) this.activeCharacter.visible = false;
    
    console.log('🔥 [FreshScene] WarmUp complete (GPU Upload forced)');
  }

  initialize() {
    console.log('✨ [FreshScene] Initializing Fresh Mode');
    // this.load(); // Now called in main.ts

    // Hide Main Menu UI
    const menuUI = document.querySelector('.main-menu-container') as HTMLElement;
    if (menuUI) menuUI.style.display = 'none';
    
    // Hide Game UI (Legacy)
    const gameUI = document.querySelector('.hud-stats-container') as HTMLElement;
    if (gameUI) gameUI.style.display = 'none';

    // Show Play HUD (New)
    const playHud = document.getElementById('play-hud');
    if (playHud) playHud.classList.remove('hidden');

    // Hook up Pause Button
    const pauseBtn = document.getElementById('pause-game-button');
    if (pauseBtn) {
        pauseBtn.onclick = () => this.togglePause();
    }
    
    // Hook up Resume Button (Modal)
    const resumeBtn = document.getElementById('resume-button');
    if (resumeBtn) {
        resumeBtn.onclick = () => this.togglePause();
    }

    // Hook up Quit Button (Modal)
    const quitBtn = document.getElementById('quit-button');
    if (quitBtn) {
        quitBtn.onclick = () => {
            this.togglePause(); // Unpause first to hide modal
            this.cleanup();
            window.dispatchEvent(new CustomEvent('returnToMainMenu'));
        };
    }

    // Show a simple "Back" button (Removed)
    // let backBtn = document.getElementById('fresh-mode-back-btn');
    // if (!backBtn) {
    //     backBtn = document.createElement('button');
    //     backBtn.id = 'fresh-mode-back-btn';
    //     backBtn.innerText = 'BACK TO MENU';
    //     backBtn.style.position = 'absolute';
    //     backBtn.style.top = '20px';
    //     backBtn.style.left = '20px';
    //     backBtn.style.zIndex = '1000';
    //     backBtn.style.padding = '10px 20px';
    //     backBtn.style.background = 'rgba(0,0,0,0.5)';
    //     backBtn.style.color = 'white';
    //     backBtn.style.border = '1px solid white';
    //     backBtn.style.cursor = 'pointer';
    //     document.body.appendChild(backBtn);
        
    //     backBtn.onclick = () => {
    //         this.cleanup();
    //         window.dispatchEvent(new CustomEvent('returnToMainMenu'));
    //     };
    // }
    // backBtn.style.display = 'block';

    this.visible = true;
    this.clock.start();
    
    // Reset Stats
    this.scores = 0;
    this.distance = 0;
    this.elapsedTime = 0;
    this.cacheHudElements();
    this.setScoreText('0');
    this.setCoinsText('0');
    this.setMetersText('0 M');
    this.setTimerText('00:00');
    
    // Reset Position
    this.targetX = 0;
    this.currentX = 0;
    if (this.activeCharacter) this.activeCharacter.position.x = 0;

    // Start Generation
    this.obstacleManager.isGenerating = true;

    // Input Listeners
    window.addEventListener('keydown', this.handleInput);
  }

  hide() {
    this.visible = false;
    const backBtn = document.getElementById('fresh-mode-back-btn');
    if (backBtn) backBtn.style.display = 'none';
    
    // Hide Play HUD
    const playHud = document.getElementById('play-hud');
    if (playHud) playHud.classList.add('hidden');

    window.removeEventListener('keydown', this.handleInput);
  }

  private handleInput = (e: KeyboardEvent) => {
      if (!this.visible) return;
      
      const key = e.key.toLowerCase();

      if (key === 'escape') {
          this.togglePause();
          return;
      }

      if (this.isPaused) return;
      
      if (e.key === 'ArrowLeft') {
          if (this.isGameOver) return;
          if (this.targetX > -20) this.targetX -= this.laneStep;
          this.turnEffectTimer = 0.5; // Trigger effect burst
      } else if (e.key === 'ArrowRight') {
          if (this.isGameOver) return;
          if (this.targetX < 20) this.targetX += this.laneStep;
          this.turnEffectTimer = 0.5; // Trigger effect burst
      } else if (e.key === 'ArrowUp' && !this.isJumping) {
          if (this.isGameOver) return; // Disable jump on game over
          this.verticalVelocity = this.jumpForce;
          this.isJumping = true;
          
          // Play Random Jump Animation
          if (this.jumpClips.length > 0 && this.animationMixer) {
              const randomIndex = Math.floor(Math.random() * this.jumpClips.length);
              const jumpClip = this.jumpClips[randomIndex];
              
              const newAction = this.animationMixer.clipAction(jumpClip);
              newAction.setLoop(LoopOnce, 1);
              newAction.clampWhenFinished = true;
              newAction.reset();
              
              // Determine current action to fade from
              const fromAction = this.currentAction || this.runAction;
              if (fromAction) {
                  fromAction.crossFadeTo(newAction, 0.2, true);
              }
              
              newAction.play();
              this.currentAction = newAction;
              this.jumpAction = newAction;
              
              console.log(`🦘 [FreshScene] Jump Animation: ${jumpClip.name}`);
              
              // Return to Run when finished
              const onFinished = (e: any) => {
                  if (e.action === newAction) {
                      this.animationMixer.removeEventListener('finished', onFinished);
                      if (this.runAction) {
                          newAction.crossFadeTo(this.runAction, 0.2, true);
                          
                          // Reset Run Action
                          this.runAction.reset();
                          this.runAction.enabled = true;
                          this.runAction.setEffectiveTimeScale(1.0);
                          this.runAction.setEffectiveWeight(1.0);
                          this.runAction.play();
                          
                          this.currentAction = this.runAction;
                          
                          // Ensure global speed is maintained
                          this.animationMixer.timeScale = this.animationSpeed;
                      }
                  }
              };
              this.animationMixer.addEventListener('finished', onFinished);
          }
      } else if (e.key === 'ArrowDown' && !this.isSliding && !this.isJumping) {
          if (this.isGameOver) return; // Disable slide on game over
          this.isSliding = true;
          this.slideTimer = 0;
          
          // Play Slide Animation
          if (this.slideClip && this.animationMixer) {
              // Update slide duration to match clip
              this.slideDuration = this.slideClip.duration;
              console.log(`📉 [FreshScene] Slide Start (${this.slideDuration.toFixed(2)}s)`);

              const newAction = this.animationMixer.clipAction(this.slideClip);
              newAction.setLoop(LoopOnce, 1);
              newAction.clampWhenFinished = true;
              newAction.reset();

              const fromAction = this.currentAction || this.runAction;
              if (fromAction) {
                  fromAction.crossFadeTo(newAction, 0.2, true);
              }

              newAction.play();
              this.currentAction = newAction;
              this.slideAction = newAction;

              // Blend back early (at 80% of duration minus 0.3s)
              const duration = this.slideClip.duration;
              const blendBackTime = (duration * 0.8) - 0.3; 
              
              setTimeout(() => {
                  // Only blend back if this is still the active action
                  if (this.currentAction === newAction && this.runAction) {
                      console.log('📉 [FreshScene] Blending back from slide early');
                      
                      // Ensure run action is ready
                      this.runAction.reset();
                      this.runAction.enabled = true;
                      this.runAction.setEffectiveTimeScale(1.0);
                      this.runAction.setEffectiveWeight(1.0);
                      
                      newAction.crossFadeTo(this.runAction, 0.2, true);
                      this.runAction.play();
                      this.currentAction = this.runAction;
                      
                      // Ensure global speed is maintained
                      this.animationMixer.timeScale = this.animationSpeed;
                  }
              }, blendBackTime * 1000);
          } else {
              // Fallback if no animation
              console.log('📉 [FreshScene] Slide Start (No Animation)');
          }
      } else if (key === 'n') {
          this.baseRotationY -= 0.1;
          console.log('🔄 [FreshScene] Base Rotation Y:', this.baseRotationY.toFixed(3));
      } else if (key === 'm') {
          this.baseRotationY += 0.1;
          console.log('🔄 [FreshScene] Base Rotation Y:', this.baseRotationY.toFixed(3));
      } else if (key === 'o') {
          this.baseRotationZ -= 0.01;
          console.log('🔄 [FreshScene] Base Rotation Z:', this.baseRotationZ.toFixed(3));
      } else if (key === 'p') {
          this.baseRotationZ += 0.01;
          console.log('🔄 [FreshScene] Base Rotation Z:', this.baseRotationZ.toFixed(3));
      } else if (key === 'k') {
          this.baseRotationX -= 0.05;
          console.log('🔄 [FreshScene] Base Rotation X:', this.baseRotationX.toFixed(3));
      } else if (key === 'l') {
          this.baseRotationX += 0.05;
          console.log('🔄 [FreshScene] Base Rotation X:', this.baseRotationX.toFixed(3));
      } else if (key === 'y') {
          if (this.obstacleManager) this.obstacleManager.toggleGeneration();
      } else if (key === '1') {
          this.toggleEffect(1);
      } else if (key === '2') {
          this.toggleEffect(2);
      } else if (key === '3') {
          this.toggleEffect(3);
      } else if (key === '4') {
          this.toggleEffect(4);
      } else if (key === '5') {
          this.cycleColor('blue');
      } else if (key === '6') {
          this.cycleColor('yellow');
      } else if (key === 't') {
          this.startSpeedSequence();
      } else if (key === 'g') {
          this.resetSpeedSequence();
      } else if (key === 'u') {
          this.animationSpeed += 0.1;
          if (this.animationMixer) this.animationMixer.timeScale = this.animationSpeed;
          console.log(`🏃 [FreshScene] Animation Speed: ${this.animationSpeed.toFixed(1)}x`);
      } else if (key === 'i') {
          this.animationSpeed = Math.max(0.1, this.animationSpeed - 0.1);
          if (this.animationMixer) this.animationMixer.timeScale = this.animationSpeed;
          console.log(`🏃 [FreshScene] Animation Speed: ${this.animationSpeed.toFixed(1)}x`);
      } else if (key === 'c') {
          this.isInvulnerable = !this.isInvulnerable;
          console.log(`🛡️ [FreshScene] Invulnerable: ${this.isInvulnerable ? 'ON' : 'OFF'}`);
          // Visual feedback (Tint Green)
          if (this.activeCharacter) {
              this.activeCharacter.traverse((c: any) => {
                  if (c.isMesh && c.material && c.material.color) {
                      if (this.isInvulnerable) {
                          c.userData.originalColor = c.material.color.getHex();
                          c.material.color.setHex(0x00ff00);
                      } else {
                          if (c.userData.originalColor !== undefined) {
                              c.material.color.setHex(c.userData.originalColor);
                          } else {
                              c.material.color.setHex(0xffffff);
                          }
                      }
                  }
              });
          }
      } else if (key === 'v') {
          const helper = (this as any).hitboxHelper;
          if (helper) {
              helper.visible = !helper.visible;
              // Also toggle obstacle hitboxes
              this.obstacleManager.toggleHitboxes(helper.visible);
              console.log(`📦 [FreshScene] Hitbox Visible: ${helper.visible}`);
          }
      }
      
      // Clamp to reasonable bounds (e.g. -20 to 20)
      this.targetX = Math.max(-20, Math.min(20, this.targetX));
  };

  update() {
    if (this.isPaused) return;

    if (this.animationMixer) {
      this.delta = this.clock.getDelta();
      this.animationMixer.update(this.delta);
      
      // Move Cave (Infinite Scroll)
      // Move towards camera (positive Z) to simulate running forward
      const moveSpeed = this.speed * this.delta;
      this.woodenCave.position.z += moveSpeed;
      this.woodenCaveClone.position.z += moveSpeed;

      // Reset positions
      // Logic from RunningScene.ts
      if (this.woodenCave.position.z > 600) {
          this.woodenCave.position.z = this.woodenCaveClone.position.z - this.caveSize;
      }
      if (this.woodenCaveClone.position.z > 600) {
          this.woodenCaveClone.position.z = this.woodenCave.position.z - this.caveSize;
      }

      // Update Stats (Score & Distance)
      // Score logic from RunningScene: this.scores += Math.round(this.speed * this.delta);
    this.scores += Math.round(this.speed * this.delta);
    this.setScoreText(this.scores.toString());

      // Distance logic (30% of speed)
      this.distance += (this.speed * this.delta * 0.3); 
    this.setMetersText(`${Math.floor(this.distance)} M`);

      // Timer Logic
      this.elapsedTime += this.delta;
      const minutes = Math.floor(this.elapsedTime / 60);
      const seconds = Math.floor(this.elapsedTime % 60);
      this.setTimerText(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);

      // Smooth Movement (Lerp)
      // Play Mode uses: this.player.position.x += moveAmount; where moveAmount = speed * delta * direction
      // And simple tilt: rotation.y = baseRotationY - (direction * 0.5)
      
      const diff = this.targetX - this.currentX;
      if (Math.abs(diff) > 0.1) {
          const direction = Math.sign(diff);
          // Use a fixed speed for lane switching, e.g. 150 units/sec
          const moveSpeed = 150 * this.delta; 
          
          if (Math.abs(diff) < moveSpeed) {
              this.currentX = this.targetX;
          } else {
              this.currentX += direction * moveSpeed;
          }
          
          if (this.activeCharacter) {
              this.activeCharacter.position.x = this.currentX;
              // Tilt logic from Play Mode: rotation.y = base - (direction * 0.5)
              // Base Y is 3.232. 
              // Note: 0.5 radians is quite a lot (~28 degrees).
              this.activeCharacter.rotation.y = this.baseRotationY - (direction * 0.5);
              this.activeCharacter.rotation.x = this.baseRotationX;
              this.activeCharacter.rotation.z = this.baseRotationZ;
          }
      } else {
          this.currentX = this.targetX;
          if (this.activeCharacter) {
              this.activeCharacter.position.x = this.currentX;
              this.activeCharacter.rotation.y = this.baseRotationY; // Reset to base
              this.activeCharacter.rotation.x = this.baseRotationX;
              this.activeCharacter.rotation.z = this.baseRotationZ;
          }
      }

      // Vertical Movement (Jump)
      if (this.isJumping && this.activeCharacter) {
          this.verticalVelocity += this.gravity * this.delta;
          this.activeCharacter.position.y += this.verticalVelocity * this.delta;

          if (this.activeCharacter.position.y <= this.groundY) {
              this.activeCharacter.position.y = this.groundY;
              this.isJumping = false;
              this.verticalVelocity = 0;
          }
      }

      // Slide Logic
      if (this.isSliding) {
          this.slideTimer += this.delta;
          if (this.slideTimer >= this.slideDuration) {
              this.isSliding = false;
              console.log('📈 [FreshScene] Slide End');
          }
      }

      // Update dynamic hitbox
      const helper = (this as any).hitboxHelper;
      if (helper && this.activeCharacter) {
          this.activeCharacter.updateMatrixWorld(true); // Ensure transforms are applied
          helper.box.setFromObject(this.activeCharacter);
          
          // Apply Slide Hitbox Modification (Shrink Height)
          if (this.isSliding) {
              // Reduce max Y to simulate crouching/sliding
              // We assume the character is roughly 15-20 units tall.
              // Let's cut the height in half from the top.
              const height = helper.box.max.y - helper.box.min.y;
              helper.box.max.y -= (height * 0.5);
          }

          // Check Coin Collisions
          if (!this.isGameOver) {
              const collected = this.obstacleManager.checkCoinCollisions(helper.box);
              if (collected > 0) {
                  this.coins += collected;
                  this.setCoinsText(this.coins.toString());
              }
          }

          // Check Collisions
          if (!this.isGameOver && this.obstacleManager.checkCollisions(helper.box, this.isInvulnerable)) {
              console.log('💥 [FreshScene] Collision Detected!');
              // Game Over Logic
              this.isGameOver = true;
              this.speed = 0;
              this.obstacleManager.toggleGeneration(); // Stop spawning
              
              // Play Crash Animation
              if (this.crashClip && this.animationMixer) {
                  console.log('💥 [FreshScene] Playing Crash Animation');
                  
                  const newAction = this.animationMixer.clipAction(this.crashClip);
                  newAction.setLoop(LoopOnce, 1);
                  newAction.clampWhenFinished = true;
                  newAction.reset();

                  // Blend from current action
                  const fromAction = this.currentAction || this.runAction;
                  if (fromAction && fromAction.isRunning()) {
                      fromAction.crossFadeTo(newAction, 0.1, true); // Fast blend (0.1s)
                  } else {
                      this.animationMixer.stopAllAction();
                  }
                  
                  newAction.play();
                  this.currentAction = newAction;
                  this.crashAction = newAction;
              } else {
                  console.warn('⚠️ [FreshScene] Crash animation not found or mixer missing');
              }

              // Show Game Over Alert with Countdown
              if (!document.getElementById('fresh-game-over')) {
                  const div = document.createElement('div');
                  div.id = 'fresh-game-over';
                  div.style.position = 'absolute';
                  div.style.top = '50%';
                  div.style.left = '50%';
                  div.style.transform = 'translate(-50%, -50%)';
                  div.style.background = 'rgba(0,0,0,0.8)';
                  div.style.color = 'red';
                  div.style.padding = '20px';
                  div.style.fontSize = '40px';
                  div.style.fontWeight = 'bold';
                  div.style.border = '2px solid red';
                  div.style.textAlign = 'center';
                  div.innerHTML = 'GAME OVER<br><span id="restart-countdown" style="color:white;font-size:24px">Restarting in 3...</span>';
                  document.body.appendChild(div);
                  
                  let count = 3;
                  const interval = setInterval(() => {
                      count--;
                      const span = document.getElementById('restart-countdown');
                      if (span) span.innerText = `Restarting in ${count}...`;
                      
                      if (count <= 0) {
                          clearInterval(interval);
                          div.remove();
                          
                          // Reset Game
                          this.isGameOver = false;
                          this.speed = 220;
                          this.scores = 0;
                          this.coins = 0;
                          this.setScoreText('0');
                          this.setCoinsText('0');
                          this.distance = 0;
                          this.elapsedTime = 0;
                          this.animationSpeed = 1.2; // Reset to default
                          if (this.animationMixer) this.animationMixer.timeScale = 1.2;
                          
                          this.obstacleManager.reset(); // Clear old obstacles
                          this.obstacleManager.toggleGeneration(); // Start new generation
                          
                          // Reset Animation to Run
                          if (this.runAction) {
                              this.animationMixer.stopAllAction();
                              this.runAction.reset();
                              this.runAction.setEffectiveTimeScale(1.0);
                              this.runAction.play();
                              this.currentAction = this.runAction;
                          }
                      }
                  }, 1000);
              }
          }
      }
      
      // Update Obstacles
      this.obstacleManager.update(this.delta, this.speed);
      
      // Update Effects
      this.updateEffects(this.delta);
      
      // Update Speed Sequence
      this.updateSpeedSequence(this.delta);
    }
  }

  private togglePause() {
      this.isPaused = !this.isPaused;
      const modal = document.getElementById('game-paused-modal');
      
      if (this.isPaused) {
          console.log('⏸️ [FreshScene] Game Paused');
          this.clock.stop();
          if (modal) modal.style.display = 'flex';
      } else {
          console.log('▶️ [FreshScene] Game Resumed');
          this.clock.start();
          if (modal) modal.style.display = 'none';
      }
  }

  private cleanup() {
      console.log('🧹 [FreshScene] Cleaning up...');
      this.isPaused = false;
      this.isGameOver = false;
      this.isInvulnerable = false;
      
      // Reset Speed
      this.speed = 220;
      this.animationSpeed = 1.2;
      if (this.animationMixer) this.animationMixer.timeScale = 1.2;
      
      // Reset Obstacles
      this.obstacleManager.reset();
      
      // Reset UI
      const playHud = document.getElementById('play-hud');
      if (playHud) playHud.classList.add('hidden');
      
      const backBtn = document.getElementById('fresh-mode-back-btn');
      if (backBtn) backBtn.style.display = 'none';
      
      const pauseModal = document.getElementById('game-paused-modal');
      if (pauseModal) pauseModal.style.display = 'none';
      
      const gameOverDiv = document.getElementById('fresh-game-over');
      if (gameOverDiv) gameOverDiv.remove();

      window.removeEventListener('keydown', this.handleInput);
  }

  private makeCharacterUnlit() {
      if (!this.activeCharacter) return;
      this.activeCharacter.traverse((child: any) => {
          if (child.isMesh) {
              if (!child.userData.originalMaterial) {
                  child.userData.originalMaterial = child.material;
              }
              // Create basic mat if not exists
              if (!child.userData.basicMaterial) {
                  const basicMat = new MeshBasicMaterial({
                      map: child.material.map || null,
                      color: 0xffffff,
                      side: child.material.side,
                      transparent: child.material.transparent,
                      opacity: child.material.opacity
                  });
                  (basicMat as any).skinning = true; // Important for animated meshes
                  child.userData.basicMaterial = basicMat;
              }
              child.material = child.userData.basicMaterial;
          }
      });
      console.log('💡 [FreshScene] Character set to Unlit (Bright) Mode');
  }

  private startSpeedSequence() {
      if (this.isSpeedSequenceActive) return;
      console.log('🚀 [FreshScene] Starting Speed Sequence (1x -> 2x -> 3x)');
      this.isSpeedSequenceActive = true;
      this.speedSequenceTimer = 0;
  }

  private resetSpeedSequence() {
      console.log('🛑 [FreshScene] Resetting Speed Sequence');
      this.isSpeedSequenceActive = false;
      this.speedSequenceTimer = 0;
      this.animationSpeed = 1.2; // Default 1.2x
      if (this.animationMixer) this.animationMixer.timeScale = 1.2;

      // Switch back to run
      if (this.runAction && this.sprintAction) {
          this.sprintAction.fadeOut(0.2);
          this.runAction.reset().fadeIn(0.2).play();
          this.currentAction = this.runAction;
          this.sprintAction = null; // Reset reference
      }
  }

  private updateSpeedSequence(dt: number) {
      if (!this.isSpeedSequenceActive) return;
      
      this.speedSequenceTimer += dt;
      const t = this.speedSequenceTimer;

      // Phase 1: 0s -> 3s (1.2x -> 2x)
      if (t <= 3) {
          const progress = t / 3;
          this.animationSpeed = 1.2 + (progress * 0.8); // 1.2 + 0..0.8 = 1.2..2.0
      } 
      // Phase 2: 3s -> 7s (2x -> 3x)
      else if (t <= 7) {
          // Trigger Animation Switch at 3s (once)
          if (this.activeCharacter && this.sprintClip && this.animationMixer) {
             // Check if we are already playing sprint
             const currentAction = this.animationMixer.existingAction(this.sprintClip);
             if (!currentAction || !currentAction.isRunning()) {
                 console.log('⚡ [FreshScene] Switching to SPRINT animation');
                 // Switch
                 if (this.runAction) this.runAction.fadeOut(0.2);
                 this.sprintAction = this.animationMixer.clipAction(this.sprintClip);
                 this.sprintAction.reset().fadeIn(0.2).play();
                 this.currentAction = this.sprintAction;
             }
          }
          
          const progress = (t - 3) / 4;
          this.animationSpeed = 2.0 + (progress * 1.0); // 2 + 0..1 = 2..3
      }
      // Phase 3: > 7s (Hold 3x)
      else {
          this.animationSpeed = 3.0;
      }
      
      if (this.animationMixer) this.animationMixer.timeScale = this.animationSpeed;
  }

  private cycleColor(type: 'blue' | 'yellow') {
      this.colorIndex++;
      let palette = this.bluePalette;
      let name = 'Blue';
      
      if (type === 'yellow') {
          palette = this.yellowPalette;
          name = 'Yellow/Gold';
      }
      
      if (this.colorIndex >= palette.length) this.colorIndex = 0;
      this.lightningColor = palette[this.colorIndex];
      
      console.log(`🎨 [FreshScene] Color Cycle (${name}): ${this.lightningColor.toString(16)}`);
  }

  private toggleEffect(mode: number) {
      // Clear current effect
      if (this.effect1Aura) {
          this.activeCharacter.remove(this.effect1Aura);
          this.effect1Aura.traverse((c: any) => {
              if (c.geometry) c.geometry.dispose();
              if (c.material) c.material.dispose();
          });
          this.effect1Aura = undefined!;
      }
      if (this.effect2Outline) {
          this.activeCharacter.remove(this.effect2Outline);
          this.effect2Outline.traverse((c: any) => {
              if (c.geometry) c.geometry.dispose();
              if (c.material) c.material.dispose();
          });
          this.effect2Outline = undefined!;
      }
      this.effect3Bolts.forEach(bolt => {
          this.remove(bolt);
          bolt.geometry.dispose();
          if (Array.isArray(bolt.material)) bolt.material.forEach(m => m.dispose());
          else bolt.material.dispose();
      });
      this.effect3Bolts = [];
      
      if (this.effect4Bloom) {
          this.activeCharacter.remove(this.effect4Bloom);
          this.effect4Bloom = undefined!;
      }

      // Toggle off if same mode
      if (this.activeEffect === mode) {
          this.activeEffect = 0;
          console.log('✨ [FreshScene] Effects Cleared');
          return;
      }

      this.activeEffect = mode;
      console.log(`⚡ [FreshScene] Effect ${mode} Activated`);

      switch (mode) {
          case 1: // Static Charge (Close Body)
              // Purely procedural in update
              break;
          case 2: // Comet Trail
              // Purely procedural in update
              break;
          case 3: // Speed Charge (Static + Trail)
              // Purely procedural in update
              break;
          case 4: // Overdrive (Intense Static + Trail)
              // Purely procedural in update
              break;
      }
  }

  private createEffect1() {
      // Replaced by procedural bolts
  }

  private createEffect2() {
      // Replaced by procedural bolts
  }

  private createEffect3() {
      // Replaced by procedural bolts
  }

  private createEffect4() {
      // Replaced by procedural bolts
  }

  private updateEffects(delta: number) {
      this.effectTime += delta;

      // 1. Static Charge (The "Perfect" one)
      if (this.activeEffect === 1) {
          this.boltTimer += delta;
          if (this.boltTimer > 0.02) { 
              this.boltTimer = 0;
              this.spawnRandomBolt(
                  this.activeCharacter.position.clone().add(new Vector3(0, -10, 0)), 
                  15, 0.1, 2, this.lightningColor
              );
              this.spawnRandomBolt(
                  this.activeCharacter.position.clone().add(new Vector3(0, 10, 0)),
                  15, 0.1, 2, this.lightningColor
              );
          }
      }

      // 2. Comet Trail (Constant)
      if (this.activeEffect === 2) {
          this.boltTimer += delta;
          if (this.boltTimer > 0.01) { 
              this.boltTimer = 0;
              // Constant intensity
              for(let i=0; i<2; i++) {
                  const offset = new Vector3(
                      (Math.random()-0.5) * 10, // Width
                      (Math.random()-0.5) * 15 + 10, // Height (Shifted up +10)
                      (Math.random()-0.5) * 5   // Depth variance
                  );
                  const start = this.activeCharacter.position.clone().add(offset);
                  // Trail extends backwards (+Z)
                  const end = start.clone().add(new Vector3(0, 0, 40 + Math.random() * 20)); 
                  
                  this.spawnDirectedBolt(start, end, 0.1, 1.0, this.lightningColor);
              }
          }
      }

      // Turn Effect (Independent Burst)
      if (this.turnEffectTimer > 0) {
          this.turnEffectTimer -= delta;
          
          // Spawn per frame, scaled by intensity
          const intensity = Math.ceil(this.turnEffectTimer * 5); 
          
          for(let i=0; i<intensity; i++) {
               const color = this.turnPalette[Math.floor(Math.random() * this.turnPalette.length)];
               this.spawnRandomBolt(
                  this.activeCharacter.position.clone().add(new Vector3(0, 0, 0)), 
                  15, 0.1, 2, color
              );
          }
      }

      // 3. Speed Charge (Combo 1 + 2)
      if (this.activeEffect === 3) {
          this.boltTimer += delta;
          if (this.boltTimer > 0.02) {
              this.boltTimer = 0;
              
              // 1. Static (Reduced count)
              this.spawnRandomBolt(
                  this.activeCharacter.position.clone().add(new Vector3(0, 0, 0)), 
                  15, 0.1, 2, this.lightningColor
              );

              // 2. Trail (Reduced count)
              const offset = new Vector3(
                  (Math.random()-0.5) * 8, 
                  (Math.random()-0.5) * 15 + 10, 
                  (Math.random()-0.5) * 5
              );
              const start = this.activeCharacter.position.clone().add(offset);
              const end = start.clone().add(new Vector3(0, 0, 30 + Math.random() * 20)); 
              this.spawnDirectedBolt(start, end, 0.1, 1.0, this.lightningColor);
          }
      }

      // 4. Overdrive (Intense Combo 1 + 2)
      if (this.activeEffect === 4) {
          this.boltTimer += delta;
          if (this.boltTimer > 0.01) { // High frequency
              this.boltTimer = 0;
              
              // 1. Static (Full)
              this.spawnRandomBolt(
                  this.activeCharacter.position.clone().add(new Vector3(0, -10, 0)), 
                  20, 0.15, 3, this.lightningColor
              );
              this.spawnRandomBolt(
                  this.activeCharacter.position.clone().add(new Vector3(0, 10, 0)), 
                  20, 0.15, 3, this.lightningColor
              );

              // 2. Trail (Full)
              for(let i=0; i<2; i++) {
                  const offset = new Vector3(
                      (Math.random()-0.5) * 12, 
                      (Math.random()-0.5) * 20 + 10, 
                      (Math.random()-0.5) * 5
                  );
                  const start = this.activeCharacter.position.clone().add(offset);
                  const end = start.clone().add(new Vector3(0, 0, 50 + Math.random() * 20)); 
                  this.spawnDirectedBolt(start, end, 0.15, 1.5, this.lightningColor);
              }
          }
      }
      
      this.updateBolts(delta);
  }

  private spawnRandomBolt(center: Vector3, range: number, thickness: number, jitter: number, color: number) {
      // Random start near center
      const start = center.clone().add(new Vector3(
          (Math.random() - 0.5) * range * 0.5,
          (Math.random() - 0.5) * range * 0.8,
          (Math.random() - 0.5) * range * 0.5
      ));

      // Random end within range
      const end = start.clone().add(new Vector3(
          (Math.random() - 0.5) * range,
          (Math.random() - 0.5) * range,
          (Math.random() - 0.5) * range
      ));
      
      this.spawnDirectedBolt(start, end, thickness, jitter, color);
  }

  private spawnDirectedBolt(start: Vector3, end: Vector3, thickness: number, jitter: number, color: number) {
      const points = [];
      points.push(start.clone());
      
      const segments = 5;
      
      for(let i=1; i<segments; i++) {
          const alpha = i / segments;
          const pt = start.clone().lerp(end, alpha);
          pt.add(new Vector3(
              (Math.random()-0.5) * jitter,
              (Math.random()-0.5) * jitter,
              (Math.random()-0.5) * jitter
          ));
          points.push(pt);
      }
      points.push(end);

      const curve = new CatmullRomCurve3(points);
      const geo = new TubeGeometry(curve, 4, thickness, 3, false); 
      const mat = new MeshBasicMaterial({ color: color, transparent: true, opacity: 1 });
      const mesh = new Mesh(geo, mat);
      this.add(mesh);
      this.effect3Bolts.push(mesh);
  }

  private updateBolts(dt: number) {
      for (let i = this.effect3Bolts.length - 1; i >= 0; i--) {
          const bolt = this.effect3Bolts[i];
          (bolt.material as MeshBasicMaterial).opacity -= dt * 5; // Fade faster
          if ((bolt.material as MeshBasicMaterial).opacity <= 0) {
              this.remove(bolt);
              bolt.geometry.dispose();
              (bolt.material as MeshBasicMaterial).dispose();
              this.effect3Bolts.splice(i, 1);
          }
      }
  }
}
