import {
  Scene, DirectionalLight, AmbientLight, Object3D, AnimationMixer, AnimationAction, Clock,
} from 'three';

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

import Toastify from 'toastify-js';

import allCharacters from '../allCharacters';
import { loadCachedFbx } from '../assetCache';

import { IallGameCharacters } from '../types';

export default class CharacterSelectionScene extends Scene {
  public loaded = false;
  public showProgressInUI = false;
  private loadingPromise: Promise<void> | null = null;
  private fbxLoader = new FBXLoader();

  private woodenCave = new Object3D();

  private allGameCharacters: IallGameCharacters[] = [];

  private animationMixer!: AnimationMixer;

  private dancingAnimation!: AnimationAction;

  private delta = 0;

  private clock = new Clock();

  private xbot = new Object3D();

  private jolleen = new Object3D();

  private peasantGirl = new Object3D();

  private xbotAnimation!: Object3D;

  private jolleenAnimation!: Object3D;

  private peasantGirlAnimation!: Object3D;

  private charactersContainer: Object3D[] = [];

  private animationsContainer: Object3D[] = [];

  private activeCharacter = new Object3D();

  private activeCharacterAnimation!: Object3D;

  private activeIndexNumber = 0;

  private updateLoading(percent: number) {
    if (!this.showProgressInUI) return;
    const pctEl = document.querySelector('.loading-percentage') as HTMLElement;
    if (pctEl) pctEl.innerHTML = `${percent}%`;
    
    const barEl = document.querySelector('#loading-bar-fill') as HTMLElement;
    if (barEl) barEl.style.width = `${percent}%`;
  }

  async load() {
    if (this.loaded) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = (async () => {
    this.woodenCave = await loadCachedFbx('./assets/models/wooden-cave.fbx');
    this.woodenCave.position.set(0, 0, -500);
    this.woodenCave.scale.set(0.055, 0.055, 0.055);
    this.add(this.woodenCave);

    this.updateLoading(50);

    const ambient = new AmbientLight(0xFFFFFF, 2.5);
    this.add(ambient);

    const light = new DirectionalLight(0xFFFFFF, 2.5);

    light.position.set(0, 40, -10);
    this.add(light);

    if (!JSON.parse(localStorage.getItem('allGameCharacters') !)) {
      localStorage.setItem('allGameCharacters', JSON.stringify(allCharacters));
    }

    this.allGameCharacters = (JSON.parse(localStorage.getItem('allGameCharacters') !));

    // [1]=Xbot, [2]=Jolleen, [3]=Peasant Girl (Flash is [0])
    this.xbot = await loadCachedFbx(this.allGameCharacters[1].model);
    this.updateLoading(60);

    this.jolleen = await loadCachedFbx(this.allGameCharacters[2].model);

    this.updateLoading(70);

    this.peasantGirl = await loadCachedFbx(this.allGameCharacters[3].model);

    this.updateLoading(80);

    this.xbotAnimation = await loadCachedFbx(this.allGameCharacters[1].danceAnimation);

    this.updateLoading(90);
    this.jolleenAnimation = await loadCachedFbx(this.allGameCharacters[2]
      .danceAnimation);

    this.peasantGirlAnimation = await loadCachedFbx(this.allGameCharacters[3]
      .danceAnimation);

    this.updateLoading(100);

    this.xbot.visible = false;
    this.jolleen.visible = false;
    this.peasantGirl.visible = false;

    this.add(this.xbot);
    this.add(this.jolleen);
    this.add(this.peasantGirl);

    this.charactersContainer.push(this.xbot, this.jolleen, this.peasantGirl);
    this.animationsContainer.push(
      this.xbotAnimation,
      this.jolleenAnimation,
      this.peasantGirlAnimation,
    );

    this.hide();
    this.loaded = true;
    })();
    return this.loadingPromise;
  }

  private nextCharacter() {
    if (this.activeIndexNumber + 1 !== this.allGameCharacters.length) {
      this.activeCharacter.visible = false;
      this.activeIndexNumber += 1;
      this.activeCharacter = this.charactersContainer[this.activeIndexNumber];
      this.activeCharacterAnimation = this.animationsContainer[this.activeIndexNumber];
      this.activeCharacter.scale.set(0.1, 0.1, 0.1);
      this.activeCharacter.position.set(0, -35, -110);
      this.activeCharacter.visible = true;
      this.animationMixer = new AnimationMixer(this.activeCharacter);
      this.dancingAnimation = this.animationMixer
        .clipAction(this.activeCharacterAnimation.animations[0]);
      this.dancingAnimation.play();
    }
  }

  private prevCharacter() {
    if (this.activeIndexNumber !== 0) {
      this.activeCharacter.visible = false;
      this.activeIndexNumber -= 1;
      this.activeCharacter = this.charactersContainer[this.activeIndexNumber];
      this.activeCharacterAnimation = this.animationsContainer[this.activeIndexNumber];
      this.activeCharacter.scale.set(0.1, 0.1, 0.1);
      this.activeCharacter.position.set(0, -35, -110);
      this.activeCharacter.visible = true;
      this.animationMixer = new AnimationMixer(this.activeCharacter);
      this.dancingAnimation = this.animationMixer
        .clipAction(this.activeCharacterAnimation.animations[0]);
      this.dancingAnimation.play();
    }
  }

  async activateCharacter() {
    const savedPlayerData:IallGameCharacters[] = JSON.parse(localStorage.getItem('allGameCharacters')!);
    const updatedPlayerData = savedPlayerData.map((playerInfo, index: number) => {
      if (this.activeIndexNumber === index) {
        return {
          ...playerInfo, isActive: true, price: 0, isLocked: false,
        };
      }
      return { ...playerInfo, isActive: false };
    });
    localStorage.setItem('allGameCharacters', JSON.stringify(updatedPlayerData));
    this.allGameCharacters = updatedPlayerData;

    const token = localStorage.getItem('token');
    if (token) {
      try {
        (document.querySelector('.auto-save-loader') as HTMLInputElement).style.display = 'block';
        const response = await fetch('/.netlify/functions/save-characters-and-coins', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            authorization: token,
          },
          body: JSON.stringify({ characters: JSON.stringify(updatedPlayerData), coins: Number(localStorage.getItem('total-coins')) }),
        });
        (document.querySelector('.auto-save-loader') as HTMLInputElement).style.display = 'none';
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
          }
        }
      } catch (error) {
        (document.querySelector('.auto-save-loader') as HTMLInputElement).style.display = 'none';
      }
    }
  }

  purchaseCharacter() {
    const totalCoins = Number(localStorage.getItem('total-coins'));
    if (totalCoins >= this.allGameCharacters[this.activeIndexNumber].price) {
      const remainingCoins = totalCoins - Number(this.allGameCharacters[this.activeIndexNumber]
        .price);
      localStorage.setItem('total-coins', remainingCoins.toString()!);
      this.activateCharacter();
      (document.querySelector('.coins-count') as HTMLInputElement).innerHTML = `${remainingCoins}`;
    }
  }

  initialize() {
    this.activeCharacter = this.charactersContainer[this.activeIndexNumber];
    this.activeCharacterAnimation = this.animationsContainer[this.activeIndexNumber];
    this.activeCharacter.scale.set(0.1, 0.1, 0.1);
    this.activeCharacter.position.set(0, -35, -110);
    this.activeCharacter.visible = true;
    this.animationMixer = new AnimationMixer(this.activeCharacter);
    this.dancingAnimation = this.animationMixer
      .clipAction(this.activeCharacterAnimation.animations[0]);
    this.dancingAnimation.play();

    (document.getElementById('next-btn') as HTMLInputElement).onclick = () => {
      this.nextCharacter();
    };

    (document.getElementById('prev-btn') as HTMLInputElement).onclick = () => {
      this.prevCharacter();
    };

    (document.getElementById('character-price-button') as HTMLInputElement).onclick = () => {
      this.purchaseCharacter();
    };

    (document.getElementById('select-character-btn') as HTMLInputElement).onclick = () => {
      this.activateCharacter();
    };

    (document.querySelector('.hud-stats-container') as HTMLInputElement).style.display = 'flex';
    (document.querySelector('.coins-count') as HTMLInputElement).innerHTML = localStorage.getItem('total-coins') || '0';
    (document.querySelector('.scores-count') as HTMLInputElement).innerHTML = '0';
    (document.querySelector('#character-selection-container') as HTMLInputElement).style.display = 'block';
    (document.querySelector('.home-menu') as HTMLInputElement).style.display = 'block';

    if (!this.visible) {
      this.visible = true;
    }

    if (!this.clock.running) {
      this.clock.start();
    }
  }

  update() {
    if (this.animationMixer) {
      this.delta = this.clock.getDelta();
      this.animationMixer.update(this.delta);
    }

    (document.querySelector('.home-menu') as HTMLInputElement).style.display = 'block';
    (document.querySelector('.pause-button') as HTMLInputElement).style.display = 'none';
    (document.querySelector('#character-selection-container') as HTMLInputElement).style.display = 'block';
    (document.querySelector('.character-name') as HTMLInputElement).innerHTML = this.allGameCharacters[this.activeIndexNumber].name;

    if (this.allGameCharacters[this.activeIndexNumber].isLocked) {
      (document.getElementById('select-character-btn') as HTMLInputElement).style.display = 'none';
      (document.getElementById('character-price-button') as HTMLInputElement).style.display = 'block';
      (document.getElementById('character-price-text') as HTMLInputElement).innerHTML = `${this.allGameCharacters[this.activeIndexNumber].price}`;
    }

    if (this.allGameCharacters[this.activeIndexNumber].isActive) {
      (document.getElementById('select-character-btn') as HTMLInputElement).style.display = 'block';
      (document.getElementById('character-price-button') as HTMLInputElement).style.display = 'none';
      (document.getElementById('select-button-text') as HTMLInputElement).innerHTML = 'Selected';
    }

    if (!this.allGameCharacters[this.activeIndexNumber]
      .isLocked && !this.allGameCharacters[this.activeIndexNumber].isActive) {
      (document.getElementById('select-character-btn') as HTMLInputElement).style.display = 'block';
      (document.getElementById('character-price-button') as HTMLInputElement).style.display = 'none';
      (document.getElementById('select-button-text') as HTMLInputElement).innerText = 'Select';
    }
  }

  hide() {
    this.visible = false;
    const charSel = document.querySelector('#character-selection-container') as HTMLElement;
    if (charSel) charSel.style.display = 'none';
    
    const homeMenu = document.querySelector('.home-menu') as HTMLElement;
    if (homeMenu) homeMenu.style.display = 'none';
    
    const hudStats = document.querySelector('.hud-stats-container') as HTMLElement;
    if (hudStats) hudStats.style.display = 'none';
    
    this.clock.stop();
  }
}
