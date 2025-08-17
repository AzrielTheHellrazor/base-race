"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import * as Phaser from "phaser";

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
  carProgress: number[]; // Progress for each car (0-10)
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
  private carDetails: { body: Phaser.GameObjects.Rectangle; windows: Phaser.GameObjects.Rectangle[]; wheels: Phaser.GameObjects.Rectangle[]; lights: Phaser.GameObjects.Rectangle[] }[] = [];
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
      foundPrimes: [],
      carProgress: [0, 0, 0, 0] // Each car starts at progress 0
    };
    this.onStateChange = () => {};
    this.onFeedback = () => {};
  }

  setCallbacks(onStateChange: (state: GameState) => void, onFeedback: (text: string, color: string) => void) {
    this.onStateChange = onStateChange;
    this.onFeedback = onFeedback;
  }

  // Test function to advance cars
  advanceCar(carIndex: number, steps: number) {
    if (carIndex >= 0 && carIndex < this.gameState.carProgress.length) {
      this.gameState.carProgress[carIndex] = Math.min(10, this.gameState.carProgress[carIndex] + steps);
      this.updateCarPositions();
      this.onStateChange(this.gameState);
    }
  }

  // Update car positions based on progress with smooth transition
  updateCarPositions() {
    const laneWidth = this.scale.width / 4;
    const laneHeight = this.scale.height * 0.6;
    const laneStartY = this.scale.height * 0.2;
    const laneEndY = laneStartY + laneHeight;
    
    this.carDetails.forEach((carDetail, index) => {
      const laneX = index * laneWidth + (laneWidth / 2);
      const progress = this.gameState.carProgress[index] / 10; // Progress from 0 to 1
      const carY = laneEndY - 30 - (progress * (laneHeight - 60)); // Move from bottom to top
      
      // Update car body position with smooth transition
      this.tweens.add({
        targets: carDetail.body,
        x: laneX,
        y: carY,
        duration: 500,
        ease: 'Power2'
      });
      
      // Update windows position
      carDetail.windows.forEach((window, windowIndex) => {
        const windowOffsetX = windowIndex === 0 ? -7 : 7;
        this.tweens.add({
          targets: window,
          x: laneX + windowOffsetX,
          y: carY - 2,
          duration: 500,
          ease: 'Power2'
        });
      });
      
      // Update wheels position
      carDetail.wheels.forEach((wheel, wheelIndex) => {
        const wheelOffsetX = wheelIndex === 0 ? -12 : 12;
        this.tweens.add({
          targets: wheel,
          x: laneX + wheelOffsetX,
          y: carY - 5,
          duration: 500,
          ease: 'Power2'
        });
      });
      
      // Update lights position
      carDetail.lights.forEach((light, lightIndex) => {
        const lightOffsetX = lightIndex === 0 ? -10 : 10;
        this.tweens.add({
          targets: light,
          x: laneX + lightOffsetX,
          y: carY + 6,
          duration: 500,
          ease: 'Power2'
        });
      });
    });
  }

  create() {
    const { width, height } = this.scale;
    
    // Create green background
    this.add.graphics()
      .fillGradientStyle(0x059669, 0x10b981, 0x059669, 0x10b981, 1)
      .fillRect(0, 0, width, height);

    // Create 4 separate lanes
    const laneWidth = width / 4;
    const laneHeight = height * 0.6;
    const laneStartY = height * 0.2;
    const laneEndY = laneStartY + laneHeight;
    
    // Create 4 lanes side by side
    for (let lane = 0; lane < 4; lane++) {
      const laneX = lane * laneWidth;
      const laneColor = lane % 2 === 0 ? 0x1f2937 : 0x374151;
      
      // Draw lane
      this.add.graphics()
        .fillStyle(laneColor)
        .fillRect(laneX + 2, laneStartY, laneWidth - 4, laneHeight);
      
      // Lane borders
      this.add.graphics()
        .lineStyle(2, 0xfbbf24)
        .strokeRect(laneX + 2, laneStartY, laneWidth - 4, laneHeight);
    }
    
    // Finish line at the top
    this.add.graphics()
      .fillStyle(0xfbbf24)
      .fillRect(0, laneStartY - 10, width, 10);
    
    // Add checkered pattern to finish line
    const checkeredSize = 15;
    for (let x = 0; x < width; x += checkeredSize * 2) {
      this.add.graphics()
        .fillStyle(0x000000)
        .fillRect(x, laneStartY - 10, checkeredSize, 10);
    }

    // Create cars side by side at the bottom
    const carColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b];
    const carStartY = laneEndY - 30;
    
    for (let i = 0; i < 4; i++) {
      const carX = (i * laneWidth) + (laneWidth / 2);
      const carY = carStartY;
      
      // Car body
      const carBody = this.add.rectangle(
        carX,
        carY,
        25,
        12,
        carColors[i]
      );
      
      // Car windows
      const window1 = this.add.rectangle(carX - 7, carY - 2, 5, 5, 0xe5e7eb);
      const window2 = this.add.rectangle(carX + 7, carY - 2, 5, 5, 0xe5e7eb);
      
      // Car wheels
      const wheel1 = this.add.rectangle(carX - 12, carY - 5, 5, 6, 0x1f2937);
      const wheel2 = this.add.rectangle(carX + 12, carY - 5, 5, 6, 0x1f2937);
      
      // Car lights (headlights)
      const light1 = this.add.rectangle(carX - 10, carY + 6, 3, 3, 0xffff00);
      const light2 = this.add.rectangle(carX + 10, carY + 6, 3, 3, 0xffff00);
      
      this.cars.push(carBody);
      this.carDetails.push({
        body: carBody,
        windows: [window1, window2],
        wheels: [wheel1, wheel2],
        lights: [light1, light2]
      });
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

    // Update car positions based on progress
    this.updateCarPositions();

    this.onStateChange(this.gameState);
  }

  updateTimer() {
    if (!this.gameState.gameRunning) return;
    
    this.gameState.timeLeft--;
    if (this.gameState.timeLeft <= 0) {
      this.gameState.gameRunning = false;
    }
    
    this.onStateChange(this.gameState);
  }

  checkAnswer(prime1: number, prime2: number) {
    const product = prime1 * prime2;
    
    if (product === this.gameState.target) {
      // Correct answer - determine difficulty and advance cars
      const difficulty = this.getPuzzleDifficulty(prime1, prime2);
      const steps = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
      
      // Advance all cars based on difficulty
      for (let i = 0; i < 4; i++) {
        this.advanceCar(i, steps);
      }
      
      this.onFeedback('Correct!', '#10b981');
      this.generateTarget();
    } else {
      // Wrong answer
      this.gameState.wrongAnswers++;
      this.onFeedback('Wrong!', '#ef4444');
      
      if (this.gameState.wrongAnswers >= this.gameState.maxWrongAnswers) {
        this.gameState.gameRunning = false;
      }
    }
    
    this.onStateChange(this.gameState);
  }

  getPuzzleDifficulty(prime1: number, prime2: number): 'easy' | 'medium' | 'hard' {
    const sum = prime1 + prime2;
    if (sum <= 10) return 'easy';
    if (sum <= 20) return 'medium';
    return 'hard';
  }

  generateTarget(): number {
    const randomIndex = Math.floor(Math.random() * validProducts.length);
    return validProducts[randomIndex];
  }

  resetGame() {
    this.gameState = {
      score: 0,
      distance: 0,
      speed: 0.5,
      target: this.generateTarget(),
      selectedPrimes: [],
      timeLeft: 60,
      wrongAnswers: 0,
      maxWrongAnswers: 5,
      gameRunning: true,
      foundPrimes: [],
      carProgress: [0, 0, 0, 0] // Reset all car progress
    };

    // Reset car positions to bottom of their lanes
    this.updateCarPositions();
    
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
    foundPrimes: [],
    carProgress: [0, 0, 0, 0]
  });

  const [showGameOver, setShowGameOver] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', color: '', show: false });

  // Test function to advance cars
  const testAdvanceCars = useCallback((steps: number) => {
    if (sceneRef.current) {
      for (let i = 0; i < 4; i++) {
        sceneRef.current.advanceCar(i, steps);
      }
    }
  }, []);

  // Initialize Phaser Game
  useEffect(() => {
    if (gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 300,
      height: 600,
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
    }
  }, [gameState.gameRunning, showGameOver]);

  // Reset game
  const resetGame = useCallback(() => {
    if (sceneRef.current) {
      sceneRef.current.resetGame();
    }
    setShowGameOver(false);
  }, []);

  return (
    <div className="flex flex-col min-h-screen font-sans bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="w-full max-w-md mx-auto h-screen relative bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-700">
        {/* Phaser Game Container */}
        <div id="game-container" className="w-full h-full" />
        
        {/* UI Overlay */}
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Bottom Bar - Found Primes */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex justify-center space-x-2">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg border-2 border-blue-400 shadow-lg flex items-center justify-center"
                >
                  <span className="text-white font-bold text-lg">
                    {gameState.foundPrimes[index] || '?'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Test Buttons */}
          <div className="absolute bottom-20 left-4 right-4">
            <div className="flex justify-center space-x-2">
              <button
                onClick={() => testAdvanceCars(1)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold shadow-lg hover:bg-green-600 transition-colors pointer-events-auto"
              >
                Easy (+1)
              </button>
              <button
                onClick={() => testAdvanceCars(2)}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-semibold shadow-lg hover:bg-yellow-600 transition-colors pointer-events-auto"
              >
                Medium (+2)
              </button>
              <button
                onClick={() => testAdvanceCars(3)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold shadow-lg hover:bg-red-600 transition-colors pointer-events-auto"
              >
                Hard (+3)
              </button>
            </div>
          </div>

          {/* Feedback */}
          {feedback.show && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div
                className={`px-6 py-3 rounded-lg text-white font-bold text-xl shadow-lg animate-pulse`}
                style={{ backgroundColor: feedback.color }}
              >
                {feedback.text}
              </div>
            </div>
          )}
        </div>

        {/* Game Over Modal */}
        {showGameOver && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-600 shadow-2xl max-w-sm w-full mx-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Game Complete!</h2>
                <p className="text-slate-300 mb-6">Great Job!</p>
                <div className="text-3xl font-bold text-green-400 mb-6">
                  Score: {gameState.score}
                </div>
                <button
                  onClick={resetGame}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 px-6 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg"
                >
                  Play Again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
