"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Phaser from "phaser";

// Farcade SDK simulation
interface FarcadeSDK {
  ready: () => void;
  gameOver: ({ score }: { score: number }) => void;
  hapticFeedback: () => void;
  on: (event: string, callback: () => void) => void;
}

let farcade: FarcadeSDK | null = null;

// Game state
interface GameState {
  score: number;
  distance: number;
  speed: number;
  target: number;
  selectedPrimes: number[];
  timeLeft: number;
  gameRunning: boolean;
  wrongAnswers: number;
  maxWrongAnswers: number;
  foundPrimes: number[];
}

// Prime numbers
const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37];

// Pre-computed valid prime products
const validProducts: number[] = [];
for (let i = 0; i < primes.length; i++) {
  for (let j = i; j < primes.length; j++) {
    validProducts.push(primes[i] * primes[j]);
  }
}

// Phaser Game Scene
class MathRaceScene extends Phaser.Scene {
  private cars: Phaser.GameObjects.Rectangle[] = [];
  private lanes: Phaser.GameObjects.Rectangle[] = [];
  private finishLine!: Phaser.GameObjects.Rectangle;
  private gameState: GameState;
  private onStateChange: (state: GameState) => void;
  private onFeedback: (text: string, color: string) => void;

  constructor() {
    super({ key: 'MathRaceScene' });
    this.gameState = {
      score: 0,
      distance: 0,
      speed: 0,
      target: 6,
      selectedPrimes: [],
      timeLeft: 60,
      gameRunning: true,
      wrongAnswers: 0,
      maxWrongAnswers: 5,
      foundPrimes: []
    };
    this.onStateChange = () => {};
    this.onFeedback = () => {};
  }

  setCallbacks(onStateChange: (state: GameState) => void, onFeedback: (text: string, color: string) => void) {
    this.onStateChange = onStateChange;
    this.onFeedback = onFeedback;
  }

  create() {
    const { width, height } = this.scale;
    
    // Create background gradient
    this.add.graphics()
      .fillGradientStyle(0x1e40af, 0x3b82f6, 0x1e40af, 0x3b82f6, 1)
      .fillRect(0, 0, width, height);

    // Create 4 lanes
    const laneWidth = width / 4;
    const laneColors = [0x1f2937, 0x374151, 0x1f2937, 0x374151];
    
    for (let i = 0; i < 4; i++) {
      const lane = this.add.rectangle(
        i * laneWidth + laneWidth / 2,
        height / 2,
        laneWidth,
        height,
        laneColors[i]
      );
      this.lanes.push(lane);

      // Lane borders
      this.add.rectangle(i * laneWidth, height / 2, 3, height, 0xfbbf24);
      this.add.rectangle((i + 1) * laneWidth - 3, height / 2, 3, height, 0xfbbf24);
    }

    // Create finish line at bottom
    this.finishLine = this.add.rectangle(
      width / 2,
      height - 25,
      width,
      15,
      0xf59e0b
    );

    // Create cars
    const carColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b];
    for (let i = 0; i < 4; i++) {
      const car = this.add.rectangle(
        i * laneWidth + laneWidth / 2,
        100,
        40,
        20,
        carColors[i]
      );
      
      // Add car details
      this.add.rectangle(car.x - 10, car.y - 5, 8, 8, 0xe5e7eb); // Window 1
      this.add.rectangle(car.x + 10, car.y - 5, 8, 8, 0xe5e7eb); // Window 2
      
      // Add wheels
      this.add.rectangle(car.x - 20, car.y - 8, 8, 10, 0x1f2937); // Wheel 1
      this.add.rectangle(car.x + 20, car.y - 8, 8, 10, 0x1f2937); // Wheel 2
      
      this.cars.push(car);
    }

    // Start game loop
    this.time.addEvent({
      delay: 16, // ~60 FPS
      callback: this.updateGame,
      callbackScope: this,
      loop: true
    });

    // Start timer
    this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true
    });
  }

  updateGame() {
    if (!this.gameState.gameRunning) return;

    // Update distance based on speed
    this.gameState.distance += this.gameState.speed * 2;
    this.gameState.score = Math.floor(this.gameState.distance);

    // Move cars down
    this.cars.forEach((car) => {
      const newY = 100 + this.gameState.distance * 0.5;
      car.setY(newY);

      // Check if car reached finish line
      if (newY >= this.scale.height - 50) {
        this.gameState.gameRunning = false;
      }
    });

    this.onStateChange(this.gameState);
  }

  updateTimer() {
    if (!this.gameState.gameRunning) return;

    this.gameState.timeLeft--;
    
    if (this.gameState.timeLeft <= 0 || this.gameState.wrongAnswers >= this.gameState.maxWrongAnswers) {
      this.gameState.gameRunning = false;
    }

    this.onStateChange(this.gameState);
  }

  checkAnswer(selectedPrimes: number[]) {
    if (selectedPrimes.length !== 2) return;
    
    const product = selectedPrimes[0] * selectedPrimes[1];
    
    if (product === this.gameState.target) {
      // Correct answer
      this.gameState.speed = Math.min(this.gameState.speed + 1, 5);
      this.gameState.selectedPrimes = [];
      this.gameState.foundPrimes = [...this.gameState.foundPrimes, ...selectedPrimes.filter(p => !this.gameState.foundPrimes.includes(p))];
      this.onFeedback('Correct!', '#10B981');
      if (farcade) farcade.hapticFeedback();
    } else {
      // Wrong answer
      this.gameState.speed = Math.max(this.gameState.speed - 0.5, 0);
      this.gameState.wrongAnswers++;
      this.gameState.selectedPrimes = [];
      this.onFeedback('Wrong!', '#EF4444');
      if (farcade) farcade.hapticFeedback();
    }
    
    this.generateTarget();
    this.onStateChange(this.gameState);
  }

  generateTarget() {
    const randomIndex = Math.floor(Math.random() * validProducts.length);
    this.gameState.target = validProducts[randomIndex];
    this.onStateChange(this.gameState);
  }

  resetGame() {
    this.gameState = {
      score: 0,
      distance: 0,
      speed: 0,
      target: 6,
      selectedPrimes: [],
      timeLeft: 60,
      gameRunning: true,
      wrongAnswers: 0,
      maxWrongAnswers: 5,
      foundPrimes: []
    };

    // Reset car positions
    this.cars.forEach(car => car.setY(100));
    
    this.generateTarget();
    this.onStateChange(this.gameState);
  }
}

export default function MathRaceGame() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<MathRaceScene | null>(null);
  
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    distance: 0,
    speed: 0,
    target: 6,
    selectedPrimes: [],
    timeLeft: 60,
    gameRunning: true,
    wrongAnswers: 0,
    maxWrongAnswers: 5,
    foundPrimes: []
  });

  const [showGameOver, setShowGameOver] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', color: '', show: false });

  // Initialize Phaser Game
  useEffect(() => {
    if (gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 400,
      height: 800,
      parent: 'game-container',
      backgroundColor: '#1e40af',
      scene: MathRaceScene,
             physics: {
         default: 'arcade',
         arcade: {
           gravity: { x: 0, y: 0 },
           debug: false
         }
       },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    gameRef.current = new Phaser.Game(config);
    
    // Get scene reference
    gameRef.current.events.once('ready', () => {
      const scene = gameRef.current?.scene.getScene('MathRaceScene') as MathRaceScene;
      if (scene) {
        sceneRef.current = scene;
        scene.setCallbacks(setGameState, (text, color) => {
          setFeedback({ text, color, show: true });
          setTimeout(() => setFeedback(prev => ({ ...prev, show: false })), 1000);
        });
      }
    });

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  // Check for game over
  useEffect(() => {
    if (!gameState.gameRunning && !showGameOver) {
      setShowGameOver(true);
      if (farcade) {
        farcade.gameOver({ score: gameState.score });
      }
    }
  }, [gameState.gameRunning, showGameOver, gameState.score]);

  // Reset game
  const resetGame = useCallback(() => {
    if (sceneRef.current) {
      sceneRef.current.resetGame();
    }
    setShowGameOver(false);
    
    if (farcade) {
      farcade.ready();
    }
  }, []);

  // Initialize Farcade SDK
  useEffect(() => {
    try {
      farcade = {
        ready: () => console.log('Farcade ready'),
        gameOver: ({ score }: { score: number }) => console.log('Game over with score:', score),
        hapticFeedback: () => console.log('Haptic feedback'),
        on: (event: string) => {
          if (event === 'play_again') {
            // Handle play again
          }
          if (event === 'toggle_mute') {
            // Handle mute toggle
          }
        }
      };
      
      farcade.ready();
    } catch (error) {
      console.log('Farcade SDK not available:', error);
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen font-sans bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="w-full max-w-md mx-auto h-screen relative bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-700">
        {/* Phaser Game Container */}
        <div id="game-container" className="w-full h-full" />
        
        {/* UI Overlay */}
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-black/80 to-transparent h-24">
            {/* Score */}
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-slate-600">
              <div className="text-slate-300 text-xs font-medium">DISTANCE</div>
              <div className="text-white text-xl font-bold">{gameState.score}m</div>
            </div>
            
            {/* Target */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl px-6 py-3 border border-orange-400 shadow-lg">
              <div className="text-white text-xs font-medium text-center">TARGET</div>
              <div className="text-white text-2xl font-bold text-center">{gameState.target}</div>
            </div>
            
            {/* Time Left */}
            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-slate-600">
              <div className="text-slate-300 text-xs font-medium">TIME</div>
              <div className={`text-xl font-bold ${gameState.timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}>
                {gameState.timeLeft}s
              </div>
            </div>
          </div>
          
          {/* Found Primes Boxes - Top Left */}
          <div className="absolute top-28 left-4 flex flex-col gap-3 pointer-events-auto">
            <div className="text-white text-xs font-medium mb-1">FOUND PRIME NUMBERS</div>
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-white font-bold text-lg transition-all duration-300 shadow-lg ${
                  gameState.foundPrimes[index] 
                    ? 'bg-gradient-to-br from-green-500 to-green-600 border-green-400 shadow-green-500/25' 
                    : 'bg-slate-800/80 border-slate-600 backdrop-blur-sm'
                }`}
              >
                {gameState.foundPrimes[index] || '?'}
              </div>
            ))}
          </div>
          
          {/* Feedback */}
          {feedback.show && (
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-6xl font-bold drop-shadow-2xl transition-all duration-300 animate-pulse"
              style={{ color: feedback.color }}
            >
              {feedback.text}
            </div>
          )}
        </div>
        
        {/* Game Over Modal */}
        {showGameOver && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col justify-center items-center z-20">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 border border-slate-600 shadow-2xl max-w-sm w-full mx-4">
              <h2 className="text-white text-3xl font-bold mb-6 text-center">Game Over!</h2>
              
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-4 mb-6 text-center">
                <div className="text-slate-900 text-4xl font-bold">{gameState.score}m</div>
                <div className="text-slate-800 text-sm font-medium">Total Distance</div>
              </div>
              
              {gameState.foundPrimes.length > 0 && (
                <div className="bg-slate-700/50 rounded-xl p-4 mb-6">
                  <div className="text-slate-300 text-sm font-medium mb-2">Found Prime Numbers:</div>
                  <div className="text-white text-lg font-semibold">
                    {gameState.foundPrimes.join(', ')}
                  </div>
                </div>
              )}
              
              <button
                onClick={resetGame}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 border-none rounded-xl text-white text-lg font-bold py-4 px-8 cursor-pointer transition-all duration-200 shadow-lg hover:shadow-green-500/25 hover:-translate-y-1"
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
