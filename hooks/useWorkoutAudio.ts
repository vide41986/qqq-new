import { useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

interface WorkoutAudioHook {
  playReadySound: () => Promise<void>;
  playRestSound: () => Promise<void>;
  playNextExerciseSound: () => Promise<void>;
  playCompletionSound: () => Promise<void>;
  speakText: (text: string) => void;
  setVolume: (volume: number) => void;
  cleanup: () => Promise<void>;
}

export function useWorkoutAudio(): WorkoutAudioHook {
  const [soundsLoaded, setSoundsLoaded] = useState(false);
  const [volume, setVolumeState] = useState(1.0);
  
  // Sound refs
  const readySoundRef = useRef<Audio.Sound | null>(null);
  const restSoundRef = useRef<Audio.Sound | null>(null);
  const nextExerciseSoundRef = useRef<Audio.Sound | null>(null);
  const completionSoundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    loadSounds();
    return () => {
      cleanup();
    };
  }, []);

  const loadSounds = async () => {
    try {
      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create sound objects with fallback beep sounds
      const { sound: readySound } = await Audio.Sound.createAsync(
        { uri: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav' },
        { shouldPlay: false, volume }
      );
      readySoundRef.current = readySound;

      const { sound: restSound } = await Audio.Sound.createAsync(
        { uri: 'https://www.soundjay.com/misc/sounds/bell-ringing-04.wav' },
        { shouldPlay: false, volume }
      );
      restSoundRef.current = restSound;

      const { sound: nextExerciseSound } = await Audio.Sound.createAsync(
        { uri: 'https://www.soundjay.com/misc/sounds/bell-ringing-03.wav' },
        { shouldPlay: false, volume }
      );
      nextExerciseSoundRef.current = nextExerciseSound;

      const { sound: completionSound } = await Audio.Sound.createAsync(
        { uri: 'https://www.soundjay.com/misc/sounds/bell-ringing-02.wav' },
        { shouldPlay: false, volume }
      );
      completionSoundRef.current = completionSound;

      setSoundsLoaded(true);
    } catch (error) {
      console.warn('Failed to load workout sounds:', error);
      // Fallback to speech synthesis only
      setSoundsLoaded(true);
    }
  };

  const playSound = async (soundRef: React.MutableRefObject<Audio.Sound | null>) => {
    try {
      if (soundRef.current) {
        await soundRef.current.replayAsync();
      }
    } catch (error) {
      console.warn('Failed to play sound:', error);
    }
  };

  const playReadySound = async () => {
    await playSound(readySoundRef);
    speakText('Ready to start! Let\'s begin your workout.');
  };

  const playRestSound = async () => {
    await playSound(restSoundRef);
    speakText('Great job! Take a rest.');
  };

  const playNextExerciseSound = async () => {
    await playSound(nextExerciseSoundRef);
    speakText('Next exercise coming up!');
  };

  const playCompletionSound = async () => {
    await playSound(completionSoundRef);
    speakText('Congratulations! Workout completed!');
  };

  const speakText = (text: string) => {
    try {
      Speech.speak(text, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.9,
        volume: volume,
      });
    } catch (error) {
      console.warn('Failed to speak text:', error);
    }
  };

  const setVolume = async (newVolume: number) => {
    setVolumeState(newVolume);
    
    try {
      const sounds = [
        readySoundRef.current,
        restSoundRef.current,
        nextExerciseSoundRef.current,
        completionSoundRef.current,
      ];

      for (const sound of sounds) {
        if (sound) {
          await sound.setVolumeAsync(newVolume);
        }
      }
    } catch (error) {
      console.warn('Failed to set volume:', error);
    }
  };

  const cleanup = async () => {
    try {
      const sounds = [
        readySoundRef.current,
        restSoundRef.current,
        nextExerciseSoundRef.current,
        completionSoundRef.current,
      ];

      for (const sound of sounds) {
        if (sound) {
          await sound.unloadAsync();
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup sounds:', error);
    }
  };

  return {
    playReadySound,
    playRestSound,
    playNextExerciseSound,
    playCompletionSound,
    speakText,
    setVolume,
    cleanup,
  };
}