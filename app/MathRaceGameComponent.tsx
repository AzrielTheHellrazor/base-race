"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import * as Phaser from "phaser";
import { apiClient } from "@/lib/api-client";
import { io } from "socket.io-client";

// Game state
interface GameState {
  score: number;
  distance: number;
  speed: number;
  timeLeft: number;
  gameRunning: boolean;
  carProgress: number[]; // Progress for each car (0-10)
}

// Prime numbers
const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37];

// Props interface
interface MathRaceGameProps {
  raceId: string;
}

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
  private onGameStarted: () => void;
  private participants: Array<{address: string, position: number}> = [];

  constructor() {
    super({ key: 'MathRaceScene' });
    this.gameState = {
      score: 0,
      distance: 0,
      speed: 0,
      timeLeft: 60,
      gameRunning: false,
      carProgress: [0, 0, 0, 0] // Each car starts at progress 0
    };
    this.onStateChange = () => {};
    this.onFeedback = () => {};
    this.onGameStarted = () => {};
  }

  setCallbacks(onStateChange: (state: GameState) => void, onFeedback: (text: string, color: string) => void, onGameStarted?: () => void) {
    this.onStateChange = onStateChange;
    this.onFeedback = onFeedback;
    this.onGameStarted = onGameStarted || (() => {});
  }

  setParticipants(participants: Array<{address: string, position: number}>) {
    this.participants = participants;
    // Initialize car progress array based on participants
    this.gameState.carProgress = new Array(4).fill(0);
    console.log('Participants set:', participants);
    console.log('Car progress initialized:', this.gameState.carProgress);
    // Update car positions based on participant order
    this.updateCarPositions();
  }

  updateCarProgress(progress: number[]) {
    console.log('updateCarProgress called with:', progress);
    this.gameState.carProgress = progress;
    console.log('Updated carProgress:', this.gameState.carProgress);
    this.updateCarPositions();
    this.onStateChange(this.gameState);
  }

  updateSingleCarProgress(carIndex: number, progress: number) {
    if (carIndex >= 0 && carIndex < this.gameState.carProgress.length) {
      this.gameState.carProgress[carIndex] = progress;
      this.updateCarPositions();
      this.onStateChange(this.gameState);
    }
  }



  // Start the game
  async startGame() {
    try {
      console.log('Starting game...');
      this.gameState.gameRunning = true;
      this.onStateChange(this.gameState);
      this.onGameStarted(); // Notify that game has started
      
      console.log('Game started successfully');
    } catch (error) {
      console.error('Failed to start game:', error);
      this.gameState.gameRunning = false;
      this.onStateChange(this.gameState);
      this.onFeedback('Failed to start game', '#ef4444');
    }
  }





  // Update car positions based on progress with smooth transition
  updateCarPositions() {
    console.log('updateCarPositions called, carProgress:', this.gameState.carProgress);
    const laneWidth = this.scale.width / 4;
    const laneHeight = this.scale.height * 0.6;
    const laneStartY = this.scale.height * 0.2;
    const laneEndY = laneStartY + laneHeight;
    
    this.carDetails.forEach((carDetail, index) => {
      const laneX = index * laneWidth + (laneWidth / 2);
      const progress = this.gameState.carProgress[index] / 10; // Progress from 0 to 1
      const carY = laneEndY - 30 - (progress * (laneHeight - 60)); // Move from bottom to top
      console.log(`Car ${index}: progress=${this.gameState.carProgress[index]}, normalized=${progress}, targetY=${carY}`);
      
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

    // Start the game
    this.startGame();

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
    // WebSocket'ten gelen verilerle araba pozisyonları güncelleniyor
    // Bu metod artık sadece UI güncellemesi yapıyor
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

  // Eski oyun mantığı kaldırıldı - artık backend'den geliyor

  resetGame() {
    this.gameState = {
      score: 0,
      distance: 0,
      speed: 0,
      timeLeft: 60,
      gameRunning: false,
      carProgress: [0, 0, 0, 0] // Reset all car progress
    };

    // Reset car positions to bottom of their lanes
    this.updateCarPositions();
    
    // Start the game again
    this.startGame();
  }
}

export default function MathRaceGame({ raceId }: MathRaceGameProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<MathRaceScene | null>(null);
  
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    distance: 0,
    speed: 0,
    timeLeft: 60,
    gameRunning: false,
    carProgress: [0, 0, 0, 0]
  });

  const [showGameOver, setShowGameOver] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', color: '', show: false });
  const [participants, setParticipants] = useState<Array<{address: string, position: number}>>([]);
  const [hasGameStarted, setHasGameStarted] = useState(false);



  // Initialize WebSocket connection and get race participants
  useEffect(() => {
    const initializeRace = async () => {
      try {


        // Get race state to get participants
        const raceState = await apiClient.getRaceState(raceId);
        if (raceState && raceState.participants) {
          // Sort participants by join order (first to join gets leftmost lane)
          const sortedParticipants = raceState.participants
            .map((p, index) => ({ address: p.address, position: index }))
            .sort((a, b) => a.position - b.position);
          setParticipants(sortedParticipants);
        }

        // Initialize WebSocket connection
        const socket = io('http://localhost:3002', {
          query: { raceId }
        });

        socket.on('connect', () => {
          console.log('Connected to WebSocket server');
          socket.emit('join-race', { raceId });
        });

        socket.on('race-positions-update', (data) => {
          console.log('Race positions received:', data);
          // Update car positions based on real-time data
          if (data && data.positions && Array.isArray(data.positions) && sceneRef.current) {
            const updatedProgress = data.positions.map((p: { position: number }) => 
              Math.min(10, (p.position / 500) * 10) // RACE_LENGTH = 500 in backend
            );
            console.log('Updated progress:', updatedProgress);
            sceneRef.current.updateCarProgress(updatedProgress);
          }
        });

        socket.on('puzzle-solved', (data) => {
          console.log('Puzzle solved:', data);
          // Update specific car progress when puzzle is solved
          if (data.participantAddress && sceneRef.current) {
            const participantIndex = participants.findIndex(p => p.address === data.participantAddress);
            if (participantIndex >= 0) {
              const newProgress = Math.min(10, (data.newPosition / data.raceLength) * 10);
              sceneRef.current.updateSingleCarProgress(participantIndex, newProgress);
            }
          }
        });

        // Periyodik olarak race state'i güncelle
        const updateRaceState = async () => {
          try {
            const raceState = await apiClient.getRaceState(raceId);
            if (raceState && raceState.participants && sceneRef.current) {
              const updatedProgress = raceState.participants.map((p: { position: number }) => 
                Math.min(10, (p.position / (raceState.progress.raceLength || 100)) * 10)
              );
              sceneRef.current.updateCarProgress(updatedProgress);
            }
          } catch (error) {
            console.error('Failed to update race state:', error);
          }
        };

        // Her 2 saniyede bir race state'i güncelle
        const raceStateInterval = setInterval(updateRaceState, 2000);



        return () => {
          socket.disconnect();
          if (raceStateInterval) {
            clearInterval(raceStateInterval);
          }
        };
      } catch (error) {
        console.error('Failed to initialize race:', error);
      }
    };

    initializeRace();
  }, [raceId]);

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
        }, () => {
          setHasGameStarted(true);
        });
        
        // Set participants in the scene
        if (participants.length > 0) {
          scene.setParticipants(participants);
        }
      }
    });

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [participants]);

  // Check for game over
  useEffect(() => {
    // Only show game over if game was running and then stopped
    // Don't show game over immediately when component mounts
    if (gameState.gameRunning === false && !showGameOver && hasGameStarted) {
      setShowGameOver(true);
    }
  }, [gameState.gameRunning, showGameOver, hasGameStarted]);



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
