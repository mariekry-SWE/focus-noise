import TrackPlayer from "react-native-track-player";
import { playbackService } from "./trackPlayerService";
import "expo-router/entry";

TrackPlayer.registerPlaybackService(() => playbackService);
