// ========================================================
// Mumbai Island Taxi Sim 3D - Global Configuration & State
// ========================================================

// 1. World Geometry & Grid Constants
const MAP_HALF = 4200;
const GRID_STEP = 500;
const ROAD_WIDTH = 130;
const RIVER_X = -1000;
const RIVER_WIDTH = 280;
const HIGHWAY_Z = 2250;

// Island 2: Palm Resort Island & Sea Link Bridge Constants
const BRIDGE_Z = 0;
const BRIDGE_START_X = 4100;
const BRIDGE_END_X = 6400;
const BRIDGE_WIDTH = 90;
const ISLAND2_CENTER_X = 8200;
const ISLAND2_CENTER_Z = 0;
const ISLAND2_HALF_W = 1800; // X from 6400 to 10000
const ISLAND2_HALF_D = 1800; // Z from -1800 to 1800

// 2. Three.js Scene References
let scene, camera, renderer, dirLight, ambientLight;

// 3. World Entities & Spatial Partitioning
let cars = [];
let playerCar = null;
let buildings = [];
let spatialGrid = new Map();
let serviceZones = [];

// 4. Materials & Shared Procedural Textures Cache
let buildingWallMat = null;
let facadeDayTex = null;
let facadeNightTex = null;
let lastFacadeNightState = null;

let sharedEnvCube = null;
let sharedContactShadowTex = null;
let sharedTaxiSideTex = null;
let sharedTrafficSideTex = null;
let sharedFrontFaceTex = null;
let sharedRearFaceTex = null;
let sharedTaxiSignTex = null;
let sharedDriverFaceTex = null;

// 5. Player State (In-Car Driving & On-Foot Free-Roam)
const player = {
    inCar: true,
    x: 250,
    y: 0,
    z: 250,
    vx: 0,
    vy: 0,
    vz: 0,
    heading: 0,
    walkCycle: 0,
    mesh: null,
    leftLeg: null,
    rightLeg: null,
    leftArm: null,
    rightArm: null
};

// 6. Camera & Environment
let camMode = 0; // 0 = Close Action View, 1 = Standard Chase View, 2 = Wide Cinematic View
let camYawOffset = 0;
let camPitchOffset = 0;
let camFollowYaw = 0;
let camEyePos = null;
let camLookTarget = null;
let timeOfDay = 0.28; // 0..1 (0.28 = morning)
let manualNight = false;
let fullMapOpen = false;
let inMainMenu = true;

// 7. Input State
const keys = {};
const touchState = { left: false, right: false, gas: false, reverse: false, brake: false, nitro: false, jump: false };

// 8. Economy, Resources & Mission State
let cash = 120;
let faresCompleted = 0;
let health = 100;
let fuel = 100;
let nitro = 100;
let isGameOver = false;

const mission = {
    state: 'pickup', // 'pickup' | 'dropoff'
    x: 750,
    z: 750,
    timer: 0,
    payout: 45,
    ringMesh: null,
    beamMesh: null,
    passengerMesh: null
};

