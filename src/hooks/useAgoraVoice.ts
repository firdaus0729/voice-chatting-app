/**
 * Hook for Agora voice: join/leave channel, mute, volume indication, connection state.
 * Firestore = seat/mute state; RTC = audio only.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { agoraService, ConnectionState } from '../services/agora';
import { updateRoomVoiceMember } from '../services/firestoreModels';

export type UseAgoraVoiceOptions = {
  appId: string;
  channelId: string;
  userId: string;
  /** Leave channel when app goes to background, rejoin on foreground */
  leaveOnBackground?: boolean;
};

export function useAgoraVoice(options: UseAgoraVoiceOptions) {
  const { appId, channelId, userId, leaveOnBackground = true } = options;
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [volumeByUid, setVolumeByUid] = useState<Record<number, number>>({});
  const [localUid, setLocalUid] = useState(0);
  const joinedRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const join = useCallback(async (publishMic: boolean = false) => {
    if (!appId?.trim()) return false;
    joinedRef.current = true;
    const ok = await agoraService.joinChannel(appId, channelId, '', publishMic);
    if (ok) {
      agoraService.enableVolumeIndicator();
    }
    return ok;
  }, [appId, channelId]);

  const leave = useCallback(async () => {
    joinedRef.current = false;
    await agoraService.leaveChannel();
    setLocalUid(0);
    setVolumeByUid({});
    setConnectionState('idle');
  }, []);

  const mute = useCallback((muted: boolean) => {
    return agoraService.muteLocalAudioStream(muted);
  }, []);

  const setPublishMic = useCallback((publish: boolean) => {
    return agoraService.updateChannelMediaOptions(publish);
  }, []);

  useEffect(() => {
    if (!appId?.trim()) return;

    agoraService.setCallbacks({
      onConnectionState: setConnectionState,
      onJoinSuccess: (chId, uid) => {
        setLocalUid(uid);
        updateRoomVoiceMember(chId, userId, uid).catch((e) => console.warn('Update voiceMembers failed', e));
      },
      onVolume: setVolumeByUid,
    });

    return () => {
      agoraService.setCallbacks({});
      if (joinedRef.current) {
        agoraService.leaveChannel();
        joinedRef.current = false;
      }
    };
  }, [appId, userId]);

  useEffect(() => {
    if (!leaveOnBackground) return;
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appStateRef.current === 'active' && (nextState === 'background' || nextState === 'inactive')) {
        if (joinedRef.current) {
          agoraService.leaveChannel();
          joinedRef.current = false;
          setConnectionState('disconnected');
        }
      } else if ((appStateRef.current === 'background' || appStateRef.current === 'inactive') && nextState === 'active') {
        appStateRef.current = nextState;
        if (joinedRef.current === false && appId?.trim() && channelId) {
          join(false).then(() => {});
        }
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [leaveOnBackground, appId, channelId, join]);

  return {
    connectionState,
    localUid,
    volumeByUid,
    join,
    leave,
    mute,
    setPublishMic,
  };
}
