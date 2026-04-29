import { Group, Object3D, Box3, Box3Helper, Color, Vector3, BoxGeometry, MeshBasicMaterial, Mesh, MeshPhongMaterial } from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export class FreshObstacleManager {
    private scene: Object3D;
    private barrelObject!: Object3D;
    private spikeObject!: Object3D;
    private coinObject!: Object3D;
    private boxObject!: Object3D;
    
    private obstacles: Group[] = [];
    private coins: Group[] = [];
    
    private activeObstacles: Group[] = [];
    private activeCoins: Group[] = [];
    
    public isGenerating = true;
    private spawnTimer = 0;
    private spawnInterval = 2.0; // Seconds between spawns
    private coinSpawnTimer = 0;
    private coinSpawnInterval = 1.5;

    private coinSpinSpeed = 1.6;

    private obstacleCollisionBox = new Box3();

    private coinCollisionBox = new Box3();

    private readonly collisionRearBuffer = 40;

    private readonly collisionFrontBuffer = 140;

    constructor(scene: Object3D) {
        this.scene = scene;
    }

    async loadAssets(loader: FBXLoader) {
        this.barrelObject = await loader.loadAsync('./assets/models/barrel.fbx');
        this.spikeObject = await loader.loadAsync('./assets/models/spike.fbx');
        this.coinObject = await loader.loadAsync('./assets/models/coin.fbx');
        this.boxObject = await loader.loadAsync('./assets/models/box.fbx');
        
        // Pre-scale/rotate if needed
        this.coinObject.rotation.set(90 * (Math.PI / 180), 0, 150 * (Math.PI / 180));
        
        console.log('🚧 [FreshObstacleManager] Assets Loaded');
        
        this.createTemplates();
        this.createCoinTemplates();
    }

    private createTemplates() {
        // Create all obstacle types from RunningScene
        this.obstacles.push(this.createCenterJump());
        this.obstacles.push(this.createLeftJump());
        this.obstacles.push(this.createRightJump());
        this.obstacles.push(this.createLeftRight());
        this.obstacles.push(this.createRightCenter());
        this.obstacles.push(this.createLeftCenter());
        this.obstacles.push(this.createCenterRight());
        
        // Slide Obstacles
        this.obstacles.push(this.createCenterSlide());
        this.obstacles.push(this.createLeftSlide());
        this.obstacles.push(this.createRightSlide());
    }

    private createCoinTemplates() {
        this.coins.push(this.generateLeftCenterRightCoins());
        this.coins.push(this.generateLeftSideCoin());
        this.coins.push(this.generateLeftandCenterCoins());
        this.coins.push(this.generateCenterRightCoins());
        this.coins.push(this.generateRightCoins());
    }

    // --- OBSTACLE CREATORS (Exact copies from RunningScene) ---

    private createCenterJump(): Group {
        const group = new Group();
        // Barrels on sides
        const b1 = this.barrelObject.clone();
        b1.scale.set(0.03, 0.03, 0.03);
        b1.position.set(-20, -25, 0); 
        group.add(b1);

        const b2 = this.barrelObject.clone();
        b2.scale.set(0.03, 0.03, 0.03);
        b2.position.set(20, -25, 0); 
        group.add(b2);

        // Spike in center
        const s1 = this.spikeObject.clone();
        s1.scale.set(0.06, 0.06, 0.06);
        s1.position.set(0, -31, 0); 
        group.add(s1);
        
        this.addHitbox(s1, group);
        this.addHitbox(b1, group);
        this.addHitbox(b2, group);
        
        group.visible = false;
        this.scene.add(group);
        return group;
    }

    private createLeftJump(): Group {
        const group = new Group();
        const b1 = this.barrelObject.clone();
        b1.scale.set(0.03, 0.03, 0.03);
        b1.position.set(0, -25, 0);
        group.add(b1);
        
        const b2 = this.barrelObject.clone();
        b2.scale.set(0.03, 0.03, 0.03);
        b2.position.set(20, -25, 0);
        group.add(b2);
        
        const s1 = this.spikeObject.clone();
        s1.scale.set(0.06, 0.06, 0.06);
        s1.position.set(-20, -31, 0);
        group.add(s1);
        
        this.addHitbox(s1, group);
        this.addHitbox(b1, group);
        this.addHitbox(b2, group);
        
        group.visible = false;
        this.scene.add(group);
        return group;
    }

    private createRightJump(): Group {
        const group = new Group();
        const b1 = this.barrelObject.clone();
        b1.scale.set(0.03, 0.03, 0.03);
        b1.position.set(-20, -25, 0);
        group.add(b1);
        
        const b2 = this.barrelObject.clone();
        b2.scale.set(0.03, 0.03, 0.03);
        b2.position.set(0, -25, 0);
        group.add(b2);
        
        const s1 = this.spikeObject.clone();
        s1.scale.set(0.06, 0.06, 0.06);
        s1.position.set(20, -31, 0);
        group.add(s1);
        
        this.addHitbox(s1, group);
        this.addHitbox(b1, group);
        this.addHitbox(b2, group);
        
        group.visible = false;
        this.scene.add(group);
        return group;
    }

    private createLeftRight(): Group {
        const group = new Group();
        const b1 = this.barrelObject.clone();
        b1.scale.set(0.03, 0.03, 0.03);
        b1.position.set(-20, -25, 0);
        group.add(b1);
        
        const b2 = this.barrelObject.clone();
        b2.scale.set(0.03, 0.03, 0.03);
        b2.position.set(20, -25, 0);
        group.add(b2);
        
        this.addHitbox(b1, group);
        this.addHitbox(b2, group);
        
        group.visible = false;
        this.scene.add(group);
        return group;
    }

    private createRightCenter(): Group {
        const group = new Group();
        const b1 = this.barrelObject.clone();
        b1.scale.set(0.03, 0.03, 0.03);
        b1.position.set(0, -25, 0);
        group.add(b1);
        
        const b2 = this.barrelObject.clone();
        b2.scale.set(0.03, 0.03, 0.03);
        b2.position.set(20, -25, 0);
        group.add(b2);
        
        this.addHitbox(b1, group);
        this.addHitbox(b2, group);
        
        group.visible = false;
        this.scene.add(group);
        return group;
    }

    private createLeftCenter(): Group {
        const group = new Group();
        const b1 = this.barrelObject.clone();
        b1.scale.set(0.03, 0.03, 0.03);
        b1.position.set(-20, -25, 0);
        group.add(b1);
        
        const b2 = this.barrelObject.clone();
        b2.scale.set(0.03, 0.03, 0.03);
        b2.position.set(0, -25, 0);
        group.add(b2);
        
        this.addHitbox(b1, group);
        this.addHitbox(b2, group);
        
        group.visible = false;
        this.scene.add(group);
        return group;
    }

    private createCenterRight(): Group {
        const group = new Group();
        const b1 = this.barrelObject.clone();
        b1.scale.set(0.031, 0.031, 0.031);
        b1.position.set(-20, -25, 0);
        group.add(b1);
        
        const b2 = this.barrelObject.clone();
        b2.scale.set(0.03, 0.03, 0.03);
        b2.position.set(20, -25, 0);
        group.add(b2);
        
        this.addHitbox(b1, group);
        this.addHitbox(b2, group);
        
        group.visible = false;
        this.scene.add(group);
        return group;
    }

    private createCenterSlide(): Group {
        const group = new Group();
        const geometry = new BoxGeometry();
        const material = new MeshPhongMaterial({ color: 'brown' });
        const plank = new Mesh(geometry, material);
        group.add(plank);
        plank.position.set(0, -20, 0);
        plank.scale.set(40, 0.5, 7);
        
        const b1 = this.barrelObject.clone();
        b1.scale.set(0.03, 0.03, 0.03);
        b1.position.set(-20, -25, 0);
        group.add(b1);
        
        const b2 = this.barrelObject.clone();
        b2.scale.set(0.03, 0.03, 0.03);
        b2.position.set(20, -25, 0);
        group.add(b2);
        
        const box = this.boxObject.clone();
        box.scale.set(4, 2, 2);
        box.position.set(0, -19, 3);
        group.add(box);
        
        this.addHitbox(box, group); // Hitbox on the floating box
        this.addHitbox(b1, group);
        this.addHitbox(b2, group);
        
        group.visible = false;
        this.scene.add(group);
        return group;
    }

    private createLeftSlide(): Group {
        const group = new Group();
        const geometry = new BoxGeometry();
        const material = new MeshPhongMaterial({ color: 'brown' });
        const plank = new Mesh(geometry, material);
        group.add(plank);
        plank.position.set(-20, -20, 0);
        plank.scale.set(40, 0.5, 7);
        
        const b1 = this.barrelObject.clone();
        b1.scale.set(0.03, 0.03, 0.03);
        b1.position.set(20, -25, 0);
        group.add(b1);
        
        const b2 = this.barrelObject.clone();
        b2.scale.set(0.03, 0.03, 0.03);
        b2.position.set(0, -25, 0);
        group.add(b2);
        
        const box = this.boxObject.clone();
        box.scale.set(4, 2, 2);
        box.position.set(-20, -19, 3);
        group.add(box);
        
        this.addHitbox(box, group);
        this.addHitbox(b1, group);
        this.addHitbox(b2, group);
        
        group.visible = false;
        this.scene.add(group);
        return group;
    }

    private createRightSlide(): Group {
        const group = new Group();
        const geometry = new BoxGeometry();
        const material = new MeshPhongMaterial({ color: 'brown' });
        const plank = new Mesh(geometry, material);
        group.add(plank);
        plank.position.set(20, -20, 0);
        plank.scale.set(40, 0.5, 7);
        
        const b1 = this.barrelObject.clone();
        b1.scale.set(0.03, 0.03, 0.03);
        b1.position.set(-20, -25, 0);
        group.add(b1);
        
        const b2 = this.barrelObject.clone();
        b2.scale.set(0.03, 0.03, 0.03);
        b2.position.set(0, -25, 0);
        group.add(b2);
        
        const box = this.boxObject.clone();
        box.scale.set(4, 2, 2);
        box.position.set(20, -19, 3);
        group.add(box);
        
        this.addHitbox(box, group);
        this.addHitbox(b1, group);
        this.addHitbox(b2, group);
        
        group.visible = false;
        this.scene.add(group);
        return group;
    }

    // --- COIN CREATORS ---

    private generateLeftCenterRightCoins(): Group {
        const group = new Group();
        for (let i = 0; i < 5; i += 1) {
            const l = this.coinObject.clone();
            const c = this.coinObject.clone();
            const r = this.coinObject.clone();
            l.position.set(-18, -12, -i * 20);
            c.position.set(0, -12, -i * 20);
            r.position.set(18, -12, -i * 20);
            l.scale.set(0.035, 0.035, 0.035);
            c.scale.set(0.035, 0.035, 0.035);
            r.scale.set(0.035, 0.035, 0.035);
            group.add(l, c, r);
        }
        group.position.y = -20;
        group.visible = false;
        this.scene.add(group);
        return group;
    }

    private generateLeftSideCoin(): Group {
        const group = new Group();
        for (let i = 0; i < 5; i += 1) {
            const l = this.coinObject.clone();
            l.position.set(-18, -12, -i * 20);
            l.scale.set(0.035, 0.035, 0.035);
            group.add(l);
        }
        group.position.y = -20;
        group.visible = false;
        this.scene.add(group);
        return group;
    }

    private generateLeftandCenterCoins(): Group {
        const group = new Group();
        for (let i = 0; i < 5; i += 1) {
            const l = this.coinObject.clone();
            const c = this.coinObject.clone();
            l.position.set(-18, -12, -i * 20);
            c.position.set(0, -12, -i * 20);
            l.scale.set(0.035, 0.035, 0.035);
            c.scale.set(0.035, 0.035, 0.035);
            group.add(l, c);
        }
        group.position.y = -20;
        group.visible = false;
        this.scene.add(group);
        return group;
    }

    private generateCenterRightCoins(): Group {
        const group = new Group();
        for (let i = 0; i < 5; i += 1) {
            const c = this.coinObject.clone();
            const r = this.coinObject.clone();
            c.position.set(0, -12, -i * 20);
            r.position.set(18, -12, -i * 20);
            c.scale.set(0.035, 0.035, 0.035);
            r.scale.set(0.035, 0.035, 0.035);
            group.add(c, r);
        }
        group.position.y = -20;
        group.visible = false;
        this.scene.add(group);
        return group;
    }

    private generateRightCoins(): Group {
        const group = new Group();
        for (let i = 0; i < 5; i += 1) {
            const r = this.coinObject.clone();
            r.position.set(18, -12, -i * 20);
            r.scale.set(0.035, 0.035, 0.035);
            group.add(r);
        }
        group.position.y = -20;
        group.visible = false;
        this.scene.add(group);
        return group;
    }

    // --- UTILS ---

    private addHitbox(obj: Object3D, group: Group) {
        const box = new Box3().setFromObject(obj);
        const size = new Vector3();
        box.getSize(size);
        const center = new Vector3();
        box.getCenter(center);
        
        const hitboxGeo = new BoxGeometry(size.x, size.y, size.z);
        const hitboxMat = new MeshBasicMaterial({ color: 0xff0000, wireframe: true });
        const hitbox = new Mesh(hitboxGeo, hitboxMat);
        hitbox.position.copy(center);
        hitbox.name = 'hitbox';
        hitbox.visible = false; // Hidden by default
        group.add(hitbox);
    }

    toggleHitboxes(visible: boolean) {
        // Toggle for all templates
        this.obstacles.forEach(group => {
            group.traverse((child: any) => {
                if (child.name === 'hitbox') child.visible = visible;
            });
        });
        // Toggle for active obstacles
        this.activeObstacles.forEach(group => {
            group.traverse((child: any) => {
                if (child.name === 'hitbox') child.visible = visible;
            });
        });
    }

    toggleGeneration() {
        this.isGenerating = !this.isGenerating;
        console.log(`🚧 [FreshObstacleManager] Generation: ${this.isGenerating ? 'ON' : 'OFF'}`);
        if (!this.isGenerating) {
            // Do NOT clear obstacles, just stop spawning
        }
    }

    reset() {
        this.isGenerating = false;
        this.activeObstacles.forEach(o => {
            o.visible = false;
            o.position.z = -1000; 
        });
        this.activeObstacles = [];
        this.activeCoins.forEach(c => {
            c.visible = false;
            c.position.z = -1000;
        });
        this.activeCoins = [];
    }

    update(delta: number, speed: number) {
        // Always move existing obstacles if speed > 0
        if (speed > 0) {
            // Move Obstacles
            for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
                const obs = this.activeObstacles[i];
                obs.position.z += speed * delta;
                if (obs.position.z > 50) {
                    obs.visible = false;
                    // this.scene.remove(obs); // Don't remove from scene, just hide/recycle
                    this.activeObstacles.splice(i, 1);
                }
            }

            // Move Coins
            for (let i = this.activeCoins.length - 1; i >= 0; i--) {
                const c = this.activeCoins[i];
                for (let childIndex = 0; childIndex < c.children.length; childIndex += 1) {
                    const child = c.children[childIndex];
                    if (!child.visible) continue;
                    child.rotateZ(this.coinSpinSpeed * delta);
                }

                c.position.z += speed * delta;
                if (c.position.z > 50) {
                    c.visible = false;
                    this.activeCoins.splice(i, 1);
                }
            }
        }

        if (!this.isGenerating) return;

        // Spawn Obstacles
        this.spawnTimer += delta;
        if (this.spawnTimer > this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnRandomObstacle();
        }

        // Spawn Coins
        this.coinSpawnTimer += delta;
        if (this.coinSpawnTimer > this.coinSpawnInterval) {
            this.coinSpawnTimer = 0;
            this.spawnRandomCoin();
        }
    }

    private spawnRandomObstacle() {
        const template = this.obstacles[Math.floor(Math.random() * this.obstacles.length)];
        const instance = template.clone();
        instance.position.z = -1000; 
        instance.visible = true;
        this.scene.add(instance);
        this.activeObstacles.push(instance);
    }

    private spawnRandomCoin() {
        const template = this.coins[Math.floor(Math.random() * this.coins.length)];
        const instance = template.clone();
        instance.position.z = -1000;
        instance.visible = true;
        this.scene.add(instance);
        this.activeCoins.push(instance);
    }
    
    checkCollisions(playerBox: Box3, isInvulnerable: boolean): boolean {
        if (isInvulnerable) return false;
        const minZ = playerBox.min.z - this.collisionRearBuffer;
        const maxZ = playerBox.max.z + this.collisionFrontBuffer;
        
        for (let groupIndex = 0; groupIndex < this.activeObstacles.length; groupIndex += 1) {
            const obs = this.activeObstacles[groupIndex];
            if (obs.position.z < minZ || obs.position.z > maxZ) continue;

            for (let childIndex = 0; childIndex < obs.children.length; childIndex += 1) {
                const child = obs.children[childIndex] as any;
                if (child.name !== 'hitbox') continue;

                this.obstacleCollisionBox.setFromObject(child);
                if (playerBox.intersectsBox(this.obstacleCollisionBox)) {
                    return true;
                }
            }
        }
        return false;
    }

    checkCoinCollisions(playerBox: Box3): number {
        let collected = 0;
        const minZ = playerBox.min.z - this.collisionRearBuffer;
        const maxZ = playerBox.max.z + this.collisionFrontBuffer;

        for (let groupIndex = 0; groupIndex < this.activeCoins.length; groupIndex += 1) {
            const group = this.activeCoins[groupIndex];
            if (group.position.z < minZ || group.position.z > maxZ) continue;

            for (let childIndex = 0; childIndex < group.children.length; childIndex += 1) {
                const child = group.children[childIndex] as any;
                if (!child.visible) continue;

                this.coinCollisionBox.setFromObject(child);
                if (playerBox.intersectsBox(this.coinCollisionBox)) {
                    child.visible = false;
                    collected += 1;
                }
            }
        }
        return collected;
    }
}
