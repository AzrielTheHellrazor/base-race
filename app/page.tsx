"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import GameLobby from "./components/GameLobby";
import RaceStatus from "./components/RaceStatus";
import PuzzleSolver from "./components/PuzzleSolver";

// Dynamic import for Phaser
const MathRaceGame = dynamic(() => {
  return import('./MathRaceGameComponent').then((mod) => mod.default);
}, {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <div className="text-white text-xl">Oyun yükleniyor...</div>
    </div>
  )
});

type GameMode = 'lobby' | 'waiting' | 'racing' | 'phaser';

export default function Page() {
  const [currentRaceId, setCurrentRaceId] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('lobby');
  const [isCreator, setIsCreator] = useState(false);

  // Farcaster SDK ready çağrısı
  useEffect(() => {
    // Farcaster SDK'sının yüklenmesini bekle
    const initFarcaster = async () => {
      try {
        // @ts-expect-error - Farcaster SDK global olarak yüklenir
        if (typeof window !== 'undefined' && window.farcaster) {
          // @ts-expect-error - Farcaster SDK global object
          await window.farcaster.actions.ready();
          console.log('Farcaster SDK ready called successfully');
        }
      } catch (error) {
        console.log('Farcaster SDK not available or ready call failed:', error);
      }
    };

    initFarcaster();
  }, []);

  const handleStartGame = (raceId: string, isCreator: boolean = false) => {
    setCurrentRaceId(raceId);
    setIsCreator(isCreator);
    setGameMode('waiting');
  };

  const handleRaceStarted = () => {
    setGameMode('phaser'); // Doğrudan Phaser oyununa geç
  };

  const handleBackToLobby = () => {
    setGameMode('lobby');
    setCurrentRaceId(null);
    setIsCreator(false);
  };

  const handlePuzzleSolved = (correct: boolean, speedBoost: number) => {
    // Bulmaca çözüldüğünde yapılacak işlemler
    console.log(`Bulmaca ${correct ? 'doğru' : 'yanlış'} çözüldü, hız bonusu: ${speedBoost}`);
  };

  const handleStartPhaserGame = () => {
    setGameMode('phaser');
  };

  // Lobby ekranı
  if (gameMode === 'lobby') {
    return <GameLobby onStartGame={handleStartGame} />;
  }

  // Yarış bekleme ekranı
  if (gameMode === 'waiting' && currentRaceId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 to-blue-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-white">🏁 Math Race</h1>
            <button
              onClick={handleBackToLobby}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              ← Lobby&apos;ye Dön
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RaceStatus 
              raceId={currentRaceId} 
              onStartRace={handleRaceStarted}
              isCreator={isCreator}
            />
            <div className="space-y-4">
              <button
                onClick={handleStartPhaserGame}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                🎮 Phaser Oyununu Başlat
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Yarış ekranı
  if (gameMode === 'racing' && currentRaceId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 to-blue-900 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-white">🏁 Math Race - Yarış</h1>
            <button
              onClick={handleBackToLobby}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              ← Lobby&apos;ye Dön
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RaceStatus raceId={currentRaceId} />
            </div>
            <div>
              <PuzzleSolver 
                raceId={currentRaceId} 
                onPuzzleSolved={handlePuzzleSolved}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Phaser oyun ekranı
  if (gameMode === 'phaser' && currentRaceId) {
    return (
      <div className="relative">
        <button
          onClick={handleBackToLobby}
          className="absolute top-4 left-4 z-50 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          ← Lobby&apos;ye Dön
        </button>
        <MathRaceGame raceId={currentRaceId} />
      </div>
    );
  }

  return <GameLobby onStartGame={handleStartGame} />;
}
