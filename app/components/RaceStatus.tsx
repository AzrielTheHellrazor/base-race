"use client";
import { useState, useEffect } from 'react';
import { apiClient, RaceState, LeaderboardEntry } from '@/lib/api-client';

interface RaceStatusProps {
  raceId: string;
  onStartRace?: () => void;
  isCreator?: boolean;
}

export default function RaceStatus({ raceId, onStartRace, isCreator = false }: RaceStatusProps) {
  const [raceState, setRaceState] = useState<RaceState | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState('');

  // Yarış durumunu periyodik olarak güncelle
  useEffect(() => {
    const updateRaceState = async () => {
      try {
        const [state, board] = await Promise.all([
          apiClient.getRaceState(raceId),
          apiClient.getLeaderboard(raceId)
        ]);
        setRaceState(state);
        setLeaderboard(board);
        setError('');
      } catch {
        setError('Failed to update race status');
      }
    };

    updateRaceState();
    const interval = setInterval(updateRaceState, 2000); // Her 2 saniyede bir güncelle

    return () => clearInterval(interval);
  }, [raceId]);

  const handleStartRace = async () => {
    if (!isCreator) return;
    
    try {
      setIsStarting(true);
      setError('');
      
      // Authentication kontrolü
      const session = await apiClient.checkSession();
      if (!session.valid) {
        setError('Authentication required. Please reconnect your wallet.');
        return;
      }
      
      await apiClient.startRace(raceId);
      onStartRace?.();
    } catch (err) {
      console.error('Start race error:', err);
      setError('Failed to start race: ' + (err as Error).message);
    } finally {
      setIsStarting(false);
    }
  };

  if (!raceState) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 text-white">
        <p>Loading race status...</p>
      </div>
    );
  }

  // Normalize backend response using typed shapes
  const raceStatusValue = raceState.race.state ?? 'waiting';
  const participantsArray = raceState.participants ?? [];
  const participantsCount = participantsArray.length;
  const raceLength = raceState.progress?.raceLength ?? 0;
  const raceCreator = raceState.race.creator;

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 text-white">
      {/* Yarış Bilgileri */}
      <div className="mb-4">
        <h3 className="text-lg font-bold mb-2">Race #{raceId.slice(0, 8)}</h3>
        <div className="flex justify-between items-center">
          <span className={`px-2 py-1 rounded text-xs ${
            raceStatusValue === 'waiting' ? 'bg-yellow-500/20 text-yellow-200' :
            raceStatusValue === 'started' ? 'bg-green-500/20 text-green-200' :
            'bg-gray-500/20 text-gray-200'
          }`}>
            {raceStatusValue === 'waiting' ? '⏳ Waiting' :
             raceStatusValue === 'started' ? '🏁 Started' :
             '🏁 Finished'}
          </span>
          <span className="text-sm text-gray-300">
            {participantsCount} participants
          </span>
        </div>
      </div>

      {/* Başlat Butonu */}
      {isCreator && raceStatusValue === 'waiting' && (
        <button
          onClick={handleStartRace}
          disabled={isStarting}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-400 text-white font-bold py-2 px-4 rounded-lg transition-colors mb-4"
        >
          {isStarting ? '⏳ Starting...' : '🏁 Start Race'}
        </button>
      )}

      {/* Katılımcılar */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2">Participants</h4>
        <div className="space-y-2">
          {participantsArray.map((participant) => (
            <div key={participant.address} className="flex justify-between items-center bg-white/5 rounded p-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-mono">
                  {participant.address.slice(0, 6)}...{participant.address.slice(-4)}
                </span>
                {raceCreator && participant.address === raceCreator && (
                  <span className="text-xs bg-blue-500/20 text-blue-200 px-1 rounded">👑</span>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm">
                  Pozisyon: {participant.position}/{raceLength}
                </div>
                <div className="text-xs text-gray-400">
                  Hız: {typeof participant.speed === 'number' ? participant.speed.toFixed(1) : '-'} | Bulmaca: {participant.totalPuzzlesSolved ?? 0}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lider Tablosu */}
      {leaderboard.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Leaderboard</h4>
          <div className="space-y-1">
            {leaderboard.slice(0, 5).map((entry, index) => (
              <div key={entry.address} className="flex justify-between items-center bg-white/5 rounded p-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                  </span>
                  <span className="text-sm font-mono">
                    {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm">
                    Position: {typeof entry.position === 'number' ? entry.position.toFixed(2) : '-'}
                  </div>
                  <div className="text-xs text-gray-400">
                    Puzzles: {entry.totalPuzzlesSolved ?? 0}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-500/20 border border-red-500 rounded-lg p-2">
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
