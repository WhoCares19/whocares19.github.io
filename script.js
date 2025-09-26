// script.js

// --- Global Data Storage ---
let roomsData = {};
let allMinersData = [];
let racksData = [];
let setsData = [];
let currentRoom = 'Room 1'; // Default active room
let nextRoomId = 3; // For adding new rooms
let inventoryMode = 'miners'; // 'miners' or 'racks'
let placedRacks = {}; // Stores racks placed in rooms
let placedMiners = {}; // Stores miners placed in racks

// --- Constants for Image Paths ---
const GITHUB_RAW_CONTENT_BASE = 'https://raw.githubusercontent.com/WhoCares19/whocares19.github.io/main/';
const LEVELS_BASE_URL = `${GITHUB_RAW_CONTENT_BASE}Levels/`;

// Define the miner image subfolders. The script will search these.
const MINER_IMAGE_SUBFOLDERS = [
    'miners/miners1/',
    'miners/miners2/',
    'miners/miners3/',
    'miners/miners4/',
    'miners/miners5/',
    'miners/miners6/',
    'miners/miners7/',
    'miners/miners8/'
];

const MINER_IMAGE_CACHE = {}; // Cache to store resolved miner image URLs

// --- Utility Functions ---

// Helper to calculate total power (simplified for now)
function calculateTotalPower() {
    let totalRawPower = 0;
    let totalBonusPercentage = 0;

    // Iterate through all placed miners
    Object.values(placedMiners).forEach(miner => {
        const minerConfig = allMinersData.find(m => m.miner_name === miner.type);
        if (minerConfig) {
            const level = miner.level;
            totalRawPower += parseFloat(minerConfig[`Raw_power_level_${level}`]);
            totalBonusPercentage += parseFloat(minerConfig[`Bonus_level_${level}`]);
        }
    });

    // Iterate through all placed racks (for their bonuses)
    Object.values(placedRacks).forEach(rack => {
        const rackConfig = racksData.find(r => r.name === rack.type);
        if (rackConfig && rackConfig.bonus_power) {
            totalBonusPercentage += parseFloat(rackConfig.bonus_power);
        }
    });

    // TODO: Implement set bonuses here later

    const finalPower = totalRawPower * (1 + (totalBonusPercentage / 100));
    document.getElementById('total-power').textContent = finalPower.toFixed(2); // Display with 2 decimal places
}

// Function to parse CSV data
async function parseCSV(url) {
    const response = await fetch(url);
    const text = await response.text();
    const lines = text.split('\n').filter(line => line.trim() !== ''); // Filter out empty lines
    const headers = lines[0].split(',').map(header => header.trim());
    return lines.slice(1).map(line => {
        const values = line.split(',').map(value => value.trim());
        return headers.reduce((obj, header, index) => {
            obj[header] = values[index];
            return obj;
        }, {});
    });
}

/**
 * Asynchronously searches for a miner's image across predefined folders.
 * Caches the result to avoid repeated lookups.
 * @param {string} minerName The name of the miner.
 * @returns {Promise<string>} The URL of the miner's image or a default fallback.
 */
async function getMinerImageUrl(minerName) {
    if (MINER_IMAGE_CACHE[minerName]) {
        return MINER_IMAGE_CACHE[minerName];
    }

    const defaultImageUrl = `${GITHUB_RAW_CONTENT_BASE}miners/default/default_miner.png`; // Fallback image if not found

    for (const subfolder of MINER_IMAGE_SUBFOLDERS) {
        const imageUrl = `${GITHUB_RAW_CONTENT_BASE}${subfolder}${minerName.replace(/ /g, '_')}.png`; // Replace spaces for filenames
        try {
            const response = await fetch(imageUrl, { method: 'HEAD' }); // Use HEAD to check if resource exists
            if (response.ok) {
                MINER_IMAGE_CACHE[minerName] = imageUrl;
                return imageUrl;
            }
        } catch (error) {
            // Network error or CORS issue, continue trying other paths
            console.warn(`Failed to fetch HEAD for ${imageUrl}: ${error.message}`);
        }
    }

    // If no image is found in any specified folder, use a default
    MINER_IMAGE_CACHE[minerName] = defaultImageUrl;
    return defaultImageUrl;
}

// --- UI Rendering Functions ---

function renderRoomSidebar() {
    const sidebar = document.getElementById('left-sidebar');
    const existingRoomSections = sidebar.querySelectorAll('.room-section[data-room-id]');
    existingRoomSections.forEach(section => section.remove()); // Clear existing dynamic rooms

    let roomCount = 0;
    for (const roomId in roomsData.rooms) {
        roomCount++;
        const roomConfig = roomsData.rooms[roomId];

        const roomSection = document.createElement('div');
        roomSection.classList.add('sidebar-section');
        roomSection.dataset.roomId = roomId;

        const header = document.createElement('div');
        header.classList.add('room-header');
        header.innerHTML = `<h4>${roomId}</h4><span class="fold-icon">▼</span>`;
        header.addEventListener('click', (e) => {
            const icon = header.querySelector('.fold-icon');
            const buttons = roomSection.querySelector('.room-buttons');
            if (buttons.style.display === 'none') {
                buttons.style.display = 'flex';
                icon.textContent = '▼';
            } else {
                buttons.style.display = 'none';
                icon.textContent = '►';
            }
        });

        const buttonsContainer = document.createElement('div');
        buttonsContainer.classList.add('room-buttons');
        buttonsContainer.style.display = 'none'; // Start folded

        // Add a button to select the room
        const selectRoomBtn = document.createElement('button');
        selectRoomBtn.textContent = `Select ${roomId}`;
        selectRoomBtn.addEventListener('click', () => selectRoom(roomId));
        buttonsContainer.appendChild(selectRoomBtn);
        
        roomSection.appendChild(header);
        roomSection.appendChild(buttonsContainer);
        
        // Insert before the "Add New Room" button
        sidebar.insertBefore(roomSection, document.getElementById('add-room-btn').parentNode);
    }
    nextRoomId = roomCount + 1;
}


function selectRoom(roomId) {
    currentRoom = roomId;
    const roomConfig = roomsData.rooms[roomId];
    const roomDisplay = document.getElementById('room-display');
    const roomBackground = document.getElementById('room-background');
    const rackPlaceholdersContainer = document.getElementById('rack-placeholders-container');

    roomBackground.src = `data:image/png;base64,${roomConfig.background_image_b64}`;
    roomBackground.alt = `${roomId} Background`;
    
    // Clear existing rack placeholders
    rackPlaceholdersContainer.innerHTML = '';

    // Render new rack placeholders
    roomConfig.placeholders.forEach((placeholder, index) => {
        const ph = document.createElement('div');
        ph.classList.add('rack-placeholder');
        ph.dataset.id = `ph-${roomId}-${index}`;
        ph.style.left = `${placeholder.x_ratio * 100}%`;
        ph.style.top = `${placeholder.y_ratio * 100}%`;
        ph.style.width = `${placeholder.width_ratio * 100}%`;
        ph.style.height = `${placeholder.height_ratio * 100}%`;
        ph.dataset.rackConfig = JSON.stringify(placeholder); // Store the full config

        // Drag and drop events for racks
        ph.addEventListener('dragover', (e) => {
            e.preventDefault(); // Allow drop
            if (inventoryMode === 'racks') { // Only allow dropping racks
                ph.classList.add('drag-over');
            }
        });
        ph.addEventListener('dragleave', () => ph.classList.remove('drag-over'));
        ph.addEventListener('drop', (e) => {
            e.preventDefault();
            ph.classList.remove('drag-over');
            if (inventoryMode === 'racks') {
                const rackType = e.dataTransfer.getData('text/plain');
                placeRack(ph, rackType);
            }
        });

        rackPlaceholdersContainer.appendChild(ph);
        
        // If a rack was previously placed here, re-render it
        if (placedRacks[ph.dataset.id]) {
            renderPlacedRack(ph, placedRacks[ph.dataset.id].type);
        }
    });

    calculateTotalPower();
}

async function renderInventory() {
    const inventoryItemsContainer = document.getElementById('inventory-items');
    inventoryItemsContainer.innerHTML = ''; // Clear previous items

    let itemsToRender = [];
    if (inventoryMode === 'miners') {
        itemsToRender = allMinersData;
        document.getElementById('level-dropdown-label').style.display = 'inline-block';
        document.getElementById('level-dropdown').style.display = 'inline-block';
        // Add sorting for miners
        const sortBy = document.getElementById('sort-dropdown').value;
        if (sortBy === 'highest_power') {
            itemsToRender.sort((a, b) => parseFloat(b.Raw_power_level_1) - parseFloat(a.Raw_power_level_1));
        } else if (sortBy === 'highest_bonus') {
            itemsToRender.sort((a, b) => parseFloat(b.Bonus_level_1) - parseFloat(a.Bonus_level_1));
        }
        // TODO: Implement "Highest power and Highest bonus power" and "Highest bonus power and highest power" sorting
        
        // Filter by level
        const selectedLevel = document.getElementById('level-dropdown').value;
        if (selectedLevel !== 'all') {
            itemsToRender = itemsToRender.filter(miner => miner[`Raw_power_level_${selectedLevel}`] !== undefined);
        }

    } else { // inventoryMode === 'racks'
        itemsToRender = racksData;
        document.getElementById('level-dropdown-label').style.display = 'none';
        document.getElementById('level-dropdown').style.display = 'none';
        // Add sorting for racks
        const sortBy = document.getElementById('sort-dropdown').value;
        if (sortBy === 'highest_bonus_rack') {
            itemsToRender.sort((a, b) => parseFloat(b.bonus_power || 0) - parseFloat(a.bonus_power || 0));
        }
    }

    // Apply search filter
    const searchTerm = document.getElementById('search-bar').value.toLowerCase();
    if (searchTerm) {
        itemsToRender = itemsToRender.filter(item => {
            if (inventoryMode === 'miners') {
                return item.miner_name.toLowerCase().includes(searchTerm);
            } else { // racks
                return item.name.toLowerCase().includes(searchTerm) || 
                       (item.set_name && item.set_name.toLowerCase().includes(searchTerm));
            }
        });
    }

    for (const item of itemsToRender) {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('inventory-item');
        itemDiv.dataset.type = inventoryMode === 'miners' ? item.miner_name : item.name;
        itemDiv.dataset.slotSize = item.slot_size; // Store slot size for miners
        itemDiv.draggable = true;

        const img = document.createElement('img');
        if (inventoryMode === 'miners') {
            img.src = await getMinerImageUrl(item.miner_name); // Asynchronously get miner image URL
        } else {
            // Assuming rack images are in a specific subfolder or named simply
            img.src = `${GITHUB_RAW_CONTENT_BASE}racks/${itemDiv.dataset.type}.png`; 
        }
        img.alt = itemDiv.dataset.type;
        itemDiv.appendChild(img);

        const nameSpan = document.createElement('span');
        nameSpan.textContent = itemDiv.dataset.type;
        itemDiv.appendChild(nameSpan);

        if (inventoryMode === 'miners') {
            const level = document.getElementById('level-dropdown').value || '1'; // Default to level 1 for display
            const powerSpan = document.createElement('span');
            powerSpan.textContent = `Power: ${item[`Raw_power_level_${level}`]} Gh/s`;
            itemDiv.appendChild(powerSpan);

            const bonusSpan = document.createElement('span');
            bonusSpan.textContent = `Bonus: ${item[`Bonus_level_${level}`]}%`;
            itemDiv.appendChild(bonusSpan);
        } else { // racks
            if (item.bonus_power) {
                const bonusSpan = document.createElement('span');
                bonusSpan.textContent = `Bonus: ${item.bonus_power}%`;
                itemDiv.appendChild(bonusSpan);
            }
            if (item.set_name) {
                const setSpan = document.createElement('span');
                setSpan.textContent = `Set: ${item.set_name}`;
                itemDiv.appendChild(setSpan);
            }
        }

        itemDiv.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', itemDiv.dataset.type);
            e.dataTransfer.effectAllowed = 'copy';
            itemDiv.classList.add('dragging-source');
        });
        itemDiv.addEventListener('dragend', () => itemDiv.classList.remove('dragging-source'));

        inventoryItemsContainer.appendChild(itemDiv);
    }
}

function updateSortDropdownOptions() {
    const sortDropdown = document.getElementById('sort-dropdown');
    sortDropdown.innerHTML = ''; // Clear existing options

    if (inventoryMode === 'miners') {
        const options = [
            { value: 'default', text: 'Default' },
            { value: 'highest_power', text: 'Highest Power' },
            { value: 'highest_bonus', text: 'Highest Bonus Power' },
            // TODO: Add combined sorting options later
        ];
        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.text;
            sortDropdown.appendChild(opt);
        });
    } else { // racks
        const options = [
            { value: 'default', text: 'Default' },
            { value: 'highest_bonus_rack', text: 'Rack with Highest Bonus' },
        ];
        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.text;
            sortDropdown.appendChild(opt);
        });
    }
}

function placeRack(placeholderElement, rackType) {
    if (placedRacks[placeholderElement.dataset.id]) {
        alert('A rack is already placed here. Remove it first.');
        return;
    }

    const rackConfig = JSON.parse(placeholderElement.dataset.rackConfig);
    const rackDetails = racksData.find(r => r.name === rackType);

    if (!rackDetails) {
        console.error('Rack details not found for type:', rackType);
        return;
    }

    // Create the visual representation of the placed rack
    const placedRackDiv = document.createElement('div');
    placedRackDiv.classList.add('placed-rack');
    placedRackDiv.dataset.id = placeholderElement.dataset.id; // Link to placeholder
    placedRackDiv.dataset.type = rackType;
    placedRackDiv.style.width = '100%'; // Placed rack takes 100% of placeholder
    placedRackDiv.style.height = '100%';
    placedRackDiv.style.backgroundImage = `url(${GITHUB_RAW_CONTENT_BASE}rack_thumbnail.png)`; // Generic rack image
    placedRackDiv.style.backgroundSize = 'cover';

    // Store rack data
    placedRacks[placeholderElement.dataset.id] = {
        type: rackType,
        config: rackConfig,
        miners: {} // To store miners placed in this rack
    };

    // Add miner slots based on the rack's current active config type
    const activeConfig = rackConfig.configurations[rackConfig.current_active_config_type];
    if (activeConfig && activeConfig.miner_slots) {
        activeConfig.miner_slots.forEach(slot => {
            const minerSlot = document.createElement('div');
            minerSlot.classList.add('miner-slot-container');
            minerSlot.dataset.id = `${placedRackDiv.dataset.id}-${slot.id}`; // Unique ID for miner slot
            minerSlot.dataset.isContainer = slot.is_container;
            minerSlot.dataset.parentRackId = placedRackDiv.dataset.id; // Store parent rack ID

            // Position relative to the placed rack
            minerSlot.style.left = `${slot.x_ratio_rel * 100}%`;
            minerSlot.style.top = `${slot.y_ratio_rel * 100}%`;
            minerSlot.style.width = `${slot.width_ratio_rel * 100}%`;
            minerSlot.style.height = `${slot.height_ratio_rel * 100}%`;

            // Drag and drop for miners
            minerSlot.addEventListener('dragover', (e) => {
                e.preventDefault();
                minerSlot.classList.add('drag-over');
            });
            minerSlot.addEventListener('dragleave', () => minerSlot.classList.remove('drag-over'));
            minerSlot.addEventListener('drop', (e) => {
                e.preventDefault();
                minerSlot.classList.remove('drag-over');
                const minerType = e.dataTransfer.getData('text/plain');
                const selectedLevel = document.getElementById('level-dropdown').value;
                const minerData = allMinersData.find(m => m.miner_name === minerType);
                if (minerData) {
                    if (minerData.slot_size === "2_slot" && minerSlot.dataset.isContainer === "true") {
                        placeMiner(minerSlot, minerType, selectedLevel);
                    } else if (minerData.slot_size === "1_slot" && minerSlot.dataset.isContainer === "false") {
                         placeMiner(minerSlot, minerType, selectedLevel);
                    } else {
                        alert(`A ${minerData.slot_size} miner cannot be placed in this slot type.`);
                    }
                }
            });
            placedRackDiv.appendChild(minerSlot);

            // If it's a container slot, it might have child slots
            if (slot.is_container && slot.child_slots) {
                slot.child_slots.forEach(childSlot => {
                    const childMinerSlot = document.createElement('div');
                    childMinerSlot.classList.add('miner-slot-container');
                    childMinerSlot.dataset.id = `${minerSlot.dataset.id}-${childSlot.id}`;
                    childMinerSlot.dataset.isContainer = false; // Child slots are typically not containers themselves
                    childMinerSlot.dataset.parentRackId = placedRackDiv.dataset.id; // Store parent rack ID

                    // Position relative to its parent container slot
                    childMinerSlot.style.left = `${childSlot.x_ratio_rel_to_parent * 100}%`;
                    childMinerSlot.style.top = `${childSlot.y_ratio_rel_to_parent * 100}%`;
                    childMinerSlot.style.width = `${childSlot.width_ratio_rel_to_parent * 100}%`;
                    childMinerSlot.style.height = `${childSlot.height_ratio_rel_to_parent * 100}%`;

                    childMinerSlot.addEventListener('dragover', (e) => {
                        e.preventDefault();
                        childMinerSlot.classList.add('drag-over');
                    });
                    childMinerSlot.addEventListener('dragleave', () => childMinerSlot.classList.remove('drag-over'));
                    childMinerSlot.addEventListener('drop', (e) => {
                        e.preventDefault();
                        childMinerSlot.classList.remove('drag-over');
                        const minerType = e.dataTransfer.getData('text/plain');
                        const selectedLevel = document.getElementById('level-dropdown').value;
                        const minerData = allMinersData.find(m => m.miner_name === minerType);
                        if (minerData) {
                             // Check slot size requirement for child slots
                            if (minerData.slot_size === "1_slot") {
                                placeMiner(childMinerSlot, minerType, selectedLevel);
                            } else {
                                alert("This is a 1-slot only. A 2-slot miner cannot be placed here.");
                            }
                        }
                    });
                    minerSlot.appendChild(childMinerSlot);
                });
            }
        });
    }

    placeholderElement.appendChild(placedRackDiv);
    calculateTotalPower();
}

async function placeMiner(slotElement, minerType, level = '1') {
    if (placedMiners[slotElement.dataset.id]) {
        alert('A miner is already placed here. Remove it first.');
        return;
    }

    const minerData = allMinersData.find(m => m.miner_name === minerType);
    if (!minerData) {
        console.error('Miner data not found for type:', minerType);
        return;
    }

    const minerDiv = document.createElement('div');
    minerDiv.classList.add('placed-miner');
    minerDiv.dataset.id = slotElement.dataset.id;
    minerDiv.dataset.type = minerType;
    minerDiv.dataset.level = level;
    minerDiv.dataset.parentRackId = slotElement.dataset.parentRackId; // Inherit parent rack ID

    // Miner takes 100% of its slot
    minerDiv.style.width = '100%';
    minerDiv.style.height = '100%';

    const img = document.createElement('img');
    img.src = await getMinerImageUrl(minerType); // Asynchronously get miner image URL
    img.alt = minerType;
    img.classList.add('miner-thumbnail');
    minerDiv.appendChild(img);

    // Add level overlay
    const levelOverlay = document.createElement('div');
    levelOverlay.classList.add('miner-level-overlay');
    levelOverlay.style.backgroundImage = `url(${LEVELS_BASE_URL}lvl${level}.png)`;
    minerDiv.appendChild(levelOverlay);

    // Store miner data
    placedMiners[slotElement.dataset.id] = {
        type: minerType,
        level: level,
        slot: slotElement.dataset.id,
        parentRackId: slotElement.dataset.parentRackId
    };
    
    // Add to parent rack's miners for easier saving
    if (placedMiners[slotElement.dataset.id].parentRackId && placedRacks[placedMiners[slotElement.dataset.id].parentRackId]) {
        placedRacks[placedMiners[slotElement.dataset.id].parentRackId].miners[slotElement.dataset.id] = placedMiners[slotElement.dataset.id];
    }


    slotElement.appendChild(minerDiv);
    calculateTotalPower();
}


// --- Event Listeners ---

document.getElementById('add-room-btn').addEventListener('click', () => {
    const newRoomId = `Room ${nextRoomId}`;
    roomsData.rooms[newRoomId] = JSON.parse(JSON.stringify(roomsData.rooms['Room 2'])); // Deep clone Room 2 config
    roomsData.active_room = newRoomId; // Set new room as active
    renderRoomSidebar();
    selectRoom(newRoomId); // Automatically select the new room
});

document.getElementById('show-miners-btn').addEventListener('click', () => {
    inventoryMode = 'miners';
    updateSortDropdownOptions();
    renderInventory();
});

document.getElementById('show-racks-btn').addEventListener('click', () => {
    inventoryMode = 'racks';
    updateSortDropdownOptions();
    renderInventory();
});

document.getElementById('search-bar').addEventListener('input', renderInventory);
document.getElementById('sort-dropdown').addEventListener('change', renderInventory);
document.getElementById('level-dropdown').addEventListener('change', renderInventory);


document.getElementById('save-setup-btn').addEventListener('click', () => {
    const setupData = {
        currentRoom: currentRoom,
        placedRacks: placedRacks,
        placedMiners: placedMiners,
        roomsConfig: roomsData // Save the full room configuration including any added rooms
    };
    const blob = new Blob([JSON.stringify(setupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mining_setup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

document.getElementById('load-setup-btn').addEventListener('click', () => {
    document.getElementById('load-setup-input').click();
});

document.getElementById('load-setup-input').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const loadedData = JSON.parse(e.target.result);
                
                // Restore room configurations
                roomsData = loadedData.roomsConfig;
                renderRoomSidebar(); // Re-render sidebar with loaded rooms

                // Clear current display before loading new setup
                document.getElementById('rack-placeholders-container').innerHTML = '';
                placedRacks = {};
                placedMiners = {};

                // Restore placed racks and miners
                placedRacks = loadedData.placedRacks || {};
                placedMiners = loadedData.placedMiners || {};

                // Select the previously active room and re-render its contents
                if (loadedData.currentRoom && roomsData.rooms[loadedData.currentRoom]) {
                    selectRoom(loadedData.currentRoom);
                    // Manually re-render placed racks and miners for the active room
                    const activeRoomPlaceholders = document.getElementById('rack-placeholders-container').children;
                    for (const phElement of activeRoomPlaceholders) {
                        const rackId = phElement.dataset.id;
                        if (placedRacks[rackId]) {
                            renderPlacedRack(phElement, placedRacks[rackId].type);
                            // Now render miners for this rack
                            const rackSlots = phElement.querySelectorAll('.miner-slot-container');
                            for (const slotElement of rackSlots) {
                                const minerId = slotElement.dataset.id;
                                if (placedMiners[minerId]) {
                                    renderPlacedMiner(slotElement, placedMiners[minerId].type, placedMiners[minerId].level);
                                }
                            }
                        }
                    }
                } else {
                    selectRoom('Room 1'); // Fallback
                }
                
                renderInventory(); // Re-render inventory based on restored state
                calculateTotalPower(); // Recalculate total power
                alert('Setup loaded successfully!');

            } catch (error) {
                console.error('Error loading setup:', error);
                alert('Failed to load setup. Invalid JSON file.');
            }
        };
        reader.readAsText(file);
    }
});

// Helper function to re-render a placed rack and its miners after loading
function renderPlacedRack(placeholderElement, rackType) {
    const rackConfig = JSON.parse(placeholderElement.dataset.rackConfig);
    const placedRackDiv = document.createElement('div');
    placedRackDiv.classList.add('placed-rack');
    placedRackDiv.dataset.id = placeholderElement.dataset.id;
    placedRackDiv.dataset.type = rackType;
    placedRackDiv.style.width = '100%';
    placedRackDiv.style.height = '100%';
    placedRackDiv.style.backgroundImage = `url(${GITHUB_RAW_CONTENT_BASE}rack_thumbnail.png)`;
    placedRackDiv.style.backgroundSize = 'cover';

    const activeConfig = rackConfig.configurations[rackConfig.current_active_config_type];
    if (activeConfig && activeConfig.miner_slots) {
        activeConfig.miner_slots.forEach(slot => {
            const minerSlot = document.createElement('div');
            minerSlot.classList.add('miner-slot-container');
            minerSlot.dataset.id = `${placedRackDiv.dataset.id}-${slot.id}`;
            minerSlot.dataset.isContainer = slot.is_container;
            minerSlot.dataset.parentRackId = placedRackDiv.dataset.id;

            minerSlot.style.left = `${slot.x_ratio_rel * 100}%`;
            minerSlot.style.top = `${slot.y_ratio_rel * 100}%`;
            minerSlot.style.width = `${slot.width_ratio_rel * 100}%`;
            minerSlot.style.height = `${slot.height_ratio_rel * 100}%`;

            // Add drop listeners (copy from placeRack)
            minerSlot.addEventListener('dragover', (e) => { e.preventDefault(); minerSlot.classList.add('drag-over'); });
            minerSlot.addEventListener('dragleave', () => minerSlot.classList.remove('drag-over'));
            minerSlot.addEventListener('drop', (e) => {
                e.preventDefault();
                minerSlot.classList.remove('drag-over');
                const minerType = e.dataTransfer.getData('text/plain');
                const selectedLevel = document.getElementById('level-dropdown').value;
                const minerData = allMinersData.find(m => m.miner_name === minerType);
                if (minerData) {
                    if (minerData.slot_size === "2_slot" && minerSlot.dataset.isContainer === "true") {
                        placeMiner(minerSlot, minerType, selectedLevel);
                    } else if (minerData.slot_size === "1_slot" && minerSlot.dataset.isContainer === "false") {
                         placeMiner(minerSlot, minerType, selectedLevel);
                    } else {
                        alert(`A ${minerData.slot_size} miner cannot be placed in this slot type.`);
                    }
                }
            });
            placedRackDiv.appendChild(minerSlot);

            if (slot.is_container && slot.child_slots) {
                slot.child_slots.forEach(childSlot => {
                    const childMinerSlot = document.createElement('div');
                    childMinerSlot.classList.add('miner-slot-container');
                    childMinerSlot.dataset.id = `${minerSlot.dataset.id}-${childSlot.id}`;
                    childMinerSlot.dataset.isContainer = false;
                    childMinerSlot.dataset.parentRackId = placedRackDiv.dataset.id;

                    childMinerSlot.style.left = `${childSlot.x_ratio_rel_to_parent * 100}%`;
                    childMinerSlot.style.top = `${childSlot.y_ratio_rel_to_parent * 100}%`;
                    childMinerSlot.style.width = `${childSlot.width_ratio_rel_to_parent * 100}%`;
                    childMinerSlot.style.height = `${childSlot.height_ratio_rel_to_parent * 100}%`;

                    // Add drop listeners (copy from placeRack)
                    childMinerSlot.addEventListener('dragover', (e) => { e.preventDefault(); childMinerSlot.classList.add('drag-over'); });
                    childMinerSlot.addEventListener('dragleave', () => childMinerSlot.classList.remove('drag-over'));
                    childMinerSlot.addEventListener('drop', (e) => {
                        e.preventDefault();
                        childMinerSlot.classList.remove('drag-over');
                        const minerType = e.dataTransfer.getData('text/plain');
                        const selectedLevel = document.getElementById('level-dropdown').value;
                        const minerData = allMinersData.find(m => m.miner_name === minerType);
                        if (minerData) {
                            if (minerData.slot_size === "1_slot") {
                                placeMiner(childMinerSlot, minerType, selectedLevel);
                            } else {
                                alert("This is a 1-slot only. A 2-slot miner cannot be placed here.");
                            }
                        }
                    });
                    minerSlot.appendChild(childMinerSlot);
                });
            }
        });
    }
    placeholderElement.appendChild(placedRackDiv);
}

// Helper function to re-render a placed miner after loading
async function renderPlacedMiner(slotElement, minerType, level) {
    const minerData = allMinersData.find(m => m.miner_name === minerType);
    if (!minerData) {
        console.error('Miner data not found for type:', minerType);
        return;
    }

    const minerDiv = document.createElement('div');
    minerDiv.classList.add('placed-miner');
    minerDiv.dataset.id = slotElement.dataset.id;
    minerDiv.dataset.type = minerType;
    minerDiv.dataset.level = level;
    minerDiv.dataset.parentRackId = slotElement.dataset.parentRackId;

    minerDiv.style.width = '100%';
    minerDiv.style.height = '100%';

    const img = document.createElement('img');
    img.src = await getMinerImageUrl(minerType); // Asynchronously get miner image URL
    img.alt = minerType;
    img.classList.add('miner-thumbnail');
    minerDiv.appendChild(img);

    const levelOverlay = document.createElement('div');
    levelOverlay.classList.add('miner-level-overlay');
    levelOverlay.style.backgroundImage = `url(${LEVELS_BASE_URL}lvl${level}.png)`;
    minerDiv.appendChild(levelOverlay);

    slotElement.appendChild(minerDiv);
}


// --- Initialization ---

async function initialize() {
    try {
        roomsData = await fetch('Rooms.json').then(res => res.json());
        allMinersData = await parseCSV(`${GITHUB_RAW_CONTENT_BASE}All_Miners.csv`);
        racksData = await parseCSV(`${GITHUB_RAW_CONTENT_BASE}Racks.csv`);
        setsData = await parseCSV(`${GITHUB_RAW_CONTENT_BASE}Sets.csv`);

        // Populate initial rooms in sidebar
        renderRoomSidebar();
        
        // Select the first room by default
        if (roomsData.active_room && roomsData.rooms[roomsData.active_room]) {
            selectRoom(roomsData.active_room);
        } else {
            selectRoom('Room 1');
        }

        // Set initial sort dropdown options
        updateSortDropdownOptions();
        
        // Render initial inventory (miners by default)
        renderInventory();

        calculateTotalPower();

    } catch (error) {
        console.error('Error during initialization:', error);
        alert('Failed to load application data. Please check console for details.');
    }
}

initialize();
