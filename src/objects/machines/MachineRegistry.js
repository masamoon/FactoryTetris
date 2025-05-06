import ConveyorMachine from './ConveyorMachine';
// import ExtractorMachine from './ExtractorMachine';
import ProcessorAMachine from './ProcessorAMachine';
import ProcessorBMachine from './ProcessorBMachine';
import AdvancedProcessorMachine from './AdvancedProcessorMachine';
import ProcessorCMachine from './ProcessorCMachine';
import ProcessorDMachine from './ProcessorDMachine';
import ProcessorEMachine from './ProcessorEMachine';
import AdvancedProcessor1Machine from './AdvancedProcessor1Machine';
import AdvancedProcessor2Machine from './AdvancedProcessor2Machine';

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
        // this.registerMachineType('extractor', ExtractorMachine);
        this.registerMachineType('processor-a', ProcessorAMachine);
        this.registerMachineType('processor-b', ProcessorBMachine);
        this.registerMachineType('advanced-processor', AdvancedProcessorMachine);
        this.registerMachineType('processor-c', ProcessorCMachine);
        this.registerMachineType('processor-d', ProcessorDMachine);
        this.registerMachineType('processor-e', ProcessorEMachine);
        this.registerMachineType('advanced-processor-1', AdvancedProcessor1Machine);
        this.registerMachineType('advanced-processor-2', AdvancedProcessor2Machine);
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
        console.log(`[MachineRegistry] createMachine called. ID: ${id}, Config:`, config); // Log entry
        if (!this.hasMachineType(id)) {
            console.error(`[MachineRegistry] Machine type '${id}' is not registered.`); // Log error
            throw new Error(`Machine type '${id}' is not registered`);
        }
        
        const MachineConstructor = this.machineTypes.get(id);
        console.log(`[MachineRegistry] Found constructor for ${id}:`, MachineConstructor ? 'Yes' : 'No'); // Log constructor found
        if (!MachineConstructor) { // Extra safety check
            console.error(`[MachineRegistry] Constructor for ${id} was null/undefined despite passing hasMachineType check!`);
            return null;
        }

        try {
            console.log(`[MachineRegistry] Attempting: new ${MachineConstructor.name}(...)`); // Log before new()
            const instance = new MachineConstructor(scene, config);
            console.log(`[MachineRegistry] Instance created successfully for ${id}`); // Log success
            return instance;
        } catch (error) {
            console.error(`[MachineRegistry] Error during new ${MachineConstructor.name}(...) for ID ${id}:`, error); // Log error during new()
            return null; // Return null on error instead of throwing
        }
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
     * Get the configuration object for all registered machine types
     * @returns {Array<Object>} Array of machine configuration objects
     */
    getAllMachineConfigs() {
        // Get all machine IDs
        const machineIds = this.getMachineTypeIds();
        
        // Map each ID to its configuration
        const configs = machineIds.map(id => {
            try {
                const config = this.getMachineConfig(id);
                
                // Ensure each machine has a valid shape
                if (!config.shape || !Array.isArray(config.shape)) {
                    console.warn(`Machine ${id} is missing a valid shape, using default 1x1 shape`);
                    if (id === 'conveyor') {
                        config.shape = [[1]]; // 1x1 shape for conveyor
                    } else if (id === 'extractor') {
                        config.shape = [[1, 1], [1, 1]]; // 2x2 shape for extractor
                    } else if (id === 'processor-a' || id === 'processor-b') {
                        config.shape = [[1, 1], [1, 1]]; // 2x2 shape for processors
                    } else if (id === 'advanced-processor') {
                        config.shape = [[1, 1, 1], [1, 1, 1]]; // 3x2 shape for advanced processor
                    } else if (id === 'processor-c') {
                        config.shape = [[1, 1], [1, 1]]; // 2x2 shape for cargo loader
                    } else {
                        config.shape = [[1]]; // Default 1x1 shape as fallback
                    }
                }
                
                return config;
                
            } catch (error) {
                console.error(`Error getting config for machine type ${id}:`, error);
                // Return a minimal config
                return {
                    id,
                    name: id.charAt(0).toUpperCase() + id.slice(1).replace('-', ' '),
                    shape: [[1]] // Default 1x1 shape
                };
            }
        });
        
        return configs;
    }
} 