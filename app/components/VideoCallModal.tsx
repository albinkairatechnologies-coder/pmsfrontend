'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { API_URL } from '../utils/api';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff, FiMaximize2, FiMinimize2, FiUsers, FiAlertCircle, FiRefreshCw, FiTv } from 'react-icons/fi';

interface VideoCallModalProps {
  roomId: string;
  userName: string;
  isCaller: boolean;
  onClose: () => void;
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

// ── Friendly error messages per browser DOMException name ────────────────────
function getMediaErrorMessage(err: any): { title: string; detail: string; canRetry: boolean } {
  console.error("WebRTC media access failure details:", err);
  const name = err?.name || (err instanceof DOMException ? err.name : '');
  const message = err?.message || '';

  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return {
      title: 'Camera / Microphone Not Found',
      detail: `No camera or microphone was detected on this device. Make sure your devices are plugged in and try again, or use audio-only mode. (Details: ${name}${message ? ' - ' + message : ''})`,
      canRetry: true,
    };
  }
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return {
      title: 'Permission Denied',
      detail: 'Browser blocked access to camera/microphone. Click the camera icon in your browser address bar and allow access, then try again.',
      canRetry: true,
    };
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return {
      title: 'Device In Use / Not Readable',
      detail: `Your camera or microphone is already being used by another application or is not readable. Close the other app and try again. (Details: ${name}${message ? ' - ' + message : ''})`,
      canRetry: true,
    };
  }
  if (name === 'OverconstrainedError') {
    return {
      title: 'Device Not Compatible',
      detail: `Your camera/microphone does not meet the required constraints. Try using a different device. (Constraint: ${err?.constraint || 'unknown'})`,
      canRetry: true,
    };
  }
  return {
    title: 'Cannot Access Media Devices',
    detail: `An unexpected error occurred while accessing your camera/microphone. Make sure you are on a secure (HTTPS) connection. (Details: ${name || 'UnknownError'} - ${message || 'No details provided'})`,
    canRetry: true,
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
  const mountedRef     = useRef(true);

  const [status,       setStatus]       = useState<'connecting' | 'calling' | 'ringing' | 'connected' | 'ended'>('connecting');
  const [micMuted,     setMicMuted]     = useState(false);
  const [camOff,       setCamOff]       = useState(false);
  const [audioOnly,    setAudioOnly]    = useState(false);  // true when no camera found but mic OK
  const [isViewer,     setIsViewer]     = useState(false);  // true when no mic/camera or chosen viewer mode
  const [remoteStream, setRemoteStream] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [mediaError,   setMediaError]   = useState<{ title: string; detail: string; canRetry: boolean } | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // ── Cleanup ──────────────────────────────────────────────────────────────
  const cleanup = useCallback(async (deleteRoom = true) => {
    if (hangingUpRef.current) return;
    hangingUpRef.current = true;

    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
    if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null; }

    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;

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

  // ── Post ICE candidate ────────────────────────────────────────────────────
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
      try { await pcRef.current.addIceCandidate(new RTCIceCandidate(c)); } catch (_) {}
    }
  }, []);

  // ── Poll loop ─────────────────────────────────────────────────────────────
  const startPolling = useCallback(() => {
    const role = isCaller ? 'caller' : 'callee';

    pollTimerRef.current = setInterval(async () => {
      if (!pcRef.current || hangingUpRef.current) return;

      if (isCaller && pcRef.current.remoteDescription === null) {
        try {
          const res  = await fetch(`${API_URL}/videocall/rooms/${encodeURIComponent(roomId)}/answer`, { headers: authHeaders() });
          const data = await res.json();
          if (data.sdp && pcRef.current && !pcRef.current.remoteDescription) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.sdp }));
          }
        } catch (_) {}
      }

      try {
        const since = iceSinceRef.current;
        const res  = await fetch(`${API_URL}/videocall/rooms/${encodeURIComponent(roomId)}/ice?role=${role}&since=${since}`, { headers: authHeaders() });
        const data = await res.json();
        if (data.candidates?.length) {
          await applyRemoteIce(data.candidates);
          iceSinceRef.current = data.total;
        }
      } catch (_) {}

      if (connectedRef.current) {
        try {
          const res  = await fetch(`${API_URL}/videocall/rooms/${encodeURIComponent(roomId)}/status`, { headers: authHeaders() });
          const data = await res.json();
          if (!data.exists) cleanup(false);
        } catch (_) {}
      }
    }, POLL_INTERVAL_MS);
  }, [isCaller, roomId, applyRemoteIce, cleanup]);

  // ── Callee: wait for offer ────────────────────────────────────────────────
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
        const res  = await fetch(`${API_URL}/videocall/rooms/${encodeURIComponent(roomId)}/offer`, { headers: authHeaders() });
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

  // ── Setup RTCPeerConnection after getting stream ───────────────────────────
  const setupPeerConnection = useCallback((stream: MediaStream | null) => {
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    pcRef.current = pc;

    if (stream) {
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
    } else {
      try {
        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });
      } catch (e) {
        console.warn('Transceivers not supported:', e);
      }
    }

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
  }, [postIce, cleanup]);

  // ── Init WebRTC with graceful fallbacks ───────────────────────────────────
  const initCall = useCallback(async (forceViewer: boolean = false) => {
    hangingUpRef.current = false;
    iceSinceRef.current  = 0;
    connectedRef.current = false;
    setMediaError(null);
    setStatus('connecting');

    let stream: MediaStream | null = null;

    if (forceViewer) {
      setAudioOnly(true);
      setCamOff(true);
      setMicMuted(true);
      setIsViewer(true);
    } else {
      setAudioOnly(false);
      setCamOff(false);
      setMicMuted(false);
      setIsViewer(false);

      // Try video+audio first
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (videoErr) {
        console.warn("Video/Camera capture failed, attempting audio-only fallback...", videoErr);
        // Try audio-only fallback
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          setAudioOnly(true);
          setCamOff(true);
        } catch (audioErr) {
          console.error("Audio-only capture also failed:", audioErr);
          // Both failed — show friendly error card
          const info = getMediaErrorMessage(videoErr);
          setMediaError(info);
          return;
        }
      }
    }

    if (!mountedRef.current) { stream?.getTracks().forEach(t => t.stop()); return; }
    localStreamRef.current = stream;

    if (localVideoRef.current && stream && stream.getVideoTracks().length > 0) {
      localVideoRef.current.srcObject = stream;
    }

    setupPeerConnection(stream);

    if (isCaller) {
      await callerCreateOffer();
    } else {
      await calleeWaitForOffer();
    }
  }, [isCaller, setupPeerConnection, callerCreateOffer, calleeWaitForOffer]);

  useEffect(() => {
    mountedRef.current = true;
    initCall();
    return () => {
      mountedRef.current = false;
      cleanup(isCaller);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Toggle mic ────────────────────────────────────────────────────────────
  const toggleMic = () => {
    if (isViewer) return;
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicMuted(!audioTrack.enabled);
    }
  };

  // ── Toggle camera ─────────────────────────────────────────────────────────
  const toggleCam = () => {
    if (audioOnly || isViewer) return; // no camera available or viewer mode
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCamOff(!videoTrack.enabled);
    }
  };

  // ── Toggle Screen Share ───────────────────────────────────────────────────
  const toggleScreenShare = async () => {
    if (isViewer) return;

    if (isScreenSharing) {
      // Stop screen sharing, revert to camera
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }

      const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
      if (pcRef.current && cameraTrack) {
        const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(cameraTrack);
        }
      }

      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }

      setIsScreenSharing(false);
    } else {
      // Start screen sharing
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        if (pcRef.current && screenTrack) {
          const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(screenTrack);
          }
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        screenTrack.onended = () => {
          toggleScreenShare(); // Revert back when user clicks native stop sharing button
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.error("Screen sharing failed:", err);
      }
    }
  };

  // ── Format duration ───────────────────────────────────────────────────────
  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const statusLabel = {
    connecting: isViewer
      ? 'Connecting as Viewer/Listener...'
      : audioOnly
      ? 'Audio-only mode — no camera found'
      : 'Setting up camera...',
    calling:    'Calling... waiting for others to join',
    ringing:    'Waiting for host to start call...',
    connected:  isViewer
      ? `Listening/Watching · ${formatDuration(callDuration)}`
      : `Connected · ${formatDuration(callDuration)}`,
    ended:      'Call ended',
  }[status];

  // ── Media Error Screen ────────────────────────────────────────────────────
  if (mediaError) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0A0C14]/95 backdrop-blur-md p-6">
        <div className="bg-[#11131E] border border-red-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-red-500/10 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-5">
            <FiAlertCircle size={32} className="text-red-400" />
          </div>
          <h2 className="text-white font-black text-lg mb-2">{mediaError.title}</h2>
          <p className="text-white/50 text-sm leading-relaxed mb-6">{mediaError.detail}</p>

          <div className="flex flex-col gap-3">
            {mediaError.canRetry && (
              <button
                onClick={() => {
                  hangingUpRef.current = false;
                  initCall();
                }}
                className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all active:scale-95"
              >
                <FiRefreshCw size={16} /> Try Again
              </button>
            )}
            <button
              onClick={() => {
                setMediaError(null);
                initCall(true); // force viewer mode
              }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg shadow-emerald-600/20"
            >
              👁️ Join as Viewer / Listener
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl font-bold text-sm transition-all border border-white/10"
            >
              Close
            </button>
          </div>

          <p className="text-white/30 text-xs mt-4">
            💡 Tip: Click the camera icon in your browser's address bar to grant permissions
          </p>
        </div>
      </div>
    );
  }

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
            <span className="text-white font-bold text-sm tracking-tight">
              {isViewer ? '👁️ VIEWER MODE' : audioOnly ? '🎙️ AUDIO CALL' : '🎥 LIVE MEETING'}
            </span>
          </div>
          <div className="hidden sm:block h-4 w-px bg-white/20" />
          <span className="hidden sm:block text-white/50 text-xs font-medium truncate max-w-[200px]">{roomId.replace(/_/g, ' ')}</span>
        </div>
        <div className="flex items-center gap-2">
          {isViewer && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
              Viewer
            </span>
          )}
          {audioOnly && !isViewer && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
              Audio Only
            </span>
          )}
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
              {audioOnly && status !== 'connected' && (
                <p className="text-yellow-400/70 text-xs mt-2 font-medium">
                  🎙️ Running in audio-only mode (no camera detected)
                </p>
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

        {/* Local video PiP (hidden in audio-only mode) */}
        {!audioOnly && (
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
        )}

        {/* Audio-only avatar (when no camera) */}
        {audioOnly && status !== 'ended' && (
          <div className="absolute bottom-4 right-4 w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 border-2 border-white/20 shadow-2xl flex flex-col items-center justify-center">
            <span className="text-white font-black text-lg">{userName[0]?.toUpperCase()}</span>
            <div className="flex gap-0.5 mt-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1 bg-emerald-400 rounded-full animate-pulse" style={{ height: `${8 + i * 4}px`, animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom controls ─────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-center gap-4 px-6 py-5 bg-black/60 backdrop-blur-md border-t border-white/10">
        {/* Mic toggle */}
        <button
          onClick={toggleMic}
          disabled={isViewer}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg ${
            isViewer
              ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
              : micMuted
                ? 'bg-red-500/90 text-white shadow-red-500/30 hover:bg-red-600'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
          }`}
          title={isViewer ? 'No microphone in viewer mode' : micMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {micMuted || isViewer ? <FiMicOff size={20} /> : <FiMic size={20} />}
        </button>

        {/* Camera toggle (disabled in audio-only or viewer mode) */}
        <button
          onClick={toggleCam}
          disabled={audioOnly || isViewer}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg ${
            audioOnly || isViewer
              ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
              : camOff
                ? 'bg-red-500/90 text-white shadow-red-500/30 hover:bg-red-600'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
          }`}
          title={isViewer ? 'No camera in viewer mode' : audioOnly ? 'No camera available' : camOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {camOff || audioOnly || isViewer ? <FiVideoOff size={20} /> : <FiVideo size={20} />}
        </button>

        {/* Screen Share toggle (disabled in audio-only or viewer mode) */}
        <button
          onClick={toggleScreenShare}
          disabled={isViewer}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg ${
            isViewer
              ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
              : isScreenSharing
                ? 'bg-emerald-500/90 text-white shadow-emerald-500/30 hover:bg-emerald-600'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
          }`}
          title={isViewer ? 'No screen sharing in viewer mode' : isScreenSharing ? 'Stop screen sharing' : 'Share screen'}
        >
          <FiTv size={20} className={isScreenSharing ? "animate-pulse" : ""} />
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
          onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(() => {});
            } else {
              document.exitFullscreen().catch(() => {});
            }
          }}
          className="w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 border border-white/10 flex items-center justify-center transition-all active:scale-90"
          title="Toggle fullscreen"
        >
          <FiMaximize2 size={18} />
        </button>
      </div>
    </div>
  );
}
