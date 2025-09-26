/**
 * VÖLVA'S VOYAGE - Game Logic
 *
 * This script handles all core game logic, including the new modular map generation system.
 */

// --- GLOBAL CONFIG & GAME STATE ---

const MAP_WIDTH = 20;
const MAP_HEIGHT = 40;

// === DETAILED TILE TYPES with final image paths ===
const TILE_TYPES = {
    // Non-Walkable Barrier Tiles (Walls)
    WALL_CASTLE: { id: 'wall_castle', symbol: '🏰', walkable: false, image: 'assets/tiles/wall_castle.png' },
    WALL_HOUSE: { id: 'wall_house', symbol: '🏠', walkable: false, image: 'assets/tiles/wall_house.png' },
    WALL_CAVE: { id: 'wall_cave', symbol: '🪨', walkable: false, image: 'assets/tiles/wall_cave.png' },
    WALL_ROCK: { id: 'wall_rock', symbol: '⛰️', walkable: false, image: 'assets/tiles/wall_rock.png' },
    
    // Non-Walkable Terrain Hazards
    LAVA: { id: 'lava', symbol: '🔥', walkable: false, image: 'assets/tiles/lava.png' },
    WATER_LAKE: { id: 'water_lake', symbol: '💧', walkable: false, image: 'assets/tiles/water_lake.png' },
    
    // Walkable Ground Tiles
    GROUND_FIELD: { id: 'ground_field', symbol: '.', walkable: true, image: 'assets/tiles/ground_field.png' }, // Default outside ground
    GROUND_STONE: { id: 'ground_stone', symbol: '=', walkable: true, image: 'assets/tiles/ground_stone.png' }, // Castle interior
    GROUND_WOODEN_FLOOR: { id: 'ground_wooden_floor', symbol: '⬜', walkable: true, image: 'assets/tiles/ground_wooden_floor.png' }, // House interior
    GROUND_ROAD: { id: 'ground_road', symbol: '🛣️', walkable: true, image: 'assets/tiles/ground_road.png' }, 
    GROUND_RIVER: { id: 'ground_river', symbol: '~', walkable: true, image: 'assets/tiles/ground_river.png' },
    
    // Walkable Interactive/Door Tiles
    DOORWAY_HOUSE: { id: 'door_house', symbol: '🚪', walkable: true, image: 'assets/tiles/doorway_house.png', action: 'travel' },
    DOORWAY_CAVE: { id: 'door_cave', symbol: '🕳️', walkable: true, image: 'assets/tiles/doorway_cave.png', action: 'travel' },
    DOORWAY_GATE: { id: 'door_gate', symbol: '🚧', walkable: true, image: 'assets/tiles/doorway_gate.png', action: 'travel' }, // NEW Castle Gate
    STAIRS_UP: { id: 'stairs_up', symbol: '▲', walkable: true, image: 'assets/tiles/stairs_up.png', action: 'travel' },
    STAIRS_DOWN: { id: 'stairs_down', symbol: '▼', walkable: true, image: 'assets/tiles/stairs_down.png', action: 'travel' },
    BRIDGE: { id: 'bridge', symbol: '🌉', walkable: true, image: 'assets/tiles/bridge.png', action: 'travel' },
    
    // Utility tiles for initial map filling
    BLANK_WALL: { id: 'blank_wall', symbol: '█', walkable: false, color: '#333333' }
};

// Tiles considered "Ground" for house/castle placement checks
const GROUND_TILE_IDS = [
    TILE_TYPES.GROUND_FIELD.id,
    TILE_TYPES.GROUND_ROAD.id,
    TILE_TYPES.GROUND_STONE.id,
    TILE_TYPES.GROUND_WOODEN_FLOOR.id
];


const ENCOUNTER_TYPES = [
    { type: 'enemy', name: 'Draugr', description: 'A restless undead warrior.', challenge: 1 },
    { type: 'treasure', name: 'Gilded Chest', description: 'A chest containing unknown riches.', challenge: 0 },
    { type: 'npc', name: 'Friendly Trader', description: 'A traveling merchant willing to trade.', challenge: 0 }
];


const GAME_PATHS = [
    { id: 'huscarl', name: 'Huscarl', focus: 'Strength', desc: 'A martial fighter focused on strength and direct combat.' },
    { id: 'volva', name: 'Völva', focus: 'Intellect', desc: 'A mystic focused on intellect and the manipulation of energies.' },
    { id: 'skirmisher', name: 'Skirmisher', focus: 'Agility', desc: 'A quick fighter focused on agility and swift movement.' }
];

const BASE_STATS = { strength: 10, intellect: 10, agility: 10, stamina: 10 };

const DAY_CYCLE = [
    { start: 6, end: 10, emoji: '🌄', id: 'Morning', color: '#f7d084', canRest: false, danger: false },
    { start: 11, end: 13, emoji: '☀️', id: 'Midday', color: '#ffeb3b', canRest: false, danger: false },
    { start: 14, end: 17, emoji: '🌤️', id: 'Day', color: '#87ceeb', canRest: false, danger: false },
    { start: 18, end: 23, emoji: '🌥️', id: 'Evening', color: '#ffa07a', canRest: true, danger: false }
];
const NIGHT_CYCLE = [
    { start: 0, end: 5, emoji: '🌙', id: 'Night', color: '#1a3366', canRest: true, danger: true }
];
const ALL_PHASES = [...DAY_CYCLE, ...NIGHT_CYCLE];


const gameState = {
    screen: 'title',
    currentLocation: 'Landfall', // Tracks the name of the current map
    currentMap: [], // Stores the 2D array of tile objects
    playerPos: { x: -1, y: -1 },
    time: { hour: 6, day: 1 },
    player: { level: 1, gender: null, path: null, maxHP: 100, currentHP: 100, stats: { ...BASE_STATS } }
};

// --- DOM ELEMENTS ---
const titleScreen = document.getElementById('title-screen');
const charSelectScreen = document.getElementById('char-select-screen');
const gameInterface = document.getElementById('game-interface');
const gameMapDiv = document.getElementById('game-map');
const encounterName = document.getElementById('encounter-name');
const encounterDescription = document.getElementById('encounter-description');
const encounterActions = document.getElementById('encounter-actions');
const gameConsole = document.getElementById('game-console');
const startGameButton = document.getElementById('start-game-button');
const genderChoiceButtons = document.querySelectorAll('#gender-selection .choice-btn');
const genderChoiceText = document.getElementById('gender-choice-text');
const classSelectionDiv = document.getElementById('class-selection');
const confirmCharButton = document.getElementById('confirm-char-button');
const sunMoonTracker = document.getElementById('sun-moon-tracker');
const dayNightCycleDiv = document.getElementById('day-night-cycle');
const locationName = document.getElementById('location-name');
const nightCycleDiv = document.createElement('div');


// --- UTILITY FUNCTIONS ---

/** Writes a message to the game console. */
function logToConsole(message) {
    const p = document.createElement('p');
    p.textContent = `> ${message}`;
    gameConsole.prepend(p); 
    while (gameConsole.children.length > 20) {
        gameConsole.removeChild(gameConsole.lastChild);
    }
}

/** Returns a random integer between min and max (inclusive). */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// --- TIME & REST LOGIC (Stable) ---

function getCurrentPhase() {
    const { hour } = gameState.time;
    
    const currentPhase = ALL_PHASES.find(phase => 
        (hour >= phase.start && hour <= phase.end) || 
        (phase.start > phase.end && (hour >= phase.start || hour <= phase.end))
    );
    
    return currentPhase || NIGHT_CYCLE[0]; 
}

function generateTimeBar() {
    dayNightCycleDiv.innerHTML = '';
    
    dayNightCycleDiv.classList.add('time-bar');
    dayNightCycleDiv.id = 'day-cycle-bar';

    DAY_CYCLE.forEach(phase => {
        const numHours = phase.end - phase.start + 1;
        for (let h = 0; h < numHours; h++) {
            const segment = document.createElement('div');
            segment.classList.add('hour-segment');
            segment.dataset.hour = phase.start + h;
            segment.style.backgroundColor = phase.color;
            segment.title = `${phase.start + h}:00 - ${phase.id}`;
            dayNightCycleDiv.appendChild(segment);
        }
    });

    const nightPhase = NIGHT_CYCLE[0];
    nightCycleDiv.classList.add('time-bar');
    nightCycleDiv.id = 'night-cycle-bar';
    nightCycleDiv.style.gridTemplateColumns = `repeat(6, 1fr)`;
    
    for (let h = 0; h < 6; h++) {
        const segment = document.createElement('div');
        segment.classList.add('hour-segment');
        segment.dataset.hour = h;
        segment.style.backgroundColor = nightPhase.color;
        segment.title = `${h}:00 - ${nightPhase.id}`;
        nightCycleDiv.appendChild(segment);
    }

    dayNightCycleDiv.parentNode.insertBefore(nightCycleDiv, dayNightCycleDiv.nextSibling);
    dayNightCycleDiv.parentNode.insertBefore(sunMoonTracker, dayNightCycleDiv);
}


function updateTimeDisplay(oldPhaseId = null) {
    const { hour, day } = gameState.time;
    const currentPhase = getCurrentPhase();
    
    let activeBar;
    let hourOffset;

    if (currentPhase.id === 'Night') {
        activeBar = nightCycleDiv;
        dayNightCycleDiv.style.opacity = 0.5;
        nightCycleDiv.style.opacity = 1;
        hourOffset = hour;
    } else {
        activeBar = dayNightCycleDiv;
        dayNightCycleDiv.style.opacity = 1;
        nightCycleDiv.style.opacity = 0.5;
        hourOffset = hour - 6; 
    }

    const segmentWidth = activeBar.offsetWidth / activeBar.childElementCount;
    const centerPosition = (hourOffset * segmentWidth) + (segmentWidth / 2);

    const trackerWidth = sunMoonTracker.offsetWidth;
    const barRect = activeBar.getBoundingClientRect();
    const parentRect = dayNightCycleDiv.parentNode.getBoundingClientRect();

    const leftPosition = (barRect.left - parentRect.left) + centerPosition - (trackerWidth / 2);
    const topPosition = (barRect.top - parentRect.top) - 15;

    sunMoonTracker.style.left = `${leftPosition}px`;
    sunMoonTracker.style.top = `${topPosition}px`;
    sunMoonTracker.textContent = currentPhase.emoji;
    
    locationName.textContent = `${gameState.currentLocation} - ${currentPhase.id} - Day ${day}, ${hour.toString().padStart(2, '0')}:00`;
    
    if (oldPhaseId && oldPhaseId !== currentPhase.id) {
        logToConsole(`The time changes. It is now ${currentPhase.id}. ${currentPhase.danger ? 'Be wary of the shadows!' : ''}`);
    }
}

function advanceTime(hours = 1) {
    const oldPhase = getCurrentPhase();
    
    gameState.time.hour += hours;
    
    if (gameState.time.hour >= 24) {
        gameState.time.hour -= 24;
        gameState.time.day++;
    }
    
    setTimeout(() => updateTimeDisplay(oldPhase.id), 10);
    
    if (gameState.screen === 'game-interface' && !gameState.currentMap[gameState.playerPos.y][gameState.playerPos.x].currentEncounter) {
         checkRestOption();
    }
}

function checkRestOption() {
    const { hour } = gameState.time;
    const currentPhase = getCurrentPhase();
    
    const isRestTime = (hour === 23) || (currentPhase.id === 'Night'); 
    
    const restButtonId = 'rest-action-button';
    document.getElementById(restButtonId)?.remove();

    if (isRestTime) {
        const restButton = document.createElement('button');
        restButton.id = restButtonId;
        
        restButton.textContent = `Rest until Morning (Heal & Skip)`;
        
        restButton.addEventListener('click', restHandler);
        
        encounterActions.insertBefore(restButton, encounterActions.firstChild || null);

        logToConsole(`It is time to rest. You may rest to recover health.`);
    }
}

function restHandler() {
    const { hour } = gameState.time;
    const currentPhase = getCurrentPhase();
    
    const MORNING_HOUR = 6;
    const NIGHT_ATTACK_CHANCE = 20;
    
    const hoursToSkip = (MORNING_HOUR - hour + 24) % 24; 
    
    const BASE_HEAL_PER_HOUR = gameState.player.maxHP * 0.05;
    let totalHealAmount = BASE_HEAL_PER_HOUR * hoursToSkip; 
    let restedSafely = true;

    if (currentPhase.id === 'Night') {
        logToConsole(`You attempt to rest during the dangerous ${currentPhase.id} hours...`);
        
        if (getRandomInt(1, 100) <= NIGHT_ATTACK_CHANCE) {
            logToConsole("A shadow attacks while you rest! You are jolted awake!");
            takeDamage(10); 
            restedSafely = false;
        } 
    } else {
        logToConsole(`You settle down for a safe rest during the late Evening.`);
    }

    if (restedSafely) {
        gameState.player.currentHP = Math.min(gameState.player.maxHP, gameState.player.currentHP + totalHealAmount);
        updateHealthDisplay();
        logToConsole(`You feel well-rested and recover ${Math.round(totalHealAmount)} HP.`);
    } else {
        logToConsole("The attack disturbed your rest! You gain no healing from this attempt.");
    }
    
    advanceTime(hoursToSkip);
    logToConsole(`It is now Day ${gameState.time.day}, 06:00 (Morning).`);
    
    document.getElementById('rest-action-button')?.remove();
}


// --- MAP GENERATION & MOVEMENT LOGIC ---

// === Tile Data Class ===
class TileData {
    constructor(x, y, type, initialEncounter = null) {
        this.x = x;
        this.y = y;
        this.type = type; // e.g., TILE_TYPES.GROUND_FIELD
        this.initialEncounter = initialEncounter; // What started here
        this.currentEncounter = initialEncounter; // What is here now (null after clearing)
        this.visited = false;
        this.actionTaken = false; // e.g., Chest opened, NPC traded with
    }
}

// === Map Generation Helper Functions ===

/** Checks if a given area of size WxH is composed only of a specified tile type (e.g., WALL_ROCK). */
function isAreaClear(map, startX, startY, width, height, requiredTileIds) {
    // Check bounds and tile type
    if (startX < 1 || startY < 1 || startX + width > map[0].length - 1 || startY + height > map.length - 1) {
        return false;
    }

    for (let y = startY; y < startY + height; y++) {
        for (let x = startX; x < startX + width; x++) {
            // Check if the current tile's type is NOT in the required list
            if (!requiredTileIds.includes(map[y][x].type.id)) {
                return false;
            }
        }
    }
    return true;
}

/** Places a basic house structure (4x4 to 6x6) on the map. */
function placeHouse(map) {
    const houseWidth = getRandomInt(4, 6);
    const houseHeight = getRandomInt(4, 6);
    const wallType = TILE_TYPES.WALL_HOUSE;
    const floorType = TILE_TYPES.GROUND_WOODEN_FLOOR;
    const houseDoor = TILE_TYPES.DOORWAY_HOUSE;

    // Try placing the house up to 50 times
    for (let attempts = 0; attempts < 50; attempts++) {
        const startX = getRandomInt(2, map[0].length - houseWidth - 2);
        const startY = getRandomInt(2, map.length - houseHeight - 2);
        
        // Check if the area required for the house and its perimeter is clear/valid ground
        // We ensure the 1-tile border around the house is a valid walkable ground type
        if (isAreaClear(map, startX - 1, startY - 1, houseWidth + 2, houseHeight + 2, [TILE_TYPES.GROUND_FIELD.id])) {
            
            let doorX = -1;
            let doorY = -1;
            
            // Draw walls and floor
            for (let y = startY; y < startY + houseHeight; y++) {
                for (let x = startX; x < startX + houseWidth; x++) {
                    const isWall = (x === startX || x === startX + houseWidth - 1 || 
                                    y === startY || y === startY + houseHeight - 1);
                    
                    if (isWall) {
                        map[y][x].type = wallType;

                        // Place a door randomly on a wall (not a corner)
                        if (doorX === -1 && (x === startX + 1 && y === startY) && getRandomInt(1, 100) > 50) {
                            map[y][x].type = houseDoor;
                            doorX = x;
                            doorY = y;
                        }

                    } else {
                        map[y][x].type = floorType;
                    }
                }
            }

            if (doorX !== -1) {
                logToConsole(`A house was placed at (${startX}, ${startY}) with a door at (${doorX}, ${doorY}).`);
                return true;
            }
        }
    }
    return false;
}

/** Places a large castle structure (7x7) on the map. */
function placeCastle(map) {
    const castleSize = 7;
    const wallType = TILE_TYPES.WALL_CASTLE;
    const floorType = TILE_TYPES.GROUND_STONE;
    const gateType = TILE_TYPES.DOORWAY_GATE;

    const startX = Math.floor(map[0].length / 2) - Math.floor(castleSize / 2);
    const startY = Math.floor(map.length / 2) - Math.floor(castleSize / 2);

    // Check if the area required for the castle and its perimeter is valid ground
    if (isAreaClear(map, startX - 1, startY - 1, castleSize + 2, castleSize + 2, [TILE_TYPES.GROUND_FIELD.id])) {
        
        // Draw the outer walls and interior floor
        for (let y = startY; y < startY + castleSize; y++) {
            for (let x = startX; x < startX + castleSize; x++) {
                const isWall = (x === startX || x === startX + castleSize - 1 || 
                                y === startY || y === startY + castleSize - 1);
                
                if (isWall) {
                    map[y][x].type = wallType;
                } else {
                    map[y][x].type = floorType;
                }
            }
        }

        // Place the main gate (doorway) on the bottom wall
        const gateX = startX + Math.floor(castleSize / 2);
        const gateY = startY + castleSize - 1;
        map[gateY][gateX].type = gateType;

        logToConsole(`A grand Castle was placed at the map center.`);
        return true;
    }
    return false;
}


/**
 * Generates the map using a sequence of rules.
 */
function generateMap(mapId = 'Landfall', width = MAP_WIDTH, height = MAP_HEIGHT) {
    gameState.currentLocation = mapId;
    const map = [];
    const tilesToVisit = new Set();
    
    // 1. Initialize map with the default GROUND_FIELD tile
    for (let y = 0; y < height; y++) {
        map[y] = [];
        for (let x = 0; x < width; x++) {
            map[y][x] = new TileData(x, y, TILE_TYPES.GROUND_FIELD);
        }
    }

    // 2. Create the Random Walk Path (ensures a main walkable area)
    let currentX = Math.floor(width / 2);
    let currentY = Math.floor(height / 2);
    tilesToVisit.add(`${currentX},${currentY}`);
    
    const PATH_LENGTH = width * height * 0.6; // Path covers 60% of the area

    for (let i = 0; i < PATH_LENGTH; i++) {
        const moves = [ { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 } ];
        const { dx, dy } = moves[getRandomInt(0, 3)];
        
        let nextX = currentX + dx;
        let nextY = currentY + dy;

        if (nextX > 0 && nextX < width - 1 && nextY > 0 && nextY < height - 1) {
            currentX = nextX;
            currentY = nextY;
            tilesToVisit.add(`${currentX},${currentY}`);
        }
    }
    
    const WALKABLE_TILES = Array.from(tilesToVisit).map(coord => coord.split(',').map(Number));

    // 3. Place Large Features (Castle)
    let castlePlaced = false;
    if (getRandomInt(1, 100) <= 25) { // 25% chance of a castle
        castlePlaced = placeCastle(map);
    }
    
    // 4. Place Houses (2-4 random houses)
    let housesPlaced = 0;
    for (let i = 0; i < 4; i++) {
        if (placeHouse(map)) {
            housesPlaced++;
        }
    }

    // 5. Place Non-Walkable Barriers (Rocks/Water) - Adds obstacles outside of features
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const tile = map[y][x];
            // If the tile is still default GROUND_FIELD, replace it randomly with a barrier
            if (tile.type.id === TILE_TYPES.GROUND_FIELD.id && getRandomInt(1, 10) === 1) {
                 tile.type = TILE_TYPES.WALL_ROCK;
            }
        }
    }

    // 6. Place Initial Encounters (Enemies/Treasures) on remaining walkable tiles
    for (const [x, y] of WALKABLE_TILES) {
        const tile = map[y][x];
        // Only place encounters on plain ground, not on road blocks or inside structures
        if (tile.type.walkable && tile.type.id === TILE_TYPES.GROUND_FIELD.id && getRandomInt(1, 100) <= 3) {
            const encounter = ENCOUNTER_TYPES[getRandomInt(0, ENCOUNTER_TYPES.length - 1)];
            tile.initialEncounter = encounter;
            tile.currentEncounter = encounter;
        }
    }

    // 7. Finalize Outer Walls
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
                map[y][x].type = TILE_TYPES.WALL_ROCK;
            }
        }
    }

    // 8. Place Final Exit Doorway (at least one, usually far from start)
    let exitPlaced = false;
    for (let i = 0; i < 10; i++) { 
        const exitX = getRandomInt(1, width - 2);
        const exitY = getRandomInt(height * 0.75, height - 2); // Place in lower quarter
        
        if (map[exitY][exitX].type.walkable) {
            map[exitY][exitX].type = TILE_TYPES.DOORWAY_CAVE; // Using Cave as generic world exit
            exitPlaced = true;
            logToConsole(`World Exit placed at (${exitX}, ${exitY}).`);
            break;
        }
    }

    if (!exitPlaced) logToConsole("Warning: No world exit placed.");

    gameState.currentMap = map;
    
    // 9. Set player start position (randomly picked from walkable path)
    if (WALKABLE_TILES.length > 0) {
        const [startX, startY] = WALKABLE_TILES[getRandomInt(0, WALKABLE_TILES.length - 1)];
        gameState.playerPos = { x: startX, y: startY };
        gameState.currentMap[startY][startX].visited = true; 
    }
}


// --- REST OF THE GAME LOGIC (Stable, No Changes Below) ---

function renderMap() {
    gameMapDiv.innerHTML = '';
    gameMapDiv.style.gridTemplateRows = `repeat(${gameState.currentMap.length}, 1fr)`;
    
    const adjacentWalkableTiles = getAdjacentWalkableTiles(gameState.playerPos.x, gameState.playerPos.y);

    for (let y = 0; y < gameState.currentMap.length; y++) {
        for (let x = 0; x < gameState.currentMap[0].length; x++) {
            const tileData = gameState.currentMap[y][x];
            const tileElement = document.createElement('div');
            
            tileElement.classList.add('tile');
            tileElement.dataset.x = x;
            tileElement.dataset.y = y;
            tileElement.title = `(${x}, ${y}) - ${tileData.type.id}`;

            tileElement.style.backgroundImage = `url(${tileData.type.image})`;
            
            if (x === gameState.playerPos.x && y === gameState.playerPos.y) {
                tileElement.classList.add('player');
            } 
            if (tileData.visited) {
                tileElement.classList.add('visited');
            }
            const isAdjacentWalkable = adjacentWalkableTiles.some(pos => pos.x === x && pos.y === y);
            if (isAdjacentWalkable) {
                tileElement.classList.add('can-move');
            }
            
            if (tileData.currentEncounter) {
                const symbol = tileData.currentEncounter.type.charAt(0).toUpperCase();
                tileElement.textContent = symbol;
            } else if (tileData.type.action === 'travel') {
                 tileElement.textContent = tileData.type.symbol;
            }
            
            tileElement.addEventListener('click', handleTileClick);

            gameMapDiv.appendChild(tileElement);
        }
    }
    centerMapOnPlayer();
}

function getAdjacentWalkableTiles(x, y) {
    const tiles = [];
    const currentMapWidth = gameState.currentMap[0].length;
    const currentMapHeight = gameState.currentMap.length;

    const moves = [
        { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
        { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
    ];

    for (const { dx, dy } of moves) {
        const checkX = x + dx;
        const checkY = y + dy;

        if (checkX >= 0 && checkX < currentMapWidth && checkY >= 0 && checkY < currentMapHeight) {
            const tileData = gameState.currentMap[checkY][checkX];
            if (tileData && tileData.type.walkable) {
                tiles.push({ x: checkX, y: checkY });
            }
        }
    }
    return tiles;
}

function centerMapOnPlayer() {
    const playerTile = document.querySelector('.tile.player');
    if (playerTile) {
        const tileRect = playerTile.getBoundingClientRect();
        const mapRect = gameMapDiv.getBoundingClientRect();
        
        gameMapDiv.scrollTop = playerTile.offsetTop - (mapRect.height / 2) + (tileRect.height / 2);
        gameMapDiv.scrollLeft = playerTile.offsetLeft - (mapRect.width / 2) + (tileRect.width / 2);
    }
}

function handleTileClick(event) {
    const targetTile = event.currentTarget;
    const targetX = parseInt(targetTile.dataset.x);
    const targetY = parseInt(targetTile.dataset.y);

    const dx = Math.abs(targetX - gameState.playerPos.x);
    const dy = Math.abs(targetY - gameState.playerPos.y);

    if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
        movePlayer(targetX, targetY);
    } else {
        logToConsole("You can only move one step (Up, Down, Left, or Right).");
    }
}

function movePlayer(newX, newY) {
    const targetTileData = gameState.currentMap[newY][newX];
    
    if (!targetTileData.type.walkable) {
        logToConsole(`You cannot walk on ${targetTileData.type.id}.`);
        return;
    }
    
    advanceTime();
    
    gameState.playerPos = { x: newX, y: newY };

    targetTileData.visited = true;

    renderMap();
    logToConsole(`Moved to (${newX}, ${newY}).`);

    checkAndDisplayTileAction(targetTileData);
}

function checkAndDisplayTileAction(tileData) {
    document.getElementById('rest-action-button')?.remove();

    if (tileData.currentEncounter) {
        const encounter = tileData.currentEncounter;
        
        encounterName.textContent = encounter.name;
        encounterDescription.textContent = encounter.description;
        
        encounterActions.innerHTML = ''; 
        const actionButton = document.createElement('button');
        actionButton.textContent = `Interact with ${encounter.name}`;
        
        actionButton.addEventListener('click', () => {
            logToConsole(`You interact with the ${encounter.name}. The encounter fades.`);
            tileData.currentEncounter = null; 
            renderMap();
            checkAndDisplayTileAction(tileData);
        });
        encounterActions.appendChild(actionButton);
        
        logToConsole(`You have found a ${encounter.type}: ${encounter.name}!`);

    } else if (tileData.type.action === 'travel') {
        encounterName.textContent = tileData.type.id.replace('_', ' ');
        encounterDescription.textContent = `This ${tileData.type.id} leads to a new area.`;
        
        encounterActions.innerHTML = '';
        const travelButton = document.createElement('button');
        travelButton.textContent = `Enter the ${tileData.type.id}`;
        travelButton.addEventListener('click', () => travelToNewMap(tileData.type));
        encounterActions.appendChild(travelButton);
        
        logToConsole(`A path to another realm lies before you.`);
    }
     else {
        encounterName.textContent = "Empty";
        encounterDescription.textContent = "The area is clear. You see only the landscape.";
        encounterActions.innerHTML = '';
    }

    checkRestOption();
}

function travelToNewMap(doorwayType) {
    let newMapId;
    let newWidth, newHeight;

    if (doorwayType === TILE_TYPES.DOORWAY_HOUSE) {
        newMapId = 'Trader\'s Hut';
        newWidth = getRandomInt(8, 12);
        newHeight = getRandomInt(8, 12);
        logToConsole(`You step through the ${doorwayType.id}, entering the Trader's Hut.`);
    } else if (doorwayType === TILE_TYPES.DOORWAY_CAVE) {
        newMapId = 'Dark Cavern';
        newWidth = 20;
        newHeight = 60;
        logToConsole(`You descend into the cold ${doorwayType.id}.`);
    } else if (doorwayType === TILE_TYPES.DOORWAY_GATE) {
        newMapId = 'Castle Courtyard';
        newWidth = 10;
        newHeight = 10;
        logToConsole(`You pass through the ancient ${doorwayType.id}.`);
    } else {
        logToConsole(`ERROR: Unhandled doorway type: ${doorwayType.id}`);
        return;
    }

    // TEMPORARY: For now, all travel generates the default outside map again
    generateMap(newMapId, newWidth, newHeight); 
    renderMap();
    logToConsole(`You arrive at ${gameState.currentLocation}.`);
}


function switchScreen(nextScreenId) {
    titleScreen.classList.add('hidden');
    charSelectScreen.classList.add('hidden');
    gameInterface.classList.add('hidden');

    if (nextScreenId === 'title') {
        titleScreen.classList.remove('hidden');
    } else if (nextScreenId === 'char-select') {
        charSelectScreen.classList.remove('hidden');
        document.getElementById('gender-selection').classList.remove('hidden');
        classSelectionDiv.classList.add('hidden');
    } else if (nextScreenId === 'game-interface') {
        gameInterface.classList.remove('hidden');
    }

    gameState.screen = nextScreenId;
}

function handleGenderSelection(event) {
    const selectedButton = event.currentTarget;
    const selectedGender = selectedButton.dataset.gender;

    gameState.player.gender = selectedGender;

    genderChoiceText.textContent = `You have chosen your kin. Now, select your starting Path.`;
    
    genderChoiceButtons.forEach(btn => btn.classList.remove('selected'));
    selectedButton.classList.add('selected');

    classSelectionDiv.classList.remove('hidden');
    confirmCharButton.disabled = true; 
    populatePathSelection(); 
}

function populatePathSelection() {
    const pathButtonsContainer = classSelectionDiv.querySelector('.choice-buttons');
    pathButtonsContainer.innerHTML = '';

    GAME_PATHS.forEach(path => {
        const button = document.createElement('button');
        button.classList.add('choice-btn', 'path-btn');
        button.dataset.path = path.id;
        button.textContent = path.name;
        button.addEventListener('click', handlePathSelection); 
        pathButtonsContainer.appendChild(button);
    });
}

function handlePathSelection(event) {
    const selectedPathId = event.currentTarget.dataset.path;
    const selectedPath = GAME_PATHS.find(p => p.id === selectedPathId);

    if (!selectedPath) return;

    gameState.player.path = selectedPathId;

    document.querySelectorAll('.path-btn').forEach(btn => btn.classList.remove('selected'));
    event.currentTarget.classList.add('selected');

    document.getElementById('path-choice-text').textContent = `${selectedPath.name}: ${selectedPath.desc} (Focuses on ${selectedPath.focus}).`;

    confirmCharButton.disabled = false;
}

function updateHealthDisplay() {
    const bloodMeterFill = document.getElementById('blood-meter-fill');
    const hpValue = document.getElementById('hp-value');

    const { currentHP, maxHP } = gameState.player;

    const healthPercent = (currentHP / maxHP) * 100;
    
    bloodMeterFill.style.height = `${healthPercent}%`;
    hpValue.textContent = `${currentHP} / ${maxHP}`;

    if (currentHP <= 0) {
        logToConsole("The warrior has fallen!");
    }
}


function initializeGame() {
    const charName = gameState.player.gender === 'male' ? 'The Huscarl' : 'The Shieldmaiden';
    document.querySelector('#char-sheet-container h2').textContent = charName;
    
    generateTimeBar();
    updateTimeDisplay();
    
    // Generate the initial map (Landfall)
    generateMap('Landfall');
    renderMap();
    
    updateHealthDisplay();

    logToConsole(`Welcome, ${charName}! You start your journey at ${gameState.currentLocation}. Select an adjacent tile to move.`);
    console.log("Entering the World! Final Player State:", gameState.player);
}


// --- EVENT LISTENERS ---

document.getElementById('start-game-button').addEventListener('click', () => {
    switchScreen('char-select');
});

document.querySelectorAll('#gender-selection .choice-btn').forEach(button => {
    button.addEventListener('click', handleGenderSelection);
});

document.getElementById('confirm-char-button').addEventListener('click', () => {
    if (gameState.player.gender && gameState.player.path) {
        switchScreen('game-interface');
        initializeGame();
    } else {
        alert("Please choose a gender and a starting path.");
    }
});

window.addEventListener('resize', () => {
    if (gameState.screen === 'game-interface') {
        updateTimeDisplay();
    }
});


// --- INITIALIZATION ---

switchScreen('title');

window.takeDamage = (amount) => {
    gameState.player.currentHP = Math.max(0, gameState.player.currentHP - amount);
    logToConsole(`You took ${amount} damage.`);
    updateHealthDisplay();
}

logToConsole("Game Initialized. Ready for Title Screen.");