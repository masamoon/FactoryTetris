import ConveyorMachine from './ConveyorMachine';
import ExtractorMachine from './ExtractorMachine';
import ProcessorAMachine from './ProcessorAMachine';
import ProcessorBMachine from './ProcessorBMachine';
import AdvancedProcessorMachine from './AdvancedProcessorMachine';
import CargoLoaderMachine from './CargoLoaderMachine';

/**
 * Registry for all machine types
 * This class manages the creation and registration of all machine types
 */
export default class MachineRegistry {
    /**
     * Create a new machine registry
     */
    constructor() {
        // Map of machine type IDs to their constructor functions
        this.machineTypes = new Map();
        
        // Register built-in machine types
        this.registerMachineType('conveyor', ConveyorMachine);
        this.registerMachineType('extractor', ExtractorMachine);
        this.registerMachineType('processor-a', ProcessorAMachine);
        this.registerMachineType('processor-b', ProcessorBMachine);
        this.registerMachineType('advanced-processor', AdvancedProcessorMachine);
        this.registerMachineType('cargo-loader', CargoLoaderMachine);
    }
    
    /**
     * Register a new machine type
     * @param {string} id - The machine type ID
     * @param {Function} constructor - The machine class constructor
     */
    registerMachineType(id, constructor) {
        this.machineTypes.set(id, constructor);
    }
    
    /**
     * Check if a machine type is registered
     * @param {string} id - The machine type ID
     * @returns {boolean} True if the machine type is registered
     */
    hasMachineType(id) {
        return this.machineTypes.has(id);
    }
    
    /**
     * Get all registered machine type IDs
     * @returns {Array<string>} Array of machine type IDs
     */
    getMachineTypeIds() {
        return Array.from(this.machineTypes.keys());
    }
    
    /**
     * Create a new machine instance
     * @param {string} id - The machine type ID
     * @param {Phaser.Scene} scene - The scene this machine belongs to
     * @param {Object} config - Configuration object
     * @returns {BaseMachine} The created machine instance
     * @throws {Error} If the machine type is not registered
     */
    createMachine(id, scene, config) {
        if (!this.hasMachineType(id)) {
            throw new Error(`Machine type '${id}' is not registered`);
        }
        
        const MachineConstructor = this.machineTypes.get(id);
        return new MachineConstructor(scene, config);
    }
    
    /**
     * Create a preview sprite for a machine type
     * @param {string} id - The machine type ID
     * @param {Phaser.Scene} scene - The scene to create the sprite in
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @returns {Phaser.GameObjects.Container} The preview sprite
     * @throws {Error} If the machine type is not registered
     */
    createMachinePreview(id, scene, x, y) {
        if (!this.hasMachineType(id)) {
            throw new Error(`Machine type '${id}' is not registered`);
        }
        
        // Get the machine constructor
        const MachineConstructor = this.machineTypes.get(id);
        
        // Create a static preview instead of a full machine instance
        if (MachineConstructor.getPreviewSprite) {
            // If the class has a static preview method, use it
            return MachineConstructor.getPreviewSprite(scene, x, y);
        } else {
            // Create a minimal config with just enough for a preview
            const config = {
                // Don't pass grid reference for previews
                preview: true
            };
            
            // Create a temporary instance with minimal configuration
            const tempInstance = new MachineConstructor(scene, config);
            
            // Use the instance's getPreviewSprite method
            return tempInstance.getPreviewSprite(scene, x, y);
        }
    }
    
    /**
     * Get machine configuration for a specific type
     * @param {string} id - The machine type ID
     * @returns {Object} The machine configuration
     * @throws {Error} If the machine type is not registered
     */
    getMachineConfig(id) {
        if (!this.hasMachineType(id)) {
            throw new Error(`Machine type '${id}' is not registered`);
        }
        
        // Get the machine constructor
        const MachineConstructor = this.machineTypes.get(id);
        
        // If the class has a static getConfig method, use it
        if (MachineConstructor.getConfig) {
            return MachineConstructor.getConfig();
        }
        
        // Create a temporary machine instance with minimal configuration
        const tempMachine = new MachineConstructor(null, { preview: true });
        
        return {
            id: tempMachine.id,
            name: tempMachine.name,
            description: tempMachine.description,
            shape: tempMachine.shape,
            inputTypes: tempMachine.inputTypes,
            outputTypes: tempMachine.outputTypes,
            processingTime: tempMachine.processingTime,
            direction: tempMachine.direction
        };
    }
    
    /**
     * Get all machine configurations
     * @returns {Array<Object>} Array of machine configurations
     */
    getAllMachineConfigs() {
        return this.getMachineTypeIds().map(id => this.getMachineConfig(id));
    }
} 