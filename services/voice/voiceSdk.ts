import type { ActiveVoiceRoom, VoiceRole } from '@/store/voiceRoom';

/**
 * Abstraction over the underlying real-time voice SDK (e.g. Agora).
 * This makes the app future-proof and testable.
 *
 * A concrete implementation should be provided at runtime that
 * actually talks to Agora (or another provider). Until then,
 * this file provides a safe, no-op default that surfaces clear
 * errors when voice features are used without configuration.
 */

export interface VoiceSdkEvents {
  onUserJoined?: (uid: string) => void;
  onUserLeft?: (uid: string) => void;
  onSpeakingChanged?: (uid: string, isSpeaking: boolean) => void;
}

export interface JoinRoomParams {
  roomId: string;
  /** Agora channel token or equivalent, if required by backend. */
  token?: string;
  role: VoiceRole;
}

export interface VoiceSdk {
  /** Initialize underlying SDK. Safe to call multiple times. */
  initialize(): Promise<void>;
  /** Join a voice channel for the given room. */
  joinRoom(params: JoinRoomParams): Promise<void>;
  /** Leave the current room. */
  leaveRoom(): Promise<void>;
  /** Mute/unmute local microphone. */
  setMuted(muted: boolean): Promise<void>;
  /** Enable/disable speaker output. */
  setSpeakerEnabled(enabled: boolean): Promise<void>;
  /** Register callbacks for remote user events. */
  registerEvents(events: VoiceSdkEvents): void;
}

class UnconfiguredVoiceSdk implements VoiceSdk {
  async initialize(): Promise<void> {
    // No-op; real implementation should perform SDK init here.
  }

  async joinRoom(): Promise<void> {
    throw new Error(
      'Voice SDK is not configured. Provide a concrete VoiceSdk implementation (e.g. Agora) and wire it via setVoiceSdk().'
    );
  }

  async leaveRoom(): Promise<void> {
    // Safe to ignore when unconfigured.
  }

  async setMuted(): Promise<void> {
    // Safe to ignore when unconfigured.
  }

  async setSpeakerEnabled(): Promise<void> {
    // Safe to ignore when unconfigured.
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  registerEvents(_events: VoiceSdkEvents): void {
    // No-op.
  }
}

let currentSdk: VoiceSdk = new UnconfiguredVoiceSdk();

export function setVoiceSdk(sdk: VoiceSdk) {
  currentSdk = sdk;
}

export function getVoiceSdk(): VoiceSdk {
  return currentSdk;
}

export type { ActiveVoiceRoom };

