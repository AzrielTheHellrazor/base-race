"use client";
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface GameLobbyProps {
  onStartGame: (raceId: string, isCreator?: boolean) => void;
}

export default function GameLobby({ onStartGame }: GameLobbyProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [raceId, setRaceId] = useState('');
  const [isCreatingRace, setIsCreatingRace] = useState(false);
  const [isJoiningRace, setIsJoiningRace] = useState(false);
  const [error, setError] = useState('');
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  // Backend bağlantısını kontrol et ve URL'den race ID'yi al
  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        const isConnected = await apiClient.isBackendConnected();
        setBackendStatus(isConnected ? 'connected' : 'disconnected');
        if (!isConnected) {
          setError('Backend connection failed. Is the backend running?');
        }
      } catch {
        setBackendStatus('disconnected');
        setError('Backend connection failed');
      }
    };

    // URL'den race ID'yi al
    const urlParams = new URLSearchParams(window.location.search);
    const urlRaceId = urlParams.get('raceId');
    if (urlRaceId) {
      setRaceId(urlRaceId);
    }

    checkBackendConnection();
  }, []);

  // MetaMask bağlantısı
  const connectWallet = async () => {
    try {
      if (typeof window.ethereum === 'undefined') {
        setError('MetaMask is not installed!');
        return;
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      setWalletAddress(address);

      // Backend'e giriş yap
      const nonce = Math.random().toString(36).substring(2, 15);
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [nonce, address]
      });

      const authResponse = await apiClient.login(address, signature, nonce);
      apiClient.setToken(authResponse.token);
      // Save token to localStorage for Phaser game
      localStorage.setItem('authToken', authResponse.token);
      setIsConnected(true);
      setError('');
    } catch (err) {
      setError('Wallet connection failed: ' + (err as Error).message);
    }
  };

  // Yeni yarış oluştur
  const createRace = async () => {
    try {
      setIsCreatingRace(true);
      setError('');
      const response = await apiClient.createRace(false);
      console.log('Created race with ID:', response.raceId);
      setRaceId(response.raceId);
      
      // URL'ye race ID'yi ekle
      const url = new URL(window.location.href);
      url.searchParams.set('raceId', response.raceId);
      window.history.pushState({}, '', url.toString());
      
      onStartGame(response.raceId, true); // Creator olarak işaretle
    } catch (err) {
      console.error('Failed to create race:', err);
      setError('Failed to create race: ' + (err as Error).message);
    } finally {
      setIsCreatingRace(false);
    }
  };

  // Ghost race oluştur
  const createGhostRace = async () => {
    try {
      setIsCreatingRace(true);
      setError('');
      const response = await apiClient.createRace(true);
      setRaceId(response.raceId);
      
      // URL'ye race ID'yi ekle
      const url = new URL(window.location.href);
      url.searchParams.set('raceId', response.raceId);
      window.history.pushState({}, '', url.toString());
      
      onStartGame(response.raceId, true); // Creator olarak işaretle
    } catch (err) {
      setError('Failed to create ghost race: ' + (err as Error).message);
    } finally {
      setIsCreatingRace(false);
    }
  };

  // Mevcut yarışa katıl
  const joinRace = async () => {
    if (!raceId.trim()) {
      setError('Please enter a Race ID!');
      return;
    }

    try {
      setIsJoiningRace(true);
      setError('');
      console.log('Joining race with ID:', raceId);
      await apiClient.joinRace(raceId);
      console.log('Successfully joined race:', raceId);
      onStartGame(raceId, false); // Katılımcı olarak işaretle
    } catch (err) {
      console.error('Failed to join race:', err);
      setError('Failed to join race: ' + (err as Error).message);
    } finally {
      setIsJoiningRace(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-blue-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full text-white">
        <h1 className="text-3xl font-bold text-center mb-8">🏁 Math Race</h1>
        
        {/* Backend Status */}
        <div className={`mb-4 p-3 rounded-lg border ${
          backendStatus === 'connected' 
            ? 'bg-green-500/20 border-green-500' 
            : backendStatus === 'disconnected'
            ? 'bg-red-500/20 border-red-500'
            : 'bg-yellow-500/20 border-yellow-500'
        }`}>
          <p className={`text-sm ${
            backendStatus === 'connected' ? 'text-green-200' :
            backendStatus === 'disconnected' ? 'text-red-200' :
            'text-yellow-200'
          }`}>
            {backendStatus === 'checking' && '🔄 Checking backend connection...'}
            {backendStatus === 'connected' && '✅ Backend connection successful'}
            {backendStatus === 'disconnected' && '❌ Backend connection failed'}
          </p>
        </div>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-4">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {!isConnected ? (
          <div className="space-y-4">
            <p className="text-center text-gray-300 mb-6">
              Connect your MetaMask wallet to start the game
            </p>
            <button
              onClick={connectWallet}
              disabled={backendStatus !== 'connected'}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              🔗 Connect MetaMask
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-500/20 border border-green-500 rounded-lg p-3 mb-4">
              <p className="text-green-200 text-sm">
                ✅ Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={createRace}
                disabled={isCreatingRace}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                {isCreatingRace ? '⏳ Creating...' : '🏁 Create New Race'}
              </button>

              <button
                onClick={createGhostRace}
                disabled={isCreatingRace}
                className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-purple-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                {isCreatingRace ? '⏳ Creating...' : '👻 Ghost Race'}
              </button>

              <div className="border-t border-white/20 pt-4">
                <p className="text-center text-gray-300 mb-3">Or join existing race:</p>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={raceId || ''}
                    onChange={(e) => setRaceId(e.target.value)}
                    placeholder="Race ID"
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400"
                  />
                  <button
                    onClick={joinRace}
                    disabled={isJoiningRace}
                    className="bg-green-500 hover:bg-green-600 disabled:bg-green-400 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    {isJoiningRace ? '⏳' : '🎯'}
                  </button>
                </div>
                
                {/* Race ID kopyalama butonu */}
                {raceId && (
                  <div className="mt-2 space-y-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(raceId);
                        setError('Race ID copied to clipboard!');
                        setTimeout(() => setError(''), 2000);
                      }}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                      📋 Copy Race ID
                    </button>
                    
                    <button
                      onClick={() => {
                        const shareUrl = `${window.location.origin}?raceId=${raceId}`;
                        navigator.clipboard.writeText(shareUrl);
                        setError('Share link copied to clipboard!');
                        setTimeout(() => setError(''), 2000);
                      }}
                      className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                      🔗 Copy Share Link
                    </button>
                    
                    <div className="text-xs text-gray-400 text-center">
                      Race ID: {raceId}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
