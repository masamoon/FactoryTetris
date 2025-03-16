/**
 * A dummy audio plugin for Phaser that provides no-op implementations of audio methods.
 * This is used when audio files can't be loaded to prevent errors.
 */
export default class DummyAudioPlugin {
    constructor(scene) {
        this.scene = scene;
        this.game = scene.game;
        this.systems = scene.sys;
        
        // Add a dummy context that doesn't throw errors
        this.context = {
            resume: () => console.log('[DummyAudio] Mock resume called'),
            suspend: () => console.log('[DummyAudio] Mock suspend called'),
            close: () => console.log('[DummyAudio] Mock close called'),
            state: 'running'
        };
        
        // Add this plugin to the scene
        this.systems.events.once('boot', this.boot, this);
    }
    
    boot() {
        // Register this plugin with the scene
        this.systems.events.once('destroy', this.destroy, this);
    }
    
    // No-op implementations of audio methods
    add(key, config) {
        return {
            play: () => {},
            stop: () => {},
            pause: () => {},
            resume: () => {},
            setVolume: () => {},
            setLoop: () => {},
            setMute: () => {},
            destroy: () => {},
            isPlaying: false,
            isPaused: false,
            isMuted: false,
            volume: 1,
            loop: false
        };
    }
    
    play(key, config) {
        return this.add(key, config);
    }
    
    get(key) {
        return null;
    }
    
    remove(sound) {
        return true;
    }
    
    removeByKey(key) {
        return true;
    }
    
    stopAll() {
        return this;
    }
    
    pauseAll() {
        return this;
    }
    
    resumeAll() {
        return this;
    }
    
    setVolume(volume) {
        return this;
    }
    
    setMute(mute) {
        return this;
    }
    
    setRate(rate) {
        return this;
    }
    
    // Additional methods needed by Phaser's sound manager
    suspend() {
        console.log('[DummyAudio] Plugin suspend called');
        if (this.context) this.context.suspend();
        return this;
    }
    
    resume() {
        console.log('[DummyAudio] Plugin resume called');
        if (this.context) this.context.resume();
        return this;
    }
    
    destroy() {
        console.log('[DummyAudio] Plugin destroy called');
        if (this.context) {
            // Avoid destroying the context if it might be used elsewhere
            this.context = null;
        }
        this.systems = null;
        this.game = null;
        this.scene = null;
    }
} 