/**
 * Agora RTC service: audio-only voice channel.
 * Firestore = room/seat/mute state. RTC = audio only.
 */
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ConnectionStateType,
  RtcConnection,
  AudioVolumeInfo,
  ChannelMediaOptions,
} from 'react-native-agora';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed';

export type AgoraCallbacks = {
  onConnectionState?: (state: ConnectionState) => void;
  onJoinSuccess?: (channelId: string, localUid: number) => void;
  onVolume?: (volumeByUid: Record<number, number>) => void;
};

const VOLUME_INDICATOR_INTERVAL_MS = 300;
const VOLUME_SMOOTH = 3;
const VOLUME_REPORT_VAD = true;

function connectionStateFromAgora(state: ConnectionStateType): ConnectionState {
  switch (state) {
    case ConnectionStateType.ConnectionStateConnecting:
      return 'connecting';
    case ConnectionStateType.ConnectionStateConnected:
      return 'connected';
    case ConnectionStateType.ConnectionStateReconnecting:
      return 'reconnecting';
    case ConnectionStateType.ConnectionStateDisconnected:
      return 'disconnected';
    case ConnectionStateType.ConnectionStateFailed:
      return 'failed';
    default:
      return 'idle';
  }
}

class AgoraService {
  private engine: ReturnType<typeof createAgoraRtcEngine> | null = null;
  private callbacks: AgoraCallbacks = {};
  private currentChannelId: string | null = null;
  private localUid: number = 0;
  private initialized = false;

  setCallbacks(cb: AgoraCallbacks) {
    this.callbacks = cb;
  }

  async initialize(appId: string): Promise<boolean> {
    if (this.initialized && this.engine) {
      return true;
    }
    if (!appId?.trim()) {
      return false;
    }
    try {
      const eng = createAgoraRtcEngine();
      const code = eng.initialize({ appId });
      if (code !== 0) {
        console.warn('Agora initialize failed:', code);
        return false;
      }
      eng.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
      eng.enableAudio();
      eng.addListener('onJoinChannelSuccess', (connection: RtcConnection, elapsed: number) => {
        this.currentChannelId = connection.channelId ?? null;
        this.localUid = connection.localUid ?? 0;
        this.callbacks.onJoinSuccess?.(connection.channelId ?? '', this.localUid);
        this.callbacks.onConnectionState?.('connected');
      });
      eng.addListener('onConnectionStateChanged', (connection: RtcConnection, state: ConnectionStateType) => {
        this.callbacks.onConnectionState?.(connectionStateFromAgora(state));
      });
      eng.addListener('onAudioVolumeIndication', (connection: RtcConnection, speakers: AudioVolumeInfo[], speakerNumber: number) => {
        const volumeByUid: Record<number, number> = {};
        for (let i = 0; i < speakerNumber && i < speakers.length; i++) {
          const s = speakers[i];
          if (s?.uid !== undefined) {
            const uid = s.uid === 0 ? this.localUid : s.uid;
            const v = typeof s.volume === 'number' ? Math.min(1, s.volume / 255) : 0;
            volumeByUid[uid] = v;
          }
        }
        this.callbacks.onVolume?.(volumeByUid);
      });
      this.engine = eng;
      this.initialized = true;
      return true;
    } catch (e) {
      console.warn('Agora init error:', e);
      return false;
    }
  }

  joinChannel(appId: string, channelId: string, token: string = '', publishMic: boolean = false): Promise<boolean> {
    return this.initialize(appId).then((ok) => {
      if (!ok || !this.engine) return false;
      try {
        this.callbacks.onConnectionState?.('connecting');
        const options = new ChannelMediaOptions();
        options.publishMicrophoneTrack = publishMic;
        options.autoSubscribeAudio = true;
        const code = this.engine.joinChannel(token, channelId, 0, options);
        return code === 0;
      } catch (e) {
        console.warn('Agora joinChannel error:', e);
        this.callbacks.onConnectionState?.('failed');
        return false;
      }
    });
  }

  leaveChannel(): Promise<void> {
    if (!this.engine) return Promise.resolve();
    try {
      this.engine.leaveChannel();
      this.currentChannelId = null;
      this.localUid = 0;
      this.callbacks.onConnectionState?.('disconnected');
    } catch (e) {
      console.warn('Agora leaveChannel error:', e);
    }
    return Promise.resolve();
  }

  muteLocalAudioStream(mute: boolean): boolean {
    if (!this.engine) return false;
    try {
      return this.engine.muteLocalAudioStream(mute) === 0;
    } catch (e) {
      console.warn('Agora muteLocalAudioStream error:', e);
      return false;
    }
  }

  updateChannelMediaOptions(publishMic: boolean): boolean {
    if (!this.engine) return false;
    try {
      const options = new ChannelMediaOptions();
      options.publishMicrophoneTrack = publishMic;
      options.autoSubscribeAudio = true;
      return this.engine.updateChannelMediaOptions(options) === 0;
    } catch (e) {
      console.warn('Agora updateChannelMediaOptions error:', e);
      return false;
    }
  }

  enableVolumeIndicator(): boolean {
    if (!this.engine) return false;
    try {
      return this.engine.enableAudioVolumeIndication(VOLUME_INDICATOR_INTERVAL_MS, VOLUME_SMOOTH, VOLUME_REPORT_VAD) === 0;
    } catch (e) {
      console.warn('Agora enableAudioVolumeIndication error:', e);
      return false;
    }
  }

  getLocalUid(): number {
    return this.localUid;
  }

  getCurrentChannelId(): string | null {
    return this.currentChannelId;
  }

  release() {
    try {
      if (this.engine) {
        this.engine.leaveChannel();
        this.engine.release();
      }
    } catch (_) {}
    this.engine = null;
    this.initialized = false;
    this.currentChannelId = null;
    this.localUid = 0;
  }
}

export const agoraService = new AgoraService();
