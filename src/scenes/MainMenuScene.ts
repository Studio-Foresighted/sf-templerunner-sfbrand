/* eslint-disable class-methods-use-this */
import {
  Scene, Object3D, AmbientLight, DirectionalLight, Clock, AnimationMixer, AnimationAction, TextureLoader, SRGBColorSpace, RepeatWrapping, MeshStandardMaterial, MeshBasicMaterial, AnimationClip, MathUtils, LoopRepeat, LoopOnce, Vector3, CatmullRomCurve3, TubeGeometry, Mesh,
} from 'three';

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import Toastify from 'toastify-js';

import allCharacters from '../allCharacters';
import { getCachedJson, loadCachedFbx, loadCachedGltf, loadCachedTexture } from '../assetCache';

import 'flag-icons';

import { IallGameCharacters } from '../types';

export default class MainMenuScene extends Scene {
  private fbxLoader = new FBXLoader();

  private glbLoader = new GLTFLoader();

  private woodenCave = new Object3D();

  private caveTexture: any = null;

  private delta = 0;

  private clock = new Clock();

  private animationMixer!: AnimationMixer;

  private dancingAnimation!: AnimationAction;

  private xbot = new Object3D();

  private jolleen = new Object3D();

  private peasantGirl = new Object3D();

  private xbotAnimation!: Object3D;

  private jolleenAnimation!: Object3D;

  private peasantGirlAnimation!: Object3D;

  private charactersContainer: Object3D[] = [];

  private animationsContainer: Object3D[] = [];

  private allGameCharacters: IallGameCharacters[] = [];

  private activeCharacter = new Object3D();

  private activeCharacterAnimation!: Object3D;

  private activeIndexNumber = 0;

  private idleAnimations: AnimationClip[] = [];
  private currentAction: AnimationAction | null = null;
  private idleIndex = 0;
  private idleTimer = 0;
  private readonly IDLE_INTERVAL = 3.5;

  // Intro Sequence
  private introState = 'complete'; // Default to complete to avoid issues if not reset
  private introTimer = 0;
  private sprintClip: AnimationClip | null = null;
  private warmupClip: AnimationClip | null = null;
  private sprintAction: AnimationAction | null = null;
  private caveMaterials: MeshStandardMaterial[] = [];

  // Effects
  private effect3Bolts: Mesh[] = [];
  private boltTimer = 0;
  private effectColors = [0xcc0000, 0xffaa00]; // Darker Red, Orange/Gold
  
  private idleEffectActive = false;
  private idleEffectTimer = 0;

  public loadingOffset = 0;
  public loadingScale = 1;


  private async loadCaveTexture(filename: string, repeatValue?: number) {
    const repeat = repeatValue !== undefined ? repeatValue : parseFloat(localStorage.getItem('textureRepeat') || '22.5');
    const texture = await loadCachedTexture(`./assets/models/textures/${filename}`, repeat);
    console.log(`🎨 [MainMenu] Loading texture "${filename}" with repeat: ${repeat} (passed: ${repeatValue})`);
    return texture;
  }

  async changeCaveTexture(filename: string, repeatValue?: number) {
    const newTexture = await this.loadCaveTexture(filename, repeatValue);
    this.caveTexture = newTexture;
    console.log(`✅ [MainMenu] Applying texture with repeat: ${newTexture.repeat.x} x ${newTexture.repeat.y}`);
    this.woodenCave.traverse((child: any) => {
      if (child.isMesh && child.material) {
        child.material.map = newTexture;
        child.material.needsUpdate = true;
      }
    });
    localStorage.setItem('selectedCaveTexture', filename);
  }

  private renderTextureThumbnails(textures: any[]) {
    const container = document.getElementById('texture-thumbnails');
    if (!container) return;
    
    container.innerHTML = ''; // Clear existing
    
    const currentTexture = localStorage.getItem('selectedCaveTexture') || 'cyberpunk-metal-2.jpeg';
    
    textures.forEach(tex => {
        const thumb = document.createElement('div');
        thumb.className = 'texture-thumb';
        if (tex.file === currentTexture) thumb.classList.add('active');
        
        // Use the texture image as background
        thumb.style.backgroundImage = `url('./assets/models/textures/${tex.file}')`;
        thumb.title = tex.name;
        
        thumb.onclick = () => {
            // Update Active State
            document.querySelectorAll('.texture-thumb').forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
            
            // Change Texture
            this.changeCaveTexture(tex.file);
        };
        
        container.appendChild(thumb);
    });
  }

  async load() {
    this.updateLoading(5, 'INITIALIZING CORE');
    this.background = await loadCachedTexture('./assets/mainbackdrop.png', 1);

    // Fetch textures for UI and selection
    const data = await getCachedJson<any>('./assets/models/textures/textures.json');
    this.renderTextureThumbnails(data.textures);

    let selectedTexture = localStorage.getItem('selectedCaveTexture');
    if (!selectedTexture) {
      const defaultTex = data.textures.find((t: any) => t.default);
      selectedTexture = defaultTex ? defaultTex.file : 'cyberpunk-metal-2.jpeg';
    }
    const caveTexture = await this.loadCaveTexture(selectedTexture!);
    this.caveTexture = caveTexture;
    this.updateLoading(15, 'TEXTURES LOADED');

    this.woodenCave = await loadCachedFbx('./assets/models/wooden-cave.fbx');
    
    this.woodenCave.traverse((child: any) => {
      if (child.isMesh) {
        child.geometry.deleteAttribute('color');
        child.geometry.computeVertexNormals();
        const mat = new MeshStandardMaterial({
          map: caveTexture,
          color: 0xffffff,
          roughness: 1,
          metalness: 0,
          transparent: true, // Enable transparency for fade-in
          opacity: 1,
        });
        child.material = mat;
        this.caveMaterials.push(mat);
      }
    });
    this.woodenCave.position.set(0, 0, -500);
    this.woodenCave.scale.set(0.055, 0.055, 0.055);
    this.add(this.woodenCave);
    this.updateLoading(35, 'ENVIRONMENT MESH LOADED');

    // Load Sprint Animation for Intro
    try {
      const sprintGltf = await loadCachedGltf('./assets/characters/2025/flash-sprint-2.glb');
        if (sprintGltf.animations.length > 0) {
            this.sprintClip = sprintGltf.animations[0];
            console.log('🏃 [MainMenu] Loaded Sprint Animation');
        }
    } catch (e) {
        console.warn('⚠️ [MainMenu] Failed to load sprint animation:', e);
    }

    // Load Warmup Animation for Intro
    try {
      const warmGltf = await loadCachedGltf('./assets/characters/2025/flash-warm.glb');
        if (warmGltf.animations.length > 0) {
            this.warmupClip = warmGltf.animations[0];
            console.log('🔥 [MainMenu] Loaded Warmup Animation');
        }
    } catch (e) {
        console.warn('⚠️ [MainMenu] Failed to load warmup animation:', e);
    }

    this.updateLoading(55, 'NEURAL INTERFACE CONNECTED');

    const ambient = new AmbientLight(0xFFFFFF, 1.25);
    this.add(ambient);

    const light = new DirectionalLight(0xFFFFFF, 1.25);

    light.position.set(0, 40, -10);
    this.add(light);

    // Force update to ensure Flash is the default character
    localStorage.setItem('allGameCharacters', JSON.stringify(allCharacters));
    this.allGameCharacters = allCharacters;

    // Load first character (Flash) - Force load flash-idles.glb
    const char0 = this.allGameCharacters[0];
    console.log('🎮 [MainMenu] Loading Flash Idles (2025)...');
    
    // Force load the specific GLB
    const gltf = await loadCachedGltf('./assets/characters/2025/flash-idles.glb');
    this.xbot = gltf.scene;
    
    // Store all animations for cycling
    this.idleAnimations = gltf.animations;
    console.log(`✅ [MainMenu] Loaded ${this.idleAnimations.length} idle animations`);

    // Store in wrapper for show() to use
    const animWrapper = new Object3D();
    animWrapper.animations = this.idleAnimations;
    this.xbotAnimation = animWrapper as any;
    
    // Apply Unlit Mode immediately to xbot
    this.activeCharacter = this.xbot;
    this.makeCharacterUnlit();
    
    // Load other characters: [1]=Xbot, [2]=Jolleen, [3]=Peasant Girl
    this.jolleen = await loadCachedFbx(this.allGameCharacters[2].model);
    this.peasantGirl = await loadCachedFbx(this.allGameCharacters[3].model);

    this.updateLoading(75, 'CITY MESH LOADED');

    this.jolleenAnimation = await loadCachedFbx(this.allGameCharacters[2].danceAnimation);

    this.updateLoading(85, 'AUDIO SYSTEMS ONLINE');

    this.peasantGirlAnimation = await loadCachedFbx(this.allGameCharacters[3].danceAnimation);

    this.updateLoading(95, 'READY TO RUN');

    this.xbot.visible = false;
    this.jolleen.visible = false;
    this.peasantGirl.visible = false;

    this.charactersContainer.push(
      this.xbot,
      this.jolleen,
      this.peasantGirl,
    );
    this.animationsContainer.push(
      this.xbotAnimation,
      this.jolleenAnimation,
      this.peasantGirlAnimation,
    );

    this.add(this.xbot);
    this.add(this.jolleen);
    this.add(this.peasantGirl);

    this.updateLoading(100, 'SYSTEMS STABILIZED');
    this.hide();
  }

  private updateLoading(percent: number, checkText?: string) {
    const finalPercent = Math.min(100, Math.round(this.loadingOffset + (percent * this.loadingScale)));
    const pctEl = document.querySelector('.loading-percentage') as HTMLElement;
    if (pctEl) pctEl.innerHTML = `${finalPercent}%`;
    
    const barEl = document.querySelector('#loading-bar-fill') as HTMLElement;
    if (barEl) barEl.style.width = `${finalPercent}%`;
    
    if (checkText) {
       const container = document.getElementById('system-checks');
       if (container) {
         const p = document.createElement('p');
         p.className = 'check-item';
         p.innerHTML = `<span class="check-status">[OK]</span> ${checkText}`;
         container.appendChild(p);
       }
    }
  }

  private displayAboutModal() {
    (document.querySelector('#about-modal') as HTMLInputElement).style.display = 'block';
  }

  private hideAboutModal() {
    (document.querySelector('#about-modal') as HTMLInputElement).style.display = 'none';
  }

  private displaySignUpForm() {
    (document.querySelector('#sign-in-modal') as HTMLInputElement).style.display = 'none';
    (document.querySelector('#sign-up-modal') as HTMLInputElement).style.display = 'block';
  }

  private displaySignInForm() {
    (document.querySelector('#sign-up-modal') as HTMLInputElement).style.display = 'none';
    (document.querySelector('#sign-in-modal') as HTMLInputElement).style.display = 'block';
  }

  private restoreOnlineBackup(scores:number, coins:number, characters:string) {
    localStorage.setItem('high-score', String(scores));
    localStorage.setItem('total-coins', String(coins));
    localStorage.setItem('allGameCharacters', characters);
    this.allGameCharacters = (JSON.parse(localStorage.getItem('allGameCharacters')!));
    (document.querySelector('#backup-modal') as HTMLInputElement).style.display = 'none';
    (document.querySelector('.high-score') as HTMLInputElement).innerHTML = JSON.parse(localStorage.getItem('high-score')!);
    (document.querySelector('.total-coins') as HTMLInputElement).innerHTML = JSON.parse(localStorage.getItem('total-coins')!);
  }

  private async overwriteOnlineBackup() {
    const scores = (JSON.parse(localStorage.getItem('high-score')!));
    const coins = (JSON.parse(localStorage.getItem('total-coins')!));
    const characters = JSON.stringify(this.allGameCharacters);
    const token = localStorage.getItem('token');

    if (token) {
      try {
        (document.querySelector('#overwrite-online-backup-btn') as HTMLInputElement).disabled = true;
        (document.querySelector('#restore-online-backup-btn') as HTMLInputElement).disabled = true;
        (document.querySelector('.auto-save-loader') as HTMLInputElement).style.display = 'block';
        const response = await fetch('/.netlify/functions/overwrite-game-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            authorization: token,
          },
          body: JSON.stringify({ scores, coins, characters }),
        });
        (document.querySelector('.auto-save-loader') as HTMLInputElement).style.display = 'none';
        (document.querySelector('#backup-modal') as HTMLInputElement).style.display = 'none';
        (document.querySelector('.high-score') as HTMLInputElement).innerHTML = JSON.parse(localStorage.getItem('high-score')!);
        (document.querySelector('.total-coins') as HTMLInputElement).innerHTML = JSON.parse(localStorage.getItem('total-coins')!);
        (document.querySelector('#overwrite-online-backup-btn') as HTMLInputElement).disabled = false;
        (document.querySelector('#restore-online-backup-btn') as HTMLInputElement).disabled = false;
        if (response.status === 401) {
          localStorage.removeItem('token');
          if (response.status === 401) {
            Toastify({
              text: 'Your session has expired. Please relogin',
              duration: 5000,
              close: true,
              gravity: 'bottom',
              position: 'center',
              stopOnFocus: true,
            }).showToast();
            (document.querySelector('#overwrite-online-backup-btn') as HTMLInputElement).disabled = false;
            (document.querySelector('#restore-online-backup-btn') as HTMLInputElement).disabled = false;
          }
        }
      } catch (error) {
        (document.querySelector('.auto-save-loader') as HTMLInputElement).style.display = 'none';
        (document.querySelector('#backup-modal') as HTMLInputElement).style.display = 'none';
        (document.querySelector('#overwrite-online-backup-btn') as HTMLInputElement).disabled = false;
        (document.querySelector('#restore-online-backup-btn') as HTMLInputElement).disabled = false;
      }
    }
  }

  private async signInUser() {
    const username = (document.getElementById('signin-username-text') as HTMLInputElement).value;
    const password = (document.getElementById('signin-password-text') as HTMLInputElement).value;
    const loginData = { username, password };

    try {
      (document.querySelector('#login-button') as HTMLInputElement).innerHTML = 'Logging you in...';
      (document.querySelector('#login-button') as HTMLInputElement).disabled = true;
      const response = await fetch('/.netlify/functions/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      const {
        token, message, scores, coins, characters,
      } = await response.json();
      (document.querySelector('#login-button') as HTMLInputElement).innerHTML = 'Login';
      (document.querySelector('#login-button') as HTMLInputElement).disabled = false;

      if (token) {
        localStorage.setItem('token', token);
        localStorage.setItem('username', username);
        this.closeSignInForm();
        this.loadLoginScreen();
        Toastify({
          text: `Welcome Back, ${username}`,
          duration: 4000,
          close: true,
          gravity: 'bottom',
          position: 'center',
          stopOnFocus: true,
        }).showToast();
        if (scores !== Number(JSON.parse(localStorage.getItem('high-score')!))
        || coins !== Number(JSON.parse(localStorage.getItem('total-coins')!))
           || characters !== JSON.stringify(this.allGameCharacters)) {
          (document.querySelector('#backup-modal') as HTMLInputElement).style.display = 'block';
        }
        (document.querySelector('#restore-online-backup-btn') as HTMLInputElement).onclick = () => {
          this.restoreOnlineBackup(scores, coins, characters);
        };
      } else {
        Toastify({
          text: `${message}`,
          duration: 4000,
          close: true,
          gravity: 'bottom',
          position: 'center',
          stopOnFocus: true,
        }).showToast();
      }
    } catch (error) {
      (document.querySelector('#login-button') as HTMLInputElement).innerHTML = 'Login';
      (document.querySelector('#login-button') as HTMLInputElement).disabled = false;

      Toastify({
        text: '❎❎❎ Unable to login, please try again',
        duration: 3000,
        close: true,
        gravity: 'bottom',
        position: 'center',
        stopOnFocus: true,
      }).showToast();
    }
  }

  async signUpUser() {
    const username = (document.getElementById('signup-username-text') as HTMLInputElement).value;
    const password = (document.getElementById('signup-password-text') as HTMLInputElement).value;
    const repeatPassword = (document.getElementById('signup-repeat-password-text') as HTMLInputElement).value;
    const country = (document.getElementById('country') as HTMLInputElement).value;
    const characters = JSON.stringify(this.allGameCharacters);
    const signUpData = {
      username, password, country, characters,
    };
    if (username.length < 4) {
      Toastify({
        text: '❎ Username is too short!',
        duration: 3000,
        close: true,
        gravity: 'bottom',
        position: 'center',
        stopOnFocus: true,
      }).showToast();
    } else if (password.length < 5) {
      Toastify({
        text: '❎ Password is too short!',
        duration: 3000,
        close: true,
        gravity: 'bottom',
        position: 'center',
        stopOnFocus: true,
      }).showToast();
    } else if (password !== repeatPassword) {
      Toastify({
        text: '❎ Password does not match!',
        duration: 3000,
        close: true,
        gravity: 'bottom',
        position: 'center',
        stopOnFocus: true,
      }).showToast();
    } else {
      try {
        (document.querySelector('#register-button') as HTMLInputElement).innerHTML = 'Signing you up...';
        (document.querySelector('#register-button') as HTMLInputElement).disabled = true;
        const response = await fetch('/.netlify/functions/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(signUpData),
        });
        const { token, message } = await response.json();
        (document.querySelector('#register-button') as HTMLInputElement).innerHTML = 'Register';
        (document.querySelector('#register-button') as HTMLInputElement).disabled = false;

        if (token) {
          localStorage.setItem('token', token);
          localStorage.setItem('username', username);
          this.closeSignUpForm();
          this.loadLoginScreen();
          Toastify({
            text: 'Registration Successful!',
            duration: 4000,
            close: true,
            gravity: 'bottom',
            position: 'center',
            stopOnFocus: true,
          }).showToast();
        } else {
          Toastify({
            text: `${message}`,
            duration: 4000,
            close: true,
            gravity: 'bottom',
            position: 'center',
            stopOnFocus: true,
          }).showToast();
        }
      } catch (error) {
        Toastify({
          text: '❎❎❎Unable to sign you up, please try again.',
          duration: 3000,
          close: true,
          gravity: 'bottom',
          position: 'center',
          stopOnFocus: true,
        }).showToast();
        (document.querySelector('#register-button') as HTMLInputElement).innerHTML = 'Signing you up...';
        (document.querySelector('#register-button') as HTMLInputElement).disabled = false;
      }
    }
  }

  private closeSignUpForm() {
    (document.querySelector('#sign-up-modal') as HTMLInputElement).style.display = 'none';
  }

  private closeSignInForm = () => {
    (document.querySelector('#sign-in-modal') as HTMLInputElement).style.display = 'none';
  };

  private loadLoginScreen() {
    (document.querySelector('#sign-out-button') as HTMLInputElement).style.display = 'block';
    (document.querySelector('#greetings') as HTMLInputElement).style.display = 'block';
    (document.querySelector('.auth-button') as HTMLInputElement).style.display = 'none';
    (document.querySelector('#username') as HTMLInputElement).innerHTML = localStorage.getItem('username')!;
  }

  private loadLogoutScreen() {
    (document.querySelector('#sign-out-button') as HTMLInputElement).style.display = 'none';
    (document.querySelector('#greetings') as HTMLInputElement).style.display = 'none';
    (document.querySelector('.auth-button') as HTMLInputElement).style.display = 'block';
  }

  private async fetchHighScores() {
    (document.querySelector('#high-scores-modal') as HTMLInputElement).style.display = 'block';
    const response = await fetch('/.netlify/functions/highscores');
    const { highscores } = await response.json();
    let tableHead = '<tr><th>Rank</th><th>Username</th><th>Scores</th><th>Country</th></tr>';
    highscores.forEach((player: {
      username: string; scores: string; country: string;
    }, index: number) => {
      tableHead += `<tr>
          <td>${index + 1} </td>
          <td>${player.username}</td>        
          <td>${player.scores}</td>        
          <td><span class='fi fi-${player.country.toLowerCase()}'></span></td>        
      </tr>`;
    });
    (document.getElementById('rank-table') as HTMLInputElement).innerHTML = tableHead;
  }

  private closeHighScoreModal() {
    (document.querySelector('#high-scores-modal') as HTMLInputElement).style.display = 'none';
  }

  private logoutUser() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');

    this.loadLogoutScreen();
  }

  initialize() {
    (document.querySelector('.auth-button') as HTMLInputElement).style.display = 'block';

    (document.querySelector('#overwrite-online-backup-btn') as HTMLInputElement).onclick = () => {
      this.overwriteOnlineBackup();
    };

    const token = localStorage.getItem('token');
    if (token) {
      this.loadLoginScreen();
      (document.querySelector('#score-board-button') as HTMLInputElement).style.display = 'none';
    }

    (document.querySelector('#main-menu-buttons') as HTMLInputElement).style.display = 'flex';
    
    // Show Start Screen Stats
    const startStats = document.getElementById('start-screen-stats');
    if (startStats) startStats.classList.remove('hidden');

    // Update Start Screen Stats
    const totalCoinsEl = document.getElementById('total-coins-display');
    const totalCoins = localStorage.getItem('total-coins');
    if (totalCoinsEl) totalCoinsEl.innerText = totalCoins ? JSON.parse(totalCoins).toString() : '0';
    
    const highScoreEl = document.getElementById('high-score-display');
    const highScore = localStorage.getItem('high-score');
    if (highScoreEl) highScoreEl.innerText = highScore ? JSON.parse(highScore).toString() : '0';

    // Hide Play HUD if visible
    const playHud = document.getElementById('play-hud');
    if (playHud) playHud.classList.add('hidden');

    // Hide legacy container if it exists
    const legacyHighScore = document.querySelector('.high-score-container') as HTMLElement;
    if (legacyHighScore) legacyHighScore.style.display = 'none';

    const authBtn = document.querySelector('.auth-button') as HTMLElement;
    if (authBtn) {
      authBtn.onclick = () => {
        this.displaySignUpForm();
      };
    }

    const aboutBtn = document.querySelector('#about-button') as HTMLElement;
    if (aboutBtn) {
      aboutBtn.onclick = () => {
        this.displayAboutModal();
      };
    }

    const closeAboutBtn = document.querySelector('#close-about-btn') as HTMLElement;
    if (closeAboutBtn) {
      closeAboutBtn.onclick = () => {
        this.hideAboutModal();
      };
    }

    if (!this.visible) {
      this.visible = true;
    }

    if (!this.clock.running) {
      this.clock.start();
    }
    (document.querySelector('#score-board-button') as HTMLInputElement).style.display = 'block';
    this.allGameCharacters = (JSON.parse(localStorage.getItem('allGameCharacters')!));

    console.log('📋 All characters:', this.allGameCharacters.map(c => ({ name: c.name, isActive: c.isActive })));

    this.activeIndexNumber = this.allGameCharacters
      .findIndex((character) => character.isActive === true);
    
    // Ensure we have a valid index (default to 0 if not found)
    if (this.activeIndexNumber === -1) this.activeIndexNumber = 0;

    console.log('🎯 Active character index:', this.activeIndexNumber, 'Character:', this.allGameCharacters[this.activeIndexNumber]?.name);

    this.activeCharacter = this.charactersContainer[this.activeIndexNumber];
    this.activeCharacterAnimation = this.animationsContainer[this.activeIndexNumber];
    
    console.log('🎮 Active character loaded:', this.activeCharacter);
    
    this.activeCharacter.scale.set(0.1, 0.1, 0.1);
    this.activeCharacter.position.set(0, -35, -110);
    
    // Fix rotation for GLB models (Flash character)
    const activeChar = this.allGameCharacters[this.activeIndexNumber];
    if (activeChar.isGlb) {
      // Default rotation for Flash
      const defaultRotZ = -0.01; // -0.57 degrees
      const defaultRotY = 3.232; // 185.16 degrees
      
      // Adjust rotation to stand upright - GLB models may be rotated differently
      this.activeCharacter.rotation.set(0, defaultRotY, defaultRotZ);
      this.activeCharacter.position.y = -35; // Standard position
      
      // Apply saved adjustments if any
      const savedRotZ = localStorage.getItem('glbRotationZ');
      const savedRotY = localStorage.getItem('glbRotationY');
      if (savedRotZ) this.activeCharacter.rotation.z = parseFloat(savedRotZ);
      if (savedRotY) this.activeCharacter.rotation.y = parseFloat(savedRotY);
      
      console.log('✅ Applied GLB rotation fix, Z:', this.activeCharacter.rotation.z.toFixed(2), 'Y:', this.activeCharacter.rotation.y.toFixed(2));
    }
    
    this.activeCharacter.visible = true;
    this.animationMixer = new AnimationMixer(this.activeCharacter);
    
    // Setup cycling if multiple animations exist (Flash Idles)
    if (this.activeCharacterAnimation.animations.length > 1) {
        this.idleAnimations = this.activeCharacterAnimation.animations;
        this.idleIndex = 0;
        this.idleTimer = 0;
        
        const firstClip = this.idleAnimations[0];
        this.currentAction = this.animationMixer.clipAction(firstClip);
        this.currentAction.setLoop(LoopRepeat, Infinity); // Loop until switched
        this.currentAction.play();
        
        console.log(`🎬 [MainMenu] Started idle cycle with ${this.idleAnimations.length} animations`);
    } else {
        // Fallback for single animation characters
        this.idleAnimations = [];
        this.dancingAnimation = this.animationMixer
          .clipAction(this.activeCharacterAnimation.animations[0]);
        this.dancingAnimation.play();
        this.currentAction = this.dancingAnimation;
    }
    
    // Re-apply Unlit Mode (in case material was reset or new character)
    this.makeCharacterUnlit();

    (document.querySelector('#close-signup-form') as HTMLInputElement).onclick = () => {
      this.closeSignUpForm();
    };
    (document.querySelector('#close-signin-form') as HTMLInputElement).onclick = () => {
      this.closeSignInForm();
    };
    (document.querySelector('#sign-out-button') as HTMLInputElement).onclick = () => {
      this.logoutUser();
    };
    (document.querySelector('#sign-in-button') as HTMLInputElement).onclick = () => {
      this.displaySignInForm();
    };
    (document.querySelector('#sign-up-button') as HTMLInputElement).onclick = () => {
      this.displaySignUpForm();
    };
    (document.querySelector('#score-board-button') as HTMLInputElement).onclick = () => {
      this.fetchHighScores();
    };
    (document.querySelector('#close-highscores-modal') as HTMLInputElement).onclick = () => {
      this.closeHighScoreModal();
    };
    (document.querySelector('#register-button') as HTMLInputElement).onclick = () => {
      this.signUpUser();
    };
    (document.querySelector('#login-button') as HTMLInputElement).onclick = () => {
      this.signInUser();
    };
    
    // Add rotation and position adjustment controls
    document.addEventListener('keydown', (e) => {
      if (this.activeCharacter && this.visible) {
        const rotationStep = 0.01; // radians per press
        const positionStep = 0.5; // units per press
        
        const activeChar = this.allGameCharacters[this.activeIndexNumber];
        
        if (e.key === 'n' || e.key === 'N') {
          // Rotate left (decrease Y rotation) - Matches FreshScene 'n'
          this.activeCharacter.rotation.y -= rotationStep;
          if (activeChar.isGlb) localStorage.setItem('glbRotationY', this.activeCharacter.rotation.y.toString());
          console.log('🔄 Rotation Y:', (this.activeCharacter.rotation.y * 180 / Math.PI).toFixed(2), 'degrees');
        } else if (e.key === 'm' || e.key === 'M') {
          // Rotate right (increase Y rotation) - Matches FreshScene 'm'
          this.activeCharacter.rotation.y += rotationStep;
          if (activeChar.isGlb) localStorage.setItem('glbRotationY', this.activeCharacter.rotation.y.toString());
          console.log('🔄 Rotation Y:', (this.activeCharacter.rotation.y * 180 / Math.PI).toFixed(2), 'degrees');
        } else if (e.key === 'o' || e.key === 'O') {
          // Tilt left (decrease Z rotation) - Matches FreshScene 'o'
          this.activeCharacter.rotation.z -= rotationStep;
          if (activeChar.isGlb) localStorage.setItem('glbRotationZ', this.activeCharacter.rotation.z.toString());
          console.log('🔄 Rotation Z:', (this.activeCharacter.rotation.z * 180 / Math.PI).toFixed(2), 'degrees');
        } else if (e.key === 'p' || e.key === 'P') {
          // Tilt right (increase Z rotation) - Matches FreshScene 'p'
          this.activeCharacter.rotation.z += rotationStep;
          if (activeChar.isGlb) localStorage.setItem('glbRotationZ', this.activeCharacter.rotation.z.toString());
          console.log('🔄 Rotation Z:', (this.activeCharacter.rotation.z * 180 / Math.PI).toFixed(2), 'degrees');
        } else if (e.key === 'z' || e.key === 'Z') {
          this.startIntroSequence();
        }
      }
    });

    // Start Intro Sequence
    this.startIntroSequence();

    // Add click listener to skip intro (only once)
    if (!this.hasIntroListener) {
        window.addEventListener('mousedown', () => {
            if (this.visible && this.introState !== 'complete') {
                this.skipIntroSequence();
            }
        });
        this.hasIntroListener = true;
    }
  }

  private hasIntroListener = false;

  update() {
    if (this.animationMixer) {
      this.delta = this.clock.getDelta();
      this.animationMixer.update(this.delta);

      // Intro Sequence Logic
      if (this.introState !== 'complete') {
          this.updateIntroSequence(this.delta);
      } else {
          // Idle Effect Phase
          if (this.idleEffectActive) {
              this.updateEffects(this.delta);
              this.idleEffectTimer += this.delta;
              if (this.idleEffectTimer > 2.0) {
                  this.idleEffectActive = false;
              }
          }

          // Cycle animations every 3.5s
          if (this.idleAnimations.length > 0) {
            this.idleTimer += this.delta;
            if (this.idleTimer > this.IDLE_INTERVAL) {
              this.idleTimer = 0;
              this.playNextIdle();
            }
          }
      }
      
      this.updateBolts(this.delta);
    }
  }

  private playNextIdle() {
    if (this.idleAnimations.length === 0) return;

    this.idleIndex++;
    if (this.idleIndex >= this.idleAnimations.length) {
      this.idleIndex = 0;
    }

    const nextClip = this.idleAnimations[this.idleIndex];
    const nextAction = this.animationMixer.clipAction(nextClip);
    
    // Configure next action
    nextAction.setLoop(LoopRepeat, Infinity);
    nextAction.reset();

    // Crossfade
    if (this.currentAction) {
        this.currentAction.crossFadeTo(nextAction, 0.5, true);
    }
    
    nextAction.play();
    this.currentAction = nextAction;
    
    console.log(`🎬 [MainMenu] Transitioning to idle: ${nextClip.name}`);
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
      console.log('💡 [MainMenu] Character set to Unlit (Bright) Mode');
  }

  private skipIntroSequence() {
      if (this.introState === 'complete') return;
      
      console.log('⏩ [MainMenu] Skipping Intro Sequence');
      this.introState = 'complete';
      
      // 1. Finalize Cave
      this.caveMaterials.forEach(m => m.opacity = 1);
      
      // 2. Finalize Character
      if (this.activeCharacter) {
          this.activeCharacter.visible = true;
          this.activeCharacter.position.set(0, -35, -110);
          this.activeCharacter.rotation.set(0, Math.PI, 0); // Face camera
      }
      
      // 3. Start Idle Animation
      this.startIdleLoop();
      
      // 4. Show UI
      const menuBtns = document.querySelector('#main-menu-buttons') as HTMLElement;
      if (menuBtns) {
          menuBtns.style.display = 'flex';
          menuBtns.classList.add('fade-in');
      }
      
      const startStats = document.getElementById('start-screen-stats');
      if (startStats) {
          startStats.classList.remove('hidden');
          startStats.classList.add('fade-in');
      }
      
      const scoreBoardBtn = document.querySelector('#score-board-button') as HTMLElement;
      if (scoreBoardBtn) scoreBoardBtn.style.display = 'block';
      
      const authBtn = document.querySelector('.auth-button') as HTMLElement;
      if (authBtn) authBtn.style.display = 'block';
  }

  private startIntroSequence() {
      console.log('🎬 [MainMenu] Starting Intro Sequence');
      this.introState = 'cave-fade-in';
      this.introTimer = 0;
      
      // Hide UI
      const menuBtns = document.querySelector('#main-menu-buttons') as HTMLElement;
      if (menuBtns) menuBtns.style.display = 'none';
      
      const startStats = document.getElementById('start-screen-stats');
      if (startStats) startStats.classList.add('hidden');
      
      const scoreBoardBtn = document.querySelector('#score-board-button') as HTMLElement;
      if (scoreBoardBtn) scoreBoardBtn.style.display = 'none';
      
      const authBtn = document.querySelector('.auth-button') as HTMLElement;
      if (authBtn) authBtn.style.display = 'none';

      // Reset Cave Opacity
      this.caveMaterials.forEach(m => m.opacity = 0);
      
      // Hide Character initially
      if (this.activeCharacter) {
          this.activeCharacter.visible = false;
      }
  }

  private updateIntroSequence(dt: number) {
      this.introTimer += dt;
      
      switch (this.introState) {
          case 'cave-fade-in':
              // Fade in over 1.5s
              const fadeProgress = Math.min(this.introTimer / 1.5, 1);
              this.caveMaterials.forEach(m => m.opacity = fadeProgress);
              
              if (this.introTimer >= 1.5) {
                  this.introState = 'sprint-left';
                  this.introTimer = 0;
                  this.setupSprintRun(-20); // Left
              }
              break;
              
          case 'sprint-left':
              this.moveSprintRun(dt, 1.0); // 1.0s duration (Fast!)
              if (this.introTimer >= 1.0) {
                  this.introState = 'sprint-right';
                  this.introTimer = 0;
                  this.setupSprintRun(20); // Right
              }
              break;
              
          case 'sprint-right':
              this.moveSprintRun(dt, 1.0);
              if (this.introTimer >= 1.0) {
                  this.introState = 'sprint-center';
                  this.introTimer = 0;
                  this.setupSprintRun(0, -110); // Center, stop at -110
              }
              break;
              
          case 'sprint-center':
              // 4x Faster: Duration 0.25s instead of 1.0s
              this.moveSprintRun(dt, 0.25, true); 
              if (this.introTimer >= 0.25) {
                  this.finishIntroSequence();
              }
              break;
      }
      
      // Update Effects during sprint
      if (this.introState.startsWith('sprint')) {
          this.updateEffects(dt);
      }
  }
  
  private setupSprintRun(x: number, targetZ?: number) {
      if (!this.activeCharacter) return;
      
      this.activeCharacter.visible = true;
      // Start near camera (Z=50), running into distance (Negative Z)
      this.activeCharacter.position.set(x, -35, 50); 
      
      // Play Sprint Animation
      if (this.sprintClip && this.animationMixer) {
          const action = this.animationMixer.clipAction(this.sprintClip);
          
          // Ensure it loops
          action.setLoop(LoopRepeat, Infinity);
          action.timeScale = 3.0; // Fast animation (3x)

          if (this.currentAction !== action) {
              if (this.currentAction) this.currentAction.stop();
              action.reset().play();
              this.currentAction = action;
          } else {
              // If it's the same action, just reset it to start
              action.reset();
          }
      }
  }
  
  private moveSprintRun(dt: number, duration: number, stopAtTarget = false) {
      if (!this.activeCharacter) return;
      
      const startZ = 50;
      const endZ = stopAtTarget ? -110 : -800; // Into the cave
      const distance = endZ - startZ; // Negative distance
      const speed = distance / duration;
      
      // Move
      this.activeCharacter.position.z += speed * dt;
      
      // Clamp if stopping
      if (stopAtTarget && this.activeCharacter.position.z <= endZ) {
          this.activeCharacter.position.z = endZ;
      }
  }
  
  private finishIntroSequence() {
      console.log('✅ [MainMenu] Intro Sequence Complete');
      this.introState = 'complete';
      
      // Start Idle Effect (Effect 1)
      this.idleEffectActive = true;
      this.idleEffectTimer = 0;

      // Play Warmup Animation Once, then Idle Loop
      if (this.warmupClip && this.animationMixer) {
          this.animationMixer.stopAllAction();
          
          const warmAction = this.animationMixer.clipAction(this.warmupClip);
          warmAction.setLoop(LoopOnce, 1);
          warmAction.clampWhenFinished = true;
          warmAction.reset().play();
          this.currentAction = warmAction;
          
          // Listen for finish
          const onFinished = (e: any) => {
              if (e.action === warmAction) {
                  this.animationMixer.removeEventListener('finished', onFinished);
                  this.startIdleLoop();
              }
          };
          this.animationMixer.addEventListener('finished', onFinished);
      } else {
          // Fallback if no warmup
          this.startIdleLoop();
      }
      
      // Show UI
      const menuBtns = document.querySelector('#main-menu-buttons') as HTMLElement;
      if (menuBtns) {
          menuBtns.style.display = 'flex';
          menuBtns.classList.add('fade-in');
      }
      
      const startStats = document.getElementById('start-screen-stats');
      if (startStats) {
          startStats.classList.remove('hidden');
          startStats.classList.add('fade-in');
      }
      
      const scoreBoardBtn = document.querySelector('#score-board-button') as HTMLElement;
      if (scoreBoardBtn) scoreBoardBtn.style.display = 'block';
      
      const authBtn = document.querySelector('.auth-button') as HTMLElement;
      if (authBtn) authBtn.style.display = 'block';
  }

  private startIdleLoop() {
      if (this.idleAnimations.length > 0) {
          // Reset mixer to ensure clean state
          // Don't stopAllAction here if we want to blend from warmup? 
          // Actually, let's crossfade.
          
          const firstClip = this.idleAnimations[0];
          const action = this.animationMixer.clipAction(firstClip);
          action.setLoop(LoopRepeat, Infinity);
          action.reset();
          
          if (this.currentAction) {
              this.currentAction.crossFadeTo(action, 0.5, true);
          }
          
          action.play();
          this.currentAction = action;
          this.idleIndex = 0;
      }
  }

  private updateEffects(delta: number) {
      this.boltTimer += delta;
      if (this.boltTimer > 0.02) {
          this.boltTimer = 0;
          
          // Pick random color (Red or Orange)
          const color = this.effectColors[Math.floor(Math.random() * this.effectColors.length)];

          if (this.introState.startsWith('sprint')) {
              // SPRINT MODE
              
              // Determine Linger Time
              // Left/Right = 1.5s, Center = 0.5s
              const linger = (this.introState === 'sprint-center') ? 0.5 : 1.5;
              
              // 1. Static (Standard)
              this.spawnRandomBolt(
                  this.activeCharacter.position.clone().add(new Vector3(0, 0, 0)), 
                  15, 0.2, 2, color, linger 
              );

              // 2. Trail (Longer, Thicker)
              const offset = new Vector3(
                  (Math.random()-0.5) * 8, 
                  (Math.random()-0.5) * 15 + 10, 
                  (Math.random()-0.5) * 5
              );
              const start = this.activeCharacter.position.clone().add(offset);
              // Trail extends backwards (+Z) - Much longer (80 + random)
              const end = start.clone().add(new Vector3(0, 0, 80 + Math.random() * 40)); 
              this.spawnDirectedBolt(start, end, 0.3, 1.0, color, linger); 
          } else {
              // IDLE MODE (Effect 1): Static Only, Standard Thickness, Short Linger
              this.spawnRandomBolt(
                  this.activeCharacter.position.clone().add(new Vector3(0, 0, 0)), 
                  15, 0.1, 2, color, 0.2 
              );
              this.spawnRandomBolt(
                  this.activeCharacter.position.clone().add(new Vector3(0, 10, 0)), 
                  15, 0.1, 2, color, 0.2 
              );
          }
      }
  }

  private spawnRandomBolt(center: Vector3, range: number, thickness: number, jitter: number, color: number, lifeTime: number = 0.2) {
      const start = center.clone().add(new Vector3(
          (Math.random() - 0.5) * range * 0.5,
          (Math.random() - 0.5) * range * 0.8,
          (Math.random() - 0.5) * range * 0.5
      ));

      const end = start.clone().add(new Vector3(
          (Math.random() - 0.5) * range,
          (Math.random() - 0.5) * range,
          (Math.random() - 0.5) * range
      ));
      
      this.spawnDirectedBolt(start, end, thickness, jitter, color, lifeTime);
  }

  private spawnDirectedBolt(start: Vector3, end: Vector3, thickness: number, jitter: number, color: number, lifeTime: number = 0.2) {
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
      
      // Core Bolt (0.8 Opacity)
      const geo = new TubeGeometry(curve, 4, thickness, 3, false); 
      const mat = new MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8 });
      const mesh = new Mesh(geo, mat);
      mesh.userData = { age: 0, lifeTime: lifeTime, originalOpacity: 0.8 };
      this.add(mesh);
      this.effect3Bolts.push(mesh);

      // Glow Layer (Fake Blur - Thicker, Lower Opacity)
      const geoGlow = new TubeGeometry(curve, 4, thickness * 2.5, 3, false); 
      const matGlow = new MeshBasicMaterial({ color: color, transparent: true, opacity: 0.3 });
      const meshGlow = new Mesh(geoGlow, matGlow);
      meshGlow.userData = { age: 0, lifeTime: lifeTime, originalOpacity: 0.3 };
      this.add(meshGlow);
      this.effect3Bolts.push(meshGlow);
  }

  private updateBolts(dt: number) {
      for (let i = this.effect3Bolts.length - 1; i >= 0; i--) {
          const bolt = this.effect3Bolts[i];
          
          // Update Age
          if (bolt.userData.age === undefined) bolt.userData.age = 0;
          bolt.userData.age += dt;
          
          const lifeTime = bolt.userData.lifeTime || 0.2;
          const originalOpacity = bolt.userData.originalOpacity || 1.0;
          
          // Linger then fade
          if (bolt.userData.age > lifeTime) {
              (bolt.material as MeshBasicMaterial).opacity -= dt * 5; 
          } else {
              (bolt.material as MeshBasicMaterial).opacity = originalOpacity;
          }

          if ((bolt.material as MeshBasicMaterial).opacity <= 0) {
              this.remove(bolt);
              bolt.geometry.dispose();
              (bolt.material as MeshBasicMaterial).dispose();
              this.effect3Bolts.splice(i, 1);
          }
      }
  }

  hide() {
    this.visible = false;
    this.clock.stop();
    (document.querySelector('#main-menu-buttons') as HTMLInputElement).style.display = 'none';
    
    const startStats = document.getElementById('start-screen-stats');
    if (startStats) startStats.classList.add('hidden');

    // (document.querySelector('.high-score-container') as HTMLInputElement).style.display = 'none';
    this.activeCharacter.visible = false;
    (document.querySelector('.auth-button') as HTMLInputElement).style.display = 'none';
    (document.querySelector('#score-board-button') as HTMLInputElement).style.display = 'none';
    (document.querySelector('#sign-out-button') as HTMLInputElement).style.display = 'none';
    (document.querySelector('#greetings') as HTMLInputElement).style.display = 'none';
  }
}
