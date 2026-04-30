/* eslint-disable linebreak-style */
import {
  Scene, DirectionalLight, AmbientLight, Object3D, AnimationMixer, AnimationAction, Clock,
  Box3, Group, BoxGeometry, MeshPhongMaterial, Mesh, Vector3, Color, TextureLoader, SRGBColorSpace, MeshBasicMaterial, RepeatWrapping, MeshStandardMaterial, LoopOnce, LoopRepeat, BoxHelper, Box3Helper, AnimationClip, WebGLRenderer, PerspectiveCamera, WebGLRenderTarget,
} from 'three';

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Toastify from 'toastify-js';
import * as TWEEN from '@tweenjs/tween.js';
import allCharacters from '../allCharacters';
import { getCachedJson, loadCachedFbx, loadCachedGltf, loadCachedTexture } from '../assetCache';

import { IallGameCharacters } from '../types';

export default class RunningScene extends Scene {
  public loaded = false;

  public showProgressInUI = false;
  public loadingOffset = 0;
  public loadingScale = 1;

  private loadingPromise: Promise<void> | null = null;

  private fbxLoader = new FBXLoader();

  private glbLoader = new GLTFLoader();

  private woodenCave = new Object3D();

  private caveTexture: any = null;

  private player = new Object3D();

  private animationMixer!: AnimationMixer;

  private runningAnimation!: AnimationAction;

  private clock = new Clock();

  private delta = 0;

  private woodenCaveClone = new Object3D();

  private caveSize = 0;

  private speed = 220;

  private currentAnimation!: AnimationAction;

  private jumpingAnimation!: AnimationAction;

  private isJumping = false;

  private jumpingUp!: TWEEN.Tween<any>;

  private jumpingDown!: TWEEN.Tween<any>;

  private isSliding = false;

  private slidingAnimation !: AnimationAction;

  private sliderTimeout!: ReturnType<typeof setTimeout>;

  private barrelObject = new Object3D();

  private boxObject = new Object3D();

  private spikeObject = new Object3D();

  private obstacleArray: Group[] = [];

  private currentObstacleOne = new Group();

  private currentObstacleTwo = new Group();

  private playerBox = new Mesh(new BoxGeometry(), new MeshPhongMaterial({ color: 0x0000ff }));

  private playerBoxCollider = new Box3(new Vector3(), new Vector3());

  private obstacleBox = new Box3(new Vector3(), new Vector3());

  private obstacleBox2 = new Box3(new Vector3(), new Vector3());

  private coinObject = new Object3D();

  private coinsArray: Group[] = [];

  private activeCoinsGroup = new Group();

  private coinBox = new Box3(new Vector3(), new Vector3());

  private coinSpinSpeed = 1.6;

  private scores = 0;

  private coins = 0;

  private isGamePaused = false;

  private isGameOver = false;

  private stumbleAnimation!: AnimationAction;

  private isPlayerHeadStart = false;

  private touchstartX = 0;

  private touchendX = 0;

  private touchstartY = 0;

  private touchendY = 0;

  private xbot = new Object3D();

  private xbotRunningAnimation = new Object3D();

  private xbotJumpingAnimation = new Object3D();

  private xbotSlidingAnimation = new Object3D();

  private xbotStumbleAnimation = new Object3D();

  private jolleen = new Object3D();

  private jolleenRunningAnimation = new Object3D();

  private jolleenJumpingAnimation = new Object3D();

  private jolleenSlidingAnimation = new Object3D();

  private jolleenStumbleAnimation = new Object3D();

  private peasantGirl = new Object3D();

  private peasantGirlRunningAnimation = new Object3D();

  private peasantGirlJumpingAnimation = new Object3D();

  private peasantGirlSlidingAnimation = new Object3D();

  private peasantGirlStumbleAnimation = new Object3D();

  private allGameCharacters: IallGameCharacters[] = [];

  private charactersContainer: Object3D[] = [];

  private runningAnimationsContainer: Object3D[] = [];

  private jumpingAnimationsContainer: Object3D[] = [];

  private slidingAnimationsContainer: Object3D[] = [];

  private stumbleAnimationsContainer: Object3D[] = [];

  private activePlayerIndex = 0;

  public isDemo = false;

  private elapsedTime = 0;
  private meters = 0;

  // New Movement System Variables
  private targetLane = 0; // -1 (Left), 0 (Center), 1 (Right)
  private currentLane = 0;
  private laneWidth = 18;
  private laneSwitchSpeed = 100; // Units per second

  private isJumpingState = false;
  private verticalVelocity = 0;
  private gravityUp = -150;
  private gravityDown = -150;
  private groundY = -35;

  private baseRotationY = 3.232; // Base Y rotation (185.16 degrees) to preserve o/p adjustments

  // Jump Configuration
  private valJumpHeight = 20;
  private valJumpSpeedUp = 1.5; // Multiplier (1.0 = 0.6s to apex)
  private valJumpSpeedDown = 2.0; // Multiplier for gravity when falling

  // Debug
  private showHitboxes = false;
  private isInvulnerable = false;
  private hitboxHelpers: (BoxHelper | Box3Helper)[] = [];
  private playerBoxHelper!: Box3Helper;
  private ignoredColliders = new Set<Object3D>();

  private characterConfig: any = null;

  // Character Tweaks
  private planePosX = 0;
  private planePosY = 0;
  private planePosZ = 0;
  
  private hitboxPos = { x: 0, y: 90, z: 0 };
  private hitboxScale = { x: 50, y: 200, z: 20 };

  private modelPosX = 0;
  private modelPosY = -35; // Default from MainMenu
  private modelPosZ = 0;
  private modelTilt = 0;
  private modelSpin = 185.16; // Default from MainMenu (3.232 rad)
  
  private availableGlbFiles = ['character.glb', 'run.glb', 'jump.glb', 'slide.glb', 'stumble.glb', 'D7M3GLJGZXPBHJZBUQ2G0G5N0.glb']; // Defaults from 2025 folder

  private scoreEl: HTMLElement | null = null;

  private coinsEl: HTMLElement | null = null;

  private timerEl: HTMLElement | null = null;

  private metersEl: HTMLElement | null = null;

  private lastScoreText = '';

  private lastCoinsText = '';

  private lastTimerText = '';

  private lastMetersText = '';

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

  private updateLoading(percent: number) {
    if (!this.showProgressInUI) return;

    const scaledPercent = Math.min(100, Math.round(this.loadingOffset + (percent * this.loadingScale)));

    const pctEl = document.querySelector('.loading-percentage') as HTMLElement;
    if (pctEl) pctEl.innerHTML = `${scaledPercent}%`;
    
    const barEl = document.querySelector('#loading-bar-fill') as HTMLElement;
    if (barEl) barEl.style.width = `${scaledPercent}%`;
  }

  private async loadCaveTexture(filename: string, repeatValue?: number) {
    const repeat = repeatValue !== undefined ? repeatValue : parseFloat(localStorage.getItem('textureRepeat') || '8');
    const texture = await loadCachedTexture(`./assets/models/textures/${filename}`, repeat);
    console.log(`🎨 Loading texture "${filename}" with repeat: ${repeat} (passed: ${repeatValue})`);
    return texture;
  }

  private applyCaveTexture(texture: any) {
    this.caveTexture = texture;
    console.log(`✅ Applying texture with repeat: ${texture.repeat.x} x ${texture.repeat.y}`);
    this.woodenCave.traverse((child: any) => {
      if (child.isMesh && child.material) {
        child.material.map = texture;
        child.material.needsUpdate = true;
      }
    });
    this.woodenCaveClone.traverse((child: any) => {
      if (child.isMesh && child.material) {
        child.material.map = texture;
        child.material.needsUpdate = true;
      }
    });
  }

  async changeCaveTexture(filename: string, repeatValue?: number) {
    const newTexture = await this.loadCaveTexture(filename, repeatValue);
    this.applyCaveTexture(newTexture);
    localStorage.setItem('selectedCaveTexture', filename);
  }

  async load() {
    if (this.loaded) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = (async () => {
    this.updateLoading(5);
    this.background = await loadCachedTexture('./assets/mainbackdrop-2.png', 1);

    const cleanAnim = (group: any) => {
      if (group.animations && group.animations.length) {
        const clip = group.animations[0];
        
        // Log tracks before cleaning
        // console.log(`🧹 Cleaning animation: ${clip.name}`);
        // clip.tracks.forEach((t: any) => console.log(`   - Track: ${t.name}`));

        clip.tracks = clip.tracks.filter((t: any) =>
          !t.name.endsWith('.position') || t.name.toLowerCase().includes('hips') || t.name.toLowerCase().includes('root')
        );

        // Fix for side-to-side looping drift: Zero out X and Z on hips/root
        const hipsTrack = clip.tracks.find((t: any) => 
            (t.name.toLowerCase().includes('hips') || t.name.toLowerCase().includes('root')) 
            && t.name.endsWith('.position')
        );
        
        if (hipsTrack) {
            console.log(`   ✅ Found root motion track: ${hipsTrack.name}. Zeroing X/Z.`);
            const values = hipsTrack.values;
            for(let i=0; i<values.length; i+=3) {
                values[i] = 0; // Remove X root motion
                values[i+2] = 0; // Remove Z root motion
            }
        } else {
            console.warn(`   ⚠️ No root motion track found for ${clip.name}`);
        }
      }
    };

    const ambient = new AmbientLight(0xFFFFFF, 1.25);
    this.add(ambient);

    const light = new DirectionalLight(0xFFFFFF, 1.25);

    light.position.set(0, 40, -10);
    this.add(light);

    // Load selected or default texture from JSON
    let selectedTexture = localStorage.getItem('selectedCaveTexture');
    if (!selectedTexture) {
      const data = await getCachedJson<any>('./assets/models/textures/textures.json');
      const defaultTex = data.textures.find((t: any) => t.default);
      selectedTexture = defaultTex ? defaultTex.file : 'cyberpunk-metal-2.jpeg';
    }
    const textureRepeat = parseFloat(localStorage.getItem('textureRepeat') || '8');
    const caveTexture = await this.loadCaveTexture(selectedTexture!);
    this.caveTexture = caveTexture;

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
    this.updateLoading(10);

    this.woodenCaveClone = this.woodenCave.clone();
    // Clone shares material and geometry, so no need to re-apply traversal

    const caveBox = new Box3().setFromObject(this.woodenCave);
    this.caveSize = caveBox.max.z - caveBox.min.z - 1;
    this.woodenCaveClone.position.z = this.woodenCave.position.z + this.caveSize;
    this.add(this.woodenCaveClone);

    this.barrelObject = await this.fbxLoader.loadAsync('../../assets/models/barrel.fbx');
    this.boxObject = await this.fbxLoader.loadAsync('../../assets/models/box.fbx');
    this.spikeObject = await this.fbxLoader.loadAsync('../../assets/models/spike.fbx');
    this.updateLoading(30);
    this.createLeftJumpObstacle();

    this.createLeftJumpObstacle();

    this.createCenterJumpObstacle();

    this.createRightJumpObstacle();

    this.createRightCenterObstacle();

    this.createLeftSlideObstacle();

    this.createCenterRightObstacle();

    this.createLeftCenterObstacle();

    this.createLeftRightObstacle();

    this.createCenterSlideObstacle();

    this.createRightSlideObstacle();

    this.coinObject = await this.fbxLoader.loadAsync('../../assets/models/coin.fbx');
    this.coinObject.rotation.set(90 * (Math.PI / 180), 0, 150 * (Math.PI / 180));
    this.updateLoading(45);
    this.generateLeftCenterRightCoins();

    this.generateLeftSideCoin();

    this.generateLeftandCenterCoins();

    this.generateCenterRightCoins();

    this.generateRightCoins();

    const gestureZone = (document.getElementById('app') as HTMLInputElement);
    
    // Debug Keys - Moved to document.onkeydown to prevent duplicates


    // Settings UI Logic
    const jumpHeightSlider = document.getElementById('jump-height-slider') as HTMLInputElement;
    const jumpHeightValue = document.getElementById('jump-height-value') as HTMLElement;
    const jumpSpeedUpSlider = document.getElementById('jump-speed-up-slider') as HTMLInputElement;
    const jumpSpeedUpValue = document.getElementById('jump-speed-up-value') as HTMLElement;
    const jumpSpeedDownSlider = document.getElementById('jump-speed-down-slider') as HTMLInputElement;
    const jumpSpeedDownValue = document.getElementById('jump-speed-down-value') as HTMLElement;
    const textureSelector = document.getElementById('texture-selector') as HTMLSelectElement;
    const textureRepeatSlider = document.getElementById('texture-repeat-slider') as HTMLInputElement;
    const textureRepeatValue = document.getElementById('texture-repeat-value') as HTMLElement;
    
    // Animation Config UI
    const animConfigContainer = document.getElementById('anim-config-container');
    if (animConfigContainer) {
        // Clear existing
        animConfigContainer.innerHTML = '';
        
        // Create selectors for each role
        ['run', 'jump', 'slide', 'stumble'].forEach(role => {
            const wrapper = document.createElement('div');
            wrapper.className = 'setting-item';
            wrapper.style.marginBottom = '10px';
            
            const label = document.createElement('label');
            label.innerText = role.toUpperCase() + ' Animation:';
            label.style.display = 'block';
            label.style.color = '#fff';
            label.style.marginBottom = '5px';
            
            const select = document.createElement('select');
            select.style.width = '100%';
            select.style.padding = '5px';
            select.style.background = 'rgba(0,0,0,0.5)';
            select.style.color = '#fff';
            select.style.border = '1px solid #444';
            
            // Populate with all available animations
            if (this.xbot && (this.xbot as any).animations) { // Assuming xbot is the loaded GLB scene wrapper
                 // We need access to the raw animations list here. 
                 // Since we are inside load(), we might need to store them or access via a property.
                 // For now, let's assume we can get them from the loaded character if it's GLB.
            }
            
            wrapper.appendChild(label);
            wrapper.appendChild(select);
            animConfigContainer.appendChild(wrapper);
        });
    }
    
    if (textureRepeatSlider) {
      const savedRepeat = localStorage.getItem('textureRepeat') || '22';
      textureRepeatSlider.value = savedRepeat;
      if (textureRepeatValue) textureRepeatValue.innerText = savedRepeat;
      console.log('🎚️ Texture repeat slider initialized with value:', savedRepeat);
      
      textureRepeatSlider.addEventListener('input', async (e) => {
        const val = parseFloat((e.target as HTMLInputElement).value);
        console.log('🎚️ Slider changed to:', val);
        if (textureRepeatValue) textureRepeatValue.innerText = val.toString();
        localStorage.setItem('textureRepeat', val.toString());
        
        const currentTexture = localStorage.getItem('selectedCaveTexture') || 'cyberpunk-metal-2.jpeg';
        console.log('🔄 Current texture:', currentTexture);
        if (currentTexture) {
          // Update both scenes
          await this.changeCaveTexture(currentTexture, val);
          if ((window as any).gameScenes?.mainMenu) {
            await (window as any).gameScenes.mainMenu.changeCaveTexture(currentTexture, val);
          }
        }
      });
    } else {
      console.warn('⚠️ Texture repeat slider element not found!');
    }
    
    // Load and populate texture dropdown
    if (textureSelector) {
      getCachedJson<any>('./assets/models/textures/textures.json')
        .then((data) => {
          let selectedTexture = localStorage.getItem('selectedCaveTexture');
          if (!selectedTexture) {
            // Default to Cyberpunk Metal 2
            selectedTexture = 'cyberpunk-metal-2.jpeg';
            localStorage.setItem('selectedCaveTexture', selectedTexture);
          }
          textureSelector.innerHTML = '';
          data.textures.forEach((tex: any) => {
            const option = document.createElement('option');
            option.value = tex.file;
            option.text = tex.name;
            if (tex.file === selectedTexture) option.selected = true;
            textureSelector.appendChild(option);
          });
        });
      
      textureSelector.addEventListener('change', async (e) => {
        const filename = (e.target as HTMLSelectElement).value;
        await this.changeCaveTexture(filename);
        
        // Also update MainMenuScene if available
        const scenes = (window as any).gameScenes;
        if (scenes && scenes.mainMenu && scenes.mainMenu.changeCaveTexture) {
          await scenes.mainMenu.changeCaveTexture(filename);
        }
      });
    }
    
    if (jumpHeightSlider) {
      jumpHeightSlider.addEventListener('input', (e) => {
        const val = parseInt((e.target as HTMLInputElement).value);
        this.valJumpHeight = val;
        if (jumpHeightValue) jumpHeightValue.innerText = val.toString();
        
        const demoInput = document.getElementById('demo-jump-height') as HTMLInputElement;
        if (demoInput) demoInput.value = val.toString();
        this.saveSettings();
      });
    }

    if (jumpSpeedUpSlider) {
      jumpSpeedUpSlider.addEventListener('input', (e) => {
        const val = parseFloat((e.target as HTMLInputElement).value);
        this.valJumpSpeedUp = val;
        if (jumpSpeedUpValue) jumpSpeedUpValue.innerText = val.toString();
        
        const demoInput = document.getElementById('demo-jump-speed-up') as HTMLInputElement;
        if (demoInput) demoInput.value = val.toString();
        this.saveSettings();
      });
    }

    if (jumpSpeedDownSlider) {
      jumpSpeedDownSlider.addEventListener('input', (e) => {
        const val = parseFloat((e.target as HTMLInputElement).value);
        this.valJumpSpeedDown = val;
        if (jumpSpeedDownValue) jumpSpeedDownValue.innerText = val.toString();
        
        const demoInput = document.getElementById('demo-jump-speed-down') as HTMLInputElement;
        if (demoInput) demoInput.value = val.toString();
        this.saveSettings();
      });
    }

    // Demo UI Logic
    const demoUI = document.getElementById('demo-ui');
    const demoHeightInput = document.getElementById('demo-jump-height') as HTMLInputElement;
    const demoSpeedUpInput = document.getElementById('demo-jump-speed-up') as HTMLInputElement;
    const demoSpeedDownInput = document.getElementById('demo-jump-speed-down') as HTMLInputElement;
    let demoTypingTimeout: any;

    if (this.isDemo && demoUI) {
      demoUI.style.display = 'block';
    }

    const updateSetting = (val: number, type: 'height' | 'speedUp' | 'speedDown') => {
       if (type === 'height') {
          this.valJumpHeight = val;
          if (jumpHeightSlider) jumpHeightSlider.value = val.toString();
          if (jumpHeightValue) jumpHeightValue.innerText = val.toString();
       } else if (type === 'speedUp') {
          this.valJumpSpeedUp = val;
          if (jumpSpeedUpSlider) jumpSpeedUpSlider.value = val.toString();
          if (jumpSpeedUpValue) jumpSpeedUpValue.innerText = val.toString();
       } else {
          this.valJumpSpeedDown = val;
          if (jumpSpeedDownSlider) jumpSpeedDownSlider.value = val.toString();
          if (jumpSpeedDownValue) jumpSpeedDownValue.innerText = val.toString();
       }
       this.saveSettings();
       
       Toastify({
          text: `${type} Updated: ${val}`,
          duration: 2000,
          style: { background: "#BA4D31" }
       }).showToast();
    };

    if (demoHeightInput) {
      demoHeightInput.addEventListener('input', (e) => {
        updateSetting(parseInt((e.target as HTMLInputElement).value), 'height');
      });
    }

    if (demoSpeedUpInput) {
      demoSpeedUpInput.addEventListener('input', (e) => {
        updateSetting(parseFloat((e.target as HTMLInputElement).value), 'speedUp');
      });
    }

    if (demoSpeedDownInput) {
      demoSpeedDownInput.addEventListener('input', (e) => {
        updateSetting(parseFloat((e.target as HTMLInputElement).value), 'speedDown');
      });
    }

    if (!this.isGameOver && !this.isGamePaused) {
      gestureZone.addEventListener('touchstart', (event) => {
        event.preventDefault();
        this.touchstartX = event.changedTouches[0].screenX;
        this.touchstartY = event.changedTouches[0].screenY;
      }, { passive: false });

      gestureZone.addEventListener('touchend', (event) => {
        event.preventDefault();
        this.touchendX = event.changedTouches[0].screenX;
        this.touchendY = event.changedTouches[0].screenY;
        this.handleTouch();
      }, { passive: false });
    }

    // Force update to ensure Flash is the default character
    localStorage.setItem('allGameCharacters', JSON.stringify(allCharacters));
    this.allGameCharacters = allCharacters;

    console.log('📋 [Running] All characters:', this.allGameCharacters.map(c => ({ name: c.name, isActive: c.isActive })));

    const activeChar = this.allGameCharacters[0];
    console.log('🎯 [Running] Using character:', activeChar.name, 'isGlb:', activeChar.isGlb);

    // Load character model
    if (activeChar.isGlb) {
      console.log('🎮 Loading GLB character:', activeChar.name);
      const gltf = await loadCachedGltf(activeChar.model);
      
      // Create a wrapper for the character so we can rotate the model independently of the hitbox
      const wrapper = new Object3D();
      wrapper.add(gltf.scene);
      this.xbot = wrapper;
      
      // Store reference to the actual model for animation/rotation
      (this.xbot as any).modelMesh = gltf.scene;

      console.log('✅ Loaded GLB character, animations:', gltf.animations.length);
      
      this.updateLoading(13);
      
      // Try to load config
      try {
        const configPath = activeChar.model.replace('.glb', '-config.json');
        const response = await fetch(configPath);
        if (response.ok) {
          this.characterConfig = await response.json();
          console.log('📋 Loaded character config:', this.characterConfig);
        }
      } catch (e) {
        console.log('⚠️ No character config found, using auto-detection');
      }

      // Classify animations
      const anims = gltf.animations;
      
      // Rename duplicates (Option C)
      const nameCounts: Record<string, number> = {};
      anims.forEach(clip => {
        const originalName = clip.name;
        if (nameCounts[originalName]) {
            nameCounts[originalName]++;
            clip.name = `${originalName}_${nameCounts[originalName]}`;
        } else {
            nameCounts[originalName] = 1;
        }
      });
      
      console.log('🎞️ Available Animations:', anims.map(a => a.name).join(', '));

      const roles: Record<string, AnimationClip[]> = {
        run: [],
        jump: [],
        slide: [],
        stumble: []
      };

      anims.forEach(clip => {
        const name = clip.name.toLowerCase();
        if (name.includes('run')) roles.run.push(clip);
        else if (name.includes('jump')) roles.jump.push(clip);
        else if (name.includes('slide')) roles.slide.push(clip);
        else if (name.includes('stumble') || name.includes('death')) roles.stumble.push(clip);
      });

      // Fallbacks - if no specific match, use the first available or a default
      const defaultClip = anims[0];
      const getClip = (role: string) => {
        // 1. Config preference
        if (this.characterConfig && this.characterConfig.roles && this.characterConfig.roles[role]) {
            const pref = this.characterConfig.roles[role].toLowerCase();
            // Try exact match first, then includes
            const exact = anims.find(c => c.name.toLowerCase() === pref);
            if (exact) return exact;
            const match = anims.find(c => c.name.toLowerCase().includes(pref));
            if (match) return match;
        }
        // 2. Auto-detected list
        if (roles[role].length > 0) return roles[role][0];
        // 3. Fallback
        return defaultClip;
      };

      const runClip = getClip('run');
      const jumpClip = getClip('jump');
      const slideClip = getClip('slide');
      const stumbleClip = getClip('stumble');

      // Output JSON config suggestion
      const suggestedConfig = {
        roles: {
            run: runClip.name,
            jump: jumpClip.name,
            slide: slideClip.name,
            stumble: stumbleClip.name
        },
        orientation: {
            rotationX: 0,
            rotationY: 3.232,
            rotationZ: 0.12,
            scale: 0.1,
            positionY: -35,
            modelLocalY: 90,
            autoGround: false
        }
      };
      console.log('📋 Suggested Config (save to ' + activeChar.model.replace('.glb', '-config.json') + '):', JSON.stringify(suggestedConfig, null, 2));

      // Populate UI Selectors if they exist
      const animConfigContainer = document.getElementById('anim-config-container');
      if (animConfigContainer) {
          animConfigContainer.innerHTML = ''; // Clear again to be safe
          
          // Y Offset Slider REMOVED as requested

          const roles = ['run', 'jump', 'slide', 'stumble'];
          
          roles.forEach(role => {
            const wrapper = document.createElement('div');
            wrapper.className = 'setting-item';
            wrapper.style.marginBottom = '10px';
            
            const label = document.createElement('label');
            label.innerText = role.toUpperCase();
            label.style.display = 'block';
            label.style.color = '#00ff00';
            label.style.fontSize = '12px';
            
            const select = document.createElement('select');
            select.style.width = '100%';
            select.style.padding = '4px';
            select.style.background = '#333';
            select.style.color = '#fff';
            select.style.border = '1px solid #555';
            
            // Add options
            const defaultOpt = document.createElement('option');
            defaultOpt.value = "";
            defaultOpt.text = "Select GLB...";
            select.appendChild(defaultOpt);

            this.availableGlbFiles.forEach(f => {
                const option = document.createElement('option');
                option.value = f;
                option.text = f;
                select.appendChild(option);
            });
            
            // Change handler
            select.addEventListener('change', async (e) => {
                const filename = (e.target as HTMLSelectElement).value;
                if (!filename) return;
                
                console.log(`🔄 Loading ${role} anim from ${filename}`);
                
                try {
                    const path = `./assets/2025/${filename}`;
                    let loadedObject: Object3D;
                    let newClip: AnimationClip | undefined;

                    if (filename.toLowerCase().endsWith('.glb') || filename.toLowerCase().endsWith('.gltf')) {
                        const gltf = await this.glbLoader.loadAsync(path);
                        if (gltf.animations.length > 0) newClip = gltf.animations[0];
                    } else {
                        loadedObject = await this.fbxLoader.loadAsync(path);
                        if (loadedObject.animations.length > 0) newClip = loadedObject.animations[0];
                    }

                    if (newClip) {
                        // Clean anim logic inline
                        console.log(`🧹 Cleaning loaded animation: ${newClip.name}`);
                        newClip.tracks = newClip.tracks.filter((t: any) =>
                          !t.name.endsWith('.position') || t.name.toLowerCase().includes('hips') || t.name.toLowerCase().includes('root')
                        );

                        // Fix for side-to-side looping drift: Zero out X and Z on hips
                        const hipsTrack = newClip.tracks.find((t: any) => 
                            (t.name.toLowerCase().includes('hips') || t.name.toLowerCase().includes('root'))
                            && t.name.endsWith('.position')
                        );
                        
                        if (hipsTrack) {
                            console.log(`   ✅ Found root motion track: ${hipsTrack.name}. Zeroing X/Z.`);
                            const values = hipsTrack.values;
                            for(let i=0; i<values.length; i+=3) {
                                values[i] = 0; // Remove X root motion
                                values[i+2] = 0; // Remove Z root motion
                            }
                        }

                        if (role === 'run') {
                            this.xbotRunningAnimation = new Object3D();
                            (this.xbotRunningAnimation as any).animations = [newClip];
                            if (this.currentAnimation === this.runningAnimation) {
                                 this.runningAnimation.stop();
                                 this.runningAnimation = this.animationMixer.clipAction(newClip);
                                 this.runningAnimation.play();
                                 this.currentAnimation = this.runningAnimation;
                            } else {
                                 this.runningAnimation = this.animationMixer.clipAction(newClip);
                            }
                        } else if (role === 'jump') {
                            this.xbotJumpingAnimation = new Object3D();
                            (this.xbotJumpingAnimation as any).animations = [newClip];
                            this.jumpingAnimation = this.animationMixer.clipAction(newClip);
                        } else if (role === 'slide') {
                            this.xbotSlidingAnimation = new Object3D();
                            (this.xbotSlidingAnimation as any).animations = [newClip];
                            this.slidingAnimation = this.animationMixer.clipAction(newClip);
                        } else if (role === 'stumble') {
                            this.xbotStumbleAnimation = new Object3D();
                            (this.xbotStumbleAnimation as any).animations = [newClip];
                            this.stumbleAnimation = this.animationMixer.clipAction(newClip);
                        }
                        Toastify({ text: `Loaded ${role} anim from ${filename}`, duration: 2000 }).showToast();
                    } else {
                        Toastify({ text: `No animations found in ${filename}`, duration: 2000, style: { background: "red" } }).showToast();
                    }
                } catch (err) {
                    console.error(err);
                    Toastify({ text: `Failed to load ${filename}`, duration: 2000, style: { background: "red" } }).showToast();
                }
            });
            
            wrapper.appendChild(label);
            wrapper.appendChild(select);
            animConfigContainer.appendChild(wrapper);
          });
          
          // Save Button Removed as requested
      }
      
      // For GLB, create Object3D wrappers with animations array
      const runAnimWrapper = new Object3D();
      runAnimWrapper.animations = [runClip];
      cleanAnim(runAnimWrapper);
      this.xbotRunningAnimation = runAnimWrapper as any;
      this.updateLoading(60);
      
      const jumpAnimWrapper = new Object3D();
      jumpAnimWrapper.animations = [jumpClip];
      cleanAnim(jumpAnimWrapper);
      this.xbotJumpingAnimation = jumpAnimWrapper as any;
      this.updateLoading(65);
      
      const slideAnimWrapper = new Object3D();
      slideAnimWrapper.animations = [slideClip];
      cleanAnim(slideAnimWrapper);
      this.xbotSlidingAnimation = slideAnimWrapper as any;
      this.updateLoading(70);
      
      const stumbleAnimWrapper = new Object3D();
      stumbleAnimWrapper.animations = [stumbleClip];
      cleanAnim(stumbleAnimWrapper);
      this.xbotStumbleAnimation = stumbleAnimWrapper as any;
    } else {
      console.log('🎮 Loading FBX character:', activeChar.name);
      this.xbot = await loadCachedFbx(activeChar.model);
      this.updateLoading(13);

      this.xbotRunningAnimation = await loadCachedFbx(activeChar.runAnimation);
      cleanAnim(this.xbotRunningAnimation);
      this.updateLoading(14);

      this.xbotJumpingAnimation = await loadCachedFbx(activeChar.jumpAnimation);
      cleanAnim(this.xbotJumpingAnimation);
      this.updateLoading(15);

      this.xbotSlidingAnimation = await loadCachedFbx(activeChar.slideAnimation);
      cleanAnim(this.xbotSlidingAnimation);
      this.updateLoading(16);

      this.xbotStumbleAnimation = await loadCachedFbx(activeChar.stumbleAnimation);
    }
    cleanAnim(this.xbotStumbleAnimation);

    this.updateLoading(17);

    // [2]=Jolleen, [3]=Peasant Girl (Flash is [0], Xbot is [1])
    this.jolleen = await loadCachedFbx(this.allGameCharacters[2].model);
    this.jolleenRunningAnimation = await loadCachedFbx(this.allGameCharacters[2]
      .runAnimation);
    cleanAnim(this.jolleenRunningAnimation);

    this.updateLoading(18);

    this.jolleenJumpingAnimation = await loadCachedFbx(this.allGameCharacters[2]
      .jumpAnimation);
    cleanAnim(this.jolleenJumpingAnimation);

    this.updateLoading(85);

    this.jolleenSlidingAnimation = await loadCachedFbx(this.allGameCharacters[2]
      .slideAnimation);
    cleanAnim(this.jolleenSlidingAnimation);

    this.updateLoading(90);

    this.jolleenStumbleAnimation = await loadCachedFbx(this.allGameCharacters[2]
      .stumbleAnimation);
    cleanAnim(this.jolleenStumbleAnimation);

    this.updateLoading(95);

    this.peasantGirl = await loadCachedFbx(this.allGameCharacters[3].model);
    this.peasantGirlRunningAnimation = await loadCachedFbx(this.allGameCharacters[3]
      .runAnimation);
    cleanAnim(this.peasantGirlRunningAnimation);
    this.updateLoading(98);

    this.peasantGirlJumpingAnimation = await loadCachedFbx(this.allGameCharacters[3]
      .jumpAnimation);
    cleanAnim(this.peasantGirlJumpingAnimation);

    this.updateLoading(99);

    this.peasantGirlSlidingAnimation = await loadCachedFbx(this.allGameCharacters[3]
      .slideAnimation);
    cleanAnim(this.peasantGirlSlidingAnimation);

    this.updateLoading(100);

    this.peasantGirlStumbleAnimation = await loadCachedFbx(this.allGameCharacters[3]
      .stumbleAnimation);
    cleanAnim(this.peasantGirlStumbleAnimation);
    this.updateLoading(100);
    this.xbot.visible = false;
    this.jolleen.visible = false;
    this.peasantGirl.visible = false;

    this.charactersContainer.push(this.xbot, this.jolleen, this.peasantGirl);

    this.add(this.xbot);
    this.add(this.jolleen);
    this.add(this.peasantGirl);

    this.runningAnimationsContainer.push(
      this.xbotRunningAnimation,
      this.jolleenRunningAnimation,
      this.peasantGirlRunningAnimation,
    );
    this.jumpingAnimationsContainer.push(
      this.xbotJumpingAnimation,
      this.jolleenJumpingAnimation,
      this.peasantGirlJumpingAnimation,
    );
    this.slidingAnimationsContainer.push(
      this.xbotSlidingAnimation,
      this.jolleenSlidingAnimation,
      this.peasantGirlSlidingAnimation,
    );
    this.stumbleAnimationsContainer.push(
      this.xbotStumbleAnimation,
      this.jolleenStumbleAnimation,
      this.peasantGirlStumbleAnimation,
    );
    this.loaded = true;
    })();
    return this.loadingPromise;
  }

  public warmUp(renderer: WebGLRenderer, camera: PerspectiveCamera) {
    if (!this.loaded) return;

    // Temporarily make characters visible for shader compilation
    this.charactersContainer.forEach(c => c.visible = true);
    
    // Force full render to offscreen target to ensure textures are uploaded to GPU
    const renderTarget = new WebGLRenderTarget(128, 128); // Small target
    const originalTarget = renderer.getRenderTarget();
    
    renderer.setRenderTarget(renderTarget);
    renderer.render(this, camera);
    renderer.setRenderTarget(originalTarget);
    
    renderTarget.dispose();
    
    this.charactersContainer.forEach(c => c.visible = false);
    console.log('🔥 [RunningScene] WarmUp complete (GPU Upload forced)');
  }


  private async loadCharacterFrom2025(filename: string) {
      try {
          console.log(`Loading character: ${filename}`);
          const path = `./assets/2025/${filename}`;
          
          let loadedObject: Object3D;
          if (filename.toLowerCase().endsWith('.glb') || filename.toLowerCase().endsWith('.gltf')) {
              const gltf = await this.glbLoader.loadAsync(path);
              loadedObject = gltf.scene;
          } else {
              loadedObject = await this.fbxLoader.loadAsync(path);
          }

          // Clear current player children (visuals) and add new one
          // Note: This assumes this.player is the container.
          // If this.player has other children (like camera target?), we should be careful.
          // But based on `this.add(this.xbot)`, `this.player = this.xbot`, `this.player` IS the model.
          // So we can't just clear it if it IS the model.
          // We need to replace the geometry/material or add the new model as a child and hide the old one?
          // Or better: `this.player.add(loadedObject)` and hide original children?
          
          // Since `this.player` is assigned to `this.xbot` (which is a Group/Object3D loaded from FBX),
          // we can add the new model to it.
          
          this.player.children.forEach(c => c.visible = false); // Hide existing
          this.player.add(loadedObject);
          
          // Reset scale if needed, as xbot might be scaled.
          // loadedObject.scale.set(1, 1, 1); 

          Toastify({ text: `Loaded ${filename}`, duration: 2000 }).showToast();

      } catch (e) {
          console.error(e);
          Toastify({ text: `Failed to load ${filename}`, duration: 2000, style: { background: "red" } }).showToast();
      }
  }

  private setupDemoUI() {
    // Jump Settings
    const jumpHeightSlider = document.getElementById('demo-jump-height') as HTMLInputElement;
    const jumpSpeedUpSlider = document.getElementById('demo-jump-speed-up') as HTMLInputElement;
    const jumpSpeedDownSlider = document.getElementById('demo-jump-speed-down') as HTMLInputElement;

    const setupInput = (input: HTMLInputElement, callback: (val: number) => void) => {
        if (!input) return;
        input.addEventListener('input', (e) => {
            const val = parseFloat((e.target as HTMLInputElement).value);
            callback(val);
            this.saveSettings();
        });
        // Arrow keys support
        input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                // e.preventDefault(); // Don't prevent default to allow cursor movement? No, for number input it increments.
                // But we want custom increment if step is not enough or for text inputs.
                // For type="number", arrow keys work natively.
                // But user asked: "if input is in focus, I can use keyboard up/down arrows to icrement the number"
                // Native number input does this.
                // But let's ensure it triggers the callback.
                // 'input' event should fire on arrow key change in modern browsers.
            }
        });
    };

    setupInput(jumpHeightSlider, (val) => this.valJumpHeight = val);
    setupInput(jumpSpeedUpSlider, (val) => this.valJumpSpeedUp = val);
    setupInput(jumpSpeedDownSlider, (val) => this.valJumpSpeedDown = val);

    // Character Tweaks
    const planePosXSlider = document.getElementById('plane-pos-x-slider') as HTMLInputElement;
    const planePosXInput = document.getElementById('plane-pos-x-input') as HTMLInputElement;
    const planePosYSlider = document.getElementById('plane-pos-y-slider') as HTMLInputElement;
    const planePosYInput = document.getElementById('plane-pos-y-input') as HTMLInputElement;
    const planePosZSlider = document.getElementById('plane-pos-z-slider') as HTMLInputElement;
    const planePosZInput = document.getElementById('plane-pos-z-input') as HTMLInputElement;

    const modelTiltSlider = document.getElementById('model-tilt-slider') as HTMLInputElement;
    const modelTiltInput = document.getElementById('model-tilt-input') as HTMLInputElement;
    const modelSpinSlider = document.getElementById('model-spin-slider') as HTMLInputElement;
    const modelSpinInput = document.getElementById('model-spin-input') as HTMLInputElement;
    const modelYSlider = document.getElementById('model-y-slider') as HTMLInputElement;
    const modelYInput = document.getElementById('model-y-input') as HTMLInputElement;

    const logCurrentSettings = () => {
        const settings = {
            plane: { x: this.planePosX, y: this.planePosY, z: this.planePosZ },
            hitbox: { pos: this.hitboxPos, scale: this.hitboxScale },
            model: { pos: { x: this.modelPosX, y: this.modelPosY, z: this.modelPosZ }, rot: { tilt: this.modelTilt, spin: this.modelSpin } },
            jump: { height: this.valJumpHeight, speedUp: this.valJumpSpeedUp, speedDown: this.valJumpSpeedDown }
        };
        console.log('⚙️ Current Settings:', JSON.stringify(settings, null, 2));
    };

    const setupInputById = (id: string, callback: (val: number) => void) => {
        const input = document.getElementById(id) as HTMLInputElement;
        if (!input) return;
        input.addEventListener('input', (e) => {
            const val = parseFloat((e.target as HTMLInputElement).value);
            callback(val);
            logCurrentSettings();
        });
    };

    // Plane (Container)
    setupInputById('plane-pos-x-input', (val) => this.planePosX = val);
    setupInputById('plane-pos-y-input', (val) => this.planePosY = val);
    setupInputById('plane-pos-z-input', (val) => this.planePosZ = val);

    // Hitbox (Wireframe/Physics)
    setupInputById('hitbox-pos-x-input', (val) => this.hitboxPos.x = val);
    setupInputById('hitbox-pos-y-input', (val) => this.hitboxPos.y = val);
    setupInputById('hitbox-pos-z-input', (val) => this.hitboxPos.z = val);
    setupInputById('hitbox-scale-x-input', (val) => this.hitboxScale.x = val);
    setupInputById('hitbox-scale-y-input', (val) => this.hitboxScale.y = val);
    setupInputById('hitbox-scale-z-input', (val) => this.hitboxScale.z = val);

    // Model (Visuals)
    setupInputById('model-pos-x-input', (val) => this.modelPosX = val);
    setupInputById('model-y-input', (val) => this.modelPosY = val);
    setupInputById('model-pos-z-input', (val) => this.modelPosZ = val);
    setupInputById('model-tilt-input', (val) => this.modelTilt = val);
    setupInputById('model-spin-input', (val) => this.modelSpin = val);

    // Initialize inputs with default values
    const setVal = (id: string, val: number) => {
        const el = document.getElementById(id) as HTMLInputElement;
        if (el) el.value = val.toString();
    };
    setVal('plane-pos-x-input', this.planePosX);
    setVal('plane-pos-y-input', this.planePosY);
    setVal('plane-pos-z-input', this.planePosZ);
    setVal('hitbox-pos-x-input', this.hitboxPos.x);
    setVal('hitbox-pos-y-input', this.hitboxPos.y);
    setVal('hitbox-pos-z-input', this.hitboxPos.z);
    setVal('hitbox-scale-x-input', this.hitboxScale.x);
    setVal('hitbox-scale-y-input', this.hitboxScale.y);
    setVal('hitbox-scale-z-input', this.hitboxScale.z);
    setVal('model-pos-x-input', this.modelPosX);
    setVal('model-y-input', this.modelPosY);
    setVal('model-pos-z-input', this.modelPosZ);
    setVal('model-tilt-input', this.modelTilt);
    setVal('model-spin-input', this.modelSpin);

    // Collapsible Sections
    const setupCollapsible = (btnId: string, contentId: string) => {
        const btn = document.getElementById(btnId);
        const content = document.getElementById(contentId);
        if (btn && content) {
            btn.onclick = () => {
                const isHidden = content.style.display === 'none';
                content.style.display = isHidden ? 'block' : 'none';
                btn.innerText = btn.innerText.replace(isHidden ? '▼' : '▲', isHidden ? '▲' : '▼');
            };
        }
    };
    setupCollapsible('jump-settings-btn', 'jump-settings-content');
    setupCollapsible('char-tweaks-btn', 'char-tweaks-content');
    setupCollapsible('char-select-btn', 'char-select-content');

    // Character Select
    const charSelect = document.getElementById('char-select-dropdown') as HTMLSelectElement;
    const loadCharBtn = document.getElementById('load-char-btn');
    
    // Populate dropdown
    const populateChars = async () => {
        if (!charSelect) return;
        charSelect.innerHTML = '<option value="">Select Character...</option>';
        
        this.availableGlbFiles.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.text = c;
            charSelect.appendChild(opt);
        });
    };
    populateChars();

    if (loadCharBtn && charSelect) {
        loadCharBtn.onclick = async () => {
            const selected = charSelect.value;
            if (selected) {
                await this.loadCharacterFrom2025(selected);
            }
        };
    }
  }

  initialize() {
    document.onkeydown = (e) => {
      if (!this.visible) return;

      // Debug Keys (Always active)
      if (e.key.toLowerCase() === 'v') {
        this.toggleHitboxes();
      }
      if (e.key.toLowerCase() === 'c') {
         this.isInvulnerable = !this.isInvulnerable;
         Toastify({ 
           text: `Invulnerability: ${this.isInvulnerable ? 'ON' : 'OFF'}`, 
           duration: 2000,
           style: { background: this.isInvulnerable ? "green" : "red" }
         }).showToast();
      }

      if (!this.isGameOver && !this.isGamePaused) {
        if (e.key === 'ArrowLeft') {
          this.moveLeft();
        } if (e.key === 'ArrowRight') {
          this.moveRight();
        }
        if (e.key === 'ArrowUp') {
          this.jump();
        }
        if (e.key === 'ArrowDown') {
          this.slide();
        }
        if (e.key === ' ') {
          this.pauseAndResumeGame();
        }
      }
      
      // Rotation and position adjustment controls (work in play and demo mode)
      if (this.player && this.visible) {
        const rotationStep = 0.01;
        const positionStep = 0.5;
        const activeChar = this.allGameCharacters[this.activePlayerIndex];
        
        if (e.key === 'n' || e.key === 'N') {
          this.player.rotation.z -= rotationStep;
          if (activeChar.isGlb) localStorage.setItem('glbRotationZ', this.player.rotation.z.toString());
          console.log('🔄 Rotation Z:', (this.player.rotation.z * 180 / Math.PI).toFixed(2), 'degrees');
        } else if (e.key === 'm' || e.key === 'M') {
          this.player.rotation.z += rotationStep;
          if (activeChar.isGlb) localStorage.setItem('glbRotationZ', this.player.rotation.z.toString());
          console.log('🔄 Rotation Z:', (this.player.rotation.z * 180 / Math.PI).toFixed(2), 'degrees');
        } else if (e.key === 'o' || e.key === 'O') {
          this.player.rotation.y -= rotationStep;
          this.baseRotationY = this.player.rotation.y; // Update base rotation
          if (activeChar.isGlb) localStorage.setItem('glbRotationY', this.player.rotation.y.toString());
          console.log('🔄 Rotation Y (spin):', (this.player.rotation.y * 180 / Math.PI).toFixed(2), 'degrees');
        } else if (e.key === 'p' || e.key === 'P') {
          this.player.rotation.y += rotationStep;
          this.baseRotationY = this.player.rotation.y; // Update base rotation
          if (activeChar.isGlb) localStorage.setItem('glbRotationY', this.player.rotation.y.toString());
          console.log('🔄 Rotation Y (spin):', (this.player.rotation.y * 180 / Math.PI).toFixed(2), 'degrees');
        }
      }
    };

    this.setupDemoUI();
    this.allGameCharacters = (JSON.parse(localStorage.getItem('allGameCharacters')!));

    // Random Runner ID
    const runnerId = 'NK-' + Math.floor(1000 + Math.random() * 9000);
    const runnerIdEl = document.getElementById('runner-id-display');
    if (runnerIdEl) runnerIdEl.innerText = runnerId;

    this.elapsedTime = 0;
    this.meters = 0;

    // Show Play HUD, Hide Start Screen Stats
    const playHud = document.getElementById('play-hud');
    if (playHud) playHud.classList.remove('hidden');
    
    const startStats = document.getElementById('start-screen-stats');
    if (startStats) startStats.classList.add('hidden');

    // Update Total Coins & High Score displays for Start Screen (if needed later)
    const totalCoinsEl = document.getElementById('total-coins-display');
    if (totalCoinsEl) totalCoinsEl.innerText = localStorage.getItem('total-coins') || '0';
    
    const highScoreEl = document.getElementById('high-score-display');
    if (highScoreEl) highScoreEl.innerText = (localStorage.getItem('high-score') || '0');

    this.activePlayerIndex = this.allGameCharacters
      .findIndex((character) => character.isActive === true);

    this.player = this.charactersContainer[this.activePlayerIndex];
    this.player.position.z = -110;
    this.player.position.x = 0;
    this.player.scale.set(0.1, 0.1, 0.1);
    
    // Apply rotation - check if GLB model needs different rotation
    const activeChar = this.allGameCharacters[this.activePlayerIndex];
    if (activeChar.isGlb) {
      // Default rotation and position for Flash
      let defaultRotX = 0; // X rotation to stand upright
      let defaultRotZ = 0.12; // 6.88 degrees
      let defaultRotY = 3.232; // 185.16 degrees (same as start screen)
      let defaultScale = 0.1;
      let defaultPosY = -35;
      let modelLocalY = 90; // Local Y offset of model within wrapper (center with playerBox)

      // Apply from config if available
      if (this.characterConfig && this.characterConfig.orientation) {
          const o = this.characterConfig.orientation;
          if (o.rotationX !== undefined) defaultRotX = o.rotationX;
          if (o.rotationZ !== undefined) defaultRotZ = o.rotationZ;
          if (o.rotationY !== undefined) defaultRotY = o.rotationY;
          if (o.scale !== undefined) defaultScale = o.scale;
          if (o.positionY !== undefined) defaultPosY = o.positionY;
          if (o.modelLocalY !== undefined) modelLocalY = o.modelLocalY;
          console.log('✅ [Running] Applied orientation from config');
      }
      
      // For GLB models, we now have a wrapper.
      // this.player is the wrapper.
      // (this.player as any).modelMesh is the actual GLB scene.
      
      // 1. Reset Wrapper Rotation (Hitbox should be upright)
      this.player.rotation.set(0, 0, 0); 
      
      // 2. Apply Rotation and Position to Inner Model Only
      const innerModel = (this.player as any).modelMesh;
      if (innerModel) {
          // Start with defaults matching MainMenuScene
          let finalRotY = defaultRotY;
          let finalRotZ = defaultRotZ;
          
          // Apply saved adjustments from start screen (overrides defaults)
          const savedRotZ = localStorage.getItem('glbRotationZ');
          const savedRotY = localStorage.getItem('glbRotationY');
          if (savedRotZ) finalRotZ = parseFloat(savedRotZ);
          if (savedRotY) finalRotY = parseFloat(savedRotY);
          
          // Match MainMenuScene exactly: rotation.set(rotX, rotY, rotZ)
          // Add 180° spin to face forward in running scene
          innerModel.rotation.set(0, finalRotY + Math.PI, finalRotZ);
          
          // Position the model vertically within the wrapper
          innerModel.position.y = modelLocalY;
          
          // Ensure model is visible
          innerModel.visible = true;
          
          console.log(`🔧 [Model Setup] Rot(0, ${finalRotY.toFixed(3)}, ${finalRotZ.toFixed(3)}), LocalY: ${modelLocalY}`);
      }
      
      // 3. Apply Scale to Wrapper (affects hitbox size too, which is what we want usually)
      this.player.scale.set(defaultScale, defaultScale, defaultScale);
      
      // 4. Position
      this.player.position.y = defaultPosY;
      this.player.updateMatrixWorld(true);

      // Debug: Log the exact world position of the mesh vs the container
      const worldPos = new Vector3();
      this.player.getWorldPosition(worldPos);
      console.log(`📍 [Position Debug] Container Y: ${this.player.position.y}, World Y: ${worldPos.y}`);
      
      // Apply saved adjustments from start screen (overrides config)
      /*
      const savedRotZ = localStorage.getItem('glbRotationZ');
      const savedRotY = localStorage.getItem('glbRotationY');
      if (savedRotZ) {
        this.player.rotation.z = parseFloat(savedRotZ);
        console.log('✅ [Running] Applied saved rotation Z:', savedRotZ);
      }
      if (savedRotY) {
        this.player.rotation.y = parseFloat(savedRotY);
        this.baseRotationY = this.player.rotation.y; // Store base rotation
        console.log('✅ [Running] Applied saved rotation Y:', savedRotY);
      } else {
        this.baseRotationY = defaultRotY;
      }
      
      console.log('✅ [Running] Applied GLB rotation fix');
      */
    } else {
      this.player.position.y = -35;
      this.player.rotation.y = 180 * (Math.PI / 180);
      this.baseRotationY = this.player.rotation.y;
    }
    
    this.player.visible = true;

    this.playerBox.visible = false; // Hidden by default, toggle with 'V' key
    this.playerBox.scale.set(50, 200, 20);
    this.playerBox.position.set(0, 90, 0);
    this.player.add(this.playerBox);

    // Add BoxHelper to visualize the actual model bounds (not the wrapper)
    if (activeChar.isGlb && (this.player as any).modelMesh) {
      const modelHelper = new BoxHelper((this.player as any).modelMesh, 0xffff00);
      modelHelper.name = 'debug-model-bounds';
      modelHelper.visible = false; // Hidden by default, toggle with 'V'
      this.player.add(modelHelper); // Add to player so it transforms with it
      this.hitboxHelpers.push(modelHelper);
    } else {
      const modelHelper = new BoxHelper(this.player, 0xffff00);
      modelHelper.name = 'debug-model-bounds';
      modelHelper.visible = false; // Hidden by default, toggle with 'V'
      this.add(modelHelper);
      this.hitboxHelpers.push(modelHelper);
    }

    this.animationMixer = new AnimationMixer(this.player);

    const runningAnimationObject = this.runningAnimationsContainer[this.activePlayerIndex];

    this.runningAnimation = this.animationMixer.clipAction(runningAnimationObject.animations[0]);
    this.runningAnimation.setLoop(LoopRepeat, Infinity); // Always loop infinitely
    this.runningAnimation.timeScale = 1.0; // Ensure normal playback speed
    this.runningAnimation.clampWhenFinished = false; // Don't clamp, let it loop
    this.currentAnimation = this.runningAnimation;
    this.currentAnimation.reset();
    this.currentAnimation.play();

    // Force initial mixer update to prevent T-pose/pop-in
    if (this.animationMixer) {
      this.animationMixer.update(0.016); // Simulate 1 frame (16ms)
    }
    this.player.updateMatrixWorld(true);

    const jumpingAnimationObject = this.jumpingAnimationsContainer[this.activePlayerIndex];
    this.jumpingAnimation = this.animationMixer.clipAction(jumpingAnimationObject.animations[0]);

    const slidingAnimationObject = this.slidingAnimationsContainer[this.activePlayerIndex];
    this.slidingAnimation = this.animationMixer.clipAction(slidingAnimationObject.animations[0]);

    const stumblingAnimationObject = this.stumbleAnimationsContainer[this.activePlayerIndex];
    this.stumbleAnimation = this.animationMixer.clipAction(stumblingAnimationObject.animations[0]);

    // (document.querySelector('.hud-stats-container') as HTMLInputElement).style.display = 'flex'; // Removed old selector
    
    // Reset HUD labels for Gameplay
    const coinLabel = document.getElementById('hud-coin-label');
    if (coinLabel) coinLabel.innerText = 'CREDITS';
    
    const scoreLabel = document.getElementById('hud-score-label');
    if (scoreLabel) scoreLabel.innerText = 'SCORE';

    // Show extra info (Combo/Zone)
    const extraInfo = document.querySelector('.hud-extra-info') as HTMLElement;
    if (extraInfo) extraInfo.style.display = 'flex';

    this.cacheHudElements();
    this.setScoreText('0');
    this.setCoinsText('0');

    // (document.querySelector('.pause-button') as HTMLInputElement).style.display = 'block'; // Removed old selector

    // (document.querySelector('.pause-button') as HTMLInputElement).onclick = () => { // Removed old selector
    const pauseBtn = document.getElementById('pause-game-button');
    if (pauseBtn) {
      pauseBtn.onclick = () => {
        this.pauseAndResumeGame();
      };
    }

    (document.getElementById('resume-button') as HTMLInputElement).onclick = () => {
      this.pauseAndResumeGame();
    };
    (document.getElementById('restart-button') as HTMLInputElement).onclick = () => {
      this.restartGame();
    };
    setTimeout(() => {
      this.isPlayerHeadStart = true;
    }, 3000);

    if (!this.visible) {
      this.visible = true;
    }
    
    // Reset states
    this.isGameOver = false;
    this.isGamePaused = false;
    this.clock.start();
    this.speed = 220;
    this.isPlayerHeadStart = false;
    
    (document.querySelector('.disable-touch') as HTMLInputElement).style.display = 'none';
    
    // Load settings from localStorage
    this.loadSettings();
    
    // Update UI elements if they exist
    const jumpHeightSlider = document.getElementById('jump-height-slider') as HTMLInputElement;
    const jumpHeightValue = document.getElementById('jump-height-value') as HTMLElement;
    const jumpSpeedUpSlider = document.getElementById('jump-speed-up-slider') as HTMLInputElement;
    const jumpSpeedUpValue = document.getElementById('jump-speed-up-value') as HTMLElement;
    const jumpSpeedDownSlider = document.getElementById('jump-speed-down-slider') as HTMLInputElement;
    const jumpSpeedDownValue = document.getElementById('jump-speed-down-value') as HTMLElement;
    
    if (jumpHeightSlider) jumpHeightSlider.value = this.valJumpHeight.toString();
    if (jumpHeightValue) jumpHeightValue.innerText = this.valJumpHeight.toString();
    if (jumpSpeedUpSlider) jumpSpeedUpSlider.value = this.valJumpSpeedUp.toString();
    if (jumpSpeedUpValue) jumpSpeedUpValue.innerText = this.valJumpSpeedUp.toString();
    if (jumpSpeedDownSlider) jumpSpeedDownSlider.value = this.valJumpSpeedDown.toString();
    if (jumpSpeedDownValue) jumpSpeedDownValue.innerText = this.valJumpSpeedDown.toString();
    
    const demoHeightInput = document.getElementById('demo-jump-height') as HTMLInputElement;
    const demoSpeedUpInput = document.getElementById('demo-jump-speed-up') as HTMLInputElement;
    const demoSpeedDownInput = document.getElementById('demo-jump-speed-down') as HTMLInputElement;
    
    if (demoHeightInput) demoHeightInput.value = this.valJumpHeight.toString();
    if (demoSpeedUpInput) demoSpeedUpInput.value = this.valJumpSpeedUp.toString();
    if (demoSpeedDownInput) demoSpeedDownInput.value = this.valJumpSpeedDown.toString();

    if (!this.clock.running) {
      /*       this.currentAnimation = this.runningAnimation;
      this.currentAnimation.reset();
      this.currentAnimation.play(); */
      this.clock.start();
      this.speed = 220;
      this.player.position.x = 0;
    }
  }

  update() {
    if (this.animationMixer) {
      this.delta = this.clock.getDelta();
      this.animationMixer.update(this.delta);
      
      // Update debug helpers
      this.hitboxHelpers.forEach(helper => {
          if (helper instanceof BoxHelper) helper.update();
      });
    }

    // TWEEN.update(); // Removed TWEEN update

    // --- NEW MOVEMENT LOGIC START ---
    // 1. Horizontal Movement (Lane Switching)
    const targetX = (this.targetLane * this.laneWidth) + this.planePosX;
    if (Math.abs(this.player.position.x - targetX) > 0.1) {
      const direction = Math.sign(targetX - this.player.position.x);
      const moveAmount = this.laneSwitchSpeed * this.delta * direction;
      
      // Don't overshoot
      if (Math.abs(moveAmount) > Math.abs(targetX - this.player.position.x)) {
        this.player.position.x = targetX;
      } else {
        this.player.position.x += moveAmount;
      }

      // Simple tilt effect
      this.player.rotation.y = this.baseRotationY - (direction * 0.5); 
    } else {
      this.player.position.x = targetX;
      this.player.rotation.y = this.baseRotationY; // Reset to base rotation
    }

    // 2. Vertical Movement (Jumping/Gravity)
    if (this.isJumpingState) {
      // Variable Gravity Logic
      // Use gravityUp when rising, gravityDown when falling
      const currentGravity = this.verticalVelocity > 0 ? this.gravityUp : this.gravityDown;

      this.player.position.y += this.verticalVelocity * this.delta;
      this.verticalVelocity += currentGravity * this.delta;

      if (this.player.position.y <= this.groundY) {
        this.player.position.y = this.groundY;
        this.isJumpingState = false;
        this.verticalVelocity = 0;
        
        // Landed - switch back to run animation if not sliding
        if (!this.isSliding) {
           const prevAnim = this.currentAnimation;
           this.currentAnimation = this.runningAnimation;
           this.currentAnimation.enabled = true; // Enable running animation
           this.currentAnimation.setLoop(LoopRepeat, Infinity); // Ensure looping
           this.currentAnimation.timeScale = 1.0; // Reset to normal speed
           this.currentAnimation.clampWhenFinished = false; // Don't clamp
           this.currentAnimation.reset();
           this.currentAnimation.play();
           
           if (prevAnim && prevAnim !== this.currentAnimation) {
             prevAnim.crossFadeTo(this.currentAnimation, 0.1);
           }
           console.log('🏃 Resumed running animation after jump');
        }
      }
    } else {
      // Safety check: Ensure player is on ground if not jumping
      if (this.player.position.y > this.groundY + 1) {
         this.player.position.y = this.groundY;
      }
    }
    // --- NEW MOVEMENT LOGIC END ---

    // Apply Character Tweaks
    if (this.player) {
        // 1. Plane (Container) Position
        // Z is absolute offset
        this.player.position.z = -110 + this.planePosZ;
        
        // Y (Ground Level)
        // We update groundY so physics respects it
        this.groundY = -35 + this.planePosY;
        
        // If not jumping, snap to ground
        if (!this.isJumpingState) {
             this.player.position.y = this.groundY;
        }

        // 2. Hitbox (Physics Box)
        // This moves the blue box (and yellow wireframe) relative to the player container
        this.playerBox.position.set(this.hitboxPos.x, this.hitboxPos.y, this.hitboxPos.z);
        this.playerBox.scale.set(this.hitboxScale.x, this.hitboxScale.y, this.hitboxScale.z);

        // 3. Model (Visuals)
        // This moves the character mesh relative to the player container
        this.player.children.forEach(child => {
            if (child.name === 'debug-helper' || child.name === 'debug-model-bounds' || child === this.playerBox || child === this.playerBoxHelper) return;
            
            child.position.set(this.modelPosX, this.modelPosY, this.modelPosZ);
            child.rotation.x = this.modelTilt * (Math.PI / 180);
            // Y rotation (spin) is combined with base rotation from lane switching?
            // No, baseRotationY is used for lane switching tilt.
            // We should probably update baseRotationY or just set rotation.y here if we want full control.
            // But lane switching logic overrides rotation.y every frame.
            // Let's update baseRotationY instead.
            this.baseRotationY = this.modelSpin * (Math.PI / 180);
            // Note: Lane logic will apply this.baseRotationY + tilt in the movement section above.
        });
    }

    if (!this.isDemo) {
      this.woodenCave.position.z += this.speed * this.delta;
      this.woodenCaveClone.position.z += this.speed * this.delta;

      if (this.woodenCave.position.z > 600) {
        this.woodenCave.position.z = this.woodenCaveClone.position.z - this.caveSize;
      }

      if (this.woodenCaveClone.position.z > 600) {
        this.woodenCaveClone.position.z = this.woodenCave.position.z - this.caveSize;
      }
    }
    // TWEEN.update(); // Moved to top

    this.playerBoxCollider.setFromObject(this.playerBox);

    this.detectCollisionWithCoins();

    this.detectCollisionWithObstacles();

    this.scores += Math.round(this.speed * this.delta);
    this.setScoreText(this.scores.toString());

    // Update Timer
    this.elapsedTime += this.delta;
    const minutes = Math.floor(this.elapsedTime / 60);
    const seconds = Math.floor(this.elapsedTime % 60);
    const timeString = `TIME: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    this.setTimerText(timeString);

    // Update Meters (Separate from Score)
    // Assuming speed is units/sec. Let's say 10 units = 1 meter.
    this.meters += (this.speed * this.delta) / 10;
    this.setMetersText(`${Math.floor(this.meters)} M`);

    if (!this.isDemo) {
      if (this.isPlayerHeadStart) {
        this.spawnObstacle();
        this.spawnCoin();
      }

      if (!this.isGameOver && this.speed < 400 && !this.isGamePaused) {
        this.speed += 0.06;
      }
    }
  }

  hide() {
    document.onkeydown = null;
    (document.querySelector('.disable-touch') as HTMLInputElement).style.display = 'none';

    this.isGameOver = false;
    this.isGamePaused = false; // Ensure paused state is reset

    this.coins = 0;

    this.scores = 0;

    (document.getElementById('game-paused-modal') as HTMLInputElement).style.display = 'none';

    // Hide Play HUD, Show Start Screen Stats
    const playHud = document.getElementById('play-hud');
    if (playHud) playHud.classList.add('hidden');
    
    const startStats = document.getElementById('start-screen-stats');
    if (startStats) startStats.classList.remove('hidden');
    
    // Update Start Screen Stats
    const totalCoinsEl = document.getElementById('total-coins-display');
    if (totalCoinsEl) totalCoinsEl.innerText = localStorage.getItem('total-coins') || '0';
    
    const highScoreEl = document.getElementById('high-score-display');
    if (highScoreEl) highScoreEl.innerText = (localStorage.getItem('high-score') || '0');

    // (document.querySelector('.hud-stats-container') as HTMLInputElement).style.display = 'none'; // Removed old selector

    // (document.querySelector('.pause-button') as HTMLInputElement).style.display = 'none'; // Removed old selector

    const demoUI = document.getElementById('demo-ui');
    if (demoUI) demoUI.style.display = 'none';

    this.visible = false;

    this.currentObstacleOne.position.z = -1200;
    this.currentObstacleTwo.position.z = -1500;

    this.activeCoinsGroup.position.z = -1200;
    this.currentAnimation.stop();
    this.player.visible = false;
    this.clock.stop();
    this.player.rotation.x = 0;
  }

  private gameOver() {
    this.isGameOver = true;
    this.speed = 0;
    // (document.querySelector('.pause-button') as HTMLInputElement).style.display = 'none'; // Removed old selector
    
    this.stumbleAnimation.reset();
    this.stumbleAnimation.setLoop(LoopOnce, 1);
    this.stumbleAnimation.clampWhenFinished = true;

    this.currentAnimation.crossFadeTo(this.stumbleAnimation, 0, false).play();
    this.currentAnimation = this.stumbleAnimation;

    setTimeout(() => {
      this.clock.stop();
      (document.getElementById('game-over-modal') as HTMLInputElement).style.display = 'block';
      (document.querySelector('#current-score') as HTMLInputElement).innerHTML = this.scores.toString();
      (document.querySelector('#current-coins') as HTMLInputElement).innerHTML = this.coins.toString();

      this.player.rotation.x = (90 * (Math.PI / 180));
    }, 2000);

    this.currentObstacleOne.position.z -= 5;
    this.currentObstacleTwo.position.z -= 5;
    this.isPlayerHeadStart = false;
    (document.querySelector('.disable-touch') as HTMLInputElement).style.display = 'block';
    this.saveCoins();
    this.saveHighScore();
  }

  private restartGame() {
    (document.getElementById('game-over-modal') as HTMLInputElement).style.display = 'none';
    this.currentObstacleOne.position.z = -1200;
    this.currentObstacleTwo.position.z = -1500;
    this.activeCoinsGroup.position.z = -1800;
    this.clock.start();
    this.speed = 220;
    this.coins = 0;
    this.scores = 0;
    this.elapsedTime = 0;
    
    // New Runner ID
    const runnerId = 'NK-' + Math.floor(1000 + Math.random() * 9000);
    const runnerIdEl = document.getElementById('runner-id-display');
    if (runnerIdEl) runnerIdEl.innerText = runnerId;

    this.setCoinsText('0');
    this.runningAnimation.reset();
    this.currentAnimation.crossFadeTo(this.runningAnimation, 0, false).play();
    this.player.rotation.x = 0;
    this.isGameOver = false;
    this.isGamePaused = false;
    this.currentAnimation = this.runningAnimation;
    // (document.querySelector('.pause-button') as HTMLInputElement).style.display = 'block'; // Removed old selector
    this.player.position.x = 0;
    this.targetLane = 0; // Reset target lane to center
    this.currentLane = 0;
    
    this.meters = 0;
    this.setMetersText('0 M');

    setTimeout(() => {
      this.isPlayerHeadStart = true;
    }, 3000);
    (document.querySelector('.disable-touch') as HTMLInputElement).style.display = 'none';
  }

  private detectCollisionWithObstacles() {
    const checkCollision = (obstacleGroup: Group, box: Box3) => {
      for (let i = 0; i < obstacleGroup.children.length; i += 1) {
        const child = obstacleGroup.children[i];
        
        // Skip debug helpers to prevent collision with hitboxes
        if (child.name === 'debug-helper') continue;

        box.setFromObject(child);

        // Spike logic removed to ensure hitbox validity
        /* if (child.name === 'spike') {
           // Shrink hitbox for spikes
           box.max.y -= 15; 
           box.expandByScalar(-2);
        } */

        const intersects = this.playerBoxCollider.intersectsBox(box);

        if (this.isInvulnerable) {
           if (intersects) {
             this.ignoredColliders.add(child);
           } else {
             this.ignoredColliders.delete(child);
           }
           continue; // Don't die
        }

        if (intersects) {
          if (this.ignoredColliders.has(child)) {
             // We are still inside an object we hit while invulnerable
             return true; 
          }
          this.gameOver();
          return true;
        } else {
          // Left the object
          this.ignoredColliders.delete(child);
        }
      }
      return false;
    };

    checkCollision(this.currentObstacleOne, this.obstacleBox);
    checkCollision(this.currentObstacleTwo, this.obstacleBox2);
  }

  private toggleHitboxes() {
    this.showHitboxes = !this.showHitboxes;
    
    // Toggle the blue physics box mesh
    if (this.playerBox) {
      this.playerBox.visible = this.showHitboxes;
    }
    
    if (!this.playerBoxHelper) {
       this.playerBoxHelper = new Box3Helper(this.playerBoxCollider, 0xffff00);
       this.add(this.playerBoxHelper);
    }
    this.playerBoxHelper.visible = this.showHitboxes;

    this.obstacleArray.forEach(group => {
       // Remove old helpers if any
       const oldHelper = group.children.find(c => c.name === 'debug-helper');
       if (oldHelper) group.remove(oldHelper);

       if (this.showHitboxes) {
          // Create a group to hold individual box helpers
          const debugGroup = new Group();
          debugGroup.name = 'debug-helper';
          
          // Use a snapshot of children to avoid iterating over the new debugGroup
          const children = [...group.children];
          
          children.forEach(child => {
             if (child instanceof Mesh || child instanceof Group) {
                // Skip if it's a helper
                if (child.name === 'debug-helper') return;

                // Create a wireframe box that matches the collision box logic
                const box = new Box3().setFromObject(child);
                
                // Spike logic removed to ensure hitbox validity
                /* if (child.name === 'spike') {
                   box.max.y -= 15; 
                   box.expandByScalar(-2);
                } */

                // Create a mesh that represents this box
                const size = new Vector3();
                box.getSize(size);
                const center = new Vector3();
                box.getCenter(center);

                const geometry = new BoxGeometry(size.x, size.y, size.z);
                const material = new MeshBasicMaterial({ color: 0xff0000, wireframe: true });
                const helperMesh = new Mesh(geometry, material);
                
                group.worldToLocal(center);
                helperMesh.position.copy(center);
                
                debugGroup.add(helperMesh);
             }
          });
          group.add(debugGroup);
       }
    });
  }

  private moveLeft() {
    if (this.targetLane > -1) {
      this.targetLane -= 1;
    }
  }

  private moveRight() {
    if (this.targetLane < 1) {
      this.targetLane += 1;
    }
  }

  private jump() {
    if (!this.isJumpingState) {
      // If sliding, cancel slide
      if (this.isSliding) {
        this.isSliding = false;
        this.playerBox.scale.y = 200;
        this.playerBox.position.y = 90;
        if (this.sliderTimeout) clearTimeout(this.sliderTimeout);
      }

      this.isJumpingState = true;
      
      // Calculate Physics based on Settings
      // h = v^2 / 2g  ->  v = sqrt(2gh)
      // t = v / g     ->  g = v / t
      // Combined: g = 2h / t^2, v = 2h / t
      
      // UP PHASE
      const timeToApex = 0.6 / this.valJumpSpeedUp; // Base time 0.6s
      const gUp = (2 * this.valJumpHeight) / (timeToApex * timeToApex);
      const v = gUp * timeToApex;

      // DOWN PHASE
      // We want the same height 'h' but potentially different time
      const timeDown = 0.6 / this.valJumpSpeedDown;
      const gDown = (2 * this.valJumpHeight) / (timeDown * timeDown);

      this.gravityUp = -gUp;
      this.gravityDown = -gDown;
      this.verticalVelocity = v;
      
      // Animation - fully stop running animation
      const prevAnim = this.currentAnimation;
      this.currentAnimation = this.jumpingAnimation;
      this.currentAnimation.enabled = true;
      this.currentAnimation.reset();
      this.currentAnimation.setLoop(LoopOnce, 1);
      this.currentAnimation.clampWhenFinished = true;
      
      // Scale animation speed to match physics
      this.currentAnimation.timeScale = this.valJumpSpeedUp;
      
      this.currentAnimation.play();
      
      if (prevAnim && prevAnim !== this.currentAnimation) {
        prevAnim.crossFadeTo(this.currentAnimation, 0.1);
      }
    }
  }

  private slide() {
    if (!this.isSliding && !this.isJumpingState) {
      this.isSliding = true;
      
      // Reduce hitbox height
      this.playerBox.scale.y = 100;
      this.playerBox.position.y = 45;

      const prevAnim = this.currentAnimation;
      this.slidingAnimation.reset();
      this.currentAnimation = this.slidingAnimation;
      this.slidingAnimation.setLoop(LoopOnce, 1);
      this.slidingAnimation.clampWhenFinished = true;
      this.slidingAnimation.play();

      if (prevAnim && prevAnim !== this.currentAnimation) {
        prevAnim.crossFadeTo(this.currentAnimation, 0.1);
      }
      
      const onFinished = (e: any) => {
        if (e.action === this.slidingAnimation) {
          this.animationMixer.removeEventListener('finished', onFinished);
          if (!this.isSliding) return; // Already cancelled?

          this.isSliding = false;
          // Reset hitbox
          this.playerBox.scale.y = 200;
          this.playerBox.position.y = 90;

          const oldAnim = this.currentAnimation;
          this.currentAnimation = this.runningAnimation;
          this.currentAnimation.setLoop(LoopRepeat, Infinity); // Ensure looping
          this.currentAnimation.timeScale = 1.0; // Reset to normal speed
          this.currentAnimation.clampWhenFinished = false; // Don't clamp
          this.currentAnimation.reset();
          this.currentAnimation.play();
          
          oldAnim.crossFadeTo(this.currentAnimation, 0.1);
          console.log('🏃 Resumed running animation after slide (event)');
        }
      };
      this.animationMixer.addEventListener('finished', onFinished);
    }
  }

  private createRandomObstacle() {
    let randomNum = Math.floor(Math.random() * this.obstacleArray.length);

    while (this.obstacleArray[randomNum] === this.currentObstacleOne
      || this.obstacleArray[randomNum] === this.currentObstacleTwo) {
      randomNum = Math.floor(Math.random() * this.obstacleArray.length);
    }
    return this.obstacleArray[randomNum];
  }

  private spawnObstacle() {
    if (!this.currentObstacleOne.visible) {
      this.currentObstacleOne.visible = true;
    }

    if (!this.currentObstacleTwo.visible) {
      this.currentObstacleTwo.visible = true;
      this.currentObstacleTwo.position.z = this.currentObstacleOne.position.z - 450;
    }

    this.currentObstacleOne.position.z += this.speed * this.delta;
    this.currentObstacleTwo.position.z += this.speed * this.delta;

    if (this.currentObstacleOne.position.z > -40) {
      this.currentObstacleOne.visible = false;
      this.currentObstacleOne.position.z = -1100;
      this.currentObstacleOne = this.createRandomObstacle();
    }

    if (this.currentObstacleTwo.position.z > -40) {
      this.currentObstacleTwo.visible = false;
      this.currentObstacleTwo.position.z = this.currentObstacleOne.position.z - 450;
      this.currentObstacleTwo = this.createRandomObstacle();
    }
  }

  private detectCollisionWithCoins() {
    let collected = 0;

    for (let i = 0; i < this.activeCoinsGroup.children.length; i += 1) {
      const coin = this.activeCoinsGroup.children[i];
      if (!coin.visible) continue;

      this.coinBox.setFromObject(coin);
      if (this.playerBoxCollider.intersectsBox(this.coinBox)) {
        coin.visible = false;
        collected += 1;
      }
    }

    if (collected > 0 && !this.isGamePaused && !this.isGameOver) {
      this.coins += collected;
      this.setCoinsText(`${this.coins}`);
    }
  }

  private generateRandomCoins() {
    const randNum = Math.floor(Math.random() * this.coinsArray.length);
    this.activeCoinsGroup = this.coinsArray[randNum];
  }

  private spawnCoin() {
    if (!this.activeCoinsGroup.visible) {
      this.activeCoinsGroup.visible = true;
    }

    for (let i = 0; i < this.activeCoinsGroup.children.length; i += 1) {
      const coin = this.activeCoinsGroup.children[i];
      if (!coin.visible) continue;
      coin.rotateY(this.coinSpinSpeed * this.delta);
    }

    this.activeCoinsGroup.position.z += 0.8 * this.speed * this.delta;
    if (this.activeCoinsGroup.position.z > 50) {
      for (let i = 0; i < this.activeCoinsGroup.children.length; i += 1) {
        if (!this.activeCoinsGroup.children[i].visible) {
          this.activeCoinsGroup.children[i].visible = true;
        }
      }
      this.activeCoinsGroup.visible = false;
      this.activeCoinsGroup.position.z = -1200;
      this.generateRandomCoins();
    }
  }

  private pauseAndResumeGame() {
    if (!this.isGamePaused) {
      this.clock.stop();
      (document.getElementById('game-paused-modal') as HTMLInputElement).style.display = 'block';
      this.isGamePaused = true;
    } else {
      this.clock.start();
      (document.getElementById('game-paused-modal') as HTMLInputElement).style.display = 'none';
      this.isGamePaused = false;
    }
    this.saveCoins();
    this.saveHighScore();
  }

  private async saveHighScore() {
    const highScore = localStorage.getItem('high-score') || 0;
    if (Number(this.scores) > Number(highScore)) {
      localStorage.setItem('high-score', this.scores.toString());
      const token = localStorage.getItem('token');
      if (token) {
        try {
          (document.querySelector('.auto-save-loader') as HTMLInputElement).style.display = 'block';
          const response = await fetch('/.netlify/functions/save-highscore', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              authorization: token,
            },
            body: JSON.stringify({ scores: this.scores }),
          });
          (document.querySelector('.auto-save-loader') as HTMLInputElement).style.display = 'none';
          if (response.status === 401) {
            localStorage.removeItem('token');
          }
        } catch (error) {
          (document.querySelector('.auto-save-loader') as HTMLInputElement).style.display = 'none';
        }
      }
    }
  }

  private async saveCoins() {
    const prevTotalCoins = localStorage.getItem('total-coins') || 0;
    const totalCoins = Number(prevTotalCoins) + this.coins;
    localStorage.setItem('total-coins', totalCoins.toString());

    const token = localStorage.getItem('token');
    if (token) {
      (document.querySelector('.auto-save-loader') as HTMLInputElement).style.display = 'block';
      try {
        const response = await fetch('/.netlify/functions/save-coins', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            authorization: token,
          },
          body: JSON.stringify({ coins: totalCoins }),
        });
        (document.querySelector('.auto-save-loader') as HTMLInputElement).style.display = 'none';
        if (response.status === 401) {
          Toastify({
            text: 'Your session has expired. Please relogin',
            duration: 5000,
            close: true,
            gravity: 'bottom',
            position: 'center',
            stopOnFocus: true,
          }).showToast();
          localStorage.removeItem('token');
        }
      } catch (error) {
        (document.querySelector('.auto-save-loader') as HTMLInputElement).style.display = 'none';
      }
    }
  }

  private saveSettings() {
    const settings = {
      valJumpHeight: this.valJumpHeight,
      valJumpSpeedUp: this.valJumpSpeedUp,
      valJumpSpeedDown: this.valJumpSpeedDown
    };
    localStorage.setItem('gameSettings', JSON.stringify(settings));
  }

  private loadSettings() {
    const settings = localStorage.getItem('gameSettings');
    if (settings) {
      const parsed = JSON.parse(settings);
      if (parsed.valJumpHeight) this.valJumpHeight = parsed.valJumpHeight;
      if (parsed.valJumpSpeedUp) this.valJumpSpeedUp = parsed.valJumpSpeedUp;
      if (parsed.valJumpSpeedDown) this.valJumpSpeedDown = parsed.valJumpSpeedDown;
    }
  }

  /*
This implementation of handleTouch Method is based on Smmehrab answer on stackoverflow
Link: https://stackoverflow.com/a/62825217
  */

  private debugSessionId = '';
  private debugLogs: any[] = [];

  setDemoModeEnabled(enabled: boolean) {
    this.isDemo = enabled;
    
    // Clean up any visible hitboxes when switching modes
    if (this.showHitboxes) {
      this.showHitboxes = false;
      if (this.playerBoxHelper) this.playerBoxHelper.visible = false;
      this.obstacleArray.forEach(group => {
        const oldHelper = group.children.find(c => c.name === 'debug-helper');
        if (oldHelper) group.remove(oldHelper);
      });
    }
    
    // Toggle Demo UI
    const demoUI = document.getElementById('demo-ui');
    if (demoUI) {
      demoUI.style.display = enabled ? 'block' : 'none';
    }

    // Toggle Character Select UI
    const charSelectUI = document.getElementById('character-select-ui');
    if (charSelectUI) {
      charSelectUI.style.display = enabled ? 'block' : 'none';
    }

    if (enabled) {
      this.debugSessionId = `session_${Date.now()}`;
      this.debugLogs = [];
      console.log(`Debug Session Started: ${this.debugSessionId}`);
      
      // Auto-enable hitboxes for demo
      if (!this.showHitboxes) {
        this.toggleHitboxes();
      }
    } else {
      // Disable hitboxes when leaving demo
      if (this.showHitboxes) {
        this.toggleHitboxes();
      }
    }
  }

  private saveDebugLogs() {
    if (this.debugLogs.length === 0) {
      alert('No logs to save yet!');
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.debugLogs, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `debug_swipes_${this.debugSessionId}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  private logDebugSwipe(data: any) {
    if (!this.isDemo) return;
    
    this.debugLogs.push(data);
    
    // Auto-save to server
    const payload = {
      sessionId: this.debugSessionId,
      device: navigator.userAgent,
      logs: this.debugLogs
    };

    console.log('Sending debug log to server...', payload);

    fetch('/api/log-debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(e => console.error('Auto-save failed:', e));

    const debugEl = document.getElementById('demo-debug-log');
    if (debugEl) {
      debugEl.innerText = `
      Session: ${this.debugSessionId}
      Result: ${data.result}
      X: ${data.x}, Y: ${data.y}
      Threshold: ${data.threshold}
      Ratio XY: ${data.xy}
      Ratio YX: ${data.yx}
      Action: ${data.action}
      Auto-Saved: Yes
      `;
    }
  }

  private handleTouch = () => {
    const pageWidth = window.innerWidth || document.body.clientWidth;
    const treshold = Math.max(1, Math.floor(0.01 * (pageWidth)));
    const limit = Math.tan(45 * (1.5 / 180) * Math.PI);
    const x = this.touchendX - this.touchstartX;
    const y = this.touchendY - this.touchstartY;
    const xy = Math.abs(x / y);
    const yx = Math.abs(y / x);

    let result = 'None';
    let action = 'None';

    if (Math.abs(x) > treshold || Math.abs(y) > treshold) {
      if (yx <= limit) {
        if (x < 0) {
          result = 'Swipe Left';
          this.moveLeft();
          action = 'Move Left Triggered';
        } else {
          result = 'Swipe Right';
          this.moveRight();
          action = 'Move Right Triggered';
        }
      } else if (xy <= limit) {
        if (y < 0) {
          result = 'Swipe Up';
          this.jump();
          action = this.isJumping ? 'Jump Triggered' : 'Jump Ignored (Already Jumping)';
        } else {
          result = 'Swipe Down';
          this.slide();
          action = this.isSliding ? 'Slide Triggered' : 'Slide Ignored (Already Sliding)';
        }
      } else {
        result = 'Diagonal/Ambiguous';
        action = 'Ignored';
      }
    } else {
      result = 'Too Short';
      action = 'Ignored';
    }

    if (this.isDemo) {
      this.logDebugSwipe({
        timestamp: Date.now(),
        x, y,
        threshold: treshold,
        limit: limit.toFixed(3),
        xy: xy.toFixed(3),
        yx: yx.toFixed(3),
        result,
        action
      });
    }
  };

  private createLeftJumpObstacle() {
    const meshGroup = new Group();
    const mesh = this.barrelObject.clone();
    mesh.scale.set(0.03, 0.03, 0.03);
    mesh.position.set(0, -25, 0);
    meshGroup.add(mesh);
    const mesh2 = this.barrelObject.clone();
    mesh2.scale.set(0.03, 0.03, 0.03);
    mesh2.position.set(20, -25, 0);
    meshGroup.add(mesh2);
    const mesh3 = this.spikeObject.clone();
    mesh3.name = 'spike';
    mesh3.scale.set(0.06, 0.06, 0.06);
    mesh3.position.set(-20, -31, 0);
    
    // Add debug hitbox for spike
    const box = new Box3().setFromObject(mesh3);
    // Spike logic removed
    /* box.max.y -= 15; 
    box.expandByScalar(-2); */
    const helper = new Box3Helper(box, 0xff0000);
    helper.name = 'debug-helper';
    helper.visible = false; // Hidden by default
    meshGroup.add(helper);

    meshGroup.add(mesh3);
    meshGroup.position.set(0, 0, -800);
    this.add(meshGroup);
    meshGroup.visible = false;
    this.obstacleArray.push(meshGroup);
  }

  private createCenterJumpObstacle() {
    const meshGroup = new Group();
    const mesh = this.barrelObject.clone();
    mesh.scale.set(0.03, 0.03, 0.03);
    mesh.position.set(-20, -25, 0);
    meshGroup.add(mesh);
    const mesh2 = this.barrelObject.clone();
    mesh2.scale.set(0.03, 0.03, 0.03);
    mesh2.position.set(20, -25, 0);
    meshGroup.add(mesh2);
    const mesh3 = this.spikeObject.clone();
    mesh3.name = 'spike';
    mesh3.scale.set(0.06, 0.06, 0.06);
    mesh3.position.set(0, -31, 0);

    // Add debug hitbox for spike
    const box = new Box3().setFromObject(mesh3);
    // Spike logic removed
    /* box.max.y -= 15; 
    box.expandByScalar(-2); */
    const helper = new Box3Helper(box, 0xff0000);
    helper.name = 'debug-helper';
    helper.visible = false;
    meshGroup.add(helper);

    meshGroup.add(mesh3);
    meshGroup.position.set(0, 0, -1200);
    this.add(meshGroup);
    meshGroup.visible = false;
    this.obstacleArray.push(meshGroup);
  }

  private createRightJumpObstacle() {
    const meshGroup = new Group();
    const mesh = this.barrelObject.clone();
    mesh.scale.set(0.03, 0.03, 0.03);
    mesh.position.set(-20, -25, 0);
    meshGroup.add(mesh);
    const mesh2 = this.barrelObject.clone();
    mesh2.scale.set(0.03, 0.03, 0.03);
    mesh2.position.set(0, -25, 0);
    meshGroup.add(mesh2);
    const mesh3 = this.spikeObject.clone();
    mesh3.name = 'spike';
    mesh3.scale.set(0.06, 0.06, 0.06);
    mesh3.position.set(20, -31, 0);

    // Add debug hitbox for spike
    const box = new Box3().setFromObject(mesh3);
    // Spike logic removed
    /* box.max.y -= 15; 
    box.expandByScalar(-2); */
    const helper = new Box3Helper(box, 0xff0000);
    helper.name = 'debug-helper';
    helper.visible = false;
    meshGroup.add(helper);

    meshGroup.add(mesh3);
    meshGroup.position.set(0, 0, -1200);
    this.add(meshGroup);
    meshGroup.visible = false;
    this.obstacleArray.push(meshGroup);
  }

  private createRightCenterObstacle() {
    const meshGroup = new Group();
    const mesh = this.barrelObject.clone();
    mesh.scale.set(0.03, 0.03, 0.03);
    mesh.position.set(0, -25, 0);
    meshGroup.add(mesh);
    const mesh2 = this.barrelObject.clone();
    mesh2.scale.set(0.03, 0.03, 0.03);
    mesh2.position.set(20, -25, 0);
    meshGroup.add(mesh2);
    meshGroup.position.set(0, 0, -1200);
    this.add(meshGroup);
    meshGroup.visible = false;
    this.obstacleArray.push(meshGroup);
  }

  private createLeftCenterObstacle() {
    const meshGroup = new Group();
    const mesh = this.barrelObject.clone();
    mesh.scale.set(0.03, 0.03, 0.03);
    mesh.position.set(-20, -25, 0);
    meshGroup.add(mesh);
    const mesh2 = this.barrelObject.clone();
    mesh2.scale.set(0.03, 0.03, 0.03);
    mesh2.position.set(0, -25, 0);
    meshGroup.add(mesh2);
    meshGroup.position.set(0, 0, -1200);
    this.add(meshGroup);
    meshGroup.visible = false;
    this.obstacleArray.push(meshGroup);
  }

  private createLeftRightObstacle() {
    const meshGroup = new Group();
    const mesh = this.barrelObject.clone();
    mesh.scale.set(0.03, 0.03, 0.03);
    mesh.position.set(-20, -25, 0);
    meshGroup.add(mesh);
    const mesh2 = this.barrelObject.clone();
    mesh2.scale.set(0.03, 0.03, 0.03);
    mesh2.position.set(20, -25, 0);
    meshGroup.add(mesh2);
    meshGroup.position.set(0, 0, -1200);
    this.add(meshGroup);
    meshGroup.visible = false;
    this.obstacleArray.push(meshGroup);
  }

  private createCenterRightObstacle() {
    const meshGroup = new Group();
    const mesh = this.barrelObject.clone();
    mesh.scale.set(0.031, 0.031, 0.031);
    mesh.position.set(-20, -25, 0);
    meshGroup.add(mesh);
    const mesh2 = this.barrelObject.clone();
    mesh2.scale.set(0.03, 0.03, 0.03);
    mesh2.position.set(20, -25, 0);
    meshGroup.add(mesh2);
    meshGroup.position.set(0, 0, -1200);
    this.add(meshGroup);
    meshGroup.visible = false;
    this.obstacleArray.push(meshGroup);
  }

  private createCenterSlideObstacle() {
    const meshGroup = new Group();
    const geometry = new BoxGeometry();
    const material = new MeshPhongMaterial({ color: 'brown' });
    const plank = new Mesh(geometry, material);
    meshGroup.add(plank);
    plank.position.set(0, -20, 0);
    plank.scale.set(40, 0.5, 7);
    const mesh = this.barrelObject.clone();
    mesh.scale.set(0.03, 0.03, 0.03);
    mesh.position.set(-20, -25, 0);
    meshGroup.add(mesh);
    const mesh2 = this.barrelObject.clone();
    mesh2.scale.set(0.03, 0.03, 0.03);
    mesh2.position.set(20, -25, 0);
    meshGroup.add(mesh2);
    const mesh3 = this.boxObject.clone();
    mesh3.scale.set(4, 2, 2);
    mesh3.position.set(0, -19, 3);
    meshGroup.add(mesh3);
    meshGroup.position.set(0, 0, -1200);
    this.add(meshGroup);
    meshGroup.visible = false;
    this.obstacleArray.push(meshGroup);
  }

  private createRightSlideObstacle() {
    const meshGroup = new Group();
    const geometry = new BoxGeometry();
    const material = new MeshPhongMaterial({ color: 'brown' });
    const plank = new Mesh(geometry, material);
    meshGroup.add(plank);
    plank.position.set(20, -20, 0);
    plank.scale.set(40, 0.5, 7);
    const mesh = this.barrelObject.clone();
    mesh.scale.set(0.03, 0.03, 0.03);
    mesh.position.set(-20, -25, 0);
    meshGroup.add(mesh);
    const mesh2 = this.barrelObject.clone();
    mesh2.scale.set(0.03, 0.03, 0.03);
    mesh2.position.set(0, -25, 0);
    meshGroup.add(mesh2);
    const mesh3 = this.boxObject.clone();
    mesh3.scale.set(4, 2, 2);
    mesh3.position.set(20, -19, 3);
    meshGroup.add(mesh3);
    meshGroup.position.set(0, 0, -1200);
    this.add(meshGroup);
    meshGroup.visible = false;
    this.obstacleArray.push(meshGroup);
  }

  private createLeftSlideObstacle() {
    const meshGroup = new Group();
    const geometry = new BoxGeometry();
    const material = new MeshPhongMaterial({ color: 'brown' });
    const plank = new Mesh(geometry, material);
    meshGroup.add(plank);
    plank.position.set(-20, -20, 0);
    plank.scale.set(40, 0.5, 7);
    const mesh = this.barrelObject.clone();
    mesh.scale.set(0.03, 0.03, 0.03);
    mesh.position.set(20, -25, 0);
    meshGroup.add(mesh);
    const mesh2 = this.barrelObject.clone();
    mesh2.scale.set(0.03, 0.03, 0.03);
    mesh2.position.set(0, -25, 0);
    meshGroup.add(mesh2);
    const mesh3 = this.boxObject.clone();
    mesh3.scale.set(4, 2, 2);
    mesh3.position.set(-20, -19, 3);
    meshGroup.add(mesh3);
    meshGroup.position.set(0, 0, -1200);
    this.add(meshGroup);
    meshGroup.visible = false;
    this.obstacleArray.push(meshGroup);
  }

  private generateLeftCenterRightCoins() {
    const coinsGroup = new Group();
    for (let i = 0; i < 5; i += 1) {
      const leftCoin = this.coinObject.clone();
      const centerCoin = this.coinObject.clone();
      const rightCoin = this.coinObject.clone();
      leftCoin.position.set(-18, -12, -i * 20);
      centerCoin.position.set(0, -12, -i * 20);
      rightCoin.position.set(18, -12, -i * 20);
      leftCoin.scale.set(0.035, 0.035, 0.035);
      centerCoin.scale.set(0.035, 0.035, 0.035);
      rightCoin.scale.set(0.035, 0.035, 0.035);
      coinsGroup.add(leftCoin, centerCoin, rightCoin);
    }
    coinsGroup.position.set(0, -20, -1200);
    this.add(coinsGroup);
    coinsGroup.visible = false;
    this.coinsArray.push(coinsGroup);
  }

  private generateLeftSideCoin() {
    const coinsGroup = new Group();
    for (let i = 0; i < 5; i += 1) {
      const leftCoin = this.coinObject.clone();
      leftCoin.position.set(-18, -12, -i * 20);
      leftCoin.scale.set(0.035, 0.035, 0.035);
      coinsGroup.add(leftCoin);
    }
    coinsGroup.position.set(0, -20, -1200);
    this.add(coinsGroup);
    coinsGroup.visible = false;
    this.coinsArray.push(coinsGroup);
  }

  private generateLeftandCenterCoins() {
    const coinsGroup = new Group();
    for (let i = 0; i < 5; i += 1) {
      const leftCoin = this.coinObject.clone();
      const centerCoin = this.coinObject.clone();
      leftCoin.position.set(-18, -12, -i * 20);
      centerCoin.position.set(0, -12, -i * 20);
      leftCoin.scale.set(0.035, 0.035, 0.035);
      centerCoin.scale.set(0.035, 0.035, 0.035);
      coinsGroup.add(leftCoin, centerCoin);
    }
    coinsGroup.position.set(0, -20, -1200);
    this.add(coinsGroup);
    coinsGroup.visible = false;
    this.coinsArray.push(coinsGroup);
  }

  private generateCenterRightCoins() {
    const coinsGroup = new Group();
    for (let i = 0; i < 5; i += 1) {
      const centerCoin = this.coinObject.clone();
      const rightCoin = this.coinObject.clone();
      centerCoin.position.set(0, -12, -i * 20);
      rightCoin.position.set(18, -12, -i * 20);
      coinsGroup.add(centerCoin, rightCoin);
      centerCoin.scale.set(0.035, 0.035, 0.035);
      rightCoin.scale.set(0.035, 0.035, 0.035);
    }
    coinsGroup.position.set(0, -20, -1200);
    this.add(coinsGroup);
    coinsGroup.visible = false;
    this.coinsArray.push(coinsGroup);
  }

  private generateRightCoins() {
    const coinsGroup = new Group();
    for (let i = 0; i < 5; i += 1) {
      const rightCoin = this.coinObject.clone();
      rightCoin.position.set(18, -12, -i * 20);
      coinsGroup.add(rightCoin);
      rightCoin.scale.set(0.035, 0.035, 0.035);
    }
    coinsGroup.position.set(0, -20, -1200);
    this.add(coinsGroup);
    coinsGroup.visible = false;
    this.coinsArray.push(coinsGroup);
  }
}
