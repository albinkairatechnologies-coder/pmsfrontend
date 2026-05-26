'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { API_URL } from '../utils/api';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff, FiMaximize2, FiMinimize2, FiUsers } from 'react-icons/fi';

interface VideoCallModalProps {
  roomId: string;          // e.g. "KairaFlow_Task_7"
  userName: string;        // display name of local user
  isCaller: boolean;       // true = initiated call, false = joining
  onClose: () => void;     // callback when call ends
}

const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

const POLL_INTERVAL_MS = 800;

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export default function VideoCallModal({ roomId, userName, isCaller, onClose }: VideoCallModalProps) {
  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef          = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pollTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const iceSinceRef    = useRef(0);
  const hangingUpRef   = useRef(false);
  const connectedRef   = useRef(false);

  const [status,        setStatus]        = useState<'connecting' | 'calling' | 'ringing' | 'connected' | 'ended'>('connecting');
  const [micMuted,      setMicMuted]      = useState(false);
  const [camOff,        setCamOff]        = useState(false);
  const [remoteStream,  setRemoteStream]  = useState(false);
  const [isFullscreen,  setIsFullscreen]  = useState(false);
  const [callDuration,  setCallDuration]  = useState(0);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Cleanup ──────────────────────────────────────────────────────────────
  const cleanup = useCallback(async (deleteRoom = true) => {
    if (hangingUpRef.current) return;
    hangingUpRef.current = true;

    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
    if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null; }

    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;

    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    if (deleteRoom) {
      try {
        await fetch(`${API_URL}/videocall/rooms/${encodeURIComponent(roomId)}`, {
          method: 'DELETE',
          headers: authHeaders(),
        });
      } catch (_) {}
    }

    setStatus('ended');
    setTimeout(() => onClose(), 600);
  }, [roomId, onClose]);

  // ── Post ICE candidate to backend ────────────────────────────────────────
  const postIce = useCallback((candidate: RTCIceCandidate) => {
    fetch(`${API_URL}/videocall/rooms/${encodeURIComponent(roomId)}/ice`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ candidate: candidate.toJSON(), role: isCaller ? 'caller' : 'callee' }),
    }).catch(() => {});
  }, [roomId, isCaller]);

  // ── Apply remote ICE candidates ───────────────────────────────────────────
  const applyRemoteIce = useCallback(async (candidates: RTCIceCandidateInit[]) => {
    if (!pcRef.current) return;
    for (const c of candidates) {
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(c));
      } catch (_) {}
    }
  }, []);

  // ── Poll loop (both sides) ────────────────────────────────────────────────
  const startPolling = useCallback(() => {
    const role = isCaller ? 'caller' : 'callee';

    pollTimerRef.current = setInterval(async () => {
      if (!pcRef.current || hangingUpRef.current) return;

      // Caller polls for answer
      if (isCaller && pcRef.current.remoteDescription === null) {
        try {
          const res = await fetch(`${API_URL}/videocall/rooms/${encodeURIComponent(roomId)}/answer`, {
            headers: authHeaders()
          });
          const data = await res.json();
          if (data.sdp && pcRef.current && !pcRef.current.remoteDescription) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.sdp }));
          }
        } catch (_) {}
      }

      // Poll remote ICE
      try {
        const since = iceSinceRef.current;
        const res = await fetch(
          `${API_URL}/videocall/rooms/${encodeURIComponent(roomId)}/ice?role=${role}&since=${since}`,
          { headers: authHeaders() }
        );
        const data = await res.json();
        if (data.candidates?.length) {
          await applyRemoteIce(data.candidates);
          iceSinceRef.current = data.total;
        }
      } catch (_) {}

      // Stop polling when connected and answer exchanged
      if (connectedRef.current && pcRef.current?.remoteDescription) {
        // Keep polling ICE for a bit then slow down
      }

      // Check if remote ended call (room deleted)
      if (connectedRef.current) {
        try {
          const res = await fetch(`${API_URL}/videocall/rooms/${encodeURIComponent(roomId)}/status`, {
            headers: authHeaders(),
          });
          const data = await res.json();
          if (!data.exists) {
            cleanup(false);
          }
        } catch (_) {}
      }
    }, POLL_INTERVAL_MS);
  }, [isCaller, roomId, applyRemoteIce, cleanup]);

  // ── Callee: poll for offer then answer ───────────────────────────────────
  const calleeWaitForOffer = useCallback(async () => {
    setStatus('ringing');
    const maxWait = 60000;
    const start = Date.now();

    const tryGetOffer = async (): Promise<void> => {
      if (hangingUpRef.current || Date.now() - start > maxWait) {
        if (!hangingUpRef.current) cleanup();
        return;
      }
      try {
        const res = await fetch(`${API_URL}/videocall/rooms/${encodeURIComponent(roomId)}/offer`, {
          headers: authHeaders(),
        });
        const data = await res.json();
        if (data.sdp && pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: data.sdp }));
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          await fetch(`${API_URL}/videocall/rooms/${encodeURIComponent(roomId)}/answer`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ sdp: answer.sdp }),
          });
          setStatus('connected');
          startPolling();
          return;
        }
      } catch (_) {}
      setTimeout(tryGetOffer, POLL_INTERVAL_MS);
    };

    tryGetOffer();
  }, [roomId, cleanup, startPolling]);

  // ── Caller: create offer ──────────────────────────────────────────────────
  const callerCreateOffer = useCallback(async () => {
    if (!pcRef.current) return;
    setStatus('calling');
    try {
      const offer = await pcRef.current.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pcRef.current.setLocalDescription(offer);
      await fetch(`${API_URL}/videocall/rooms/${encodeURIComponent(roomId)}/offer`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ sdp: offer.sdp }),
      });
      startPolling();
    } catch (err) {
      console.error('Offer creation failed:', err);
      cleanup();
    }
  }, [roomId, cleanup, startPolling]);

  // ── Init WebRTC ───────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
        pcRef.current = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.onicecandidate = (ev) => {
          if (ev.candidate) postIce(ev.candidate);
        };

        pc.ontrack = (ev) => {
          if (remoteVideoRef.current && ev.streams[0]) {
            remoteVideoRef.current.srcObject = ev.streams[0];
            setRemoteStream(true);
          }
        };

        pc.onconnectionstatechange = () => {
          if (!pcRef.current) return;
          const state = pcRef.current.connectionState;
          if (state === 'connected') {
            connectedRef.current = true;
            setStatus('connected');
            durationTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
          }
          if (state === 'disconnected' || state === 'failed' || state === 'closed') {
            if (!hangingUpRef.current) cleanup(false);
          }
        };

        if (isCaller) {
          await callerCreateOffer();
        } else {
          await calleeWaitForOffer();
        }
      } catch (err) {
        console.error('Media access failed:', err);
        if (mounted) {
          setStatus('ended');
          setTimeout(() => onClose(), 1000);
        }
      }
    };

    init();
    return () => {
      mounted = false;
      cleanup(isCaller);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Toggle mic ────────────────────────────────────────────────────────────
  const toggleMic = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicMuted(!audioTrack.enabled);
    }
  };

  // ── Toggle camera ─────────────────────────────────────────────────────────
  const toggleCam = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCamOff(!videoTrack.enabled);
    }
  };

  // ── Format duration ───────────────────────────────────────────────────────
  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const statusLabel = {
    connecting: 'Setting up camera...',
    calling:    'Calling... waiting for others to join',
    ringing:    'Waiting for host to start call...',
    connected:  `Connected · ${formatDuration(callDuration)}`,
    ended:      'Call ended',
  }[status];

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col bg-[#0A0C14] transition-all duration-300 ${
        status === 'ended' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-black/50 backdrop-blur-md border-b border-white/10 z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white font-bold text-sm tracking-tight">🎥 LIVE MEETING</span>
          </div>
          <div className="hidden sm:block h-4 w-px bg-white/20" />
          <span className="hidden sm:block text-white/50 text-xs font-medium truncate max-w-[200px]">{roomId.replace(/_/g, ' ')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
            status === 'connected'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
          }`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* ── Video area ─────────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden bg-[#0A0C14]">
        {/* Remote video (large) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover transition-all duration-500 ${remoteStream ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Placeholder when no remote stream */}
        {!remoteStream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 ring-4 ring-indigo-500/20">
              <FiUsers size={40} className="text-white" />
            </div>
            <div className="text-center">
              <p className="text-white/80 font-bold text-lg">
                {status === 'calling'    ? 'Waiting for participants...' :
                 status === 'ringing'   ? 'Host is starting the call...' :
                 status === 'connected' ? 'Participant camera is off' :
                 'Connecting...'}
              </p>
              {(status === 'calling' || status === 'ringing') && (
                <p className="text-white/40 text-sm mt-1">Share the task link so others can join</p>
              )}
            </div>
            {(status === 'calling' || status === 'ringing' || status === 'connecting') && (
              <div className="flex gap-1.5 mt-2">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Local video (PiP, bottom right) */}
        <div className={`absolute bottom-4 right-4 w-32 sm:w-40 aspect-video rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-gray-900 transition-all duration-300 ${camOff ? 'opacity-50' : 'opacity-100'}`}>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
          {camOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
              <FiVideoOff className="text-white/60" size={20} />
            </div>
          )}
          <div className="absolute bottom-1 left-1 right-1 text-center">
            <span className="text-white text-[9px] font-bold bg-black/60 px-1.5 py-0.5 rounded-full truncate max-w-full block">
              {userName} (you)
            </span>
          </div>
        </div>
      </div>

      {/* ── Bottom controls ─────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-center gap-4 px-6 py-5 bg-black/60 backdrop-blur-md border-t border-white/10">
        {/* Mic toggle */}
        <button
          onClick={toggleMic}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg ${
            micMuted
              ? 'bg-red-500/90 text-white shadow-red-500/30 hover:bg-red-600'
              : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
          }`}
          title={micMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {micMuted ? <FiMicOff size={20} /> : <FiMic size={20} />}
        </button>

        {/* Camera toggle */}
        <button
          onClick={toggleCam}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg ${
            camOff
              ? 'bg-red-500/90 text-white shadow-red-500/30 hover:bg-red-600'
              : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
          }`}
          title={camOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {camOff ? <FiVideoOff size={20} /> : <FiVideo size={20} />}
        </button>

        {/* End call */}
        <button
          onClick={() => cleanup(true)}
          className="w-16 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-xl shadow-red-600/40 transition-all active:scale-90 hover:scale-105"
          title="End call"
        >
          <FiPhoneOff size={22} />
        </button>

        {/* Fullscreen toggle */}
        <button
          onClick={() => setIsFullscreen(f => !f)}
          className="w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 border border-white/10 flex items-center justify-center transition-all active:scale-90"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <FiMinimize2 size={18} /> : <FiMaximize2 size={18} />}
        </button>
      </div>
    </div>
  );
}
